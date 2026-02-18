/**
 * EmailTransitionSettings — Full email management UI for the Settings page.
 *
 * Shows:
 * - Current college email (read-only)
 * - Personal email status + link/verify/transition actions
 * - Transition status badge
 * - Resend verification code with cooldown timer (Case 9, 10, 11)
 * - Brute-force lockout feedback (Case 12)
 * - Expired code feedback (Case 7)
 * - Email delivery status (Case 19, 21)
 *
 * All data from Supabase via useEmailTransition hook.
 * No local state pretending to be persisted.
 */

import { useState, useEffect } from "react";
import { Mail, Shield, Loader2, CheckCircle, AlertCircle, Trash2, ArrowRight, RefreshCw, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useEmailTransition } from "@/hooks/useEmailTransition";
import { getTransitionDisplayStatus } from "@/lib/email-transition";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/** Only Students and Alumni can access email transition settings. */
const ALLOWED_ROLES = ["Student", "Alumni"];

export function EmailTransitionSettings() {
  const { profile } = useProfile();
  const {
    status,
    personalEmail,
    personalEmailVerified,
    collegeEmail,
    isNearGraduation,
    isLinking,
    isVerifying,
    isResending,
    isTransitioning,
    isRemoving,
    isLoading,
    isRetryingAuthEmail,
    linkPersonalEmail,
    verifyPersonalEmail,
    resendVerificationCode,
    transitionEmail,
    removePersonalEmail,
    retryAuthEmailChange,
    lastVerifyError,
    emailSent,
    cooldownRemaining,
    isOnCooldown,
    clearVerifyError,
  } = useEmailTransition();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  // FIX F12: Track auth email to verify badge accuracy
  const [authEmail, setAuthEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthEmail(session?.user?.email?.toLowerCase() ?? null);
    });
  }, []);

  const displayStatus = getTransitionDisplayStatus(status);

  // FIX F12: Badge shows "Primary login" only when auth email actually matches
  const isAuthEmailSynced = authEmail != null
    && personalEmail != null
    && authEmail === personalEmail.toLowerCase();

  // Role guard: only Students and Alumni should see email transition.
  if (!profile?.role || !ALLOWED_ROLES.includes(profile.role)) {
    return null;
  }

  const handleLinkEmail = async () => {
    setLocalError(null);
    clearVerifyError();

    // Case 6: Empty submission — no RPC call
    if (!email.trim()) {
      setLocalError("Please enter your personal email");
      return;
    }

    if (email.toLowerCase().trim() === collegeEmail?.toLowerCase()) {
      setLocalError("Personal email must differ from your college email");
      return;
    }

    const result = await linkPersonalEmail(email.trim());

    if (result.success) {
      setShowOtpInput(true);
      if (result.email_sent) {
        toast({
          title: "Verification email sent",
          description: `Check ${email.trim()} for a verification link or 6-digit code.`,
        });
      } else {
        // Case 19: Email sent but delivery may be delayed
        toast({
          title: "Verification requested",
          description: `Email delivery may be delayed. Please check your spam folder or try again shortly.`,
        });
      }
    } else {
      setLocalError(result.error || "Failed to link email");
    }
  };

  const handleVerify = async () => {
    setLocalError(null);
    clearVerifyError();

    // Case 5: Partial code — no RPC call
    if (!otp.trim() || otp.length < 6) {
      setLocalError("Enter the complete 6-digit code");
      return;
    }

    const result = await verifyPersonalEmail(otp.trim());

    if (result.success) {
      setShowOtpInput(false);
      setOtp("");
      toast({
        title: "Email verified",
        description: "Your personal email has been verified successfully.",
      });
    } else {
      // Error is also tracked in lastVerifyError via the hook
      setLocalError(result.error || "Verification failed");
    }
  };

  const handleResend = async () => {
    setLocalError(null);
    clearVerifyError();
    const targetEmail = personalEmail || email;
    if (!targetEmail) return;

    const result = await resendVerificationCode(targetEmail);
    if (result.success) {
      setOtp("");
      if (result.email_sent) {
        toast({
          title: "New code sent",
          description: `A new verification code has been sent to ${targetEmail}.`,
        });
      } else {
        toast({
          title: "Code resent",
          description: "Email delivery may be delayed. Please check your spam folder or try again shortly.",
        });
      }
    } else {
      setLocalError(result.error || "Failed to resend code");
    }
  };

  const handleTransition = async () => {
    const result = await transitionEmail();

    if (result.success) {
      // Show the confirmation message if auth email change is pending
      const description = result.message
        ? result.message
        : result.error
        ? result.error
        : `Your primary login is now ${result.new_primary_email}`;

      toast({
        title: "Email transitioned",
        description,
      });
    } else {
      toast({
        title: "Transition failed",
        description: result.error || "Could not transition email",
        variant: "destructive",
      });
    }
  };

  const handleRemove = async () => {
    const result = await removePersonalEmail();

    if (result.success) {
      setEmail("");
      setOtp("");
      setShowOtpInput(false);
      setLocalError(null);
      toast({
        title: "Personal email removed",
        description: "You can link a new personal email anytime.",
      });
    } else {
      toast({
        title: "Remove failed",
        description: result.error || "Could not remove personal email",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-white/40 text-sm py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading email settings...
      </div>
    );
  }

  // Determine the error to show (prefer lastVerifyError for richer detail)
  const displayError = lastVerifyError?.error || localError;
  const isLockout = lastVerifyError?.locked;
  const isExpired = lastVerifyError?.expired;
  const attemptsRemaining = lastVerifyError?.attemptsRemaining;

  return (
    <div className="space-y-6">
      {/* College Email (Identity) */}
      <div className="space-y-2">
        <Label className="text-white/80">College Email (Identity)</Label>
        <p className="text-sm text-white/60">{collegeEmail || "No college email"}</p>
        <p className="text-xs text-white/35">
          This verifies your college identity. It cannot be changed.
        </p>
      </div>

      <Separator className="bg-white/10" />

      {/* Personal Email (Lifetime Access) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-white/80">Personal Email (Lifetime Access)</Label>
            <p className="text-xs text-white/35 mt-0.5">
              Ensures you keep access after your college email expires
            </p>
          </div>
          <Badge
            variant="outline"
            className={`text-xs ${
              displayStatus.variant === "success"
                ? "border-white/15 text-white/60"
                : displayStatus.variant === "warning"
                ? "border-white/10 text-white/50"
                : displayStatus.variant === "info"
                ? "border-white/10 text-white/50"
                : "border-white/10 text-white/40"
            }`}
          >
            {displayStatus.label}
          </Badge>
        </div>

        {/* Graduation proximity notice */}
        {isNearGraduation && status === "none" && (
          <Alert className="bg-white/[0.04] border-white/10">
            <Shield className="h-4 w-4 text-white/40" />
            <AlertDescription className="text-white/60 text-xs">
              You're nearing graduation. Add a personal email now to ensure uninterrupted access.
            </AlertDescription>
          </Alert>
        )}

        {/* Error display — with context-specific icons and messages */}
        {displayError && (
          <Alert className="bg-white/[0.06] border-white/10">
            {isLockout ? (
              <AlertTriangle className="h-4 w-4 text-white/50" />
            ) : isExpired ? (
              <Clock className="h-4 w-4 text-white/40" />
            ) : (
              <AlertCircle className="h-4 w-4 text-white/50" />
            )}
            <AlertDescription className="text-xs text-white/60">
              {displayError}
              {attemptsRemaining !== undefined && attemptsRemaining > 0 && (
                <span className="block mt-1 text-white/40">
                  {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* State: No personal email linked */}
        {status === "none" && !showOtpInput && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="settings-personal-email" className="text-xs text-white/60">
                Enter your personal email
              </Label>
              <Input
                id="settings-personal-email"
                type="email"
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLinking}
                className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus:border-white/20"
              />
            </div>
            <Button
              onClick={handleLinkEmail}
              disabled={isLinking || !email.trim()}
              variant="outline"
              size="sm"
              className="border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
            >
              {isLinking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending verification...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Link personal email
                </>
              )}
            </Button>
          </div>
        )}

        {/* State: Pending verification — show code input */}
        {(status === "pending" || showOtpInput) && !personalEmailVerified && (
          <div className="space-y-3">
            {/* Email delivery status (Case 19) */}
            {emailSent === true && (
              <Alert className="bg-white/[0.04] border-white/10">
                <Mail className="h-4 w-4 text-white/40" />
                <AlertDescription className="text-white/60 text-xs">
                  Verification email sent to{" "}
                  <span className="font-medium">{personalEmail || email}</span>.
                  Click the link or enter the code below. Check spam too.
                </AlertDescription>
              </Alert>
            )}
            {emailSent === false && (
              <Alert className="bg-white/[0.04] border-white/10">
                <AlertTriangle className="h-4 w-4 text-white/40" />
                <AlertDescription className="text-white/60 text-xs">
                  Email delivery may be delayed. You can resend or wait a moment.
                  <br />
                  <span className="text-white/40">The code expires in 10 minutes.</span>
                </AlertDescription>
              </Alert>
            )}

            <p className="text-xs text-white/50">
              Click the link in your email, or enter the 6-digit code for{" "}
              <span className="text-white/70 font-medium">{personalEmail || email}</span>
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="settings-otp" className="text-xs text-white/60">
                Verification code
              </Label>
              <Input
                id="settings-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                  if (localError) setLocalError(null);
                }}
                disabled={isVerifying || isLockout}
                maxLength={6}
                className="bg-white/[0.04] border-white/10 text-white text-center tracking-widest placeholder:text-white/25 focus:border-white/20"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleVerify}
                disabled={isVerifying || otp.length < 6 || isLockout}
                variant="outline"
                size="sm"
                className="border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Verify
                  </>
                )}
              </Button>

              {/* Resend button with cooldown (Case 9, 10, 11) */}
              <Button
                onClick={handleResend}
                disabled={isResending || isOnCooldown}
                variant="outline"
                size="sm"
                className="border border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/70"
              >
                {isResending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : isOnCooldown ? (
                  <Clock className="mr-2 h-3.5 w-3.5" />
                ) : (
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                )}
                {isOnCooldown ? `Wait ${cooldownRemaining}s` : "Resend"}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isRemoving}
                    className="border border-white/10 bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/60"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Cancel
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-black border-white/10 text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Remove personal email?</AlertDialogTitle>
                    <AlertDialogDescription className="text-white/60">
                      This will cancel the verification and invalidate any pending codes. You can link a new email later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]">
                      Keep it
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRemove}
                      className="bg-white/[0.10] text-white border border-white/15 hover:bg-white/[0.15]"
                    >
                      {isRemoving ? "Removing..." : "Remove"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {/* State: Verified — show personal email + option to transition */}
        {status === "verified" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-white/50" />
              <span className="text-sm text-white/70">{personalEmail}</span>
              <Badge variant="outline" className="text-xs border-white/10 text-white/50">
                Verified
              </Badge>
            </div>
            <p className="text-xs text-white/40">
              Your personal email is verified. When your college email expires, you can transition your login.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleTransition}
                disabled={isTransitioning}
                variant="outline"
                size="sm"
                className="border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
              >
                {isTransitioning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transitioning...
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Make primary login
                  </>
                )}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isRemoving}
                    className="border border-white/10 bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/60"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Remove
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-black border-white/10 text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Remove personal email?</AlertDialogTitle>
                    <AlertDialogDescription className="text-white/60">
                      This will remove your verified personal email. You'll need to verify again later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]">
                      Keep it
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRemove}
                      className="bg-white/[0.10] text-white border border-white/15 hover:bg-white/[0.15]"
                    >
                      {isRemoving ? "Removing..." : "Remove"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {/* State: Transitioned — show both emails */}
        {status === "transitioned" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className={`h-4 w-4 ${isAuthEmailSynced ? "text-blue-400" : "text-white/40"}`} />
              <span className="text-sm text-white/70">{personalEmail}</span>
              {isAuthEmailSynced ? (
                <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">
                  Primary login
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-400">
                  Pending sync
                </Badge>
              )}
            </div>
            <p className="text-xs text-white/40">
              Your login has been transitioned. College email remains as identity verification only.
            </p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-white/30 flex-1">
                If Google sign-in isn’t working with this email yet, click below to finalize the login email change.
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={isRetryingAuthEmail}
                onClick={async () => {
                  const result = await retryAuthEmailChange();
                  if (result.success) {
                    toast({
                      title: "Login email updated",
                      description: result.message || "You can now sign in with Google using your personal email.",
                    });
                  } else {
                    toast({
                      title: "Could not update",
                      description: result.error || "Please try again later.",
                      variant: "destructive",
                    });
                  }
                }}
                className="shrink-0 border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] text-xs"
              >
                {isRetryingAuthEmail ? (
                  <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Updating…</>
                ) : (
                  <><RefreshCw className="mr-1.5 h-3 w-3" />Finalize login email</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
