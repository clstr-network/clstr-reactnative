import { supabase } from "@/integrations/supabase/client";
import { handleApiError } from "@/lib/errorHandler";

/**
 * Deactivate the authenticated user's account.
 * Calls the deactivate_own_account RPC directly (soft deactivation with a
 * 15-day grace period).  Falls back to the delete-account edge function if
 * the RPC is unavailable.
 */
export async function deactivateOwnAccount(): Promise<void> {
  try {
    // Ensure we have a fresh session before attempting deactivation
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      // Try refreshing explicitly
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw new Error("Session expired. Please sign in again.");
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("User not authenticated");
    if (!user.id || typeof user.id !== "string" || user.id.length < 36) {
      throw new Error("Invalid user ID");
    }

    // Primary path: call the RPC directly (avoids edge-function deployment issues)
    const { error: rpcError } = await supabase.rpc("deactivate_own_account");

    if (rpcError) {
      // If the RPC doesn't exist yet (migration not applied), fall back to
      // the edge function which can handle it server-side.
      if (rpcError.code === "PGRST202") {
        const { error: fnError } = await supabase.functions.invoke("delete-account", {
          body: {},
        });
        if (fnError) throw fnError;
      } else {
        throw rpcError;
      }
    }

    // Best-effort audit log (non-blocking)
    try {
      await supabase.from("account_deletion_audit").insert({
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
    // showToast: false — the caller (Settings page) handles the toast
    throw handleApiError(error, {
      operation: "deactivateOwnAccount",
      userMessage: "Failed to deactivate account. Please try again.",
      showToast: false,
    });
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
export async function reactivateOwnAccount(): Promise<void> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase.rpc("reactivate_own_account");
    if (error) throw error;
  } catch (error) {
    throw handleApiError(error, {
      operation: "reactivateOwnAccount",
      userMessage: "Failed to reactivate account. Please try again.",
      showToast: false,
    });
  }
}
