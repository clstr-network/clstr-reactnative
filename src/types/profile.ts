export type BasicUserProfile = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  /**
   * @deprecated Use `college_domain` instead. This field is kept for backward
   * compatibility but is populated ONLY from `college_domain` in
   * `normalizeProfileRecord`. It will NEVER fall back to the deprecated
   * DB `domain` column or derive a value from email. Treat as read-only alias.
   */
  domain?: string | null;
  college_domain?: string | null;
  onboarding_complete?: boolean | null;
  role?: string | null;
  headline?: string | null;
  created_at?: string | null;
  branch?: string | null;
  university?: string | null;
  major?: string | null;
  graduation_year?: string | null;
  year_of_completion?: string | null;
  enrollment_year?: number | null;
  course_duration_years?: number | null;
  updated_at?: string | null;
  location?: string | null;
  profile_completion?: number | null;
  is_verified?: boolean | null;
  verified_at?: string | null;
  verification_method?: string | null;
  resume_storage_path?: string | null;
  resume_filename?: string | null;
  resume_url?: string | null;
  resume_updated_at?: string | null;
  // Email verification tracking
  email_verified_at?: string | null;
  domain_verified?: boolean | null;
  // Personal email (lifetime access)
  personal_email?: string | null;
  personal_email_verified?: boolean | null;
  personal_email_verified_at?: string | null;
  email_transition_status?: "none" | "pending" | "verified" | "transitioned" | null;
  personal_email_prompt_dismissed_at?: string | null;
  // Account deactivation lifecycle
  account_status?: "active" | "deactivated" | null;
  scheduled_deletion_at?: string | null;
};

export type SkillLevel = "Beginner" | "Intermediate" | "Expert" | "Professional";

export interface SkillData {
  id?: string;
  name: string;
  level: SkillLevel;
  profile_id?: string;
  created_at?: string | null;
  updated_at?: string | null;
  // Legacy fields for backward compatibility
  skill_name?: string;
  proficiency_level?: string;
  [key: string]: unknown;
}

export interface EducationData {
  id?: string;
  school: string;  // Matches Supabase field
  degree: string;
  description?: string | null;
  location?: string | null;
  start_date: string;
  end_date?: string | null;
  profile_id?: string;
  created_at?: string | null;
  updated_at?: string | null;
  // Legacy fields for backward compatibility
  institution?: string;
  field_of_study?: string;
  [key: string]: unknown;
}

export interface ExperienceData {
  id?: string;
  title: string;
  company: string;
  description?: string | null;
  location?: string | null;
  start_date: string;
  end_date?: string | null;
  profile_id?: string;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface ProjectData {
  id?: string;
  name: string;
  description?: string;
  url?: string;
  image_url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  skills?: string[];
  profile_id?: string;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface PostData {
  id?: string;
  content: string;
  created_at?: string;
  [key: string]: unknown;
}

export type UserProfile = BasicUserProfile & {
  bio?: string | null;
  interests?: string[] | null;
  location?: string | null;
  cover_photo_url?: string | null;
  connections?: string[];
  skills?: SkillData[];
  education?: EducationData[];
  experience?: ExperienceData[];
  projects?: ProjectData[];
  posts?: PostData[];
  social_links?: Record<string, string> | null;
};
