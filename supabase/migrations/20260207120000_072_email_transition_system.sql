-- ============================================================================
-- 072: Email Transition System
-- Adds personal email support for alumni lifetime access
-- College email = identity, Personal email = long-term access
-- ============================================================================

-- 1. Add personal email columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS personal_email text,
  ADD COLUMN IF NOT EXISTS personal_email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS personal_email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_transition_status text NOT NULL DEFAULT 'none'
    CHECK (email_transition_status IN ('none', 'pending', 'verified', 'transitioned'));

-- Index for personal_email lookups (unique when set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_personal_email
  ON public.profiles (personal_email)
  WHERE personal_email IS NOT NULL;

-- Index for transition status queries (admin dashboards, batch jobs)
CREATE INDEX IF NOT EXISTS idx_profiles_email_transition_status
  ON public.profiles (email_transition_status)
  WHERE email_transition_status <> 'none';

-- 2. RPC: Request personal email link (sends OTP via Supabase Auth)
-- This stores the personal email in a pending state.
-- Actual verification is handled client-side via Supabase Auth OTP.
CREATE OR REPLACE FUNCTION public.request_personal_email_link(
  p_personal_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing uuid;
  v_current_email text;
BEGIN
  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate email format
  IF p_personal_email IS NULL OR p_personal_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid email format');
  END IF;

  -- Get current college email
  SELECT email INTO v_current_email FROM profiles WHERE id = v_user_id;

  -- Cannot use same email as college email
  IF lower(p_personal_email) = lower(v_current_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Personal email must differ from college email');
  END IF;

  -- Check if this personal email is already used by another user
  SELECT id INTO v_existing
  FROM profiles
  WHERE lower(personal_email) = lower(p_personal_email)
    AND id <> v_user_id;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'This email is already linked to another account');
  END IF;

  -- Also check if it conflicts with any other user's primary email
  SELECT id INTO v_existing
  FROM profiles
  WHERE lower(email) = lower(p_personal_email)
    AND id <> v_user_id;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'This email is already registered as a college email');
  END IF;

  -- Store personal email in pending state
  UPDATE profiles
  SET
    personal_email = lower(p_personal_email),
    personal_email_verified = false,
    personal_email_verified_at = NULL,
    email_transition_status = 'pending',
    updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'status', 'pending');
END;
$$;

-- 3. RPC: Verify personal email (called after OTP verification succeeds)
CREATE OR REPLACE FUNCTION public.verify_personal_email()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_personal_email text;
  v_status text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT personal_email, email_transition_status
  INTO v_personal_email, v_status
  FROM profiles
  WHERE id = v_user_id;

  IF v_personal_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No personal email to verify');
  END IF;

  IF v_status = 'verified' OR v_status = 'transitioned' THEN
    RETURN jsonb_build_object('success', true, 'status', v_status, 'message', 'Already verified');
  END IF;

  UPDATE profiles
  SET
    personal_email_verified = true,
    personal_email_verified_at = now(),
    email_transition_status = 'verified',
    updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'status', 'verified');
END;
$$;

-- 4. RPC: Transition to personal email (makes personal email the primary login)
-- Only allowed when personal email is already verified
CREATE OR REPLACE FUNCTION public.transition_to_personal_email()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_personal_email text;
  v_college_email text;
  v_verified boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT email, personal_email, personal_email_verified
  INTO v_college_email, v_personal_email, v_verified
  FROM profiles
  WHERE id = v_user_id;

  IF v_personal_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No personal email linked');
  END IF;

  IF NOT v_verified THEN
    RETURN jsonb_build_object('success', false, 'error', 'Personal email not yet verified');
  END IF;

  -- Update profile: email becomes personal, college_email stored separately
  -- NOTE: The actual auth.users email change must be done via Supabase Auth API
  -- from the client side. This RPC only updates the profiles table.
  UPDATE profiles
  SET
    email_transition_status = 'transitioned',
    updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'transitioned',
    'college_email', v_college_email,
    'new_primary_email', v_personal_email
  );
END;
$$;

-- 5. RPC: Get email transition status (for dashboard / prompts)
CREATE OR REPLACE FUNCTION public.get_email_transition_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT
    email,
    personal_email,
    personal_email_verified,
    personal_email_verified_at,
    email_transition_status,
    graduation_year,
    enrollment_year,
    course_duration_years,
    role
  INTO v_row
  FROM profiles
  WHERE id = v_user_id;

  IF v_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'college_email', v_row.email,
    'personal_email', v_row.personal_email,
    'personal_email_verified', COALESCE(v_row.personal_email_verified, false),
    'personal_email_verified_at', v_row.personal_email_verified_at,
    'email_transition_status', v_row.email_transition_status,
    'graduation_year', v_row.graduation_year,
    'role', v_row.role,
    'is_near_graduation', (
      v_row.graduation_year IS NOT NULL
      AND v_row.graduation_year::int <= (EXTRACT(YEAR FROM now())::int + 1)
    )
  );
END;
$$;

-- 6. Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.request_personal_email_link(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_personal_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_to_personal_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_transition_status() TO authenticated;

-- 7. Enable realtime for the new columns (profiles already in realtime publication)
-- No action needed — profiles table is already part of supabase_realtime publication.

-- 8. Update the sync_profile_email trigger to handle personal email awareness
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain text;
  v_college_domain text;
  v_new_email text;
BEGIN
  v_new_email := NEW.email;

  IF v_new_email IS NOT NULL THEN
    v_domain := split_part(v_new_email, '@', 2);
    v_college_domain := lower(v_domain);

    -- Normalize Raghu domains
    IF v_college_domain IN ('raghuinstech.com', 'raghuenggcollege.in') THEN
      v_college_domain := 'raghuenggcollege.in';
    END IF;

    -- Check if user has transitioned to personal email
    -- If so, update the personal_email field instead of college email fields
    IF EXISTS (
      SELECT 1 FROM profiles
      WHERE id = NEW.id
        AND email_transition_status = 'transitioned'
        AND personal_email IS NOT NULL
    ) THEN
      -- User has transitioned: the auth email change is now for their personal email
      UPDATE profiles
      SET
        personal_email = lower(v_new_email),
        updated_at = now()
      WHERE id = NEW.id;
    ELSE
      -- Normal case: update college email and domain fields
      UPDATE profiles
      SET
        email = v_new_email,
        domain = v_domain,
        college_domain = v_college_domain,
        updated_at = now()
      WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
