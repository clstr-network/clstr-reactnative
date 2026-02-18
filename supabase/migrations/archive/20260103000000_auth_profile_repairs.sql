-- ====================================================================
-- Repair authentication/profile schema and policies
-- ====================================================================
-- UPDATED: Policy creation moved to 20260118000000_fix_profiles_rls_and_add_verification.sql
-- This migration now only handles schema repairs.
-- ====================================================================
BEGIN;

-- Ensure essential columns exist (no-ops if already present)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS college_domain text,
  ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'Student'::user_role,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Relax NOT NULL constraints that block inserts
ALTER TABLE public.profiles
  ALTER COLUMN college_domain DROP NOT NULL,
  ALTER COLUMN role DROP NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- Backfill timestamps so new defaults apply consistently
UPDATE public.profiles SET created_at = COALESCE(created_at, now());
UPDATE public.profiles SET updated_at = COALESCE(updated_at, now());

-- RLS policies are managed by 20260118000000_fix_profiles_rls_and_add_verification.sql
-- Just ensure RLS is enabled here
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

COMMIT;
