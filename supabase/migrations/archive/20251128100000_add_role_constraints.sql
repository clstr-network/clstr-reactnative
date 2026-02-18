-- Add role constraints and role-specific data columns
BEGIN;

-- Create ENUM type for user roles
CREATE TYPE user_role AS ENUM ('Student', 'Alumni', 'Faculty', 'Club', 'Organization');

-- Add role-specific data columns (JSONB for flexibility)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role_data jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id);

-- Convert existing role column to use ENUM (with safe conversion)
-- First, update any null or invalid values to 'Student' as default
UPDATE public.profiles 
SET role = 'Student' 
WHERE role IS NULL OR role NOT IN ('Student', 'Alumni', 'Faculty', 'Club', 'Organization');

-- Alter the column to use the ENUM type
ALTER TABLE public.profiles 
  ALTER COLUMN role TYPE user_role USING role::user_role;

-- Set default value for role
ALTER TABLE public.profiles 
  ALTER COLUMN role SET DEFAULT 'Student'::user_role;

-- Make role NOT NULL
ALTER TABLE public.profiles 
  ALTER COLUMN role SET NOT NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);
CREATE INDEX IF NOT EXISTS profiles_is_verified_idx ON public.profiles (is_verified);
CREATE INDEX IF NOT EXISTS profiles_role_data_idx ON public.profiles USING gin (role_data);

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.role IS 'User role type - determines permissions and available features';
COMMENT ON COLUMN public.profiles.role_data IS 'Role-specific data stored as JSONB - structure varies by role type';
COMMENT ON COLUMN public.profiles.is_verified IS 'Whether the user role has been verified by an administrator';
COMMENT ON COLUMN public.profiles.verification_requested_at IS 'Timestamp when role verification was requested';
COMMENT ON COLUMN public.profiles.verified_at IS 'Timestamp when role was verified';
COMMENT ON COLUMN public.profiles.verified_by IS 'Admin user who verified this role';

COMMIT;
