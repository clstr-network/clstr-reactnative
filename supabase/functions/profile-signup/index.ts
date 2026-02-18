import "./deno-shim.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const normalizeInterests = (interests: string[] = []) =>
  Array.from(new Set(interests.map((interest) => interest.trim()).filter(Boolean))).slice(0, 20);

const sanitizeString = (value?: string | null) => {
  if (!value) return "";
  return value.toString().trim();
};

const getDomainFromEmail = (email: string): string | null => {
  const parts = email.split("@");
  return parts.length > 1 ? parts[1].toLowerCase() : null;
};

const mapUserTypeToRole = (value?: string | null) => {
  if (!value) return "Student";
  const normalized = value.toLowerCase();
  switch (normalized) {
    case "student":
      return "Student";
    case "alumni":
      return "Alumni";
    case "faculty":
      return "Faculty";
    case "club":
    case "club lead":
      return "Club";
    case "organization":
      return "Organization";
    default:
      return "Student"; // Fallback ensures compatibility with user_role enum
  }
};

const baseProfileScore = 15;

const calculateProfileCompletion = (fields: {
  fullName?: string | null;
  university?: string | null;
  major?: string | null;
  graduationYear?: string | null;
  bio?: string | null;
  interests?: string[] | null;
  avatarUrl?: string | null;
}) => {
  let score = baseProfileScore;

  if (fields.fullName) score += 15;
  if (fields.university) score += 15;
  if (fields.major) score += 10;
  if (fields.graduationYear) score += 10;
  if (fields.bio && fields.bio.length > 30) score += 15;
  if ((fields.interests?.length || 0) >= 3) score += 15;
  if (fields.avatarUrl) score += 20;

  return Math.min(100, score);
};

const validateProfileData = (data: {
  full_name?: string | null;
  bio?: string | null;
  interests?: string[] | null;
  email?: string | null;
  graduation_year?: string | null;
}) => {
  const errors: string[] = [];

  if (!data.full_name || data.full_name.trim().length < 2) {
    errors.push("Full name must be at least 2 characters");
  }

  if (!data.email || !data.email.includes("@")) {
    errors.push("Valid email is required");
  }

  if (data.bio && data.bio.length > 500) {
    errors.push("Bio must be less than 500 characters");
  }

  if (data.interests && data.interests.length > 20) {
    errors.push("You can select up to 20 interests");
  }

  if (data.graduation_year) {
    const year = parseInt(data.graduation_year, 10);
    const currentYear = new Date().getFullYear();
    if (Number.isNaN(year) || year < 1950 || year > currentYear + 10) {
      errors.push(`Graduation year must be between 1950 and ${currentYear + 10}`);
    }
  }

  return { valid: errors.length === 0, errors };
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      console.error("Invalid request body received");
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, profile } = body as { userId?: string; profile?: Record<string, unknown> };

    if (!userId || typeof userId !== "string" || !profile) {
      console.error("Missing userId or profile:", { userId, hasProfile: !!profile });
      return new Response(
        JSON.stringify({ error: "Missing userId or profile payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Profile signup request for user:", userId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: "Supabase environment not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, serviceKey);

    const trimmedFirstName = sanitizeString(profile.firstName as string | undefined);
    const trimmedLastName = sanitizeString(profile.lastName as string | undefined);
    const fullName = `${trimmedFirstName} ${trimmedLastName}`.trim() || sanitizeString(profile.fullName as string | undefined) || "New Member";
    const trimmedUniversity = sanitizeString(profile.university as string | undefined) || null;
    const trimmedMajor = sanitizeString(profile.major as string | undefined) || null;
    const sanitizedBio = sanitizeString(profile.bio as string | undefined) || null;
    const sanitizedAvatarUrl = sanitizeString(profile.avatarUrl as string | undefined) || null;
    const normalizedInterests = normalizeInterests((profile.interests as string[] | undefined) ?? []);
    const email = sanitizeString(profile.email as string | undefined);
    const graduationYear = sanitizeString(profile.graduationYear as string | undefined) || null;
    const normalizedRole = mapUserTypeToRole(profile.userType as string | undefined);
    const domain = email ? getDomainFromEmail(email) : null;

    const validation = validateProfileData({
      full_name: fullName,
      bio: sanitizedBio ?? undefined,
      interests: normalizedInterests,
      email,
      graduation_year: graduationYear ?? undefined,
    });

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.errors.join(", ") }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!domain) {
      return new Response(
        JSON.stringify({ error: "Invalid email address - unable to extract domain" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const profileCompletion = calculateProfileCompletion({
      fullName,
      university: trimmedUniversity,
      major: trimmedMajor,
      graduationYear,
      bio: sanitizedBio,
      interests: normalizedInterests,
      avatarUrl: sanitizedAvatarUrl,
    });

    console.log("Attempting to insert/update profile for user:", userId);
    
    const { error } = await supabaseClient
      .from("profiles")
      .upsert(
        {
          id: userId,
          email,
          full_name: fullName,
          branch: trimmedMajor,
          major: trimmedMajor,
          university: trimmedUniversity,
          graduation_year: graduationYear,
          year_of_completion: graduationYear,
          bio: sanitizedBio,
          interests: normalizedInterests,
          role: normalizedRole,
          headline:
            trimmedMajor && trimmedUniversity
              ? `${trimmedMajor} · ${trimmedUniversity}`
              : trimmedMajor || trimmedUniversity || null,
          location: trimmedUniversity,
          domain,
          college_domain: domain,
          profile_completion: profileCompletion,
          avatar_url: sanitizedAvatarUrl,
        },
        { onConflict: "id" }
      );

    if (error) {
      console.error("Profile creation failed:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      let errorMessage = "Failed to create profile";
      let statusCode = 500;
      
      if (error.code === "23505") {
        errorMessage = "A profile with this email already exists";
        statusCode = 409;
      } else if (error.code === "23503") {
        errorMessage = "User authentication not found. Please sign up again.";
        statusCode = 400;
      } else if (error.code === "42501") {
        errorMessage = "Permission denied. RLS policy may be blocking profile creation.";
        statusCode = 403;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          code: error.code,
          details: error.details
        }),
        { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Profile created successfully for user:", userId);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("Unhandled error in profile-signup:", error);
    return new Response(
      JSON.stringify({ 
        error: message,
        type: error instanceof Error ? error.constructor.name : "Unknown"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
