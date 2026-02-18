-- ============================================================================
-- 016_auth_hooks.sql - Auth Hooks for Profile Creation
-- U-Hub Platform Database Baseline
-- ============================================================================

BEGIN;

-- ============================================================================
-- HANDLE NEW USER FUNCTION
-- Creates a profile automatically when a user signs up
-- Sets domain and college_domain from email for domain-based features
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role public.user_role;
  user_email TEXT;
  email_domain TEXT;
BEGIN
  -- Get user email
  user_email := NEW.email;
  
  -- Extract domain from email (e.g., 'university.edu' from 'user@university.edu')
  IF user_email IS NOT NULL AND user_email LIKE '%@%' THEN
    email_domain := LOWER(SUBSTRING(user_email FROM '@(.+)$'));
  ELSE
    email_domain := NULL;
  END IF;
  
  -- Determine default role based on email domain
  -- Educational domains default to 'Student'
  default_role := 'Student';
  
  -- Insert the new profile with domain information
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    role,
    domain,
    college_domain,
    is_verified,
    onboarding_complete,
    profile_completion,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    user_email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(user_email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    default_role,
    email_domain,        -- Set domain for domain-based features
    email_domain,        -- Set college_domain for institutional grouping
    false,               -- is_verified starts as false
    false,               -- onboarding_complete starts as false
    10,                  -- Base profile completion score
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    domain = COALESCE(profiles.domain, EXCLUDED.domain),
    college_domain = COALESCE(profiles.college_domain, EXCLUDED.college_domain),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- CREATE TRIGGER FOR NEW USER SIGNUP
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- HANDLE USER DELETION FUNCTION
-- Cleans up user data and creates audit record
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_user_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create audit record
  INSERT INTO public.account_deletion_audit (
    user_id,
    email,
    deletion_reason,
    deleted_at
  ) VALUES (
    OLD.id,
    OLD.email,
    'User account deleted',
    NOW()
  );

  -- The cascade delete will handle most cleanup
  -- Additional cleanup can be added here if needed
  
  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_user_deletion: %', SQLERRM;
    RETURN OLD;
END;
$$;

-- ============================================================================
-- CREATE TRIGGER FOR USER DELETION
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_deletion();

-- ============================================================================
-- SYNC PROFILE EMAIL FUNCTION
-- Syncs email changes from auth.users to profiles
-- Also updates domain when email changes
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_domain TEXT;
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    -- Extract new domain from email
    IF NEW.email IS NOT NULL AND NEW.email LIKE '%@%' THEN
      new_domain := LOWER(SUBSTRING(NEW.email FROM '@(.+)$'));
    ELSE
      new_domain := NULL;
    END IF;
    
    UPDATE public.profiles
    SET 
      email = NEW.email,
      domain = new_domain,
      college_domain = new_domain,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- CREATE TRIGGER FOR EMAIL SYNC
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_email();

COMMIT;
