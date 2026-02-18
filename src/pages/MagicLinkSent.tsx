import { useLocation, Link, useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const MagicLinkSent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const email = location.state?.email || "";
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "No email address found. Please go back and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-magic-link", {
        body: {
          email: email.trim().toLowerCase(),
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      if (data && !data.success) {
        throw new Error(data.error || "Failed to resend magic link");
      }

      toast({
        title: "Magic link resent",
        description: "Check your inbox for the new magic link.",
      });
    } catch (error) {
      console.error("Resend error:", error);
      const message = error instanceof Error ? error.message : "Failed to resend magic link";
      
      toast({
        title: "Failed to resend",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000000] p-4">
        <Card className="w-full max-w-md bg-white/[0.04] border border-white/10 rounded-xl shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-white">No email provided</CardTitle>
            <CardDescription className="text-white/60">Please go back and enter your email address.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/login">Back to Login</Link>
            </Button>
          </CardContent>
        </Card>
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="bg-white/[0.04] border border-white/10 rounded-xl shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.06] mb-4">
              <Mail className="h-8 w-8 text-white/60" />
            </div>
            <CardTitle className="text-2xl text-white">Check your email</CardTitle>
            <CardDescription className="text-base text-white/60">
              We sent a magic link to
            </CardDescription>
            <p className="text-sm font-semibold text-white mt-2">{email}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Click the link in your email to sign in. This link will keep you signed in on this device and expires in 1 hour.
              </AlertDescription>
            </Alert>

            <div className="bg-white/[0.06] border border-white/10 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-white">Didn't receive the email?</p>
              <ul className="text-xs text-white/60 space-y-1 list-disc list-inside">
                <li>Check your spam or junk folder</li>
                <li>Make sure you entered the correct email address</li>
                <li>Wait a few minutes for the email to arrive</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleResend}
                variant="outline"
                className="w-full"
                disabled={isResending}
              >
                {isResending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Resending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend magic link
                  </>
                )}
              </Button>

              <Button asChild variant="ghost" className="w-full">
                <Link to="/login">Back to Login</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default MagicLinkSent;
