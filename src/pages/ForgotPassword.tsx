import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    if (!email) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Enter a valid email address";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const emailValidation = validateEmail(email);
    if (emailValidation) {
      setError(emailValidation);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "Reset link sent",
        description: "Check your email for the password reset link.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send reset email";
      setError(message);
      toast({
        title: "Failed to send reset email",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000000] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <Card className="bg-white/[0.04] border border-white/10 rounded-xl shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.06] mb-4">
                <CheckCircle2 className="h-8 w-8 text-white/60" />
              </div>
              <CardTitle className="text-2xl text-white">Check your email</CardTitle>
              <CardDescription className="text-base text-white/60">
                We sent a password reset link to
              </CardDescription>
              <p className="text-sm font-semibold text-white mt-2">{email}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Click the link in your email to reset your password. The link expires in 1 hour.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button asChild className="w-full bg-white/10 border border-white/15 text-white">
                  <Link to="/login">Back to Login</Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEmailSent(false);
                    setEmail("");
                  }}
                  className="w-full"
                >
                  Try different email
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#000000] p-4">
      <div className="absolute top-4 left-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/login">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="text-xl font-bold text-white">clstr</span>
          </Link>
        </div>

        <Card className="bg-white/[0.04] border border-white/10 rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-white">Reset your password</CardTitle>
            <CardDescription className="text-white/60">
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-white">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    placeholder="you@example.com"
                    required
                  />
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
                    Sending reset link...
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>

              <div className="text-center">
                <Link to="/login" className="text-sm text-white/60 hover:text-white hover:underline">
                  Back to login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
