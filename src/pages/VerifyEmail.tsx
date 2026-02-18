import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { MailCheck, ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "your email";
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const handleResendEmail = async () => {
    if (email === "your email") {
      toast({
        title: "Email not found",
        description: "Please go back to signup and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      toast({
        title: "Email sent!",
        description: "Check your inbox for the verification link.",
      });
    } catch (error) {
      console.error('Resend error:', error);
      toast({
        title: "Failed to resend",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#000000] p-4">
      <div className="absolute top-4 left-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/signup">
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
          <CardHeader className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.06] mb-4">
              <MailCheck className="h-8 w-8 text-white/60" />
            </div>
            <CardTitle className="text-2xl text-white">Check your email</CardTitle>
            <CardDescription className="text-base text-white/60">
              We sent a verification link to
            </CardDescription>
            <p className="text-sm font-semibold text-white mt-2">{email}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 text-sm text-white/60">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] text-white/60 font-semibold text-xs flex-shrink-0 mt-0.5">
                  1
                </div>
                <p>Click the verification link in the email we just sent you</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] text-white/60 font-semibold text-xs flex-shrink-0 mt-0.5">
                  2
                </div>
                <p>You'll be redirected to the login page</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] text-white/60 font-semibold text-xs flex-shrink-0 mt-0.5">
                  3
                </div>
                <p>Log in and complete your profile setup</p>
              </div>
            </div>

            <div className="bg-white/[0.06] border border-white/10 rounded-lg p-4">
              <p className="text-sm text-white/60 mb-3">
                <strong>Can't find the email?</strong> Check your spam folder or request a new verification link.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendEmail}
                disabled={isResending}
                className="w-full border-white/15 hover:bg-white/10 text-white"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Resend Verification Email"
                )}
              </Button>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => navigate("/login")}
                className="w-full bg-white/10 border border-white/15 text-white"
              >
                Go to Login
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/signup")}
                className="w-full"
              >
                Back to Signup
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
