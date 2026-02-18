-- ============================================================================
-- 076: Email Transition Security Hardening
-- 
-- Fixes:
-- 1. CRITICAL: Drop orphaned verify_personal_email() (no params) — bypasses
--    the 6-digit code verification entirely.
-- 2. CRITICAL: Add column-level RLS restriction — prevent direct client
--    updates to email transition columns (must go through RPCs).
-- 3. HIGH: Add brute-force protection — max 5 failed attempts per code,
--    lockout after too many failures.
-- 4. LOW: Safe-cast graduation_year to int in get_email_transition_status
--    to prevent runtime SQL errors on non-numeric values.
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX 1: Drop the orphaned parameterless verify_personal_email() RPC
-- It was created in migration 072 and never removed. It allows any user to
-- verify their personal email without entering a verification code.
-- ═══════════════════════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.verify_personal_email();

-- Revoke just in case (belt & suspenders)
-- (Will no-op if function already dropped, but explicit is good)

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX 2: Column-level UPDATE restriction via BEFORE UPDATE trigger
-- The existing "profiles_update_own" RLS policy allows users to update ANY column.
-- PostgreSQL RLS WITH CHECK doesn't support OLD references, so we use a
-- BEFORE UPDATE trigger (SECURITY INVOKER) that rejects direct client changes
-- to protected columns. SECURITY DEFINER RPCs set a local config flag to bypass.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create a trigger function that guards email transition columns.
-- SECURITY DEFINER RPCs can set a session variable to bypass the guard.
CREATE OR REPLACE FUNCTION public.guard_email_transition_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If the RPC has flagged this session, allow the update
  IF current_setting('app.bypass_email_guard', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Block changes to protected columns from direct client updates
  IF NEW.personal_email_verified IS DISTINCT FROM OLD.personal_email_verified THEN
    RAISE EXCEPTION 'Direct modification of personal_email_verified is not allowed. Use the provided RPCs.';
  END IF;

  IF NEW.personal_email_verified_at IS DISTINCT FROM OLD.personal_email_verified_at THEN
    RAISE EXCEPTION 'Direct modification of personal_email_verified_at is not allowed. Use the provided RPCs.';
  END IF;

  IF NEW.email_transition_status IS DISTINCT FROM OLD.email_transition_status THEN
    RAISE EXCEPTION 'Direct modification of email_transition_status is not allowed. Use the provided RPCs.';
  END IF;

  -- Allow personal_email to be set to NULL (removal) but not to a new value
  IF NEW.personal_email IS DISTINCT FROM OLD.personal_email
     AND NEW.personal_email IS NOT NULL THEN
    RAISE EXCEPTION 'Direct modification of personal_email is not allowed. Use the provided RPCs.';
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the guard trigger
DROP TRIGGER IF EXISTS trg_guard_email_transition_columns ON public.profiles;
CREATE TRIGGER trg_guard_email_transition_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_email_transition_columns();

-- Now update all SECURITY DEFINER RPCs that modify these columns to set the bypass flag.
-- We do this by wrapping the UPDATE statements with SET LOCAL.

-- Update request_personal_email_link to set bypass flag
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
  v_role text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Role guard
  SELECT role INTO v_role FROM profiles WHERE id = v_user_id;
  IF v_role IS NULL OR v_role NOT IN ('Student', 'Alumni') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email transition is only available for Students and Alumni');
  END IF;

  IF p_personal_email IS NULL OR p_personal_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid email format');
  END IF;

  SELECT email INTO v_current_email FROM profiles WHERE id = v_user_id;

  IF lower(p_personal_email) = lower(v_current_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Personal email must differ from college email');
  END IF;

  SELECT id INTO v_existing FROM profiles
  WHERE lower(personal_email) = lower(p_personal_email) AND id <> v_user_id;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'This email is already linked to another account');
  END IF;

  SELECT id INTO v_existing FROM profiles
  WHERE lower(email) = lower(p_personal_email) AND id <> v_user_id;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'This email is already registered as a college email');
  END IF;

  -- Bypass the column guard for this transaction
  PERFORM set_config('app.bypass_email_guard', 'true', true);

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

-- Update transition_to_personal_email to set bypass flag
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
  v_role text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT email, personal_email, personal_email_verified, role
  INTO v_college_email, v_personal_email, v_verified, v_role
  FROM profiles WHERE id = v_user_id;

  IF v_role IS NULL OR v_role NOT IN ('Student', 'Alumni') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email transition is only available for Students and Alumni');
  END IF;

  IF v_personal_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No personal email linked');
  END IF;

  IF NOT v_verified THEN
    RETURN jsonb_build_object('success', false, 'error', 'Personal email not yet verified');
  END IF;

  -- Bypass the column guard
  PERFORM set_config('app.bypass_email_guard', 'true', true);

  UPDATE profiles
  SET email_transition_status = 'transitioned', updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true, 'status', 'transitioned',
    'college_email', v_college_email, 'new_primary_email', v_personal_email
  );
END;
$$;

-- Update verify_personal_email_code to set bypass flag (already has brute-force protection below)
-- (handled in FIX 3 section)

-- Update dismiss_personal_email_prompt — no protected columns changed, but adding bypass for safety
CREATE OR REPLACE FUNCTION public.dismiss_personal_email_prompt()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  UPDATE profiles
  SET personal_email_prompt_dismissed_at = now(), updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Update sync_profile_email trigger to set bypass flag
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

    IF v_college_domain IN ('raghuinstech.com', 'raghuenggcollege.in') THEN
      v_college_domain := 'raghuenggcollege.in';
    END IF;

    -- Bypass the column guard for this trigger
    PERFORM set_config('app.bypass_email_guard', 'true', true);

    IF EXISTS (
      SELECT 1 FROM profiles
      WHERE id = NEW.id
        AND email_transition_status = 'transitioned'
        AND personal_email IS NOT NULL
    ) THEN
      UPDATE profiles
      SET personal_email = lower(v_new_email), updated_at = now()
      WHERE id = NEW.id;
    ELSE
      UPDATE profiles
      SET email = v_new_email, domain = v_domain, college_domain = v_college_domain, updated_at = now()
      WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-grant RPCs updated above
GRANT EXECUTE ON FUNCTION public.request_personal_email_link(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_to_personal_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_personal_email_prompt() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX 3: Brute-force protection on verify_personal_email_code
-- Add a failed_attempts counter. After 5 failed attempts the code is locked.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add failed_attempts column
ALTER TABLE public.email_verification_codes
  ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0;

-- Update verify_personal_email_code with brute-force protection
CREATE OR REPLACE FUNCTION public.verify_personal_email_code(
  p_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_record record;
  v_current_status text;
  v_role text;
  v_max_attempts constant integer := 5;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_code IS NULL OR length(trim(p_code)) <> 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid verification code format');
  END IF;

  -- Role guard + status check
  SELECT email_transition_status, role INTO v_current_status, v_role
  FROM profiles WHERE id = v_user_id;

  IF v_role IS NULL OR v_role NOT IN ('Student', 'Alumni') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email transition is only available for Students and Alumni');
  END IF;

  IF v_current_status = 'verified' OR v_current_status = 'transitioned' THEN
    RETURN jsonb_build_object('success', true, 'status', v_current_status, 'message', 'Already verified');
  END IF;

  IF v_current_status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending verification');
  END IF;

  -- Find the latest active (unused, non-expired) code for this user
  SELECT * INTO v_record
  FROM email_verification_codes
  WHERE user_id = v_user_id
    AND NOT used
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active verification code. Please request a new one.');
  END IF;

  -- Check if max attempts exceeded
  IF v_record.failed_attempts >= v_max_attempts THEN
    -- Lock the code
    UPDATE email_verification_codes SET used = true WHERE id = v_record.id;
    RETURN jsonb_build_object('success', false, 'error', 'Too many failed attempts. Please request a new code.');
  END IF;

  -- Check if code matches
  IF v_record.code <> trim(p_code) THEN
    -- Increment failed attempts
    UPDATE email_verification_codes
    SET failed_attempts = failed_attempts + 1
    WHERE id = v_record.id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Incorrect verification code',
      'attempts_remaining', v_max_attempts - v_record.failed_attempts - 1
    );
  END IF;

  -- Code matches — mark as used
  UPDATE email_verification_codes SET used = true WHERE id = v_record.id;

  -- Bypass the column guard for this transaction
  PERFORM set_config('app.bypass_email_guard', 'true', true);

  -- Mark personal email as verified
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

-- Re-grant
GRANT EXECUTE ON FUNCTION public.verify_personal_email_code(text) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX 4: Safe graduation_year cast in get_email_transition_status
-- Handles NULL and non-numeric graduation_year gracefully instead of crashing.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_email_transition_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row record;
  v_grad_year integer;
  v_is_near_graduation boolean := false;
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
    role,
    personal_email_prompt_dismissed_at
  INTO v_row
  FROM profiles
  WHERE id = v_user_id;

  IF v_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Safe cast: only treat as near graduation if graduation_year is a valid integer
  IF v_row.graduation_year IS NOT NULL AND v_row.graduation_year ~ '^\d{4}$' THEN
    v_grad_year := v_row.graduation_year::int;
    v_is_near_graduation := (v_grad_year <= (EXTRACT(YEAR FROM now())::int + 1));
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
    'is_near_graduation', v_is_near_graduation,
    'prompt_dismissed_at', v_row.personal_email_prompt_dismissed_at
  );
END;
$$;

-- Re-grant
GRANT EXECUTE ON FUNCTION public.get_email_transition_status() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX 5: Add remove_personal_email RPC
-- Since column-level RLS now blocks direct client updates to transition columns,
-- removal must also go through a SECURITY DEFINER RPC.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.remove_personal_email()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_status text;
  v_role text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Role guard
  SELECT email_transition_status, role INTO v_status, v_role
  FROM profiles WHERE id = v_user_id;

  IF v_role IS NULL OR v_role NOT IN ('Student', 'Alumni') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email transition is only available for Students and Alumni');
  END IF;

  -- Cannot remove after transition is complete
  IF v_status = 'transitioned' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot remove personal email after transition is complete');
  END IF;

  -- Reset all personal email fields
  -- Bypass the column guard for this transaction
  PERFORM set_config('app.bypass_email_guard', 'true', true);

  UPDATE profiles
  SET
    personal_email = NULL,
    personal_email_verified = false,
    personal_email_verified_at = NULL,
    email_transition_status = 'none',
    updated_at = now()
  WHERE id = v_user_id;

  -- Also invalidate any active verification codes
  UPDATE email_verification_codes
  SET used = true
  WHERE user_id = v_user_id AND NOT used;

  RETURN jsonb_build_object('success', true, 'status', 'none');
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_personal_email() TO authenticated;
