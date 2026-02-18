/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle, Shield, Mail, EyeIcon, EyeOffIcon, Users, GraduationCap, Crown, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

// Access code from environment (required in production)
const CLUB_ACCESS_CODE = import.meta.env.VITE_CLUB_ACCESS_CODE as string | undefined;

const getConfiguredClubAccessCode = (): string | null => {
  if (CLUB_ACCESS_CODE && CLUB_ACCESS_CODE.trim()) return CLUB_ACCESS_CODE.trim();
  // No fallback in any environment — access code MUST be configured via env var
  return null;
};

// Session storage keys
const CLUB_ACCESS_VERIFIED_KEY = "club_access_verified";
const CLUB_ACCESS_VERIFIED_AT_KEY = "club_access_verified_at";
const STAFF_AUTH_ROLE_KEY = "staff_auth_role"; // "Club" | "Faculty"
const STAFF_AUTH_ROLE_SIG_KEY = "staff_auth_role_sig"; // integrity signature
const ACCESS_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

// Role type for staff/club auth
type StaffAuthRole = "Club" | "Faculty" | "Principal" | "Dean";

/**
 * Compute a lightweight integrity signature for the stored role.
 * This is NOT cryptographic security — it deters casual sessionStorage
 * tampering. Actual authorization is enforced server-side via RLS/RPCs.
 */
const computeRoleSig = (role: string, timestamp: string): string => {
  // Simple hash: combine role + timestamp + a fixed salt
  const raw = `clstr:${role}:${timestamp}:staff_auth_v1`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString(36);
};

/**
 * Check if club access is currently verified (within session)
 */
export const isClubAccessVerified = (): boolean => {
  const verified = sessionStorage.getItem(CLUB_ACCESS_VERIFIED_KEY);
  const verifiedAt = sessionStorage.getItem(CLUB_ACCESS_VERIFIED_AT_KEY);

  if (verified !== "true" || !verifiedAt) {
    return false;
  }

  // Check expiry
  const verifiedTime = parseInt(verifiedAt, 10);
  if (Date.now() - verifiedTime > ACCESS_EXPIRY_MS) {
    // Expired - clear session
    clearClubAccessVerified();
    return false;
  }

  return true;
};

/**
 * Get the selected staff auth role from session.
 * Validates integrity signature to detect casual tampering.
 *
 * SECURITY NOTE: This is a UX convenience only — it pre-fills the role
 * during onboarding. Actual role assignment in the profiles table is
 * enforced server-side. Modifying sessionStorage does NOT grant elevated
 * privileges because all permission checks go through RLS/RPCs.
 */
export const getStaffAuthRole = (): StaffAuthRole | null => {
  const role = sessionStorage.getItem(STAFF_AUTH_ROLE_KEY);
  if (role !== "Club" && role !== "Faculty" && role !== "Principal" && role !== "Dean") return null;

  // Validate integrity signature
  const timestamp = sessionStorage.getItem(CLUB_ACCESS_VERIFIED_AT_KEY);
  const storedSig = sessionStorage.getItem(STAFF_AUTH_ROLE_SIG_KEY);
  if (!timestamp || !storedSig || computeRoleSig(role, timestamp) !== storedSig) {
    // Signature mismatch — role may have been tampered with
    clearClubAccessVerified();
    return null;
  }

  return role;
};

/**
 * Set club access as verified in session storage
 */
const setClubAccessVerified = (role: StaffAuthRole): void => {
  const timestamp = Date.now().toString();
  sessionStorage.setItem(CLUB_ACCESS_VERIFIED_KEY, "true");
  sessionStorage.setItem(CLUB_ACCESS_VERIFIED_AT_KEY, timestamp);
  sessionStorage.setItem(STAFF_AUTH_ROLE_KEY, role);
  sessionStorage.setItem(STAFF_AUTH_ROLE_SIG_KEY, computeRoleSig(role, timestamp));
};

/**
 * Clear club access verification from session
 */
export const clearClubAccessVerified = (): void => {
  sessionStorage.removeItem(CLUB_ACCESS_VERIFIED_KEY);
  sessionStorage.removeItem(CLUB_ACCESS_VERIFIED_AT_KEY);
  sessionStorage.removeItem(STAFF_AUTH_ROLE_KEY);
  sessionStorage.removeItem(STAFF_AUTH_ROLE_SIG_KEY);
};

const ClubAuth = () => {
  const [accessCode, setAccessCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [step, setStep] = useState<"code" | "role" | "auth">("code"); // Three-step flow
  const [selectedRole, setSelectedRole] = useState<StaffAuthRole | null>(null);

  // Auth form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Get the redirect path based on selected role
  const getOnboardingPath = (): string => {
    // Club goes to club-specific onboarding, all staff roles go to regular onboarding
    return selectedRole === "Club" ? "/club-onboarding" : "/onboarding";
  };

  // Check if already verified on mount
  useEffect(() => {
    const checkExistingVerification = async () => {
      // If already verified in this session, check auth status
      if (isClubAccessVerified()) {
        const storedRole = getStaffAuthRole();
        if (storedRole) {
          setSelectedRole(storedRole);
        }

        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setError("You're offline or we couldn't verify your session yet.");
          setStep("auth");
          setIsCheckingAuth(false);
          return;
        }

        if (data.session?.user) {
          // Check if user already has a profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, onboarding_complete")
            .eq("id", data.session.user.id)
            .maybeSingle();

          if (profile?.onboarding_complete) {
            // Already onboarded, go to home
            navigate("/home");
            return;
          }

          // Has verified access and logged in, go to appropriate onboarding
          const targetPath = storedRole === "Club" ? "/club-onboarding" : "/onboarding";
          navigate(targetPath);
          return;
        }

        // Access verified but not logged in - show auth step
        setStep("auth");
      }

      setIsCheckingAuth(false);
    };

    checkExistingVerification();
  }, [navigate]);

  // Handle access code submission
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError("");

    // Validate access code
    if (!accessCode.trim()) {
      setError("Please enter the access code");
      return;
    }

    const configuredCode = getConfiguredClubAccessCode();
    if (!configuredCode) {
      setError("Staff access is not configured. Please contact your administrator.");
      return;
    }

    // Check access code against configured value
    if (accessCode.trim() !== configuredCode) {
      setError("Invalid access code. Please contact your administrator.");
      return;
    }

    // Move to role selection step
    toast({
      title: "Access Verified",
      description: "Now select your role to continue.",
    });
    setStep("role");
  };

  // Handle role selection
  const handleRoleSelect = async (role: StaffAuthRole) => {
    setSelectedRole(role);
    setClubAccessVerified(role);

    // Check if user is already logged in
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      setError("You're offline or we couldn't verify your session yet.");
      setStep("auth");
      return;
    }

    if (data.session?.user) {
      // Check if user already has a profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, onboarding_complete")
        .eq("id", data.session.user.id)
        .maybeSingle();

      if (profile?.onboarding_complete) {
        toast({
          title: "Already Registered",
          description: "Your profile is already set up!",
        });
        navigate("/home");
        return;
      }

      // User is logged in but not yet onboarded
      const targetPath = role === "Club" ? "/club-onboarding" : "/onboarding";
      toast({
        title: "Role Selected",
        description: `Complete your ${role.toLowerCase()} registration.`,
      });
      navigate(targetPath);
    } else {
      // Not logged in, show auth step
      toast({
        title: "Role Selected",
        description: "Now sign in or create an account.",
      });
      setStep("auth");
    }
  };

  // Handle Google OAuth
  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const redirectPath = getOnboardingPath();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${redirectPath}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        }
      });

      if (error) throw error;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign-in failed";
      setError(message);
      setIsSubmitting(false);
    }
  };

  // Handle email/password auth
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError("");

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setIsSubmitting(true);
    const redirectPath = getOnboardingPath();

    try {
      if (isSignUp) {
        // Sign up new user
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${redirectPath}`,
          }
        });

        if (signUpError) throw signUpError;

        if (data.user && !data.session) {
          // Email confirmation required
          toast({
            title: "Check your email",
            description: "We sent you a confirmation link. Please verify your email to continue.",
          });
        } else if (data.session) {
          // Auto-confirmed, go to onboarding
          navigate(redirectPath);
        }
      } else {
        // Sign in existing user
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (signInError) throw signInError;

        if (data.user) {
          // Check if user already has a profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, onboarding_complete")
            .eq("id", data.user.id)
            .maybeSingle();

          if (profile?.onboarding_complete) {
            toast({
              title: "Welcome back!",
              description: "Your profile is already registered.",
            });
            navigate("/home");
          } else {
            navigate(redirectPath);
          }
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Authentication failed";

      let errorMessage = errMsg;
      if (errMsg.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password.";
      } else if (errMsg.includes("User already registered")) {
        errorMessage = "This email is already registered. Try signing in instead.";
      } else if (errMsg.includes("Password should be")) {
        errorMessage = "Password must be at least 6 characters.";
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          <p className="text-white/60">Checking access...</p>
        </div>
      </div>
    );
  }

  // Get step info for display
  const getStepInfo = () => {
    switch (step) {
      case "code":
        return {
          title: "Staff & Club Access",
          subtitle: "Enter your access code to proceed",
          cardTitle: "Staff Authentication",
          cardDescription: "For faculty members and club leads only"
        };
      case "role":
        return {
          title: "Select Your Role",
          subtitle: "Choose how you want to register",
          cardTitle: "Role Selection",
          cardDescription: "Select the role that best describes you"
        };
      case "auth":
        return {
          title: `${selectedRole} Sign In`,
          subtitle: "Sign in or create an account",
          cardTitle: `${selectedRole} Registration`,
          cardDescription: `Sign in to complete your ${selectedRole?.toLowerCase()} registration`
        };
    }
  };

  const stepInfo = getStepInfo();

  return (
    <div className="min-h-screen bg-[#000000] p-4 py-12 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-white/[0.06] border border-white/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">{stepInfo.title}</h1>
          <p className="text-white/60 mt-2">{stepInfo.subtitle}</p>
        </div>

        <Card className="bg-white/[0.04] border border-white/10 rounded-xl shadow-none text-white">
          <CardHeader>
            <CardTitle className="text-white">{stepInfo.cardTitle}</CardTitle>
            <CardDescription className="text-white/60">{stepInfo.cardDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === "code" && (
              // Step 1: Access Code
              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="code" className="text-sm font-medium">
                    Access Code *
                  </label>
                  <Input
                    id="code"
                    type="password"
                    value={accessCode}
                    onChange={(e) => {
                      setAccessCode(e.target.value);
                      setError("");
                    }}
                    placeholder="Enter the access code"
                    required
                    className="h-11"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Access Code"
                  )}
                </Button>

                <div className="mt-4 pt-4 border-t text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/home")}
                    className="text-white/60 hover:text-white"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                  </Button>
                </div>
              </form>
            )}

            {step === "role" && (
              // Step 2: Role Selection
              <div className="space-y-4">
                <div className="grid gap-4">
                  <button
                    type="button"
                    onClick={() => handleRoleSelect("Club")}
                    className="flex items-center gap-4 p-4 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/[0.06] transition-all text-left"
                  >
                    <div className="h-12 w-12 rounded-full bg-white/[0.06] flex items-center justify-center">
                      <Users className="h-6 w-6 text-white/60" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Club Lead</h3>
                      <p className="text-sm text-white/60">Register your club or organization</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleSelect("Faculty")}
                    className="flex items-center gap-4 p-4 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/[0.06] transition-all text-left"
                  >
                    <div className="h-12 w-12 rounded-full bg-white/[0.06] flex items-center justify-center">
                      <GraduationCap className="h-6 w-6 text-white/60" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Faculty Member</h3>
                      <p className="text-sm text-white/60">Professors and teaching staff</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleSelect("Principal")}
                    className="flex items-center gap-4 p-4 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/[0.06] transition-all text-left"
                  >
                    <div className="h-12 w-12 rounded-full bg-white/[0.06] flex items-center justify-center">
                      <Crown className="h-6 w-6 text-white/60" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Principal</h3>
                      <p className="text-sm text-white/60">Institution head or director</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleSelect("Dean")}
                    className="flex items-center gap-4 p-4 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/[0.06] transition-all text-left"
                  >
                    <div className="h-12 w-12 rounded-full bg-white/[0.06] flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-white/60" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Dean</h3>
                      <p className="text-sm text-white/60">Department or faculty dean</p>
                    </div>
                  </button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep("code");
                    setError("");
                  }}
                  className="w-full text-white/60 hover:text-white"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Access Code
                </Button>
              </div>
            )}

            {step === "auth" && (
              // Step 3: Authentication
              <div className="space-y-4">
                {/* Google OAuth */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11"
                  onClick={handleGoogleAuth}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  Continue with Google
                </Button>

                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#000000] px-2 text-xs text-white/40">
                    or continue with email
                  </span>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@university.edu"
                        className="h-11 pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium">
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isSignUp ? "Create a password (min 6 chars)" : "Enter your password"}
                        className="h-11 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                      >
                        {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isSignUp ? "Creating Account..." : "Signing In..."}
                      </>
                    ) : (
                      isSignUp ? "Create Account" : "Sign In"
                    )}
                  </Button>
                </form>

                <div className="text-center text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError("");
                    }}
                    className="text-white/60 hover:text-white hover:underline"
                  >
                    {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                  </button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep("role");
                    setError("");
                  }}
                  className="w-full text-white/60 hover:text-white"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Role Selection
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-white/40 mt-6">
          This page is for authorized staff and club leads only.
        </p>
      </motion.div>
    </div>
  );
};

export default ClubAuth;
