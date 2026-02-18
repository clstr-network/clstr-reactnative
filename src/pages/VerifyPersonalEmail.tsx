/**
 * VerifyPersonalEmail — Magic link landing page.
 *
 * When the user clicks the verification link in the email, they land here.
 * The page reads the code from the URL query param and auto-submits it
 * via the same `verify_personal_email_code` RPC used by the manual OTP flow.
 *
 * URL format: /verify-personal-email#code=123456
 * (Fragment hash is used instead of query param to avoid server/referrer logging)
 *
 * This page requires the user to be logged in (the RPC checks auth.uid()).
 * If not logged in, it redirects to /login with a return URL.
 */

import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { verifyPersonalEmail } from "@/lib/email-transition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";

export default function VerifyPersonalEmail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // FIX F13: Read code from URL fragment (#code=) instead of query param.
  // Fragments are never sent to servers, so the OTP stays client-side only.
  // Fallback to query param for backwards compatibility with old emails.
  const code = useMemo(() => {
    const hash = window.location.hash;
    const hashMatch = hash.match(/[#&]code=([^&]*)/);
    if (hashMatch) return decodeURIComponent(hashMatch[1]);
    // Backwards compat: check query param for old emails
    const params = new URLSearchParams(window.location.search);
    return params.get("code");
  }, []);

  const [status, setStatus] = useState<"loading" | "success" | "error" | "no-code" | "no-auth">("loading");
  const [message, setMessage] = useState("");
  const hasVerified = useRef(false);

  useEffect(() => {
    if (hasVerified.current) return;

    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      setStatus("no-code");
      setMessage("Invalid or missing verification code in the link.");
      return;
    }

    const verify = async () => {
      hasVerified.current = true;

      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus("no-auth");
        setMessage("Please log in first, then click the link again.");
        return;
      }

      // Auto-verify using the same RPC as manual OTP
      const result = await verifyPersonalEmail(code);

      if (result.success) {
        setStatus("success");
        setMessage("Your personal email has been verified! Your lifetime access is secured.");
        // Invalidate caches so the UI reflects the change
        await queryClient.invalidateQueries({ queryKey: ["email-transition-status"] });
      } else {
        setStatus("error");
        setMessage(result.error || "Verification failed. The code may be expired or already used.");
      }
    };

    verify();
  }, [code, queryClient]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#000000] p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">Eligible badges</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            <Badge className="text-[10px] px-2 py-0.5 text-white/70 border-transparent bg-white/[0.04]">Student</Badge>
            <Badge className="text-[10px] px-2 py-0.5 text-white/70 border-transparent bg-white/[0.04]">Club Member</Badge>
            <Badge className="text-[10px] px-2 py-0.5 text-white/70 border-transparent bg-white/[0.04]">Faculty</Badge>
            <Badge className="text-[10px] px-2 py-0.5 text-white/70 border-transparent bg-white/[0.04]">Principal</Badge>
            <Badge className="text-[10px] px-2 py-0.5 text-white/70 border-transparent bg-white/[0.04]">Dean</Badge>
          </div>
        </div>
        {/* Loading */}
        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-white/60 mx-auto" />
            <p className="text-white/60 text-sm">Verifying your personal email...</p>
          </div>
        )}

        {/* Success */}
        {status === "success" && (
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Email Verified!</h2>
            <p className="text-white/50 text-sm">{message}</p>
            <Button
              onClick={() => navigate("/settings", { replace: true })}
              className="bg-white/[0.08] text-white border border-white/10 hover:bg-white/[0.12]"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Go to Settings
            </Button>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-white/[0.06] flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-white/40" />
            </div>
            <h2 className="text-xl font-semibold text-white">Verification Failed</h2>
            <p className="text-white/50 text-sm">{message}</p>
            <p className="text-white/30 text-xs">You can still enter the code manually in Settings.</p>
            <Button
              onClick={() => navigate("/settings", { replace: true })}
              variant="outline"
              className="border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
            >
              Go to Settings
            </Button>
          </div>
        )}

        {/* No code in URL */}
        {status === "no-code" && (
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-white/[0.06] flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-white/40" />
            </div>
            <h2 className="text-xl font-semibold text-white">Invalid Link</h2>
            <p className="text-white/50 text-sm">{message}</p>
            <Button
              onClick={() => navigate("/home", { replace: true })}
              variant="outline"
              className="border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
            >
              Go Home
            </Button>
          </div>
        )}

        {/* Not logged in */}
        {status === "no-auth" && (
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-white/[0.06] flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-white/40" />
            </div>
            <h2 className="text-xl font-semibold text-white">Login Required</h2>
            <p className="text-white/50 text-sm">{message}</p>
            <Button
              onClick={() => {
                // Store the current URL so they come back here after login
                sessionStorage.setItem("authReturnUrl", `/verify-personal-email#code=${code}`);
                navigate("/login", { replace: true });
              }}
              className="bg-white/[0.08] text-white border border-white/10 hover:bg-white/[0.12]"
            >
              Log In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
