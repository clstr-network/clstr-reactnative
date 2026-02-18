import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EyeIcon, EyeOffIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const UpdatePassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isValidSession, setIsValidSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user has a valid session from the password reset link.
    // Supabase may deliver the recovery token in two ways:
    //   1. Via URL hash fragment (implicit flow) — getSession() picks it up
    //   2. Via PASSWORD_RECOVERY auth event — onAuthStateChange fires
    const checkSession = async () => {
      setSessionError(null);

      // First try to exchange any hash tokens (Supabase auto-processes #access_token etc.)
      const { data, error: sessionCheckError } = await supabase.auth.getSession();

      if (sessionCheckError) {
        setSessionError("You're offline or we couldn't verify your reset link yet.");
        return;
      }

      if (data.session) {
        setIsValidSession(true);
        return;
      }

      // No session yet — wait briefly for PASSWORD_RECOVERY event
      // (the redirect may still be processing the hash tokens)
      // If no session after 3 seconds, redirect to forgot-password.
    };

    checkSession();

    // Listen for Supabase PASSWORD_RECOVERY event — fired when the user
    // clicks the password reset link and Supabase processes the recovery token.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY' && session) {
          setIsValidSession(true);
        } else if (event === 'SIGNED_IN' && session) {
          // Also accept SIGNED_IN (some Supabase versions fire this for recovery)
          setIsValidSession(true);
        }
      }
    );

    // Timeout: if no session is established within 5 seconds, redirect
    const timeout = setTimeout(() => {
      if (!isValidSession) {
        toast({
          title: "Invalid or expired link",
          description: "Please request a new password reset link.",
          variant: "destructive",
        });
        navigate("/forgot-password");
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate, toast, isValidSession]);

  const validatePassword = (value: string) => {
    if (!value) return "Password is required";
    if (value.length < 6) return "Password must be at least 6 characters long";
    if (/\s/.test(value)) return "Password cannot contain spaces";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const passwordValidation = validatePassword(password);
    if (passwordValidation) {
      setError(passwordValidation);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast({
        title: "Password updated",
        description: "Your password has been successfully changed. Please sign in again.",
      });

      // Sign out to clear the recovery session, then redirect to login.
      // This ensures the user gets a fresh session with the new password.
      await supabase.auth.signOut();
      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update password";
      setError(message);
      toast({
        title: "Failed to update password",
        description: message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000000] p-4">
        {sessionError ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500" />
            <p className="text-sm text-white/60">{sessionError}</p>
            <Button onClick={() => window.location.reload()} className="mt-2">
              Retry
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-white/60" />
            <p className="text-sm text-white/60">Verifying reset link...</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#000000] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <span className="text-xl font-bold text-white">clstr</span>
          </div>
        </div>

        <Card className="bg-white/[0.04] border border-white/10 rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-white">Set new password</CardTitle>
            <CardDescription className="text-white/60">
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-white">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10"
                    placeholder="Enter new password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-4 w-4 text-white/40" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-white/40" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-white/40">
                  Must be at least 6 characters long
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-white">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 pr-10"
                    placeholder="Confirm new password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOffIcon className="h-4 w-4 text-white/40" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-white/40" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-white/10 border border-white/15 text-white h-11"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Update password
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default UpdatePassword;
