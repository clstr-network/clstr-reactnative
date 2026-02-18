import "./deno-shim.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * cron-hard-delete — Supabase scheduled Edge Function (daily)
 *
 * Permanently deletes accounts that have been deactivated for 15+ days.
 * Uses atomic DELETE...RETURNING via hard_delete_expired_accounts() RPC,
 * eliminating the race window between SELECT and DELETE.
 *
 * FK direction: profiles.id REFERENCES auth.users(id) ON DELETE CASCADE.
 * Deleting FROM profiles does NOT cascade to auth.users — we manually
 * call admin.deleteUser() after the profile row is removed.
 *
 * Schedule: Run daily via Supabase cron or external scheduler.
 * Auth: Requires SUPABASE_SERVICE_ROLE_KEY (admin access).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Supabase environment not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify this is called with proper authorization (cron secret or service key)
    const authHeader = req.headers.get("authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");

    // Accept either service role key in auth header or cron secret
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Fall back to checking if it's a valid service role call
      if (!authHeader?.includes(serviceKey)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const now = new Date().toISOString();

    // Atomic DELETE...RETURNING — single operation, no race window.
    // The RPC hard_delete_expired_accounts() deletes all profiles where
    // account_status = 'deactivated' AND scheduled_deletion_at < now(),
    // returning {user_id, email} for each deleted row.
    const { data: deleted, error: rpcError } = await adminClient
      .rpc("hard_delete_expired_accounts");

    if (rpcError) {
      console.error("Failed to hard-delete expired accounts:", rpcError);
      return new Response(JSON.stringify({ error: "Failed to hard-delete expired accounts" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!deleted || deleted.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No expired accounts to delete", deleted: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Profile rows are already gone. Now clean up auth.users and write audit logs.
    let cleanedCount = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    for (const user of deleted) {
      let authDeleted = false;
      let authErrorMsg: string | null = null;

      try {
        // Profile gone → cascaded data cleaned up → now remove auth user.
        // This is safe because profiles.id REFERENCES auth.users(id),
        // and the cascade direction is auth.users → profiles (not reverse).
        const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(user.user_id);

        if (authDeleteError) {
          authErrorMsg = `Auth delete failed: ${authDeleteError.message}`;
          console.error(`Failed to delete auth user ${user.user_id}:`, authDeleteError);
          errors.push({ userId: user.user_id, error: authErrorMsg });
          // Profile is already gone, but auth user remains — log for manual cleanup
        } else {
          authDeleted = true;
        }
      } catch (userError) {
        const message = userError instanceof Error ? userError.message : String(userError);
        authErrorMsg = `Auth delete threw: ${message}`;
        console.error(`Unexpected error deleting auth user ${user.user_id}:`, message);
        errors.push({ userId: user.user_id, error: authErrorMsg });
      }

      // Audit log — ALWAYS written regardless of auth deletion outcome.
      // Profile delete already committed; audit must survive.
      try {
        const { error: auditError } = await adminClient
          .from("account_deletion_audit")
          .insert({
            user_id: user.user_id,
            email: user.email,
            action: "hard_deleted",
            deleted_at: now,
            source: "cron-hard-delete",
            ...(authErrorMsg ? { deactivated_at: null } : {}),
          });

        if (auditError) {
          console.error(`Failed to write deletion audit for ${user.user_id}:`, auditError);
          // Non-blocking — the profile deletion was successful
        }
      } catch (auditErr) {
        console.error(`Audit insert threw for ${user.user_id}:`, auditErr);
      }

      cleanedCount++;
      console.log(
        `Hard-deleted account: ${user.user_id} (${user.email})` +
          (authDeleted ? "" : " [auth cleanup pending]"),
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted: cleanedCount,
        total: deleted.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    console.error("Unhandled error in cron-hard-delete:", normalized);
    return new Response(JSON.stringify({ error: normalized.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
