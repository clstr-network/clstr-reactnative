import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User as UserIcon, Briefcase, FileText, Image as ImageIcon, Loader2, AlertCircle, GraduationCap, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Autocomplete } from "@/components/ui/autocomplete";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { uploadProfileAvatar, validateAvatarFile, sanitizeSocialLinks } from "@/lib/profile";
import { getStaffAuthRole, clearClubAccessVerified, isClubAccessVerified } from "./ClubAuth";
import { 
  determineUserRoleFromGraduation, 
  calculateGraduationYear,
  getAcademicStatusLabel,
  validateGraduationYear,
  validateCourseDuration
} from "@/lib/alumni-identification";
import { getUniversityNameFromDomain, getUniversityOptions, getMajorOptions } from "@clstr/shared/utils/university-data";
import { getCollegeDomainFromEmailServer } from "@/lib/validation";
import type { Database } from "@/integrations/supabase/types";
import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { useProfile } from "@/contexts/ProfileContext";
import { assertValidUuid } from "@clstr/shared/utils/uuid";

const AUTH_MODE = process.env.EXPO_PUBLIC_AUTH_MODE;

const Onboarding = () => {
  const [formData, setFormData] = useState({
    role: "",
    university: "",
    major: "",
    graduationYear: "",
    enrollmentYear: "",
    courseDurationYears: "4", // Default to 4 years
    deanOffice: "",
    deanOfficeOther: "",
    bio: "",
    interests: [] as string[],
    socialLinks: {
      website: "",
      googleScholar: "",
      linkedin: "",
      twitter: "",
      facebook: "",
      instagram: "",
    },
    profilePicture: null as File | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState<
    | "enrollmentYear"
    | "courseDurationYears"
    | "deanOffice"
    | "deanOfficeOther"
    | "university"
    | "major"
    | "interests"
    | null
  >(null);
  const [authWarning, setAuthWarning] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const { refreshProfile } = useProfile();
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Check if user came from club-auth with a staff role (Faculty, Principal, Dean)
  const [isStaffFromAuth, setIsStaffFromAuth] = useState(false);
  const [staffRoleLabel, setStaffRoleLabel] = useState<string>("");
  const [interestInput, setInterestInput] = useState("");

  // Alumni invite data (from /alumni-invite claim flow)
  const [alumniInviteData, setAlumniInviteData] = useState<{
    college_email: string;
    college_domain: string;
    full_name?: string;
    grad_year?: number;
    degree?: string;
    major?: string;
    personal_email?: string;
  } | null>(null);
  const [identityProfile, setIdentityProfile] = useState<{
    email: string | null;
    college_domain: string | null;
  } | null>(null);

  const currentYear = new Date().getFullYear();
  const earliestGraduationYear = currentYear - 50;
  const latestGraduationYear = currentYear + 10;
  const graduationYears = Array.from(
    { length: latestGraduationYear - earliestGraduationYear + 1 },
    (_, i) => latestGraduationYear - i
  );

  // Enrollment years (past 60 years)
  const enrollmentYears = Array.from(
    { length: 61 },
    (_, i) => currentYear - i
  );

  // Course duration options (1-10 years)
  const courseDurations = Array.from({ length: 10 }, (_, i) => i + 1);

  const isStaffRole = formData.role === "Faculty" || formData.role === "Principal" || formData.role === "Dean";
  const isPrincipal = formData.role === "Principal";
  const isDean = formData.role === "Dean";

  // Auto-calculate graduation year and role based on enrollment year and course duration
  const calculatedGraduationYear = useMemo(() => {
    if (isStaffRole) return null;
    if (!formData.enrollmentYear) return null;
    
    const duration = parseInt(formData.courseDurationYears, 10) || 4;
    return calculateGraduationYear(formData.enrollmentYear, duration);
  }, [formData.enrollmentYear, formData.courseDurationYears, isStaffRole]);

  // Auto-determine role (Student or Alumni) based on graduation year
  const autoRole = useMemo(() => {
    if (isStaffRole) return formData.role;
    const gradYear = calculatedGraduationYear?.toString() || formData.graduationYear;
    return determineUserRoleFromGraduation(gradYear);
  }, [calculatedGraduationYear, formData.graduationYear, formData.role, isStaffRole]);

  // Get academic status label for display
  const academicStatusLabel = useMemo(() => {
    if (isStaffRole) return staffRoleLabel || formData.role;
    const gradYear = calculatedGraduationYear?.toString() || formData.graduationYear;
    return getAcademicStatusLabel(gradYear, autoRole);
  }, [calculatedGraduationYear, formData.graduationYear, autoRole, isStaffRole, staffRoleLabel, formData.role]);

  useEffect(() => {
    if (AUTH_MODE === 'mock') {
      navigate('/home');
      return;
    }

    // Check for warnings from auth callback
    const authWarn = sessionStorage.getItem('authWarning');

    if (authWarn) {
      setAuthWarning(authWarn);
      sessionStorage.removeItem('authWarning');
    }

    // RISK 1 MITIGATION: The real invite context is fetched server-side via
    // get_accepted_invite_context() RPC in checkAuth() below.
    // No sessionStorage needed ï¿½ DB is the source of truth.

    // Check if user came from club-auth with a staff role
    if (isClubAccessVerified()) {
      const staffRole = getStaffAuthRole();
      if (staffRole === "Faculty" || staffRole === "Principal" || staffRole === "Dean") {
        setIsStaffFromAuth(true);
        setFormData(prev => ({ ...prev, role: staffRole }));
        // Set display label
        const labels: Record<string, string> = {
          "Faculty": "Faculty Member",
          "Principal": "Principal",
          "Dean": "Dean"
        };
        setStaffRoleLabel(labels[staffRole] || staffRole);
      }
    }

    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setAuthWarning("You're offline or we couldn't verify your session yet.");
        setIsLoading(false);
        return;
      }

      const session = data.session;

      if (!session) {
        toast({
          title: "Not authenticated",
          description: "Please log in first",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      setUser(session.user);

      // RISK 1 MITIGATION: Fetch invite context from server (source of truth).
      // This replaces the sessionStorage-only approach ï¿½ even if a malicious
      // user tampers with sessionStorage, the DB returns the real invite data.
      try {
        const { data: inviteCtx, error: inviteErr } = await supabase.rpc(
          "get_accepted_invite_context"
        );
        if (!inviteErr && inviteCtx && (inviteCtx as any).found) {
          const ctx = inviteCtx as {
            found: boolean;
            college_email: string;
            college_domain: string;
            full_name?: string;
            grad_year?: number;
            degree?: string;
            major?: string;
            personal_email?: string;
          };
          // Server-verified invite data overwrites any sessionStorage hint
          setAlumniInviteData({
            college_email: ctx.college_email,
            college_domain: ctx.college_domain,
            full_name: ctx.full_name,
            grad_year: ctx.grad_year,
            degree: ctx.degree,
            major: ctx.major,
            personal_email: ctx.personal_email,
          });
          setFormData(prev => ({
            ...prev,
            role: "Alumni",
            ...(ctx.major ? { major: ctx.major } : {}),
            ...(ctx.grad_year ? { graduationYear: String(ctx.grad_year) } : {}),
          }));
        }
      } catch {
        // Non-fatal ï¿½ if RPC fails, alumni invite data simply won't be pre-filled.
        // Normal students aren't affected.
        console.warn("Could not fetch invite context from server");
      }

      // Check if profile already exists AND onboarding is complete
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, onboarding_complete, email, college_domain")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile) {
        setIdentityProfile({
          email: profile.email ?? null,
          college_domain: profile.college_domain ?? null,
        });
      }

      // Only redirect if profile exists AND onboarding is complete
      if (profile && profile.onboarding_complete === true) {
        // Profile exists and onboarding is complete, redirect to home
        navigate("/home");
        return;
      }

      // Allow onboarding if:
      // 1. No profile exists (new user)
      // 2. Profile exists but onboarding_complete is false (incomplete onboarding)
      setIsLoading(false);
    };

    checkAuth();
  }, [navigate, toast]);

  // Auto-fill university name from canonical college domain
  useEffect(() => {
    if (!formData.university) {
      const domain = alumniInviteData?.college_domain || identityProfile?.college_domain || '';
      const universityName = getUniversityNameFromDomain(domain);
      if (universityName) {
        setFormData(prev => ({ ...prev, university: universityName }));
      }
    }
  }, [alumniInviteData?.college_domain, identityProfile?.college_domain, formData.university]);

  // Memoized autocomplete options
  const universityOptions = useMemo(() => getUniversityOptions(), []);
  const majorOptions = useMemo(() => getMajorOptions(), []);

  const updateFormData = (field: keyof typeof formData, value: string | string[] | File | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
    setInvalidField((current) => (current === field ? null : current));
  };

  const updateSocialLink = (field: keyof typeof formData.socialLinks, value: string) => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [field]: value,
      },
    }));
    setError("");
  };

  const addManualInterest = () => {
    const nextInterest = interestInput.trim();
    if (!nextInterest) return;

    const exists = formData.interests.some(
      (interest) => interest.toLowerCase() === nextInterest.toLowerCase()
    );

    if (exists) {
      setInterestInput("");
      return;
    }

    updateFormData("interests", [...formData.interests, nextInterest]);
    setInvalidField((current) => (current === "interests" ? null : current));
    setInterestInput("");
  };

  const removeManualInterest = (interestToRemove: string) => {
    updateFormData(
      "interests",
      formData.interests.filter((interest) => interest !== interestToRemove)
    );
  };

  const handleEnterToNext = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    const form = event.currentTarget.form;
    if (!form) return;
    event.preventDefault();
    const focusable = Array.from(
      form.querySelectorAll<HTMLElement>("input, textarea, [role='combobox']")
    ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");
    const currentIndex = focusable.indexOf(event.currentTarget);
    const nextField = focusable[currentIndex + 1];
    nextField?.focus();
  };

  const focusInvalidField = (field: Exclude<typeof invalidField, null>, message: string) => {
    setError(message);
    setInvalidField(field);
    window.requestAnimationFrame(() => {
      const target = fieldRefs.current[field];
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        const focusable = target.querySelector<HTMLElement>(
          "input, textarea, button, [role='combobox'], [role='button'], [tabindex]:not([tabindex='-1'])"
        );
        focusable?.focus();
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validation = validateAvatarFile(file);

      if (!validation.valid) {
        toast({
          title: "Invalid file",
          description: validation.error,
          variant: "destructive",
        });
        return;
      }

      updateFormData("profilePicture", file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("No user session found");
      return;
    }

    // For non-staff roles, validate academic timeline fields
    if (!isStaffRole) {
      // Must have enrollment year to calculate graduation
      if (!formData.enrollmentYear) {
        focusInvalidField("enrollmentYear", "Please select your enrollment year");
        return;
      }
      
      // Validate course duration
      const durationValidation = validateCourseDuration(parseInt(formData.courseDurationYears, 10));
      if (!durationValidation.valid) {
        focusInvalidField("courseDurationYears", durationValidation.error || "Invalid course duration");
        return;
      }

      // Calculate and validate graduation year
      const gradYear = calculatedGraduationYear?.toString() || formData.graduationYear;
      const gradValidation = validateGraduationYear(gradYear);
      if (!gradValidation.valid) {
        focusInvalidField("enrollmentYear", gradValidation.error || "Invalid graduation year");
        return;
      }
    }

    // Validation for staff roles
    if (isStaffRole && !formData.role) {
      setError("Role is required for staff members");
      return;
    }

    if (isDean && !formData.deanOffice) {
      focusInvalidField("deanOffice", "Please select your Dean Role / Office");
      return;
    }

    if (isDean && formData.deanOffice === "Other (specify)" && !formData.deanOfficeOther.trim()) {
      focusInvalidField("deanOfficeOther", "Please specify your Dean Role / Office");
      return;
    }

    if (!formData.university) {
      focusInvalidField("university", "Please select your university");
      return;
    }

    if (!formData.major) {
      focusInvalidField("major", isPrincipal ? "Some required academic details are missing." : "Please fill in your major");
      return;
    }

    const minimumInterests = isStaffRole ? 1 : 3;
    if (formData.interests.length < minimumInterests) {
      const focusLabel = isDean ? "focus area" : isStaffRole ? "academic focus area" : "interest";
      focusInvalidField(
        "interests",
        `Please select at least ${minimumInterests} ${focusLabel}${minimumInterests > 1 ? "s" : ""}`
      );
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      assertValidUuid(user.id, "user.id");
      // Identity source-of-truth:
      // - alumni invite context (server-verified), OR
      // - profile created by DB auth hook with canonical college_domain
      // - fallback: derive from the authenticated user's email
      const email = alumniInviteData?.college_email || identityProfile?.email || user.email || null;
      let college_domain = alumniInviteData?.college_domain || identityProfile?.college_domain || null;

      if (!email || !email.includes("@")) {
        throw new Error("Could not determine your academic identity email.");
      }

      // Fallback: if college_domain is still null (e.g., handle_new_user trigger
      // failed silently or profile row is missing), derive it from the user email
      // using server-side normalization.
      if (!college_domain) {
        console.warn("college_domain missing from profile ï¿½ deriving from email:", email);
        college_domain = await getCollegeDomainFromEmailServer(email);
      }

      if (!college_domain) {
        throw new Error("Could not determine your college community. Please re-authenticate with your academic email.");
      }

      // Get full_name ï¿½ prefer invite data, then user metadata
      const full_name = alumniInviteData?.full_name ||
        user.user_metadata?.full_name ||
        `${user.user_metadata?.first_name || ""} ${user.user_metadata?.last_name || ""}`.trim() ||
        email.split("@")[0] ||
        "User";

      console.log('Creating profile with:', { email, college_domain, full_name });

      // Upload avatar if provided
      let avatarUrl: string | null = null;
      if (formData.profilePicture) {
        try {
          avatarUrl = await uploadProfileAvatar(formData.profilePicture, user.id);
        } catch (avatarError) {
          console.warn("Avatar upload failed:", avatarError);
          toast({
            title: "Avatar upload failed",
            description: "Continuing without profile picture. You can add one later.",
          });
        }
      }

      const sanitizedSocialLinks = sanitizeSocialLinks(formData.socialLinks);


      // For staff roles, use the explicitly set role; otherwise use auto-determined role
      const resolvedRole = isStaffRole 
        ? (formData.role as Database["public"]["Enums"]["user_role"])
        : (autoRole as Database["public"]["Enums"]["user_role"]);
      const resolvedRoleLabel = resolvedRole as string;

      // Calculate the final graduation year (from calculation or manual input)
      const finalGraduationYear = isStaffRole 
        ? (formData.graduationYear || null)
        : (calculatedGraduationYear?.toString() || formData.graduationYear);

      const deanOfficeLabel = isDean
        ? (formData.deanOffice === "Other (specify)" ? formData.deanOfficeOther.trim() : formData.deanOffice)
        : null;

      const staffPosition = isStaffRole
        ? (resolvedRoleLabel === "Dean" ? "Dean" : resolvedRoleLabel === "Principal" ? "Principal" : "Faculty")
        : null;

      // Parse enrollment year and course duration for storage
      const enrollmentYear = formData.enrollmentYear ? parseInt(formData.enrollmentYear, 10) : null;
      const courseDurationYears = parseInt(formData.courseDurationYears, 10) || 4;

      // Create profile record with all required fields
      const profileData = {
        id: user.id,
        email,
        full_name,
        role: resolvedRole,
        university: formData.university || 'Unknown University',
        major: formData.major || 'Undeclared',
        branch: formData.major || 'Undeclared',
        graduation_year: finalGraduationYear,
        year_of_completion: finalGraduationYear,
        enrollment_year: enrollmentYear,
        course_duration_years: courseDurationYears,
        bio: formData.bio || null,
        interests: formData.interests || [],
        social_links: sanitizedSocialLinks,
        avatar_url: avatarUrl,
        college_domain: college_domain,
        headline: `${formData.major || 'Student'} ï¿½ ${formData.university || college_domain}`,
        location: formData.university || college_domain,
        onboarding_complete: true, // Mark onboarding as complete
        // Store personal email separately for alumni invite flow
        personal_email: alumniInviteData?.personal_email || null,
        role_data: isStaffRole
          ? {
              staff_role: resolvedRole,
              staff_position: staffPosition,
              dean_office: deanOfficeLabel || null,
              staff_title: staffRoleLabel || resolvedRole,
            }
          : null,
      };

      console.log('Upserting profile data:', profileData, 'Auto-determined role:', autoRole);

      // Use upsert to handle both new profiles and updating incomplete ones
      const { error: insertError } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: 'id' });

      if (insertError) {
        console.error('Profile creation error:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
          profileData
        });
        throw new Error(`Failed to create profile: ${insertError.message}. ${insertError.hint || ''}`);
      }

      // Create or update role-specific profile data based on auto-determined role
      if (resolvedRole === "Student") {
        const { error: studentError } = await supabase
          .from("student_profiles")
          .upsert({
            user_id: user.id,
            college_domain,
            expected_graduation: finalGraduationYear ? `${finalGraduationYear}-06-01` : null,
          }, { onConflict: "user_id" });

        if (studentError) {
          throw new Error(`Failed to create student profile: ${studentError.message}`);
        }
      }

      if (resolvedRole === "Alumni") {
        const graduationYearValue = finalGraduationYear ? Number.parseInt(finalGraduationYear, 10) : null;
        if (!graduationYearValue || Number.isNaN(graduationYearValue)) {
          throw new Error("Graduation year must be a valid year for alumni profiles.");
        }

        const { error: alumniError } = await supabase
          .from("alumni_profiles")
          .upsert({
            user_id: user.id,
            college_domain,
            graduation_year: graduationYearValue,
            graduation_date: `${finalGraduationYear}-06-01`,
            linkedin_url: sanitizedSocialLinks.linkedin ?? null,
            company_website: sanitizedSocialLinks.website ?? null,
          }, { onConflict: "user_id" });

        if (alumniError) {
          throw new Error(`Failed to create alumni profile: ${alumniError.message}`);
        }
      }

      if (resolvedRoleLabel === "Faculty" || resolvedRoleLabel === "Principal" || resolvedRoleLabel === "Dean") {
        if (!formData.major.trim()) {
          throw new Error("Department is required for staff profiles.");
        }

        const positionLabel = staffPosition || "Faculty";

        const { error: facultyError } = await supabase
          .from("faculty_profiles")
          .upsert({
            user_id: user.id,
            college_domain,
            department: formData.major.trim(),
            position: positionLabel,
          }, { onConflict: "user_id" });

        if (facultyError) {
          throw new Error(`Failed to create faculty profile: ${facultyError.message}`);
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.identity.context() }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.detail(user.id) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats(user.id) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.alumniDirectory() }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mentorship.all }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.network() }),
      ]);

      await refreshProfile();

      toast({
        title: "Welcome!",
        description: "Your profile has been created successfully.",
      });

      // Clear staff auth session if coming from club-auth
      if (isStaffFromAuth) {
        clearClubAccessVerified();
      }

      navigate("/home", { replace: true });

    } catch (err) {
      console.error("Onboarding error:", err);
      const message = err instanceof Error ? err.message : "Failed to complete onboarding";
      setError(message);

      // Provide helpful error messages
      let userMessage = message;
      if (message.includes('duplicate key') || message.includes('already exists')) {
        userMessage = "Your profile already exists. Redirecting to home...";
        setTimeout(() => navigate('/home'), 2000);
      } else if (message.includes('college_domain') || message.includes('college community')) {
        userMessage = "Could not verify your educational email domain. Please try signing out and signing in again with your college email.";
      } else if (message.includes('domain')) {
        userMessage = "Could not verify your educational email domain. Please contact support.";
      } else if (message.includes('permission') || message.includes('policy')) {
        userMessage = "Permission error. Please try signing out and signing in again.";
      }

      toast({
        title: "Error",
        description: userMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#000000]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/60"></div>
          <p className="text-sm text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] px-4 sm:px-6 py-6 sm:py-12">
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/60"></div>
            <p className="text-sm text-white/70">Completing setup...</p>
          </div>
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto"
      >
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {isDean ? "Set up your Dean Profile" : isStaffRole ? "Set up your Faculty Profile" : "Complete Your Profile"}
          </h1>
          <p className="text-sm sm:text-base text-white/60 mt-2">
            {isDean
              ? "Your profile represents your office and role"
              : isStaffRole
              ? "This helps students and alumni discover and connect with you appropriately"
              : "Tell us about yourself to get started"}
          </p>
        </div>

        <Card className="bg-white/[0.04] border border-white/10 rounded-xl shadow-none text-white">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-lg sm:text-xl text-white">Profile Setup</CardTitle>
            <CardDescription className="text-sm text-white/60">
              {isDean
                ? "You are joining Clstr as an officially verified academic authority"
                : isStaffRole
                ? "You are joining Clstr as a verified faculty member"
                : "This information will help us personalize your experience"}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-6">
            {authWarning && (
              <Alert className="mb-6 bg-white/[0.04] border border-white/10">
                <AlertCircle className="h-4 w-4 text-white/40" />
                <AlertDescription className="text-white/60">{authWarning}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              {/* Profile Picture */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Profile Picture</label>
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                  <div className="h-20 w-20 rounded-full bg-white/[0.06] flex items-center justify-center overflow-hidden border border-white/10">
                    {formData.profilePicture ? (
                      <img
                        src={URL.createObjectURL(formData.profilePicture)}
                        alt="Profile preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserIcon className="h-10 w-10 text-white/40" />
                    )}
                  </div>
                  <label
                    htmlFor="profile-upload"
                    className="cursor-pointer bg-white/[0.06] hover:bg-white/[0.10] text-white/60 rounded-md px-4 py-2 text-sm font-medium transition-colors"
                  >
                    <div className="flex items-center">
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Upload Photo
                    </div>
                  </label>
                  <input
                    id="profile-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-white/40">Optional - You can add this later</p>
              </div>

              {/* Academic Role Section */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Academic Status</label>
                {isStaffFromAuth ? (
                  // Staff coming from club-auth - show locked role
                  <div className="p-3 rounded-lg bg-white/[0.04] border border-white/10">
                    <p className="text-sm font-medium text-white">
                      {isDean ? "Dean ï¿½ Role verified via staff authentication" : staffRoleLabel}
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      {isDean
                        ? "This role represents an official academic position at your institution."
                        : "Role verified via staff authentication"}
                    </p>
                  </div>
                ) : (
                  // Regular signup - automatic Student/Alumni determination
                  <div className="space-y-4">
                    {/* Auto-determined role display */}
                    {(formData.enrollmentYear || formData.graduationYear) && (
                      <div className="p-3 rounded-lg bg-white/[0.04] border border-white/10">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-white/40" />
                          <p className="text-sm font-medium text-white">
                            {autoRole} ï¿½ {academicStatusLabel}
                          </p>
                        </div>
                        <p className="text-xs mt-1 text-white/40">
                          Your status is automatically determined based on your graduation year
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-white/40">
                      Are you a Faculty Member or Club Lead? Use the{" "}
                      <a href="/club-auth" className="text-white/60 hover:text-white hover:underline font-medium">staff portal</a>
                      {" "}for registration.
                    </p>
                  </div>
                )}
              </div>

              {isDean && (
                <div
                  ref={(el) => {
                    fieldRefs.current.deanOffice = el;
                  }}
                  className={`space-y-2 rounded-lg ${invalidField === "deanOffice" ? "ring-1 ring-red-500/50" : ""}`}
                >
                  <Label htmlFor="deanOffice">Dean Role / Office *</Label>
                  <Select
                    value={formData.deanOffice}
                    onValueChange={(value) => updateFormData("deanOffice", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Dean of Academics",
                        "Dean of Student Affairs",
                        "Dean of Research",
                        "Dean of Admissions",
                        "Dean of Engineering",
                        "Dean of Sciences",
                        "Associate Dean",
                        "Other (specify)",
                      ].map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.deanOffice === "Other (specify)" && (
                    <div
                      ref={(el) => {
                        fieldRefs.current.deanOfficeOther = el;
                      }}
                      className={`rounded-lg ${invalidField === "deanOfficeOther" ? "ring-1 ring-red-500/50" : ""}`}
                    >
                      <Input
                        id="deanOfficeOther"
                        value={formData.deanOfficeOther}
                        onChange={(e) => updateFormData("deanOfficeOther", e.target.value)}
                        placeholder="Specify your dean role"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* University */}
              <div
                ref={(el) => {
                  fieldRefs.current.university = el;
                }}
                className={`space-y-2 rounded-lg ${invalidField === "university" ? "ring-1 ring-red-500/50" : ""}`}
              >
                <label htmlFor="university" className="text-sm font-medium">
                  University *
                </label>
                <Autocomplete
                  options={universityOptions}
                  value={formData.university}
                  onChange={(value) => updateFormData("university", value)}
                  placeholder="Ex: Stanford University"
                  searchPlaceholder="Type to search universities..."
                  emptyMessage="No universities found. You can enter a custom name."
                  icon={<Briefcase className="h-4 w-4 text-white/40" />}
                  allowCustomValue={!isDean}
                  disabled={isDean}
                />
                {isDean && (
                  <p className="text-xs text-white/40">Auto-filled from your verified institutional email</p>
                )}
              </div>

              {/* Major */}
              <div
                ref={(el) => {
                  fieldRefs.current.major = el;
                }}
                className={`space-y-2 rounded-lg ${invalidField === "major" ? "ring-1 ring-red-500/50" : ""}`}
              >
                <label htmlFor="major" className="text-sm font-medium">
                  {isDean ? "School / Faculty / Division *" : isStaffRole ? "Department *" : "Major/Field of Study *"}
                </label>
                <Autocomplete
                  options={majorOptions}
                  value={formData.major}
                  onChange={(value) => updateFormData("major", value)}
                  placeholder={isDean ? "Ex: School of Engineering" : isStaffRole ? "Ex: Computer Science Department" : "Ex: Computer Science"}
                  searchPlaceholder="Type to search majors..."
                  emptyMessage="No matches found. You can enter a custom value."
                  allowCustomValue={true}
                />
              </div>

              {/* Academic Timeline Section - Only for non-staff roles */}
              {!isStaffRole && (
                <>
                  {/* Enrollment Year */}
                  <div
                    ref={(el) => {
                      fieldRefs.current.enrollmentYear = el;
                    }}
                    className={`space-y-2 rounded-lg ${invalidField === "enrollmentYear" ? "ring-1 ring-red-500/50" : ""}`}
                  >
                    <label htmlFor="enrollmentYear" className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-white/40" />
                      When did you start your course? *
                    </label>
                    <Select
                      value={formData.enrollmentYear}
                      onValueChange={(value) => updateFormData("enrollmentYear", value)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select enrollment year" />
                      </SelectTrigger>
                      <SelectContent>
                        {enrollmentYears.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Course Duration */}
                  <div
                    ref={(el) => {
                      fieldRefs.current.courseDurationYears = el;
                    }}
                    className={`space-y-2 rounded-lg ${invalidField === "courseDurationYears" ? "ring-1 ring-red-500/50" : ""}`}
                  >
                    <label htmlFor="courseDuration" className="text-sm font-medium flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-white/40" />
                      Course Duration (in years) *
                    </label>
                    <Select
                      value={formData.courseDurationYears}
                      onValueChange={(value) => updateFormData("courseDurationYears", value)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {courseDurations.map((duration) => (
                          <SelectItem key={duration} value={duration.toString()}>
                            {duration} year{duration > 1 ? 's' : ''} 
                            {duration === 3 && ' (Diploma/Bachelor\'s)'}
                            {duration === 4 && ' (Bachelor\'s - Most Common)'}
                            {duration === 5 && ' (Integrated Master\'s)'}
                            {duration === 2 && ' (Master\'s)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-white/40">
                      This helps us calculate your expected graduation year automatically
                    </p>
                  </div>

                  {/* Calculated Graduation Year Display */}
                  {calculatedGraduationYear && (
                    <div className="p-3 rounded-lg bg-white/[0.04] border border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/60">Expected Graduation Year:</span>
                        <span className="text-sm font-semibold text-white">
                          {calculatedGraduationYear}
                        </span>
                      </div>
                      <p className="text-xs text-white/40 mt-1">
                        Calculated from: {formData.enrollmentYear} + {formData.courseDurationYears} years
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Manual Graduation Year - Only for staff roles */}
              {isStaffRole && (
                <div className="space-y-2">
                  <label htmlFor="graduationYear" className="text-sm font-medium">
                    {isDean
                      ? "Year of Appointment (Optional)"
                      : isPrincipal
                      ? "Year you joined this institution (optional)"
                      : "Year of Joining (Optional)"}
                  </label>
                  {isDean && (
                    <p className="text-xs text-white/40">Year you assumed this role</p>
                  )}
                  <Select
                    value={formData.graduationYear}
                    onValueChange={(value) => updateFormData("graduationYear", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {graduationYears.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Bio */}
              <div className="space-y-2">
                <label htmlFor="bio" className="text-sm font-medium">
                  {isDean ? "Role Overview" : "Short Bio"}
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => updateFormData("bio", e.target.value)}
                    className="pl-10 min-h-[100px]"
                    placeholder={
                      isDean
                        ? "Briefly describe your role, responsibilities, and areas of focus as Dean."
                        : "Tell us about yourself..."
                    }
                  />
                </div>
              </div>

              {/* Social/Professional Links */}
              {isDean ? (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="official-links" className="border rounded-lg px-3">
                    <AccordionTrigger className="text-sm">Official Links (Optional)</AccordionTrigger>
                    <AccordionContent className="pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="website">Official university page / office page</Label>
                          <Input
                            id="website"
                            value={formData.socialLinks.website}
                            onChange={(e) => updateSocialLink("website", e.target.value)}
                            placeholder="https://university.edu/office"
                            onKeyDown={handleEnterToNext}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="linkedin">LinkedIn (optional)</Label>
                          <Input
                            id="linkedin"
                            value={formData.socialLinks.linkedin}
                            onChange={(e) => updateSocialLink("linkedin", e.target.value)}
                            placeholder="yourusername"
                            onKeyDown={handleEnterToNext}
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ) : isStaffRole ? (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="professional-links" className="border rounded-lg px-3">
                    <AccordionTrigger className="text-sm">Professional Links (Optional)</AccordionTrigger>
                    <AccordionContent className="pt-2">
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="website">Personal / Lab Website</Label>
                            <Input
                              id="website"
                              value={formData.socialLinks.website}
                              onChange={(e) => updateSocialLink("website", e.target.value)}
                              placeholder="https://yourlab.edu"
                              onKeyDown={handleEnterToNext}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="googleScholar">Google Scholar (optional)</Label>
                            <Input
                              id="googleScholar"
                              value={formData.socialLinks.googleScholar}
                              onChange={(e) => updateSocialLink("googleScholar", e.target.value)}
                              placeholder="citations?user=..."
                              onKeyDown={handleEnterToNext}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="linkedin">LinkedIn (optional)</Label>
                            <Input
                              id="linkedin"
                              value={formData.socialLinks.linkedin}
                              onChange={(e) => updateSocialLink("linkedin", e.target.value)}
                              placeholder="yourusername"
                              onKeyDown={handleEnterToNext}
                            />
                          </div>
                        </div>
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="other-links" className="border rounded-lg px-3">
                            <AccordionTrigger className="text-sm">Others (collapsed)</AccordionTrigger>
                            <AccordionContent className="pt-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="twitter">Twitter</Label>
                                  <Input
                                    id="twitter"
                                    value={formData.socialLinks.twitter}
                                    onChange={(e) => updateSocialLink("twitter", e.target.value)}
                                    placeholder="yourusername"
                                    onKeyDown={handleEnterToNext}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="facebook">Facebook</Label>
                                  <Input
                                    id="facebook"
                                    value={formData.socialLinks.facebook}
                                    onChange={(e) => updateSocialLink("facebook", e.target.value)}
                                    placeholder="yourusername"
                                    onKeyDown={handleEnterToNext}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="instagram">Instagram</Label>
                                  <Input
                                    id="instagram"
                                    value={formData.socialLinks.instagram}
                                    onChange={(e) => updateSocialLink("instagram", e.target.value)}
                                    placeholder="yourusername"
                                    onKeyDown={handleEnterToNext}
                                  />
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="social-links" className="border rounded-lg px-3">
                    <AccordionTrigger className="text-sm">Social Links</AccordionTrigger>
                    <AccordionContent className="pt-2">
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="website">Website</Label>
                            <Input
                              id="website"
                              value={formData.socialLinks.website}
                              onChange={(e) => updateSocialLink("website", e.target.value)}
                              placeholder="https://yourwebsite.com"
                              onKeyDown={handleEnterToNext}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="linkedin">LinkedIn</Label>
                            <Input
                              id="linkedin"
                              value={formData.socialLinks.linkedin}
                              onChange={(e) => updateSocialLink("linkedin", e.target.value)}
                              placeholder="yourusername"
                              onKeyDown={handleEnterToNext}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="twitter">Twitter</Label>
                            <Input
                              id="twitter"
                              value={formData.socialLinks.twitter}
                              onChange={(e) => updateSocialLink("twitter", e.target.value)}
                              placeholder="yourusername"
                              onKeyDown={handleEnterToNext}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="facebook">Facebook</Label>
                            <Input
                              id="facebook"
                              value={formData.socialLinks.facebook}
                              onChange={(e) => updateSocialLink("facebook", e.target.value)}
                              placeholder="yourusername"
                              onKeyDown={handleEnterToNext}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="instagram">Instagram</Label>
                            <Input
                              id="instagram"
                              value={formData.socialLinks.instagram}
                              onChange={(e) => updateSocialLink("instagram", e.target.value)}
                              placeholder="yourusername"
                              onKeyDown={handleEnterToNext}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-white/40">Optional ï¿½ you can update these later.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              {/* Interests */}
              <div
                ref={(el) => {
                  fieldRefs.current.interests = el;
                }}
                className={`space-y-2 rounded-lg ${invalidField === "interests" ? "ring-1 ring-red-500/50" : ""}`}
              >
                <label className="text-sm font-medium">
                  {isDean ? "Focus Areas" : isStaffRole ? "Academic Focus Areas" : "Interests (Select at least 3) *"}
                </label>
                {isDean ? (
                  <p className="text-xs text-white/40">Areas you oversee or are open to engagement on</p>
                ) : isStaffRole ? (
                  <p className="text-xs text-white/40">Add areas youï¿½re open to mentoring, teaching, or discussing</p>
                ) : null}
                {isStaffRole ? (
                  <>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={interestInput}
                        onChange={(e) => setInterestInput(e.target.value)}
                        placeholder="Type an interest and press Enter"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addManualInterest();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        className="h-10 sm:w-auto"
                        onClick={addManualInterest}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-2.5">
                      {formData.interests.map((interest) => (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => removeManualInterest(interest)}
                          className="px-3 py-1.5 text-xs sm:text-sm rounded-full transition-colors bg-white/[0.10] text-white hover:bg-white/[0.14]"
                        >
                          {interest} ï¿½
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2 sm:gap-2.5">
                    {[
                      "Networking",
                      "Mentorship",
                      "Career Growth",
                      "Job Opportunities",
                      "Industry Insights",
                      "Entrepreneurship",
                      "Higher Education",
                      "Research",
                      "Social Events",
                      "Technology",
                      "Business",
                      "Arts",
                    ].map((interest) => (
                      <div
                        key={interest}
                        onClick={() => {
                          const interests = [...formData.interests];
                          if (interests.includes(interest)) {
                            updateFormData("interests", interests.filter((i) => i !== interest));
                          } else {
                            updateFormData("interests", [...interests, interest]);
                          }
                          setInvalidField((current) => (current === "interests" ? null : current));
                        }}
                        className={`cursor-pointer px-3 py-1.5 text-xs sm:text-sm rounded-full transition-colors ${formData.interests.includes(interest)
                          ? "bg-white/[0.10] text-white"
                          : "bg-white/[0.04] text-white/60 hover:bg-white/[0.06]"
                          }`}
                      >
                        {interest}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-white/40">
                  {isStaffRole
                    ? `Selected: ${formData.interests.length} (minimum 1)`
                    : `Selected: ${formData.interests.length} / 3 minimum`}
                </p>
              </div>

              {isDean ? (
                <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <h3 className="text-sm font-semibold text-white">How students and faculty can reach you</h3>
                  <ul className="text-xs text-white/60 space-y-1">
                    <li>Connection requests are reviewed</li>
                    <li>Messaging may be limited or moderated</li>
                    <li>Mentorship requests are optional</li>
                    <li>You control visibility and availability</li>
                  </ul>
                  <p className="text-xs text-white/60 mt-2">
                    Engagement is structured, respectful, and under your control.
                  </p>
                </div>
              ) : isStaffRole ? (
                <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <h3 className="text-sm font-semibold text-white">How students can reach you</h3>
                  <ul className="text-xs text-white/60 space-y-1">
                    <li>Students can send connection requests</li>
                    <li>Messaging can be enabled or disabled later</li>
                    <li>You control your availability for mentorship</li>
                  </ul>
                  <p className="text-xs text-white/60 mt-2">
                    Your profile helps students discover your expertise. You stay in control of how and when people reach you.
                  </p>
                </div>
              ) : null}

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full h-11 bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating profile...
                    </>
                  ) : (
                    isDean ? "Submit Profile for Institutional Review" : "Complete Setup"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Onboarding;
