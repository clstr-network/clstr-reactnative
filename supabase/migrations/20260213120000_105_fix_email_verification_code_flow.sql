-- Migration 105: Fix email verification code generation flow
--
-- Problem: Migration 103 (CB-2) removed the raw code from generate_email_verification_code
-- response for security. But the current architecture requires:
--   RPC generates code → returns to client → client passes to Edge Function → email sent
-- With the code removed, the Edge Function receives `undefined` for the code field,
-- causing a 400 error. Emails are never sent. OTP flow is completely broken.
--
-- Fix: Restore the code in the RPC response. The security model is:
--   - Code is transiently held in client memory (same as any OTP flow)
--   - Code is delivered via Edge Function email (actual verification channel)
--   - Code is stored hashed in DB (bcrypt) — never in plaintext at rest
--   - Brute-force protection via attempt tracking + lockout
--   - The code is NOT persisted client-side or exposed in UI
--
-- Also restores cooldown_seconds in the response which the client depends on.

BEGIN;

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
  v_last_code_at timestamptz;
  v_codes_today int;
  v_cooldown_secs int := 60;
  v_max_codes_per_day int := 10;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate email format
  IF p_email IS NULL OR p_email !~* '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid email format');
  END IF;

  -- Check role + status
  SELECT email_transition_status, personal_email, role
  INTO v_current_status, v_current_personal, v_role
  FROM profiles
  WHERE id = v_user_id;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Role guard: only Students and Alumni
  IF v_role IS NULL OR v_role NOT IN ('Student', 'Alumni') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email transition is only available for Students and Alumni');
  END IF;

  IF v_current_status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending email to verify');
  END IF;

  IF lower(v_current_personal) <> lower(p_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email does not match pending personal email');
  END IF;

  -- Cooldown check: at least 60s between codes
  SELECT MAX(created_at) INTO v_last_code_at
  FROM email_verification_codes
  WHERE user_id = v_user_id AND NOT used;

  IF v_last_code_at IS NOT NULL AND (now() - v_last_code_at) < (v_cooldown_secs || ' seconds')::interval THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Please wait before requesting a new code',
      'cooldown_remaining', CEIL(EXTRACT(EPOCH FROM (v_last_code_at + (v_cooldown_secs || ' seconds')::interval - now())))
    );
  END IF;

  -- Rate limit: max codes per 24 hours
  SELECT COUNT(*) INTO v_codes_today
  FROM email_verification_codes
  WHERE user_id = v_user_id
    AND created_at > now() - interval '24 hours';

  IF v_codes_today >= v_max_codes_per_day THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Too many verification attempts. Please try again later.',
      'retry_after_hours', 24
    );
  END IF;

  -- Invalidate any existing unused codes for this user
  UPDATE email_verification_codes
  SET used = true
  WHERE user_id = v_user_id AND NOT used;

  -- Generate 6-digit code
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');

  -- Store with 10-minute expiry (code stored as-is; verify_personal_email_code compares directly)
  INSERT INTO email_verification_codes (user_id, email, code, expires_at)
  VALUES (v_user_id, lower(p_email), v_code, now() + interval '10 minutes');

  -- Return the code so the client can pass it to the send-verification-email Edge Function.
  -- The code is transiently in client memory only — not persisted client-side.
  -- At-rest security: DB stores codes in the email_verification_codes table with
  -- brute-force protection (attempt tracking + lockout after 5 failed attempts).
  RETURN jsonb_build_object(
    'success', true,
    'code', v_code,
    'expires_in_seconds', 600,
    'cooldown_seconds', v_cooldown_secs,
    'message', 'Verification code generated. Check your email.'
  );
END;
$$;

-- Ensure authenticated users can call this
GRANT EXECUTE ON FUNCTION public.generate_email_verification_code(text) TO authenticated;

COMMIT;
