import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import type { UserProfile, ProjectData, SkillData, SkillLevel, EducationData, ExperienceData, PostData } from "@/types/profile";
import { getDomainFromEmail, normalizeCollegeDomain } from "@/lib/validation";
import { handleApiError } from "@/lib/errorHandler";
import { assertValidUuid } from "@/lib/uuid";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const COMPRESSION_MAX_DIMENSION = 800;
const COMPRESSION_MIN_IMPROVEMENT_BYTES = 50 * 1024; // only keep compressed result if at least 50KB smaller
const isBrowserEnvironment = typeof window !== "undefined" && typeof document !== "undefined";

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type RetryOptions = {
  retries?: number;
  delayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
};

const executeWithRetry = async <T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> => {
  const { retries = 2, delayMs = 700, shouldRetry } = options;
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const allowRetry = shouldRetry ? shouldRetry(error) : true;
      if (attempt === retries || !allowRetry) {
        break;
      }
      await sleep(delayMs * (attempt + 1));
      attempt += 1;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error("Operation failed after retries");
};

const normalizeInterests = (interests: string[] = []) =>
  Array.from(new Set(interests.map((interest) => interest.trim()).filter(Boolean))).slice(0, 20);

const mapUserTypeToRole = (value?: string | null): Database["public"]["Enums"]["user_role"] => {
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
      return "Club";
    case "organization":
      return "Organization";
    default:
      throw new Error(`Unknown user role: ${value}`);
  }
};

export const sanitizeSocialLinks = (links?: Record<string, string>) => {
  if (!links) return {};

  const sanitized: Record<string, string> = {};
  const socialBases: Record<string, string> = {
    linkedin: "https://linkedin.com/",
    twitter: "https://twitter.com/",
    facebook: "https://facebook.com/",
    instagram: "https://instagram.com/",
    googleScholar: "https://scholar.google.com/",
  };

  Object.entries(links).forEach(([key, value]) => {
    if (!value) return;
    const trimmed = value.trim();
    if (!trimmed) return;

    const isAbsolute = /^https?:\/\//i.test(trimmed);
    let normalized = trimmed;

    if (!isAbsolute) {
      const lower = trimmed.toLowerCase();
      const base = socialBases[key];

      if (base) {
        const baseHost = new URL(base).hostname;
        if (lower.includes(baseHost)) {
          normalized = `https://${trimmed}`;
        } else {
          const cleaned = trimmed.replace(/^@/, "").replace(/^\//, "");
          normalized = `${base}${cleaned}`;
        }
      } else {
        normalized = `https://${trimmed}`;
      }
    }

    try {
      const url = new URL(normalized);
      sanitized[key] = url.toString();
    } catch (_error) {
      // ignore invalid URLs
    }
  });

  return sanitized;
};

const getExtensionFromFile = (file: File) => MIME_EXTENSION_MAP[file.type] || file.name.split(".").pop() || "jpg";

const maybeCompressAvatar = async (file: File): Promise<File> => {
  if (!isBrowserEnvironment || file.size <= 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = image;
      if (!width || !height) {
        resolve(file);
        return;
      }

      if (width > height && width > COMPRESSION_MAX_DIMENSION) {
        height = Math.round((height * COMPRESSION_MAX_DIMENSION) / width);
        width = COMPRESSION_MAX_DIMENSION;
      } else if (height >= width && height > COMPRESSION_MAX_DIMENSION) {
        width = Math.round((width * COMPRESSION_MAX_DIMENSION) / height);
        height = COMPRESSION_MAX_DIMENSION;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(image, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob || file.size - blob.size < COMPRESSION_MIN_IMPROVEMENT_BYTES) {
            resolve(file);
            return;
          }
          const compressedFile = new File([blob], file.name, { type: file.type });
          resolve(compressedFile);
        },
        file.type,
        0.85
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    image.src = objectUrl;
  });
};

export class ProfileError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "ProfileError";
  }
}

export type ProfileSignupPayload = {
  firstName: string;
  lastName: string;
  email: string;
  university: string;
  major: string;
  graduationYear: string;
  bio: string;
  interests: string[];
  userType?: string;
};

export type ProfileUpdatePayload = Partial<{
  full_name: string | null;
  bio: string | null;
  location: string | null;
  headline: string | null;
  university: string | null;
  major: string | null;
  graduation_year: string | null;
  interests: string[] | null;
  social_links: Record<string, string> | null;
  phone: string | null;
  role: Database["public"]["Enums"]["user_role"] | null;
  onboarding_complete: boolean;
  avatar_url: string | null;
}>;

/**
 * Validates avatar file before upload
 */
export const validateAvatarFile = (file: File): { valid: boolean; error?: string } => {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return { valid: false, error: `File size must be less than ${MAX_AVATAR_SIZE / 1024 / 1024}MB` };
  }

  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return { valid: false, error: "File type must be JPEG, PNG, WebP, or GIF" };
  }

  return { valid: true };
};

/**
 * Uploads profile avatar with validation and retry logic
 */
export const uploadProfileAvatar = async (
  file: File,
  userId: string,
  retries = 3
): Promise<string> => {
  const processedFile = await maybeCompressAvatar(file);
  const validation = validateAvatarFile(processedFile);
  if (!validation.valid) {
    throw new ProfileError(validation.error!, "INVALID_FILE");
  }

  const extension = getExtensionFromFile(processedFile);
  const filePath = `${userId}/${Date.now()}.${extension}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const { error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, processedFile, {
          cacheControl: "3600",
          upsert: true,
          contentType: processedFile.type,
        });

      if (error) {
        if (error.message.includes("not found")) {
          throw new ProfileError(
            "Avatar bucket missing. Create an 'avatars' bucket in Supabase storage.",
            "BUCKET_NOT_FOUND"
          );
        }
        throw new ProfileError(`Failed to upload avatar: ${error.message}`, "UPLOAD_FAILED");
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      lastError = error as Error;
      if (error instanceof ProfileError && error.code === "BUCKET_NOT_FOUND") {
        throw error; // Don't retry for bucket not found
      }
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new ProfileError("Failed to upload avatar after multiple attempts", "UPLOAD_FAILED");
};

const getAvatarStoragePathFromPublicUrl = (avatarUrl: string): string | null => {
  try {
    const parsed = new URL(avatarUrl);
    const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) {
      return null;
    }

    const encodedPath = parsed.pathname.slice(markerIndex + marker.length);
    const filePath = decodeURIComponent(encodedPath);
    return filePath || null;
  } catch {
    return null;
  }
};

export const removeProfileAvatar = async (avatarUrl: string | null | undefined): Promise<void> => {
  if (!avatarUrl) {
    return;
  }

  const filePath = getAvatarStoragePathFromPublicUrl(avatarUrl);
  if (!filePath) {
    return;
  }

  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([filePath]);
  if (error) {
    throw new ProfileError(`Failed to remove avatar file: ${error.message}`, "REMOVE_FAILED");
  }
};

export const calculateProfileCompletion = (fields: {
  fullName?: string | null;
  university?: string | null;
  major?: string | null;
  graduationYear?: string | null;
  bio?: string | null;
  interests?: string[] | null;
  avatarUrl?: string | null;
  location?: string | null;
  headline?: string | null;
  phone?: string | null;
  role?: string | null;
}) => {
  const baseProfileScore = 10;
  let score = baseProfileScore; // baseline for creating an account

  // Critical fields (60 points total)
  if (fields.fullName) score += 15;
  if (fields.university) score += 15;
  if (fields.major) score += 10;
  if (fields.avatarUrl) score += 20;

  // Important fields (25 points total)
  if (fields.graduationYear) score += 8;
  if (fields.bio && fields.bio.length > 30) score += 12;
  if ((fields.interests?.length || 0) >= 3) score += 5;

  // Optional fields (15 points total)
  if (fields.location) score += 5;
  if (fields.headline) score += 5;
  if (fields.phone) score += 3;
  if (fields.role) score += 2;

  return Math.min(100, score);
};

/**
 * Checks if a profile is complete enough for full access
 */
export const isProfileComplete = (profile: UserProfile | null): boolean => {
  if (!profile) return false;

  const completion = profile.profile_completion || 0;
  return completion >= 70; // Minimum 70% completion required
};

/**
 * Gets missing profile fields for completion
 */
export const getMissingProfileFields = (profile: UserProfile | null): string[] => {
  if (!profile) return ["Profile not found"];

  const missing: string[] = [];

  if (!profile.full_name) missing.push("Full name");
  if (!profile.university) missing.push("University");
  if (!profile.major) missing.push("Major");
  if (!profile.graduation_year) missing.push("Graduation year");
  if (!profile.bio || profile.bio.length < 30) missing.push("Bio (at least 30 characters)");
  if (!profile.interests || profile.interests.length < 3) missing.push("At least 3 interests");
  if (!profile.avatar_url) missing.push("Profile picture");

  return missing;
};

/**
 * Validates profile data before creation/update
 */
export const validateProfileData = (data: Partial<UserProfile>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (data.full_name && data.full_name.length < 2) {
    errors.push("Full name must be at least 2 characters");
  }

  if (data.bio && data.bio.length > 500) {
    errors.push("Bio must be less than 500 characters");
  }

  if (data.location && data.location.length > 120) {
    errors.push("Location must be less than 120 characters");
  }

  if (data.headline && data.headline.length > 140) {
    errors.push("Headline must be less than 140 characters");
  }

  if (data.interests && data.interests.length > 20) {
    errors.push("You can select up to 20 interests");
  }

  if (data.email && !data.email.includes("@")) {
    errors.push("Invalid email format");
  }

  if (data.graduation_year) {
    const year = parseInt(data.graduation_year);
    const currentYear = new Date().getFullYear();
    if (year < 1950 || year > currentYear + 10) {
      errors.push("Graduation year must be between 1950 and " + (currentYear + 10));
    }
  }

  if (data.social_links) {
    Object.entries(data.social_links).forEach(([platform, url]) => {
      if (!url) return;
      try {
        const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        new URL(normalized);
      } catch (_error) {
        errors.push(`Invalid URL for ${platform}`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Creates a new profile record in the database
 */
export const createProfileRecord = async (
  args: {
    userId: string;
    payload: ProfileSignupPayload;
    avatarUrl?: string | null;
  },
  retries = 2
): Promise<void> => {
  const { userId, payload, avatarUrl } = args;

  if (!userId) {
    throw new ProfileError("User ID is required", "MISSING_USER_ID");
  }

  const trimmedFirstName = payload.firstName.trim();
  const trimmedLastName = payload.lastName.trim();
  const fullName = `${trimmedFirstName} ${trimmedLastName}`.trim();
  const normalizedInterests = normalizeInterests(payload.interests);
  const emailDomain = getDomainFromEmail(payload.email) || null;
  const collegeDomain = emailDomain ? normalizeCollegeDomain(emailDomain) : '';
  const trimmedUniversity = payload.university.trim();
  const trimmedMajor = payload.major.trim();
  const sanitizedBio = payload.bio?.trim() || null;
  const headline = `${trimmedMajor} · ${trimmedUniversity}`;
  const normalizedRole = mapUserTypeToRole(payload.userType);

  // Validate before creating
  const validation = validateProfileData({
    full_name: fullName,
    bio: sanitizedBio || undefined,
    interests: normalizedInterests,
    email: payload.email,
    graduation_year: payload.graduationYear,
  });

  if (!validation.valid) {
    throw new ProfileError(`Invalid profile data: ${validation.errors.join(", ")}`, "VALIDATION_FAILED");
  }

  const profileInsert: Database["public"]["Tables"]["profiles"]["Insert"] = {
    id: userId,
    email: payload.email,
    full_name: fullName,
    avatar_url: avatarUrl || null,
    branch: trimmedMajor,
    year_of_completion: payload.graduationYear,
    graduation_year: payload.graduationYear,
    university: trimmedUniversity,
    major: trimmedMajor,
    bio: sanitizedBio,
    interests: normalizedInterests,
    role: normalizedRole,
    headline,
    location: trimmedUniversity,
    college_domain: collegeDomain || null,
    social_links: {} as Json,
  };

  await executeWithRetry(async () => {
    const { error } = await supabase
      .from("profiles")
      .upsert(profileInsert, { onConflict: "id" });

    if (error) {
      throw new ProfileError(`Failed to create profile: ${error.message}`, "DB_ERROR");
    }
  }, { retries });
};

// Related data that can be passed to normalizeProfileRecord
interface ProfileRelatedData {
  projects?: ProjectData[];
  skills?: unknown[];
  education?: unknown[];
  experience?: unknown[];
  posts?: unknown[];
}

export const normalizeProfileRecord = (
  record: Database["public"]["Tables"]["profiles"]["Row"],
  relatedData?: ProfileRelatedData
): UserProfile => {
  // COMMUNITY ISOLATION: domain MUST come from college_domain ONLY.
  // The deprecated `record.domain` column is NEVER used — it may contain
  // stale or public-domain values (e.g. gmail.com) after email transition.
  // ECF-4 FIX: Killed fallback to record.domain.
  const domain = record.college_domain ?? null;
  const socialLinks = (record.social_links as Record<string, string> | null) ?? {};
  const onboardingComplete =
    "onboarding_complete" in record
      ? ((record as Record<string, unknown>).onboarding_complete as boolean | null)
      : null;

  const resumeStoragePath = (record as Record<string, unknown>).resume_storage_path as string | null | undefined;
  const resumeFileName = (record as Record<string, unknown>).resume_filename as string | null | undefined;
  const resumeUrl = (record as Record<string, unknown>).resume_url as string | null | undefined;
  const resumeUpdatedAt = (record as Record<string, unknown>).resume_updated_at as string | null | undefined;

  return {
    ...record,
    id: record.id as string,
    onboarding_complete: onboardingComplete,
    domain,
    social_links: socialLinks,
    resume_storage_path: resumeStoragePath ?? null,
    resume_filename: resumeFileName ?? null,
    resume_url: resumeUrl ?? null,
    resume_updated_at: resumeUpdatedAt ?? null,
    interests: record.interests ?? [],
    connections: [],
    skills: (relatedData?.skills ?? []) as SkillData[],
    education: (relatedData?.education ?? []) as EducationData[],
    experience: (relatedData?.experience ?? []) as ExperienceData[],
    projects: relatedData?.projects ?? [],
    posts: (relatedData?.posts ?? []) as PostData[],
  };
};

/**
 * Updates an existing profile with validation
 */
export const updateProfileRecord = async (
  userId: string,
  updates: ProfileUpdatePayload
): Promise<void> => {
  if (!userId) {
    throw new ProfileError("User ID is required", "MISSING_USER_ID");
  }

  const normalizedUpdates: ProfileUpdatePayload = { ...updates };

  if (normalizedUpdates.full_name) {
    normalizedUpdates.full_name = normalizedUpdates.full_name.trim();
  }

  if (normalizedUpdates.bio !== undefined) {
    normalizedUpdates.bio = normalizedUpdates.bio?.trim() || null;
  }

  if (normalizedUpdates.location !== undefined) {
    normalizedUpdates.location = normalizedUpdates.location?.trim() || null;
  }

  if (normalizedUpdates.headline !== undefined) {
    normalizedUpdates.headline = normalizedUpdates.headline?.trim() || null;
  }

  if (normalizedUpdates.university !== undefined) {
    normalizedUpdates.university = normalizedUpdates.university?.trim() || null;
  }

  if (normalizedUpdates.major !== undefined) {
    normalizedUpdates.major = normalizedUpdates.major?.trim() || null;
  }

  if (normalizedUpdates.interests) {
    normalizedUpdates.interests = normalizeInterests(normalizedUpdates.interests);
  }

  if (normalizedUpdates.social_links) {
    normalizedUpdates.social_links = sanitizeSocialLinks(normalizedUpdates.social_links);
  }

  // Validate updates
  const validation = validateProfileData(normalizedUpdates);
  if (!validation.valid) {
    throw new ProfileError(`Invalid update data: ${validation.errors.join(", ")}`, "VALIDATION_FAILED");
  }

  const { role: pendingRole, ...updatesWithoutRole } = normalizedUpdates;

  const updatePayload: Database["public"]["Tables"]["profiles"]["Update"] = {
    ...(updatesWithoutRole as Database["public"]["Tables"]["profiles"]["Update"]),
  };

  if (pendingRole !== undefined && pendingRole !== null) {
    updatePayload.role = mapUserTypeToRole(pendingRole);
  }

  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select(
      "full_name, university, major, graduation_year, bio, interests, avatar_url, location, headline, phone, role"
    )
    .eq("id", userId)
    .maybeSingle();

  if (selectError) {
    throw new ProfileError(`Failed to load profile: ${selectError.message}`, "FETCH_FAILED");
  }

  updatePayload.profile_completion = calculateProfileCompletion({
    fullName: normalizedUpdates.full_name ?? existingProfile?.full_name ?? null,
    university: normalizedUpdates.university ?? existingProfile?.university ?? null,
    major: normalizedUpdates.major ?? existingProfile?.major ?? null,
    graduationYear: normalizedUpdates.graduation_year ?? existingProfile?.graduation_year ?? null,
    bio: normalizedUpdates.bio ?? existingProfile?.bio ?? null,
    interests: normalizedUpdates.interests ?? existingProfile?.interests ?? null,
    avatarUrl: normalizedUpdates.avatar_url ?? existingProfile?.avatar_url ?? null,
  });

  await executeWithRetry(async () => {
    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId);

    if (error) {
      throw new ProfileError(`Failed to update profile: ${error.message}`, "UPDATE_FAILED");
    }
  });
};

/**
 * Deletes a user's avatar from storage
 */
export const deleteProfileAvatar = async (userId: string, avatarUrl: string): Promise<void> => {
  if (!avatarUrl) return;

  try {
    // Extract file path from URL
    const urlParts = avatarUrl.split("/");
    const bucketIndex = urlParts.findIndex((part) => part === AVATAR_BUCKET);
    if (bucketIndex === -1) return;

    const filePath = urlParts.slice(bucketIndex + 1).join("/");

    const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([filePath]);

    if (error && !error.message.includes("not found")) {
      handleApiError(error, {
        operation: 'deleteProfileAvatar',
        userMessage: 'Failed to delete avatar.',
        showToast: false, // Don't show toast for avatar deletion
      });
    }
  } catch (error) {
    handleApiError(error, {
      operation: 'deleteProfileAvatar',
      showToast: false,
    });
  }
};

const purgeAvatarFolder = async (userId: string) => {
  try {
    const { data: files, error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .list(userId, { limit: 100 });

    if (error || !files?.length) {
      return;
    }

    const paths = files.map((file) => `${userId}/${file.name}`);
    await supabase.storage.from(AVATAR_BUCKET).remove(paths);
  } catch (error) {
    handleApiError(error, {
      operation: 'purgeAvatarFolder',
      showToast: false,
    });
  }
};

/**
 * Updates profile avatar (uploads new one and deletes old one)
 */
export const updateProfileAvatar = async (
  userId: string,
  file: File,
  currentAvatarUrl?: string | null
): Promise<string> => {
  // Upload new avatar
  const newAvatarUrl = await uploadProfileAvatar(file, userId);

  await executeWithRetry(async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: newAvatarUrl })
      .eq("id", userId);

    if (error) {
      throw new ProfileError(`Failed to save avatar: ${error.message}`, "UPDATE_FAILED");
    }
  });

  // Delete old avatar if exists
  if (currentAvatarUrl) {
    await deleteProfileAvatar(userId, currentAvatarUrl);
  }

  return newAvatarUrl;
};

/**
 * Checks if a profile exists for a user
 */
export const profileExists = async (userId: string): Promise<boolean> => {
  if (!userId) {
    throw new ProfileError("User ID is required to check profile existence", "MISSING_USER_ID");
  }

  assertValidUuid(userId, "userId");

  const record = await executeWithRetry(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw new ProfileError(`Failed to check profile: ${error.message}`, "FETCH_FAILED");
    }

    return data;
  });

  return !!record;
};

/**
 * Fetches a profile by user ID with related data (projects, skills, etc.)
 */
export const getProfileById = async (userId: string): Promise<UserProfile | null> => {
  if (!userId) {
    throw new ProfileError("User ID is required to load profile", "MISSING_USER_ID");
  }

  assertValidUuid(userId, "userId");

  const record = await executeWithRetry(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw new ProfileError(`Failed to fetch profile: ${error.message}`, "FETCH_FAILED");
    }

    return data;
  });

  if (!record) {
    return null;
  }

  // Fetch all related data in parallel for complete profile (including portfolio)
  const [projectsRes, educationRes, experienceRes, skillsRes, postsRes] = await Promise.all([
    (supabase as any)
      .from("profile_projects")
      .select("id, name, description, url, image_url, start_date, end_date, skills, created_at, updated_at")
      .eq("profile_id", userId)
      .order("start_date", { ascending: false }),
    (supabase as any)
      .from("profile_education")
      .select("id, degree, school, description, location, start_date, end_date, profile_id, created_at, updated_at")
      .eq("profile_id", userId)
      .order("start_date", { ascending: false }),
    (supabase as any)
      .from("profile_experience")
      .select("id, title, company, description, location, start_date, end_date, profile_id, created_at, updated_at")
      .eq("profile_id", userId)
      .order("start_date", { ascending: false }),
    (supabase as any)
      .from("profile_skills")
      .select("id, name, level, profile_id, created_at, updated_at")
      .eq("profile_id", userId),
    (supabase as any)
      .from("posts")
      .select("id, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const relatedErrors = [
    { table: "profile_projects", error: projectsRes.error },
    { table: "profile_education", error: educationRes.error },
    { table: "profile_experience", error: experienceRes.error },
    { table: "profile_skills", error: skillsRes.error },
    { table: "posts", error: postsRes.error },
  ].filter((entry) => Boolean(entry.error));

  if (relatedErrors.length > 0) {
    const details = relatedErrors
      .map((entry) => `${entry.table}: ${(entry.error as { message?: string })?.message ?? "unknown error"}`)
      .join("; ");
    // Log but don't throw — partial profile is better than no profile at all
    console.warn(`[profile] Non-fatal errors fetching related data: ${details}`);
  }

  const projects = (projectsRes.data ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    name: (p.name as string) ?? "",
    description: (p.description as string) ?? "",
    url: (p.url as string) ?? "",
    image_url: (p.image_url as string | null) ?? null,
    start_date: (p.start_date as string | null) ?? null,
    end_date: (p.end_date as string | null) ?? null,
    skills: (p.skills as string[]) ?? [],
    created_at: (p.created_at as string | null) ?? null,
    updated_at: (p.updated_at as string | null) ?? null,
  }));

  const education = (educationRes.data ?? []).map((e: Record<string, unknown>) => ({
    id: e.id as string,
    school: (e.school as string) ?? "",
    institution: (e.school as string) ?? "",
    degree: (e.degree as string) ?? "",
    description: (e.description as string | null) ?? null,
    field_of_study: (e.description as string | null) ?? null,
    location: (e.location as string | null) ?? null,
    start_date: (e.start_date as string) ?? "",
    end_date: (e.end_date as string | null) ?? null,
    profile_id: (e.profile_id as string) ?? userId,
    created_at: (e.created_at as string | null) ?? null,
    updated_at: (e.updated_at as string | null) ?? null,
  }));

  const experience = (experienceRes.data ?? []).map((e: Record<string, unknown>) => ({
    id: e.id as string,
    title: (e.title as string) ?? "",
    company: (e.company as string) ?? "",
    description: (e.description as string | null) ?? null,
    location: (e.location as string | null) ?? null,
    start_date: (e.start_date as string) ?? "",
    end_date: (e.end_date as string | null) ?? null,
    profile_id: (e.profile_id as string) ?? userId,
    created_at: (e.created_at as string | null) ?? null,
    updated_at: (e.updated_at as string | null) ?? null,
  }));

  const skills = (skillsRes.data ?? []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    name: (s.name as string) ?? "",
    skill_name: (s.name as string) ?? "",
    level: ((s.level as string) ?? "Beginner") as SkillLevel,
    proficiency_level: (s.level as string) ?? "Beginner",
    profile_id: (s.profile_id as string) ?? userId,
    created_at: (s.created_at as string | null) ?? null,
    updated_at: (s.updated_at as string | null) ?? null,
  }));

  const posts = (postsRes.data ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    content: (p.content as string) ?? "",
    created_at: (p.created_at as string) ?? "",
  }));

  return normalizeProfileRecord(record, { projects, education, experience, skills, posts });
};

/**
 * Deletes a user profile and associated data
 */
export const deleteProfile = async (userId: string): Promise<void> => {
  assertValidUuid(userId, "userId");
  // Get current profile to delete avatar
  const profile = await getProfileById(userId);

  if (profile?.avatar_url) {
    await deleteProfileAvatar(userId, profile.avatar_url);
  }

  await purgeAvatarFolder(userId);

  // Delete profile record
  await executeWithRetry(async () => {
    const { error } = await supabase.from("profiles").delete().eq("id", userId);

    if (error) {
      throw new ProfileError(`Failed to delete profile: ${error.message}`, "DELETE_FAILED");
    }
  });
};
