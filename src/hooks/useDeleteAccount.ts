import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { deactivateOwnAccount } from "@/lib/account";

/**
 * Hook to deactivate the current user's account (15-day grace period).
 * On success: clears query cache + signs out locally.
 */
export function useDeactivateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await deactivateOwnAccount();
    },
    onSuccess: async () => {
      // Cleanup after confirmed deactivation.
      // Use scope: 'local' because the edge function has already signed
      // the user out server-side. A global signOut would hit the server
      // and could fail with a session-not-found error.
      queryClient.clear();
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // Best-effort: local storage may already be cleared.
      }
    },
  });
}

/**
 * @deprecated Use `useDeactivateAccount()` instead.
 * Kept as alias for backward compatibility.
 */
export const useDeleteAccount = useDeactivateAccount;
