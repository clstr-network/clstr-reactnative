-- Create role-specific profile tables with detailed fields
BEGIN;

-- ============================================================================
-- STUDENT PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id text, -- University student ID
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

-- ============================================================================
-- ALUMNI PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.alumni_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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

-- ============================================================================
-- FACULTY PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.faculty_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id text,
  department text NOT NULL,
  position text NOT NULL CHECK (position IN ('Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor', 'Department Head', 'Dean', 'Adjunct', 'Visiting Professor')),
  tenure_status text CHECK (tenure_status IN ('Tenured', 'Tenure-Track', 'Non-Tenure Track', 'Adjunct')),
  office_location text,
  office_hours text,
  phone_extension text,
  research_areas text[] DEFAULT '{}',
  publications jsonb DEFAULT '[]'::jsonb, -- Array of publication objects
  courses_taught text[] DEFAULT '{}',
  current_courses text[] DEFAULT '{}',
  academic_credentials text[] DEFAULT '{}', -- PhDs, certifications
  research_lab text,
  accepting_phd_students boolean DEFAULT false,
  accepting_research_assistants boolean DEFAULT false,
  consultation_available boolean DEFAULT false,
  years_at_institution integer,
  awards text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- CLUB PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.club_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
  leadership_team jsonb DEFAULT '[]'::jsonb, -- Array of leadership positions
  contact_email text,
  social_media jsonb DEFAULT '{}'::jsonb,
  achievements text[] DEFAULT '{}',
  upcoming_events text[] DEFAULT '{}',
  budget_allocation numeric(12,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- ORGANIZATION PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.organization_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
  additional_contacts jsonb DEFAULT '[]'::jsonb, -- Multiple contact persons
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS student_profiles_user_id_idx ON public.student_profiles(user_id);
CREATE INDEX IF NOT EXISTS student_profiles_current_year_idx ON public.student_profiles(current_year);
CREATE INDEX IF NOT EXISTS student_profiles_seeking_idx ON public.student_profiles(seeking_internship, seeking_research_opportunity);

CREATE INDEX IF NOT EXISTS alumni_profiles_user_id_idx ON public.alumni_profiles(user_id);
CREATE INDEX IF NOT EXISTS alumni_profiles_graduation_year_idx ON public.alumni_profiles(graduation_year);
CREATE INDEX IF NOT EXISTS alumni_profiles_willing_to_mentor_idx ON public.alumni_profiles(willing_to_mentor);
CREATE INDEX IF NOT EXISTS alumni_profiles_industry_idx ON public.alumni_profiles(industry);

CREATE INDEX IF NOT EXISTS faculty_profiles_user_id_idx ON public.faculty_profiles(user_id);
CREATE INDEX IF NOT EXISTS faculty_profiles_department_idx ON public.faculty_profiles(department);
CREATE INDEX IF NOT EXISTS faculty_profiles_position_idx ON public.faculty_profiles(position);

CREATE INDEX IF NOT EXISTS club_profiles_user_id_idx ON public.club_profiles(user_id);
CREATE INDEX IF NOT EXISTS club_profiles_type_idx ON public.club_profiles(club_type);
CREATE INDEX IF NOT EXISTS club_profiles_recruitment_idx ON public.club_profiles(recruitment_open);

CREATE INDEX IF NOT EXISTS organization_profiles_user_id_idx ON public.organization_profiles(user_id);
CREATE INDEX IF NOT EXISTS organization_profiles_type_idx ON public.organization_profiles(organization_type);

-- ============================================================================
-- TRIGGERS for updated_at
-- ============================================================================
CREATE TRIGGER update_student_profiles_updated_at
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_profiles_updated_at();

CREATE TRIGGER update_alumni_profiles_updated_at
  BEFORE UPDATE ON public.alumni_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_profiles_updated_at();

CREATE TRIGGER update_faculty_profiles_updated_at
  BEFORE UPDATE ON public.faculty_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_profiles_updated_at();

CREATE TRIGGER update_club_profiles_updated_at
  BEFORE UPDATE ON public.club_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_profiles_updated_at();

CREATE TRIGGER update_organization_profiles_updated_at
  BEFORE UPDATE ON public.organization_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_profiles_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can view role-specific profiles
CREATE POLICY "Student profiles are viewable by everyone" ON public.student_profiles
  FOR SELECT USING (true);

CREATE POLICY "Alumni profiles are viewable by everyone" ON public.alumni_profiles
  FOR SELECT USING (true);

CREATE POLICY "Faculty profiles are viewable by everyone" ON public.faculty_profiles
  FOR SELECT USING (true);

CREATE POLICY "Club profiles are viewable by everyone" ON public.club_profiles
  FOR SELECT USING (true);

CREATE POLICY "Organization profiles are viewable by everyone" ON public.organization_profiles
  FOR SELECT USING (true);

-- Users can only insert/update their own role-specific profile
CREATE POLICY "Users can insert their own student profile" ON public.student_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own student profile" ON public.student_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alumni profile" ON public.alumni_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alumni profile" ON public.alumni_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own faculty profile" ON public.faculty_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own faculty profile" ON public.faculty_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own club profile" ON public.club_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own club profile" ON public.club_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own organization profile" ON public.organization_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own organization profile" ON public.organization_profiles
  FOR UPDATE USING (auth.uid() = user_id);

COMMIT;
