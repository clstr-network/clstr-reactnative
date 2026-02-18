-- ============================================================================
-- 075: Email Transition Role Guards
-- Adds explicit role-based guards to email transition RPCs.
-- Only Students and Alumni should be able to link/verify/transition
-- personal emails. This enforces the permission matrix at the DB level.
-- ============================================================================

-- 1. Update request_personal_email_link to check role
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
  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Role guard: only Students and Alumni can link personal email
  SELECT role INTO v_role FROM profiles WHERE id = v_user_id;
  IF v_role IS NULL OR v_role NOT IN ('Student', 'Alumni') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email transition is only available for Students and Alumni');
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

-- 2. Update transition_to_personal_email to check role
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

  -- Role guard
  SELECT email, personal_email, personal_email_verified, role
  INTO v_college_email, v_personal_email, v_verified, v_role
  FROM profiles
  WHERE id = v_user_id;

  IF v_role IS NULL OR v_role NOT IN ('Student', 'Alumni') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email transition is only available for Students and Alumni');
  END IF;

  IF v_personal_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No personal email linked');
  END IF;

  IF NOT v_verified THEN
    RETURN jsonb_build_object('success', false, 'error', 'Personal email not yet verified');
  END IF;

  -- Update profile: mark as transitioned
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

-- 3. Update generate_email_verification_code to check role
CREATE OR REPLACE FUNCTION public.generate_email_verification_code(
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code text;
  v_current_status text;
  v_current_personal text;
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

  -- Validate email format
  IF p_email IS NULL OR p_email !~* '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid email format');
  END IF;

  -- Check that user has this email in pending state
  SELECT email_transition_status, personal_email
  INTO v_current_status, v_current_personal
  FROM profiles
  WHERE id = v_user_id;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  IF v_current_status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending email to verify');
  END IF;

  IF lower(v_current_personal) <> lower(p_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email does not match pending personal email');
  END IF;

  -- Invalidate any existing unused codes for this user
  UPDATE email_verification_codes
  SET used = true
  WHERE user_id = v_user_id AND NOT used;

  -- Generate 6-digit code
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');

  -- Store with 10-minute expiry
  INSERT INTO email_verification_codes (user_id, email, code, expires_at)
  VALUES (v_user_id, lower(p_email), v_code, now() + interval '10 minutes');

  RETURN jsonb_build_object('success', true, 'code', v_code, 'expires_in_seconds', 600);
END;
$$;

-- 4. Update verify_personal_email_code to check role
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

  -- Find valid, unused, non-expired code
  SELECT * INTO v_record
  FROM email_verification_codes
  WHERE user_id = v_user_id
    AND code = trim(p_code)
    AND NOT used
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired verification code');
  END IF;

  -- Mark code as used
  UPDATE email_verification_codes SET used = true WHERE id = v_record.id;

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

-- Re-grant permissions (CREATE OR REPLACE keeps grants, but explicit is safer)
GRANT EXECUTE ON FUNCTION public.request_personal_email_link(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_to_personal_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_email_verification_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_personal_email_code(text) TO authenticated;
