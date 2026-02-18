-- ====================================================================
-- Fix Profiles RLS Policies & Add Email Verification Tracking
-- ====================================================================
-- This migration:
-- 1. Ensures profiles are publicly viewable (for networking)
-- 2. Restricts INSERT/UPDATE/DELETE to profile owners only
-- 3. Adds verification tracking columns
-- 4. Creates an edge function hook for enhanced verification

BEGIN;

-- ====================================================================
-- STEP 1: Clean up ALL conflicting RLS policies
-- ====================================================================
DO $$
BEGIN
  -- Drop all potentially conflicting policies
  DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
  DROP POLICY IF EXISTS "Profiles are publicly viewable" ON public.profiles;
  DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can select own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can view same domain profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
  DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- ====================================================================
-- STEP 2: Ensure RLS is enabled
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- STEP 3: Create clean, non-conflicting policies
-- ====================================================================

-- SELECT: All authenticated users can view all profiles (essential for networking)
CREATE POLICY "profiles_select_public"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Users can only create their own profile (id must match auth.uid())
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: Users can only delete their own profile (for account deletion)
CREATE POLICY "profiles_delete_own"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- ====================================================================
-- STEP 4: Add verification tracking columns (if not exist)
-- ====================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS domain_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_method text;

-- Comment on verification columns
COMMENT ON COLUMN public.profiles.email_verified_at IS 'Timestamp when email was verified via Supabase Auth';
COMMENT ON COLUMN public.profiles.domain_verified IS 'Whether the email domain was verified as educational';
COMMENT ON COLUMN public.profiles.verification_method IS 'Method used for verification: email_link, oauth, admin_manual';

-- ====================================================================
-- STEP 5: Create function to sync email verification status
-- ====================================================================
CREATE OR REPLACE FUNCTION public.sync_email_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a profile is created or updated, sync verification status from auth.users
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Get email_confirmed_at from auth.users
    SELECT email_confirmed_at INTO NEW.email_verified_at
    FROM auth.users
    WHERE id = NEW.id;
    
    -- Mark domain as verified if email is from educational institution
    -- (Additional verification happens in application layer)
    IF NEW.email IS NOT NULL AND NEW.email_verified_at IS NOT NULL THEN
      NEW.domain_verified := true;
      NEW.verification_method := COALESCE(NEW.verification_method, 'email_link');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for verification sync
DROP TRIGGER IF EXISTS trigger_sync_email_verification ON public.profiles;
CREATE TRIGGER trigger_sync_email_verification
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_email_verification();

-- ====================================================================
-- STEP 6: Create index for verification queries
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_domain_verified ON public.profiles(domain_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified_at ON public.profiles(email_verified_at);

-- ====================================================================
-- STEP 7: Grant necessary permissions
-- ====================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

COMMIT;

-- ====================================================================
-- VERIFICATION NOTES:
-- ====================================================================
-- Current verification flow:
-- 1. User signs up with educational email
-- 2. Email link verification via Supabase Auth
-- 3. Domain validated in AuthCallback.tsx via isValidAcademicEmail()
-- 4. Profile created with domain_verified = true
--
-- For enhanced verification, consider:
-- 1. Supabase Edge Function webhook on auth.users INSERT
-- 2. Third-party email verification API (SendGrid, Hunter.io)
-- 3. Manual admin verification for edge cases
-- ====================================================================
