/**
 * Alumni Invite Claim Page â€” /alumni-invite?token=...
 *
 * Flow: validate token â†’ show college email (read-only) â†’ auth with personal email â†’ accept â†’ onboarding
 */

import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAlumniInviteClaim } from "@/hooks/useAlumniInviteClaim";
import { supabase } from "@/integrations/supabase/client";
import {
  GraduationCap, Mail, ShieldCheck, AlertTriangle, Loader2,
  CheckCircle2, ArrowRight, RefreshCw, Flag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from '@clstr/shared/query-keys';

type Step = "validating" | "confirm" | "auth" | "otp" | "accepting" | "done" | "error";

const AlumniInvite = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { isValidating, inviteData, error: tokenError, acceptInvite, disputeInvite } = useAlumniInviteClaim(token);

  const [step, setStep] = useState<Step>("validating");
  const [personalEmail, setPersonalEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [authMode, setAuthMode] = useState<"otp" | "password">("otp");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Dispute dialog
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [isDisputing, setIsDisputing] = useState(false);

  // Move to confirm step once token is validated
  useEffect(() => {
    if (inviteData?.valid) {
      setPersonalEmail(inviteData.personal_email ?? "");
      setStep("confirm");
    } else if (tokenError) {
      setStep("error");
    }
  }, [inviteData, tokenError]);

  // â”€â”€â”€ Auth flow: send OTP to personal email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSendOtp = async () => {
    if (!personalEmail) return;
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: personalEmail,
        options: {
          shouldCreateUser: true,
          data: {
            full_name: inviteData?.full_name ?? "",
            alumni_invite_token: token,
          },
        },
      });

      if (error) throw error;

      setStep("otp");
      toast.success("Check your personal email for the verification code");
    } catch (err: any) {
      setAuthError(err.message ?? "Failed to send verification code");
    } finally {
      setIsSubmitting(false);
    }
  };

  // â”€â”€â”€ Auth flow: verify OTP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleVerifyOtp = async () => {
    if (!otpCode) return;
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: personalEmail,
        token: otpCode,
        type: "email",
      });

      if (error) throw error;
      if (!data.user) throw new Error("Auth user not created");

      // Accept the invite (server uses auth.uid() â€” no user ID needed)
      setStep("accepting");
      const result = await acceptInvite();

      if (!result.success) {
        throw new Error(result.error ?? "Failed to accept invite");
      }

      // Server-side invite context is fetched via get_accepted_invite_context() RPC
      // in the Onboarding page. No sessionStorage needed â€” DB is the source of truth.

      // Invalidate identity context so IdentityProvider picks up the accepted invite
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.identity.context() });

      setStep("done");
      toast.success("Welcome! Let's complete your alumni profile.");

      // Redirect to onboarding after brief delay
      setTimeout(() => navigate("/onboarding"), 1500);
    } catch (err: any) {
      setAuthError(err.message ?? "Verification failed");
      if (step === "accepting") setStep("otp");
    } finally {
      setIsSubmitting(false);
    }
  };

  // â”€â”€â”€ Auth flow: password signup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handlePasswordSignup = async () => {
    if (!personalEmail || !password) return;
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: personalEmail,
        password,
        options: {
          data: {
            full_name: inviteData?.full_name ?? "",
            alumni_invite_token: token,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Auth user not created");

      // Accept the invite (server uses auth.uid() â€” no user ID needed)
      setStep("accepting");
      const result = await acceptInvite();

      if (!result.success) {
        throw new Error(result.error ?? "Failed to accept invite");
      }

      // Server-side invite context is fetched via get_accepted_invite_context() RPC
      // in the Onboarding page. No sessionStorage needed â€” DB is the source of truth.

      // Invalidate identity context so IdentityProvider picks up the accepted invite
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.identity.context() });

      setStep("done");
      toast.success("Welcome! Let's complete your alumni profile.");
      setTimeout(() => navigate("/onboarding"), 1500);
    } catch (err: any) {
      setAuthError(err.message ?? "Signup failed");
      if (step === "accepting") setStep("auth");
    } finally {
      setIsSubmitting(false);
    }
  };

  // â”€â”€â”€ Dispute handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDispute = async () => {
    setIsDisputing(true);
    const success = await disputeInvite(disputeReason);
    setIsDisputing(false);

    if (success) {
      setShowDispute(false);
      toast.success("Thanks for reporting. We'll review this invite.");
      setStep("error"); // show generic done state
    } else {
      toast.error("Failed to report dispute");
    }
  };

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <>
      <SEO
        title="Alumni Invite â€” clstr.network"
        description="Accept your alumni invite and join your college network on clstr.network"
      />

      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-white tracking-tight">clstr.network</h1>
            <p className="text-sm text-white/40 mt-1">Alumni Network</p>
          </div>

          {/* â”€â”€â”€ Validating â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {(step === "validating" || isValidating) && (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-white/40 animate-spin mb-4" />
                <p className="text-sm text-white/50">Validating your invite...</p>
              </CardContent>
            </Card>
          )}

          {/* â”€â”€â”€ Error â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {step === "error" && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="text-center">
                <AlertTriangle className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
                <CardTitle className="text-white">Invite Issue</CardTitle>
                <CardDescription className="text-white/50">
                  {tokenError ?? "This invite is no longer valid."}
                </CardDescription>
              </CardHeader>
              <CardFooter className="justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="border-white/10 text-white/70"
                >
                  Go to Login
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/contact")}
                  className="border-white/10 text-white/70"
                >
                  Contact Support
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* â”€â”€â”€ Confirm Identity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {step === "confirm" && inviteData && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-full bg-blue-500/10">
                    <GraduationCap className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-lg">Alumni Invite</CardTitle>
                    <CardDescription className="text-white/50">
                      Confirm your alumni identity
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* College email (locked) */}
                <div className="space-y-2">
                  <Label className="text-white/60 text-xs">Your College Email (Identity)</Label>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-md px-3 py-2.5">
                    <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-white text-sm font-mono">{inviteData.college_email}</span>
                  </div>
                  <p className="text-xs text-white/30">
                    This verifies your alumni identity. It cannot be changed.
                  </p>
                </div>

                {/* Pre-filled info */}
                {(inviteData.full_name || inviteData.grad_year || inviteData.major) && (
                  <div className="bg-white/5 rounded-lg p-3 space-y-1">
                    {inviteData.full_name && (
                      <p className="text-sm text-white">{inviteData.full_name}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-white/50">
                      {inviteData.grad_year && <span>Class of {inviteData.grad_year}</span>}
                      {inviteData.degree && <span>{inviteData.degree}</span>}
                      {inviteData.major && <span>{inviteData.major}</span>}
                    </div>
                  </div>
                )}

                <Separator className="bg-white/10" />

                {/* Personal email */}
                <div className="space-y-2">
                  <Label className="text-white/60 text-xs">Your Personal Email (Login)</Label>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-md px-3 py-2.5">
                    <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-white text-sm font-mono">{inviteData.personal_email}</span>
                  </div>
                  <p className="text-xs text-white/30">
                    You'll log in with this email. A verification code will be sent here.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex-col gap-3">
                <Button
                  onClick={() => setStep("auth")}
                  className="w-full bg-white text-black hover:bg-white/90"
                >
                  Yes, that's me â€” Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <Dialog open={showDispute} onOpenChange={setShowDispute}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="text-white/30 hover:text-white/60 text-xs"
                    >
                      <Flag className="w-3 h-3 mr-1" />
                      This isn't me
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#111] border-white/10 text-white">
                    <DialogHeader>
                      <DialogTitle>Report Mismatch</DialogTitle>
                      <DialogDescription className="text-white/50">
                        If this invite wasn't meant for you, let us know.
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea
                      placeholder="Optional: tell us more..."
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowDispute(false)}
                        className="border-white/10 text-white/70"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleDispute}
                        disabled={isDisputing}
                        className="bg-orange-500 text-white hover:bg-orange-600"
                      >
                        {isDisputing ? "Reporting..." : "Report"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          )}

          {/* â”€â”€â”€ Auth Step (OTP or Password) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {step === "auth" && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Create Your Account</CardTitle>
                <CardDescription className="text-white/50">
                  Sign up with your personal email to join the network
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/60 text-xs">Personal Email</Label>
                  <Input
                    type="email"
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                    disabled
                  />
                </div>

                {authMode === "password" && (
                  <div className="space-y-2">
                    <Label className="text-white/60 text-xs">Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password (min 6 chars)"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                )}

                {authError && (
                  <Alert className="bg-red-500/10 border-red-500/20">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <AlertDescription className="text-red-300 text-xs">
                      {authError}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>

              <CardFooter className="flex-col gap-3">
                {authMode === "otp" ? (
                  <Button
                    onClick={handleSendOtp}
                    disabled={isSubmitting || !personalEmail}
                    className="w-full bg-white text-black hover:bg-white/90"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    Send Verification Code
                  </Button>
                ) : (
                  <Button
                    onClick={handlePasswordSignup}
                    disabled={isSubmitting || !personalEmail || password.length < 6}
                    className="w-full bg-white text-black hover:bg-white/90"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4 mr-2" />
                    )}
                    Create Account
                  </Button>
                )}

                <button
                  onClick={() => setAuthMode(authMode === "otp" ? "password" : "otp")}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  {authMode === "otp" ? "Use password instead" : "Use magic code instead"}
                </button>
              </CardFooter>
            </Card>
          )}

          {/* â”€â”€â”€ OTP Verification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {step === "otp" && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Enter Verification Code</CardTitle>
                <CardDescription className="text-white/50">
                  We sent a code to <span className="text-white font-mono">{personalEmail}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/60 text-xs">6-digit code</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="bg-white/5 border-white/10 text-white text-center text-2xl tracking-[0.5em] font-mono placeholder:text-white/20"
                    autoFocus
                  />
                </div>

                {authError && (
                  <Alert className="bg-red-500/10 border-red-500/20">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <AlertDescription className="text-red-300 text-xs">
                      {authError}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>

              <CardFooter className="flex-col gap-3">
                <Button
                  onClick={handleVerifyOtp}
                  disabled={isSubmitting || otpCode.length !== 6}
                  className="w-full bg-white text-black hover:bg-white/90"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Verify & Continue
                </Button>

                <button
                  onClick={handleSendOtp}
                  disabled={isSubmitting}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Resend code
                </button>
              </CardFooter>
            </Card>
          )}

          {/* â”€â”€â”€ Accepting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {step === "accepting" && (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-white/40 animate-spin mb-4" />
                <p className="text-sm text-white/50">Setting up your alumni account...</p>
              </CardContent>
            </Card>
          )}

          {/* â”€â”€â”€ Done â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {step === "done" && (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <CheckCircle2 className="w-12 h-12 text-green-400 mb-4" />
                <p className="text-lg font-semibold text-white">You're in!</p>
                <p className="text-sm text-white/50 mt-1">Redirecting to onboarding...</p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </>
  );
};

export default AlumniInvite;
