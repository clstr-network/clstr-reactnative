-- ============================================================================
-- 079: Fix personal email conflict check for orphaned profiles
--
-- BUG: request_personal_email_link rejects personal emails that match the
-- `email` column of ANY other profile — including orphaned profiles from
-- failed signups that never completed onboarding.
--
-- Example: User tries to link ganeshtappiti1605@gmail.com, but an old
-- incomplete profile exists with that gmail as its `email` column from a
-- failed Google OAuth attempt.
--
-- FIX: Only flag a college email conflict if the matching profile has
-- onboarding_complete = true. Incomplete profiles are not real users.
-- ============================================================================

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
  v_current_personal text;
  v_current_status text;
  v_role text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Role guard
  SELECT role, email, personal_email, email_transition_status
  INTO v_role, v_current_email, v_current_personal, v_current_status
  FROM profiles WHERE id = v_user_id;

  IF v_role IS NULL OR v_role NOT IN ('Student', 'Alumni') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email transition is only available for Students and Alumni');
  END IF;

  IF p_personal_email IS NULL OR p_personal_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid email format');
  END IF;

  IF lower(p_personal_email) = lower(v_current_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Personal email must differ from college email');
  END IF;

  -- Check uniqueness: not already linked by someone else
  SELECT id INTO v_existing FROM profiles
  WHERE lower(personal_email) = lower(p_personal_email) AND id <> v_user_id;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'This email is already linked to another account');
  END IF;

  -- Check uniqueness: not a college email for someone else who completed onboarding.
  -- Orphaned/incomplete profiles (failed signups) are excluded — they may have
  -- non-academic emails from aborted OAuth attempts.
  SELECT id INTO v_existing FROM profiles
  WHERE lower(email) = lower(p_personal_email)
    AND id <> v_user_id
    AND onboarding_complete = true;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'This email is already registered as a college email');
  END IF;

  -- ── Case 25: If changing email while a code exists, invalidate old codes ──
  IF v_current_personal IS NOT NULL
     AND lower(v_current_personal) <> lower(p_personal_email) THEN
    UPDATE email_verification_codes
    SET used = true
    WHERE user_id = v_user_id AND NOT used;
  END IF;

  -- Bypass the column guard
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

GRANT EXECUTE ON FUNCTION public.request_personal_email_link(text) TO authenticated;
