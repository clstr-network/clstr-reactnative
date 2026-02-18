import { useState } from "react";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { reactivateOwnAccount } from "@/lib/account";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";

/**
 * Full-screen modal shown when the user's account is deactivated.
 * Offers two choices:
 *   1. "Yes, restore my account" → calls reactivate_own_account() RPC
 *   2. "No, continue deletion"  → signs out
 *
 * When isDeactivated is true, the rest of the app is NOT mounted.
 * This is the ONLY component rendered for deactivated users (defense in depth).
 */
export function ReactivationPrompt() {
  const { profile, refreshProfile } = useProfile();
  const [isReactivating, setIsReactivating] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const deletionDate = profile?.scheduled_deletion_at
    ? format(new Date(profile.scheduled_deletion_at), "MMMM d, yyyy")
    : "soon";

  const handleReactivate = async () => {
    setIsReactivating(true);
    try {
      await reactivateOwnAccount();
      toast({
        title: "Account restored",
        description: "Your account has been reactivated. Welcome back!",
      });
      // Refresh the profile to update account_status in context
      await refreshProfile();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reactivate account";
      toast({
        title: "Reactivation failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsReactivating(false);
    }
  };

  const handleContinueDeletion = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Best-effort
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
      <Card className="w-full max-w-md border-white/10 bg-black text-white">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
            <AlertTriangle className="h-8 w-8 text-amber-400" />
          </div>
          <CardTitle className="text-xl text-white">
            Your account is deactivated
          </CardTitle>
          <CardDescription className="text-white/60">
            Your account is scheduled for permanent deletion on{" "}
            <span className="font-medium text-white/80">{deletionDate}</span>.
            All your data will be permanently removed after that date.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleReactivate}
            disabled={isReactivating || isSigningOut}
            className="w-full bg-white text-black hover:bg-white/90"
          >
            {isReactivating ? "Restoring…" : "Yes, restore my account"}
          </Button>
          <Button
            variant="outline"
            onClick={handleContinueDeletion}
            disabled={isReactivating || isSigningOut}
            className="w-full border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
          >
            {isSigningOut ? "Signing out…" : "No, continue deletion"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
