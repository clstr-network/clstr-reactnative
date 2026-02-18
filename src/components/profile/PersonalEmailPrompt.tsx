/**
 * PersonalEmailPrompt — Banner shown to students nearing graduation.
 *
 * Prompts the user to link a personal email for lifetime access.
 * All state is read from Supabase via useEmailTransition hook.
 * Dismissal is persisted in DB (re-appears after 30 days). (Case 22)
 *
 * Handles: cooldown timer (Case 9), email delivery status (Case 19),
 * brute-force lockout (Case 12), expired codes (Case 7).
 */

import { useState } from "react";
import { Mail, Shield, X, Loader2, CheckCircle, AlertCircle, RefreshCw, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEmailTransition } from "@/hooks/useEmailTransition";
import { toast } from "@/hooks/use-toast";

type PersonalEmailPromptProps = {
  forceShow?: boolean;
};

export function PersonalEmailPrompt({ forceShow = false }: PersonalEmailPromptProps) {
  const {
    showPrompt,
    status,
    personalEmail,
    personalEmailVerified,
    collegeEmail,
    isLinking,
    isVerifying,
    isResending,
    isDismissing,
    linkPersonalEmail,
    verifyPersonalEmail,
    resendVerificationCode,
    dismissPrompt,
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

  // Don't render if prompt shouldn't show (Case 22: dismissal respected)
  const shouldRender = forceShow || showPrompt || status === "pending" || showOtpInput;
  if (!shouldRender) return null;

  const handleDismiss = async () => {
    const result = await dismissPrompt();
    if (!result.success) {
      toast({
        title: "Could not dismiss",
        description: result.error || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleLinkEmail = async () => {
    setLocalError(null);
    clearVerifyError();

    // Case 6: Empty — no RPC call
    if (!email.trim()) {
      setLocalError("Please enter your personal email");
      return;
    }

    if (email.toLowerCase().trim() === collegeEmail?.toLowerCase()) {
      setLocalError("Personal email must be different from your college email");
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
        // Email delivery may be delayed
        toast({
          title: "Verification requested",
          description: `Email delivery may be delayed. Please check your spam folder or try again shortly.`,
        });
      }
    } else {
      setLocalError(result.error || "Failed to link email");
    }
  };

  const handleVerifyOtp = async () => {
    setLocalError(null);
    clearVerifyError();

    // Case 5: Partial code — no RPC call
    if (!otp.trim() || otp.trim().length < 6) {
      setLocalError("Please enter the 6-digit verification code");
      return;
    }

    const result = await verifyPersonalEmail(otp.trim());

    if (result.success) {
      toast({
        title: "Personal email verified!",
        description: "Your lifetime access is now secured.",
      });
      setShowOtpInput(false);
      setOtp("");
    } else {
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
          description: `Check ${targetEmail} for a new 6-digit code.`,
        });
      } else {
        toast({
          title: "New code generated",
          description: "Email delivery may be delayed.",
        });
      }
    } else {
      setLocalError(result.error || "Failed to resend code");
    }
  };

  // Determine error display
  const displayError = lastVerifyError?.error || localError;
  const isLockout = lastVerifyError?.locked;
  const isExpired = lastVerifyError?.expired;
  const attemptsRemaining = lastVerifyError?.attemptsRemaining;

  return (
    <div className="relative mx-4 mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 md:mx-0">
      {/* Dismiss button — persisted in DB (Case 22) */}
      <button
        onClick={handleDismiss}
        disabled={isDismissing}
        className="absolute right-3 top-3 text-white/30 hover:text-white/60 transition-colors"
        aria-label="Dismiss"
      >
        {isDismissing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
      </button>

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="rounded-lg bg-white/[0.06] p-2">
          <Shield className="h-5 w-5 text-white/70" />
        </div>
        <div className="flex-1 pr-6">
          <h3 className="text-sm font-semibold text-white">
            Secure your lifetime access
          </h3>
          <p className="text-xs text-white/50 mt-0.5">
            Your college email may expire after graduation. Add a personal email to keep access forever.
          </p>
        </div>
      </div>

      {/* College email reference */}
      {collegeEmail && (
        <div className="mb-3 flex items-center gap-2 text-xs text-white/40">
          <Mail className="h-3.5 w-3.5" />
          <span>College email: {collegeEmail}</span>
        </div>
      )}

      {/* Error display with context-specific styling */}
      {displayError && (
        <Alert className={`mb-3 bg-white/[0.06] border-white/10`}>
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

      {/* Step 1: Enter personal email */}
      {status === "none" && !showOtpInput && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="personal-email" className="text-xs text-white/60">
              Personal email (Gmail, Outlook, etc.)
            </Label>
            <Input
              id="personal-email"
              type="email"
              placeholder="you@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLinking}
              className="h-9 bg-white/[0.04] border-white/10 text-white text-sm placeholder:text-white/25 focus:border-white/20"
            />
          </div>
          <Button
            onClick={handleLinkEmail}
            disabled={isLinking || !email.trim()}
            size="sm"
            className="w-full bg-white/[0.08] text-white border border-white/10 hover:bg-white/[0.12]"
          >
            {isLinking ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Sending verification...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-3.5 w-3.5" />
                Link personal email
              </>
            )}
          </Button>
        </div>
      )}

      {/* Step 2: Verification code entry */}
      {(status === "pending" || showOtpInput) && !personalEmailVerified && (
        <div className="space-y-3">
          {/* Email delivery status */}
          {emailSent === true && (
            <Alert className="bg-white/[0.04] border-white/10">
              <Mail className="h-4 w-4 text-white/40" />
              <AlertDescription className="text-white/60 text-xs">
                Code sent to <span className="font-medium">{personalEmail || email}</span>. Check your inbox.
                <br />
                <span className="text-white/40">Expires in 10 minutes.</span>
              </AlertDescription>
            </Alert>
          )}
          {emailSent === false && (
            <Alert className="bg-white/[0.04] border-white/10">
              <AlertTriangle className="h-4 w-4 text-white/40" />
              <AlertDescription className="text-white/60 text-xs">
                Email delivery may be delayed. Try resending in a moment.
              </AlertDescription>
            </Alert>
          )}

          <p className="text-xs text-white/50">
            Click the link in your email, or enter the code for{" "}
            <span className="text-white/70 font-medium">{personalEmail || email}</span>
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="otp-code" className="text-xs text-white/60">
              Verification code
            </Label>
            <Input
              id="otp-code"
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
              className="h-9 bg-white/[0.04] border-white/10 text-white text-sm text-center tracking-widest placeholder:text-white/25 focus:border-white/20"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleVerifyOtp}
              disabled={isVerifying || otp.length < 6 || isLockout}
              size="sm"
              className="flex-1 bg-white/[0.08] text-white border border-white/10 hover:bg-white/[0.12]"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify code"
              )}
            </Button>
            {/* Resend with cooldown (Case 9, 10) */}
            <Button
              onClick={handleResend}
              disabled={isResending || isOnCooldown}
              variant="outline"
              size="sm"
              className="border border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/70"
            >
              {isResending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isOnCooldown ? (
                <>
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  {cooldownRemaining}s
                </>
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Success state */}
    </div>
  );
}
