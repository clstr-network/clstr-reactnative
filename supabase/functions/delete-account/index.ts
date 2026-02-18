import "./deno-shim.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return new Response(JSON.stringify({ error: "Supabase environment not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User-scoped client: respects RLS for any DB writes.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Step 1: Deactivate FIRST (via RPC — validates auth + club ownership) ──
    const { error: deactivateError } = await userClient.rpc("deactivate_own_account");

    if (deactivateError) {
      console.error("Failed to deactivate account:", deactivateError);
      return new Response(
        JSON.stringify({ error: deactivateError.message || "Failed to deactivate account" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── Step 2: Audit log (best-effort) ──
    // Do NOT rollback deactivation on audit failure.
    const { error: auditError } = await userClient.from("account_deletion_audit").insert({
      user_id: user.id,
      email: user.email ?? null,
      source: "settings",
      action: "deactivated",
      deactivated_at: new Date().toISOString(),
    });

    if (auditError) {
      console.error("Failed to write deactivation audit (continuing):", auditError);
    }

    // ── Step 3: Send deactivation email — fire-and-forget ──
    // Email failure must NEVER prevent deactivation.
    try {
      const adminClient = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // Best-effort email notification — no rollback on failure
      if (user.email) {
        console.log(`Deactivation email would be sent to ${user.email}`);
        // TODO: Integrate with email service (e.g., Resend, SendGrid)
        // await sendDeactivationEmail(user.email);
      }
    } catch (emailError) {
      console.error("Deactivation email failed (non-blocking):", emailError);
    }

    // ── Step 4: Sign out user server-side ──
    // Do NOT call admin.deleteUser() — the cron job handles hard deletion
    // after the 15-day grace period.
    try {
      const adminClient = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await adminClient.auth.admin.signOut(user.id);
    } catch (signOutError) {
      // Best-effort: client-side signout will also happen
      console.error("Server-side signout failed (non-blocking):", signOutError);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    console.error("Unhandled error in delete-account:", normalized);
    return new Response(JSON.stringify({ error: normalized.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
