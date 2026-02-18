-- ====================================================================
-- Remove Auto Profile Creation Trigger
-- ====================================================================
-- This migration removes the trigger that automatically creates profiles
-- on user signup. The new flow requires email verification FIRST, then
-- users create their profile AFTER authentication during onboarding.
--
-- NEW FLOW:
-- 1. User signs up → auth.users record created (NO profile)
-- 2. User verifies email
-- 3. User logs in
-- 4. User completes onboarding → profile record created
-- ====================================================================

BEGIN;

-- Drop the trigger that auto-creates profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Drop the function that handles auto profile creation
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Ensure RLS is enabled on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can select own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view same domain profiles" ON profiles;
DROP POLICY IF EXISTS "insert own" ON profiles;
DROP POLICY IF EXISTS "select own" ON profiles;
DROP POLICY IF EXISTS "update own" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "view_same_domain_profiles" ON profiles;

-- ====================================================================
-- Policy 1: Insert Own Profile (Critical for Onboarding)
-- Allow authenticated users to insert their own profile during onboarding
-- ====================================================================
CREATE POLICY "insert_own_profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- ====================================================================
-- Policy 2: Select Own Profile
-- Allow authenticated users to read their own profile
-- ====================================================================
CREATE POLICY "select_own_profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- ====================================================================
-- Policy 3: Update Own Profile
-- Allow authenticated users to update their own profile
-- ====================================================================
CREATE POLICY "update_own_profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ====================================================================
-- Policy 4: Delete Own Profile (for account deletion)
-- Allow authenticated users to delete their own profile
-- ====================================================================
CREATE POLICY "delete_own_profile"
ON profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- ====================================================================
-- Policy 5: View Same Domain Profiles (for networking features)
-- Allow users to view profiles from the same college domain
-- NOTE: This policy is created in a later migration when college_domain column exists
-- ====================================================================
-- CREATE POLICY "view_same_domain_profiles"
-- ON profiles
-- FOR SELECT
-- TO authenticated
-- USING (
--   college_domain IS NOT NULL 
--   AND college_domain = (
--     SELECT college_domain 
--     FROM profiles 
--     WHERE id = auth.uid()
--   )
-- );

-- ====================================================================
-- Grant necessary permissions to authenticated users
-- ====================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;

-- ====================================================================
-- Add indexes for performance (if not already exists)
-- Only create indexes for columns that exist in the profiles table
-- ====================================================================
DO $$ 
BEGIN
  -- Index on college_domain (if column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'college_domain'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_college_domain ON profiles(college_domain);
  END IF;

  -- Index on onboarding_complete (if column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'onboarding_complete'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_complete ON profiles(onboarding_complete);
  END IF;

  -- Index on email (if column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
  END IF;

  -- Index on role (if column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
  END IF;
END $$;

COMMIT;

-- ====================================================================
-- Migration Notes:
-- ====================================================================
-- After applying this migration:
-- 1. New signups will NOT auto-create profiles
-- 2. Users MUST complete onboarding to create their profile
-- 3. The Onboarding.tsx page will create the profile record
-- 4. Domain is extracted from email: email.split('@')[1]
-- 5. RLS policies allow users to insert/select/update/delete their own profile
-- 6. Users can view profiles from the same college domain (networking)
-- ====================================================================
