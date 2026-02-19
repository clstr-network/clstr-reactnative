import type { SupabaseClient } from '@supabase/supabase-js';
import { createAppError } from '../errors';

/**
 * Deactivate the authenticated user's account.
 * Calls the deactivate_own_account RPC directly (soft deactivation with a
 * 15-day grace period).  Falls back to the delete-account edge function if
 * the RPC is unavailable.
 */
export async function deactivateOwnAccount(client: SupabaseClient): Promise<void> {
  try {
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session) {
      const { error: refreshError } = await client.auth.refreshSession();
      if (refreshError) throw new Error("Session expired. Please sign in again.");
    }

    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("User not authenticated");
    if (!user.id || typeof user.id !== "string" || user.id.length < 36) {
      throw new Error("Invalid user ID");
    }

    const { error: rpcError } = await client.rpc("deactivate_own_account");

    if (rpcError) {
      if (rpcError.code === "PGRST202") {
        const { error: fnError } = await client.functions.invoke("delete-account", {
          body: {},
        });
        if (fnError) throw fnError;
      } else {
        throw rpcError;
      }
    }

    // Best-effort audit log (non-blocking)
    try {
      await client.from("account_deletion_audit").insert({
        user_id: user.id,
        email: user.email ?? null,
        source: "settings",
        action: "deactivated",
        deactivated_at: new Date().toISOString(),
      });
    } catch {
      // Audit failure must never block deactivation
    }
  } catch (error) {
    throw createAppError(
      "Failed to deactivate account. Please try again.",
      "deactivateOwnAccount",
      error,
    );
  }
}

/**
 * @deprecated Use `deactivateOwnAccount()` instead.
 * Kept as alias for backward compatibility.
 */
export const deleteOwnAccount = deactivateOwnAccount;

/**
 * Reactivate the authenticated user's account during the grace period.
 * Calls the reactivate_own_account RPC directly.
 */
export async function reactivateOwnAccount(client: SupabaseClient): Promise<void> {
  try {
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("User not authenticated");

    const { error } = await client.rpc("reactivate_own_account");
    if (error) throw error;
  } catch (error) {
    throw createAppError(
      "Failed to reactivate account. Please try again.",
      "reactivateOwnAccount",
      error,
    );
  }
}
