-- ============================================================================
-- 047_faculty_positions_principal.sql - Allow Principal/Faculty positions
-- Ensures staff onboarding can persist Faculty/Principal roles safely.
-- ============================================================================

BEGIN;

ALTER TABLE public.faculty_profiles
  DROP CONSTRAINT IF EXISTS faculty_profiles_position_check;

ALTER TABLE public.faculty_profiles
  ADD CONSTRAINT faculty_profiles_position_check
  CHECK (
    position IN (
      'Lecturer',
      'Assistant Professor',
      'Associate Professor',
      'Professor',
      'Department Head',
      'Dean',
      'Principal',
      'Faculty',
      'Adjunct',
      'Visiting Professor'
    )
  );

COMMIT;
