-- ============================================================================
-- 113: Fix generate_and_send_verification_code — references dropped column
--
-- ROOT CAUSE: Migration 108 created generate_and_send_verification_code which
-- inserts into the `code` column of email_verification_codes. Migration 109
-- dropped that column. The function was never updated, causing ALL calls to
-- fail with "column 'code' does not exist". This broke the entire OTP email
-- sending flow — no verification emails were ever sent after migration 109.
--
-- FIX: Recreate the function without the `code` column reference. Only
-- insert (user_id, email, code_hash, expires_at). The plaintext code is
-- returned transiently to the Edge Function for emailing, then discarded.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.generate_and_send_verification_code(
  p_user_id uuid,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_code_hash text;
  v_current_status text;
  v_current_personal text;
  v_role text;
  v_last_code_at timestamptz;
  v_codes_today int;
  v_cooldown_secs int := 60;
  v_max_codes_per_day int := 10;
BEGIN
  -- This function is callable ONLY by service_role (Edge Functions).
  -- It is NOT granted to authenticated or anon roles.

  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User ID required');
  END IF;

  -- Validate email format
  IF p_email IS NULL OR p_email !~* '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid email format');
  END IF;

  -- Check role + status
  SELECT email_transition_status, personal_email, role
  INTO v_current_status, v_current_personal, v_role
  FROM profiles
  WHERE id = p_user_id;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  IF v_role IS NULL OR v_role NOT IN ('Student', 'Alumni') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email transition is only available for Students and Alumni');
  END IF;

  IF v_current_status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending email to verify');
  END IF;

  IF lower(v_current_personal) <> lower(p_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email does not match pending personal email');
  END IF;

  -- Cooldown check
  SELECT MAX(created_at) INTO v_last_code_at
  FROM email_verification_codes
  WHERE user_id = p_user_id AND NOT used;

  IF v_last_code_at IS NOT NULL AND (now() - v_last_code_at) < (v_cooldown_secs || ' seconds')::interval THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Please wait before requesting a new code',
      'cooldown_remaining', CEIL(EXTRACT(EPOCH FROM (v_last_code_at + (v_cooldown_secs || ' seconds')::interval - now())))
    );
  END IF;

  -- Rate limit
  SELECT COUNT(*) INTO v_codes_today
  FROM email_verification_codes
  WHERE user_id = p_user_id
    AND created_at > now() - interval '24 hours';

  IF v_codes_today >= v_max_codes_per_day THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Too many verification attempts. Please try again later.',
      'retry_after_hours', 24
    );
  END IF;

  -- Invalidate existing unused codes
  UPDATE email_verification_codes
  SET used = true
  WHERE user_id = p_user_id AND NOT used;

  -- Generate 6-digit code + bcrypt hash
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');
  v_code_hash := extensions.crypt(v_code, extensions.gen_salt('bf', 8));

  -- Store ONLY the hash — `code` column was dropped in migration 109
  INSERT INTO email_verification_codes (user_id, email, code_hash, expires_at)
  VALUES (p_user_id, lower(p_email), v_code_hash, now() + interval '10 minutes');

  -- Return code to Edge Function (service_role) for emailing — NOT to client
  RETURN jsonb_build_object(
    'success', true,
    'code', v_code,
    'expires_in_seconds', 600,
    'cooldown_seconds', v_cooldown_secs
  );
END;
$$;

-- CRITICAL: Only grant to service_role — NOT to authenticated or anon.
REVOKE ALL ON FUNCTION public.generate_and_send_verification_code(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_and_send_verification_code(uuid, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.generate_and_send_verification_code(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_and_send_verification_code(uuid, text) TO service_role;

COMMIT;
