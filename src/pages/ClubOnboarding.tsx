import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { User as UserIcon, Briefcase, FileText, Image as ImageIcon, Loader2, AlertCircle } from "lucide-react";
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
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { uploadProfileAvatar, validateAvatarFile, sanitizeSocialLinks } from "@/lib/profile";
import { isClubAccessVerified, clearClubAccessVerified } from "./ClubAuth";
import { getUniversityNameFromDomain, getUniversityOptions } from "@clstr/shared/utils/university-data";
import type { Database } from "@/integrations/supabase/types";
import { assertValidUuid } from "@clstr/shared/utils/uuid";

const ClubOnboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{
    id: string;
    email?: string;
    profileEmail?: string | null;
    collegeDomain?: string | null;
  } | null>(null);

  const [formData, setFormData] = useState({
    clubName: "",
    university: "",
    category: "",
    foundingYear: "",
    bio: "",
    interests: [] as string[],
    socialLinks: {
      website: "",
      linkedin: "",
      twitter: "",
      facebook: "",
      instagram: "",
    },
    profilePicture: null as File | null,
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);
  const clubCategoryOptions = [
    "Academic",
    "Sports",
    "Cultural",
    "Social",
    "Professional",
    "Service",
    "Special Interest",
    "Greek Life",
  ];

  // Check auth AND access verification on mount
  useEffect(() => {
    const checkAccess = async () => {
      // SECURITY: Must have verified access code first
      if (!isClubAccessVerified()) {
        toast({
          title: "Access Required",
          description: "Please enter the club access code first.",
          variant: "destructive",
        });
        navigate("/club-auth");
        return;
      }
      
      // Check if user is authenticated
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setError("You're offline or we couldn't verify your session yet.");
        setIsLoading(false);
        return;
      }

      if (!data.session?.user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to continue club registration.",
          variant: "destructive",
        });
        // ClubAuth owns the auth step (Google/email) and preserves access verification.
        navigate("/club-auth");
        return;
      }

      // Check if user already has a club profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, onboarding_complete, full_name, email, college_domain")
        .eq("id", data.session.user.id)
        .maybeSingle();
      
      if (profile?.role === "Club" && profile?.onboarding_complete) {
        // Already a registered club
        toast({
          title: "Already Registered",
          description: `Welcome back, ${profile.full_name}!`,
        });
        clearClubAccessVerified(); // Clean up session
        navigate("/home");
        return;
      }

      setUser({
        id: data.session.user.id,
        email: data.session.user.email ?? undefined,
        profileEmail: profile?.email ?? null,
        collegeDomain: profile?.college_domain ?? null,
      });
      setIsLoading(false);
    };

    checkAccess();
  }, [navigate, toast]);

  // Auto-fill university name from canonical college domain
  useEffect(() => {
    if (!formData.university) {
      const domain = user?.collegeDomain || '';
      const universityName = getUniversityNameFromDomain(domain);
      if (universityName) {
        setFormData(prev => ({ ...prev, university: universityName }));
      }
    }
  }, [user?.collegeDomain, formData.university]);

  // Memoized autocomplete options
  const universityOptions = useMemo(() => getUniversityOptions(), []);

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
      
      setFormData(prev => ({ ...prev, profilePicture: file }));
    }
  };

  const updateSocialLink = (field: keyof typeof formData.socialLinks, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [field]: value,
      },
    }));
    setError("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !user) return;

    // SECURITY: Double-check access verification
    if (!isClubAccessVerified()) {
      setError("Access verification expired. Please re-enter the access code.");
      navigate("/club-auth");
      return;
    }

    // Validation
    if (!formData.clubName || !formData.university || !formData.category || !formData.foundingYear) {
      setError("Please fill in all required fields");
      return;
    }

    if (!clubCategoryOptions.includes(formData.category)) {
      setError("Please select a valid club category");
      return;
    }

    if (formData.interests.length < 1) {
      setError("Please select at least 1 focus area");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      assertValidUuid(user.id, "user.id");
      // Use profile identity context, never derive community from auth email.
      const userEmail = user.profileEmail || user.email;
      if (!userEmail || !userEmail.includes("@")) {
        throw new Error("Invalid identity email. Please sign in again.");
      }

      const collegeDomain = user.collegeDomain || null;

      if (!collegeDomain) {
        throw new Error("Could not determine your college community. Please sign in again with your academic profile.");
      }

      // Upload avatar if provided
      let avatarUrl: string | null = null;
      if (formData.profilePicture) {
        try {
          avatarUrl = await uploadProfileAvatar(formData.profilePicture, user.id);
        } catch (avatarError) {
          console.warn("Avatar upload failed, continuing without:", avatarError);
        }
      }

      const sanitizedSocialLinks = sanitizeSocialLinks(formData.socialLinks);

      // ============================================================
      // STEP 1: Create/update profile with role='Club'
      // ============================================================
      const profileData = {
        id: user.id,
        email: userEmail,
        full_name: formData.clubName,
        role: 'Club' as Database["public"]["Enums"]["user_role"],
        university: formData.university,
        major: formData.category,
        branch: formData.category,
        bio: formData.bio || `Official profile for ${formData.clubName}`,
        interests: formData.interests,
        social_links: sanitizedSocialLinks,
        avatar_url: avatarUrl,
        college_domain: collegeDomain,
        headline: `${formData.clubName} Â· ${formData.university}`,
        location: formData.university,
        onboarding_complete: true,
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: 'id' });

      if (profileError) {
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }

      // ============================================================
      // STEP 2: Create club_profiles entry (role-specific profile data)
      // ============================================================
      const clubProfileData = {
        user_id: user.id,
        college_domain: collegeDomain,
        club_type: formData.category as 'Academic' | 'Sports' | 'Cultural' | 'Social' | 'Professional' | 'Service' | 'Special Interest' | 'Greek Life' | null,
        founded_date: formData.foundingYear ? `${formData.foundingYear}-01-01` : null,
        member_count: 1,
        active_member_count: 1,
        meeting_schedule: null,
        meeting_location: null,
        membership_requirements: null,
        recruitment_open: true,
        contact_email: userEmail,
        social_media: sanitizedSocialLinks,
        achievements: [],
        upcoming_events: [],
        is_active: true,
      };

      const { error: clubProfileError } = await supabase
        .from("club_profiles")
        .upsert(clubProfileData, { onConflict: 'user_id' });

      if (clubProfileError) {
        throw new Error(`Failed to create club profile: ${clubProfileError.message}`);
      }

      // ============================================================
      // STEP 3: Create club entry in clubs table (for club discovery/following)
      // ============================================================
      const clubData = {
        name: formData.clubName,
        description: formData.bio || `Official profile for ${formData.clubName}`,
        short_description: formData.bio?.slice(0, 150) || formData.clubName,
        category: formData.category,
        club_type: formData.category,
        college_domain: collegeDomain,
        logo_url: avatarUrl,
        contact_email: userEmail,
        website_url: sanitizedSocialLinks.website ?? null,
        social_links: sanitizedSocialLinks,
        tags: formData.interests,
        is_active: true,
        is_verified: false, // Admin must verify
        requires_approval: true,
        created_by: user.id,
      };

      const { data: existingClub, error: existingClubError } = await supabase
        .from("clubs")
        .select("id")
        .eq("created_by", user.id)
        .maybeSingle();

      if (existingClubError) {
        throw new Error(`Failed to check existing club record: ${existingClubError.message}`);
      }

      if (existingClub?.id) {
        const { error: clubUpdateError } = await supabase
          .from("clubs")
          .update(clubData)
          .eq("id", existingClub.id);

        if (clubUpdateError) {
          throw new Error(`Failed to update club record: ${clubUpdateError.message}`);
        }
      } else {
        const { error: clubInsertError } = await supabase
          .from("clubs")
          .insert(clubData);

        if (clubInsertError) {
          throw new Error(`Failed to create club record: ${clubInsertError.message}`);
        }
      }

      // ============================================================
      // STEP 4: Invalidate React Query caches for fresh data
      // ============================================================
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.detail(user.id) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats(user.id) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clubs() }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.network() }),
      ]);

      // ============================================================
      // STEP 5: Clean up session and redirect
      // ============================================================
      clearClubAccessVerified();

      toast({
        title: "Welcome, Club!",
        description: `${formData.clubName} has been registered successfully.`,
      });

      navigate("/home");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to complete registration";
      setError(message);
      toast({
        title: "Error",
        description: message,
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
          <Loader2 className="h-12 w-12 animate-spin text-white/60" />
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] px-4 sm:px-6 py-6 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto"
      >
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Create your club's presence on Clstr</h1>
          <p className="text-sm sm:text-base text-white/60 mt-2">Share the essentials so students can discover you</p>
        </div>

        <Card className="bg-white/[0.04] border border-white/10 rounded-xl shadow-none text-white">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-lg sm:text-xl text-white">Club onboarding</CardTitle>
            <CardDescription className="text-sm text-white/60">Create your club's presence on Clstr</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-6">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              {/* Club Logo */}
              <div className="space-y-2">
                <Label>Club Logo</Label>
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
                      Upload Logo
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
              </div>

              <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div>
                  <h2 className="text-sm font-semibold text-white">Club Identity</h2>
                  <p className="text-xs text-white/60">This will be visible on your club profile</p>
                </div>

                {/* Club Name */}
                <div className="space-y-2">
                  <Label htmlFor="clubName">Club Name *</Label>
                  <Input
                    id="clubName"
                    value={formData.clubName}
                    onChange={(e) => setFormData(prev => ({ ...prev, clubName: e.target.value }))}
                    placeholder="e.g., Tech Innovation Club"
                    required
                  />
                </div>

                {/* University */}
                <div className="space-y-2">
                  <Label htmlFor="university">University *</Label>
                  <Autocomplete
                    options={universityOptions}
                    value={formData.university}
                    onChange={(value) => setFormData(prev => ({ ...prev, university: value }))}
                    placeholder="Your university"
                    searchPlaceholder="Type to search universities..."
                    emptyMessage="No universities found. You can enter a custom name."
                    icon={<Briefcase className="h-4 w-4 text-white/40" />}
                    allowCustomValue={true}
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Club Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {clubCategoryOptions.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Founding Year */}
                <div className="space-y-2">
                  <Label htmlFor="foundingYear">Founding Year *</Label>
                  <Select 
                    value={formData.foundingYear} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, foundingYear: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">About your club</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    className="pl-10 min-h-[100px]"
                    placeholder="What does your club do? Who is it for? What makes it unique?"
                  />
                </div>
              </div>

              {/* Interests */}
              <div className="space-y-2">
                <Label>What does your club focus on? *</Label>
                <p className="text-xs text-white/40">Used to recommend your club to students</p>
                <div className="flex flex-wrap gap-2 sm:gap-2.5">
                  {["Technology", "Arts", "Sports", "Music", "Entrepreneurship", 
                    "Social Service", "Environment", "Photography", "Literature", "Drama"].map((interest) => (
                    <div
                      key={interest}
                      onClick={() => {
                        const interests = [...formData.interests];
                        if (interests.includes(interest)) {
                          setFormData(prev => ({
                            ...prev,
                            interests: interests.filter((i) => i !== interest)
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            interests: [...interests, interest]
                          }));
                        }
                      }}
                      className={`cursor-pointer px-3 py-1.5 text-xs sm:text-sm rounded-full transition-colors ${
                        formData.interests.includes(interest)
                          ? "bg-white/[0.10] text-white"
                          : "bg-white/[0.04] text-white/60 hover:bg-white/[0.06]"
                      }`}
                    >
                      {interest}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-white/40">
                  Selected: {formData.interests.length} (minimum 1, recommended up to 3)
                </p>
              </div>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="social-links" className="border rounded-lg px-3">
                  <AccordionTrigger className="text-sm">Social Presence (Optional)</AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <p className="text-xs text-white/40 mb-3">Optional â€” you can add these later</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          value={formData.socialLinks.website}
                          onChange={(e) => updateSocialLink("website", e.target.value)}
                          placeholder="https://clubwebsite.com"
                          onKeyDown={handleEnterToNext}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="linkedin">LinkedIn</Label>
                        <Input
                          id="linkedin"
                          value={formData.socialLinks.linkedin}
                          onChange={(e) => updateSocialLink("linkedin", e.target.value)}
                          placeholder="club"
                          onKeyDown={handleEnterToNext}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="twitter">Twitter</Label>
                        <Input
                          id="twitter"
                          value={formData.socialLinks.twitter}
                          onChange={(e) => updateSocialLink("twitter", e.target.value)}
                          placeholder="club"
                          onKeyDown={handleEnterToNext}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="facebook">Facebook</Label>
                        <Input
                          id="facebook"
                          value={formData.socialLinks.facebook}
                          onChange={(e) => updateSocialLink("facebook", e.target.value)}
                          placeholder="club"
                          onKeyDown={handleEnterToNext}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="instagram">Instagram</Label>
                        <Input
                          id="instagram"
                          value={formData.socialLinks.instagram}
                          onChange={(e) => updateSocialLink("instagram", e.target.value)}
                          placeholder="club"
                          onKeyDown={handleEnterToNext}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <Button
                type="submit"
                className="w-full h-11 bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering Club...
                  </>
                ) : (
                  "Complete Registration"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ClubOnboarding;
