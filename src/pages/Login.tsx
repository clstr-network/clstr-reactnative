import { useEffect } from "react";
import loginIllustration from "@/assets/login-illustration.svg";
import { ShinyButton } from "@/components/shiny-button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams, useLocation } from "react-router-dom";
import { validateRedirectUrl } from "@/lib/analytics";

const Login = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  // Get return URL from query params (used when redirecting from public post view)
  const returnUrl = searchParams.get('returnUrl');

  // FIX F8: Show toast when redirected after email transition
  const reason = searchParams.get('reason');

  // Merge feedback: shown when redirected from AuthCallback after successful merge
  const mergeInfo = (location.state as { info?: string } | null)?.info;

  // FIX F8: Show transition toast on redirect from email transition
  useEffect(() => {
    if (reason === 'email_transitioned') {
      toast({
        title: "Email transitioned successfully",
        description: "Please sign in with your new personal email to continue.",
      });
    }
  }, [reason, toast]);

  const handleGoogleLogin = async () => {
    try {
      // Store returnUrl in sessionStorage so we can redirect after auth
      if (returnUrl) {
        const validatedUrl = validateRedirectUrl(returnUrl);
        sessionStorage.setItem('authReturnUrl', validatedUrl);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        toast({
          title: "Authentication Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: "Failed to initiate Google login",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(210,40%,96.1%)] px-8 py-8 lg:px-12 light">
      {/* Mobile Layout - Illustration background with floating glass card */}
      <div className="lg:hidden fixed inset-0 flex flex-col">
        {/* Illustration Background */}
        <div className="flex-1 bg-white flex items-center justify-center p-8">
          <img
            src={loginIllustration}
            alt="Login illustration"
            className="max-w-full max-h-full object-contain"
          />
        </div>
        
        {/* Floating Glass Card */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-8">
          <div className="bg-white/75 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.15)]">
            {/* Logo */}
            <h1 className="text-xl font-bold text-[hsl(222.2,84%,4.9%)] mb-6">Clstr</h1>

            {/* Merge info banner */}
            {mergeInfo && (
              <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                <p className="text-sm text-emerald-800">{mergeInfo}</p>
              </div>
            )}
            
            {/* Welcome Text */}
            <div className="space-y-2 mb-6">
              <h2 className="text-3xl font-bold text-[hsl(222.2,84%,4.9%)] leading-tight">
                Welcome to clstr
              </h2>
              <p className="text-[hsl(215.4,16.3%,46.9%)] text-sm">
                Your college's private network
              </p>
            </div>

            {/* New User Signal */}
            <p className="text-xs text-[hsl(215.4,16.3%,46.9%)] mb-4">
              New here? Your college email creates your account automatically.
            </p>

            {/* Google Login Button */}
            <ShinyButton onClick={handleGoogleLogin} className="w-full !text-base !py-3">
              <div className="flex items-center justify-center gap-2">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span className="font-medium text-sm">Continue with Google</span>
              </div>
            </ShinyButton>

            {/* Helper text */}
            <p className="text-xs text-[hsl(215.4,16.3%,46.9%)]/70 text-center mt-3">
              Only verified college email accounts are allowed
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Original two-column design */}
      <div className="hidden lg:block w-full max-w-[1240px] bg-[hsl(222.2,84%,4.9%)] rounded-3xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.15)] overflow-hidden">
        <div className="flex min-h-[600px]">
          {/* Left Side - Login Form (Dark) */}
          <div className="flex w-1/2 flex-col justify-between p-12">
            {/* Logo */}
            <div>
              <h1 className="text-2xl font-bold text-white">Clstr</h1>
            </div>

            {/* Login Content */}
            <div className="flex flex-col items-start justify-center flex-1 py-8">
              <div className="w-full space-y-6">
                {/* Merge info banner */}
                {mergeInfo && (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                    <p className="text-sm text-emerald-300">{mergeInfo}</p>
                  </div>
                )}

                {/* Welcome Text */}
                <div className="space-y-3">
                  <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                    Welcome to<br />clstr
                  </h2>
                  <p className="text-[hsl(215.4,16.3%,46.9%)] text-base">
                    Your college's private network
                  </p>
                </div>

                {/* New User Signal */}
                <p className="text-sm text-[hsl(215.4,16.3%,46.9%)]">
                  New here? Your college email creates your account automatically.
                </p>

                {/* Google Login Button */}
                <ShinyButton onClick={handleGoogleLogin} className="!text-base !py-3 !px-6">
                  <div className="flex items-center justify-center gap-2">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span className="font-medium text-sm">Continue with Google</span>
                  </div>
                </ShinyButton>

                {/* Helper text */}
                <p className="text-xs text-[hsl(215.4,16.3%,46.9%)]/70">
                  Only verified college email accounts are allowed
                </p>
              </div>
            </div>

            {/* Footer Links */}
            <div>
              <p className="text-xs text-[hsl(215.4,16.3%,46.9%)]">
                <a href="#" className="hover:text-white transition-colors">
                  Privacy Policy
                </a>
                <span className="mx-2">|</span>
                <a href="#" className="hover:text-white transition-colors">
                  Terms
                </a>
                <span className="mx-2">|</span>
                <a href="#" className="hover:text-white transition-colors">
                  Why college email?
                </a>
              </p>
            </div>
          </div>

          {/* Right Side - Illustration */}
          <div className="flex w-1/2 items-center justify-center p-8 rounded-3xl m-2 bg-white">
            <img
              src={loginIllustration}
              alt="Login illustration"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
