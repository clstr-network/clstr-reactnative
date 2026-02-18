-- ============================================================================
-- 046_alumni_identification_fields.sql - Add fields for automatic alumni/student identification
-- Description: Adds enrollment_year and course_duration_years to profiles table
--              to enable automatic determination of user role (Student vs Alumni)
-- ============================================================================

BEGIN;

-- ============================================================================
-- ADD NEW COLUMNS TO PROFILES TABLE
-- ============================================================================

-- Add enrollment_year to track when the user started their course
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS enrollment_year integer;

-- Add course_duration_years to track the duration of the course in years
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS course_duration_years integer DEFAULT 4
  CHECK (course_duration_years >= 1 AND course_duration_years <= 10);

-- ============================================================================
-- CREATE FUNCTION TO DETERMINE USER ROLE BASED ON ACADEMIC TIMELINE
-- ============================================================================

-- Function to determine if a user should be classified as Alumni or Student
-- based on their graduation year and the current date
CREATE OR REPLACE FUNCTION public.determine_user_role_from_graduation(
  p_graduation_year text,
  p_current_role public.user_role DEFAULT NULL
) RETURNS public.user_role
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_grad_year integer;
  v_current_year integer;
BEGIN
  -- If current role is Faculty, Principal, Dean, Club, or Organization, don't change it
  IF p_current_role IN ('Faculty', 'Principal', 'Dean', 'Club', 'Organization') THEN
    RETURN p_current_role;
  END IF;
  
  -- If no graduation year provided, default to Student
  IF p_graduation_year IS NULL OR p_graduation_year = '' THEN
    RETURN 'Student'::public.user_role;
  END IF;
  
  -- Parse graduation year
  BEGIN
    v_grad_year := p_graduation_year::integer;
  EXCEPTION WHEN OTHERS THEN
    RETURN 'Student'::public.user_role;
  END;
  
  -- Get current year
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::integer;
  
  -- Determine role based on comparison
  -- If current year is greater than graduation year, user is Alumni
  -- Otherwise, user is Student
  IF v_current_year > v_grad_year THEN
    RETURN 'Alumni'::public.user_role;
  ELSE
    RETURN 'Student'::public.user_role;
  END IF;
END;
$$;

-- ============================================================================
-- CREATE TRIGGER TO AUTO-UPDATE ROLE WHEN GRADUATION YEAR CHANGES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_update_role_from_graduation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_role public.user_role;
BEGIN
  -- Only auto-update for Student/Alumni roles (not Faculty, Club, etc.)
  IF NEW.role NOT IN ('Faculty', 'Principal', 'Dean', 'Club', 'Organization') THEN
    v_new_role := public.determine_user_role_from_graduation(NEW.graduation_year, NEW.role);
    
    -- Only update if role has actually changed
    IF NEW.role IS DISTINCT FROM v_new_role THEN
      NEW.role := v_new_role;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_auto_update_role ON public.profiles;

CREATE TRIGGER trigger_auto_update_role
  BEFORE INSERT OR UPDATE OF graduation_year
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_role_from_graduation();

-- ============================================================================
-- ADD INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_enrollment_year 
  ON public.profiles(enrollment_year) 
  WHERE enrollment_year IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_course_duration 
  ON public.profiles(course_duration_years) 
  WHERE course_duration_years IS NOT NULL;

-- ============================================================================
-- UPDATE EXISTING PROFILES TO SET CORRECT ROLE
-- ============================================================================

-- Update existing profiles where graduation_year is set and role is Student/Alumni
-- This ensures consistency with the new logic
UPDATE public.profiles
SET role = public.determine_user_role_from_graduation(graduation_year, role)
WHERE role IN ('Student', 'Alumni')
  AND graduation_year IS NOT NULL
  AND graduation_year != '';

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.profiles.enrollment_year IS 
  'Year the user enrolled/started their course. Used with graduation_year to calculate course duration.';

COMMENT ON COLUMN public.profiles.course_duration_years IS 
  'Duration of the course in years (e.g., 4 for a typical Bachelor''s degree). Default is 4 years.';

COMMENT ON FUNCTION public.determine_user_role_from_graduation IS 
  'Determines if a user should be classified as Alumni or Student based on graduation year vs current year. Faculty/Principal/Dean/Club/Organization roles are preserved.';

COMMENT ON TRIGGER trigger_auto_update_role ON public.profiles IS 
  'Automatically updates user role to Alumni/Student based on graduation year when profile is created or graduation_year is updated.';

COMMIT;
