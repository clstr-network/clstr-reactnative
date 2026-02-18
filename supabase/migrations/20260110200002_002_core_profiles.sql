-- ============================================================================
-- 002_core_profiles.sql - Core profiles table and role-specific profiles
-- U-Hub Platform Database Baseline
-- ============================================================================

BEGIN;

-- ============================================================================
-- CORE PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  full_name text,
  avatar_url text,
  cover_photo_url text,
  headline text,
  bio text,
  location text,
  branch text,
  year_of_completion text,
  role public.user_role DEFAULT 'Student',
  university text,
  major text,
  graduation_year text,
  interests text[] DEFAULT '{}'::text[],
  social_links jsonb DEFAULT '{}'::jsonb,
  profile_completion integer DEFAULT 0,
  domain text,
  college_domain text,
  domain_verified boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  verified_by uuid,
  verification_method text,
  verification_requested_at timestamptz,
  email_verified_at timestamptz,
  last_seen timestamptz,
  onboarding_complete boolean DEFAULT false,
  role_data jsonb DEFAULT '{}'::jsonb,
  resume_url text,
  resume_filename text,
  resume_storage_path text,
  resume_updated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_domain_idx ON public.profiles(domain);
CREATE INDEX IF NOT EXISTS profiles_college_domain_idx ON public.profiles(college_domain);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_full_name_idx ON public.profiles(full_name);
CREATE INDEX IF NOT EXISTS profiles_university_idx ON public.profiles(university);
CREATE INDEX IF NOT EXISTS profiles_last_seen_idx ON public.profiles(last_seen);

-- ============================================================================
-- STUDENT PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  college_domain text,
  student_id text,
  current_year integer CHECK (current_year >= 1 AND current_year <= 7),
  current_semester text,
  expected_graduation date,
  gpa numeric(4,2) CHECK (gpa >= 0 AND gpa <= 4.0),
  academic_standing text CHECK (academic_standing IN ('Good Standing', 'Probation', 'Honors', 'Dean''s List')),
  enrollment_status text DEFAULT 'Full-time' CHECK (enrollment_status IN ('Full-time', 'Part-time', 'Leave of Absence')),
  minor text,
  specialization text,
  clubs text[] DEFAULT '{}',
  academic_achievements text[] DEFAULT '{}',
  research_interests text[] DEFAULT '{}',
  seeking_internship boolean DEFAULT false,
  seeking_research_opportunity boolean DEFAULT false,
  available_for_tutoring boolean DEFAULT false,
  tutoring_subjects text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS student_profiles_user_id_idx ON public.student_profiles(user_id);
CREATE INDEX IF NOT EXISTS student_profiles_college_domain_idx ON public.student_profiles(college_domain);
CREATE INDEX IF NOT EXISTS student_profiles_current_year_idx ON public.student_profiles(current_year);

-- ============================================================================
-- ALUMNI PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.alumni_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  college_domain text,
  graduation_year integer NOT NULL,
  graduation_date date,
  degree_obtained text,
  current_company text,
  current_position text,
  industry text,
  years_of_experience integer,
  career_level text CHECK (career_level IN ('Entry', 'Mid', 'Senior', 'Executive', 'C-Level')),
  employment_status text CHECK (employment_status IN ('Employed', 'Self-Employed', 'Entrepreneur', 'Between Jobs', 'Retired')),
  linkedin_url text,
  company_website text,
  willing_to_mentor boolean DEFAULT false,
  mentorship_areas text[] DEFAULT '{}',
  available_for_recruitment boolean DEFAULT false,
  open_to_opportunities boolean DEFAULT false,
  can_provide_referrals boolean DEFAULT false,
  available_for_speaking boolean DEFAULT false,
  willing_to_post_jobs boolean DEFAULT false,
  donations_made integer DEFAULT 0,
  events_attended integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alumni_profiles_user_id_idx ON public.alumni_profiles(user_id);
CREATE INDEX IF NOT EXISTS alumni_profiles_college_domain_idx ON public.alumni_profiles(college_domain);
CREATE INDEX IF NOT EXISTS alumni_profiles_graduation_year_idx ON public.alumni_profiles(graduation_year);
CREATE INDEX IF NOT EXISTS alumni_profiles_willing_to_mentor_idx ON public.alumni_profiles(willing_to_mentor);
CREATE INDEX IF NOT EXISTS alumni_profiles_industry_idx ON public.alumni_profiles(industry);

-- ============================================================================
-- FACULTY PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.faculty_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  college_domain text,
  employee_id text,
  department text NOT NULL,
  position text NOT NULL CHECK (position IN ('Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor', 'Department Head', 'Dean', 'Adjunct', 'Visiting Professor')),
  tenure_status text CHECK (tenure_status IN ('Tenured', 'Tenure-Track', 'Non-Tenure Track', 'Adjunct')),
  office_location text,
  office_hours text,
  phone_extension text,
  research_areas text[] DEFAULT '{}',
  publications jsonb DEFAULT '[]'::jsonb,
  courses_taught text[] DEFAULT '{}',
  current_courses text[] DEFAULT '{}',
  academic_credentials text[] DEFAULT '{}',
  research_lab text,
  accepting_phd_students boolean DEFAULT false,
  accepting_research_assistants boolean DEFAULT false,
  consultation_available boolean DEFAULT false,
  years_at_institution integer,
  awards text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS faculty_profiles_user_id_idx ON public.faculty_profiles(user_id);
CREATE INDEX IF NOT EXISTS faculty_profiles_college_domain_idx ON public.faculty_profiles(college_domain);
CREATE INDEX IF NOT EXISTS faculty_profiles_department_idx ON public.faculty_profiles(department);
CREATE INDEX IF NOT EXISTS faculty_profiles_position_idx ON public.faculty_profiles(position);

-- ============================================================================
-- CLUB PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.club_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  college_domain text,
  club_type text CHECK (club_type IN ('Academic', 'Sports', 'Cultural', 'Social', 'Professional', 'Service', 'Special Interest', 'Greek Life')),
  founded_date date,
  registration_number text,
  member_count integer DEFAULT 0,
  active_member_count integer DEFAULT 0,
  faculty_advisor uuid REFERENCES public.profiles(id),
  meeting_schedule text,
  meeting_location text,
  membership_fee numeric(10,2),
  membership_requirements text,
  recruitment_open boolean DEFAULT true,
  recruitment_period text,
  leadership_team jsonb DEFAULT '[]'::jsonb,
  contact_email text,
  social_media jsonb DEFAULT '{}'::jsonb,
  achievements text[] DEFAULT '{}',
  upcoming_events text[] DEFAULT '{}',
  budget_allocation numeric(12,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS club_profiles_user_id_idx ON public.club_profiles(user_id);
CREATE INDEX IF NOT EXISTS club_profiles_college_domain_idx ON public.club_profiles(college_domain);
CREATE INDEX IF NOT EXISTS club_profiles_type_idx ON public.club_profiles(club_type);
CREATE INDEX IF NOT EXISTS club_profiles_recruitment_idx ON public.club_profiles(recruitment_open);

-- ============================================================================
-- ORGANIZATION PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.organization_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  college_domain text,
  organization_type text CHECK (organization_type IN ('Department', 'Administrative Office', 'Company', 'NGO', 'Research Center', 'Lab', 'Library', 'Career Services')),
  registration_number text,
  established_date date,
  contact_person_name text,
  contact_person_title text,
  contact_email text NOT NULL,
  contact_phone text,
  office_location text,
  operating_hours text,
  services_offered text[] DEFAULT '{}',
  website_url text,
  parent_organization text,
  staff_count integer,
  service_areas text[] DEFAULT '{}',
  can_post_jobs boolean DEFAULT false,
  can_post_events boolean DEFAULT true,
  can_verify_students boolean DEFAULT false,
  budget numeric(15,2),
  is_hiring boolean DEFAULT false,
  partnership_opportunities boolean DEFAULT false,
  collaboration_areas text[] DEFAULT '{}',
  additional_contacts jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organization_profiles_user_id_idx ON public.organization_profiles(user_id);
CREATE INDEX IF NOT EXISTS organization_profiles_college_domain_idx ON public.organization_profiles(college_domain);
CREATE INDEX IF NOT EXISTS organization_profiles_type_idx ON public.organization_profiles(organization_type);

-- ============================================================================
-- PROFILE DETAIL TABLES
-- ============================================================================

-- Profile Experience
CREATE TABLE IF NOT EXISTS public.profile_experience (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  company text NOT NULL,
  location text,
  start_date text NOT NULL,
  end_date text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_experience_profile_id_idx ON public.profile_experience(profile_id);

-- Profile Education
CREATE TABLE IF NOT EXISTS public.profile_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  degree text NOT NULL,
  school text NOT NULL,
  location text,
  start_date text NOT NULL,
  end_date text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_education_profile_id_idx ON public.profile_education(profile_id);

-- Profile Skills
CREATE TABLE IF NOT EXISTS public.profile_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  level public.skill_level NOT NULL DEFAULT 'Intermediate',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, name)
);

CREATE INDEX IF NOT EXISTS profile_skills_profile_id_idx ON public.profile_skills(profile_id);

-- Profile Views
CREATE TABLE IF NOT EXISTS public.profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  viewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  view_date text,
  viewed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_views_profile_id_idx ON public.profile_views(profile_id);
CREATE INDEX IF NOT EXISTS profile_views_viewer_id_idx ON public.profile_views(viewer_id);
CREATE INDEX IF NOT EXISTS profile_views_viewed_at_idx ON public.profile_views(viewed_at);

-- Profile Certifications
CREATE TABLE IF NOT EXISTS public.profile_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  issuer text NOT NULL,
  issue_date text,
  expiry_date text,
  credential_id text,
  credential_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_certifications_profile_id_idx ON public.profile_certifications(profile_id);

-- Profile Projects
CREATE TABLE IF NOT EXISTS public.profile_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  url text,
  start_date text,
  end_date text,
  skills text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_projects_profile_id_idx ON public.profile_projects(profile_id);

-- Profile Achievements
CREATE TABLE IF NOT EXISTS public.profile_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  date text,
  issuer text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_achievements_profile_id_idx ON public.profile_achievements(profile_id);

-- ============================================================================
-- USER SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_visibility text DEFAULT 'public',
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  message_notifications boolean DEFAULT true,
  connection_notifications boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- ACCOUNT DELETION AUDIT
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.account_deletion_audit (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL,
  email text,
  source text DEFAULT 'web',
  created_at timestamptz DEFAULT now()
);

COMMIT;
