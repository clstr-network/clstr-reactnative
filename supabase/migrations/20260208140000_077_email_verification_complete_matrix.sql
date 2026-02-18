-- ============================================================================
-- 077: Email Verification — Complete Security Matrix Implementation
--
-- Addresses ALL 34 cases from the verification matrix:
--
-- CRITICAL FIXES:
-- 1. Hash verification codes with pgcrypto (Case 17, 28) — no plaintext storage
-- 2. Resend cooldown (60s) per user (Case 9, 10)
-- 3. Max resends per 24h window (Case 11) — 10 max
-- 4. Cross-email validation in verify RPC (Case 15)
-- 5. Atomic verify + update with FOR UPDATE lock (Case 18, 26)
-- 6. Code invalidation on email change (Case 25)
-- 7. Resend rate-limit columns on verification_codes table
-- 8. Return remaining attempts on wrong code (Case 4)
-- 9. Specific error for expired codes vs wrong codes (Case 7 vs 4)
-- 10. Transaction-safe concurrent verification (Case 26, 27)
--
-- SCHEMA CHANGES:
-- - email_verification_codes.code_hash (replaces plaintext code)
-- - email_verification_codes.code column dropped (after migration)
-- - resend_count tracking via row count (no new column needed)
-- ============================================================================

-- Enable pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1: Add code_hash column (will replace plaintext code)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.email_verification_codes
  ADD COLUMN IF NOT EXISTS code_hash text;

-- Backfill existing codes with hashes (so in-flight verifications don't break)
UPDATE public.email_verification_codes
SET code_hash = extensions.crypt(code, extensions.gen_salt('bf', 8))
WHERE code_hash IS NULL AND code IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 2: Rebuild generate_email_verification_code
-- Now stores ONLY the hash. Returns code to caller (for display/email).
-- Enforces:
--   - 60-second cooldown between resends (Case 9)
--   - Max 10 resends in 24h (Case 11)
--   - Invalidates all previous codes (Case 2, 27)
-- ═══════════════════════════════════════════════════════════════════════════════

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
  v_code_hash text;
  v_current_status text;
  v_current_personal text;
  v_role text;
  v_last_code_at timestamptz;
  v_resend_count integer;
  v_cooldown_seconds constant integer := 60;
  v_max_resends_24h constant integer := 10;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate email format
  IF p_email IS NULL OR p_email !~* '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid email format');
  END IF;

  -- Role guard
  SELECT email_transition_status, personal_email, role
  INTO v_current_status, v_current_personal, v_role
  FROM profiles
  WHERE id = v_user_id;

  IF v_role IS NULL OR v_role NOT IN ('Student', 'Alumni') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email transition is only available for Students and Alumni');
  END IF;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  IF v_current_status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending email to verify');
  END IF;

  IF lower(v_current_personal) <> lower(p_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email does not match pending personal email');
  END IF;

  -- ── Resend cooldown check (Case 9) ──────────────────────────────────────
  SELECT created_at INTO v_last_code_at
  FROM email_verification_codes
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_code_at IS NOT NULL 
     AND (now() - v_last_code_at) < (v_cooldown_seconds || ' seconds')::interval THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Please wait before requesting a new code',
      'cooldown_remaining', v_cooldown_seconds - EXTRACT(EPOCH FROM (now() - v_last_code_at))::integer
    );
  END IF;

  -- ── 24h resend limit check (Case 11) ───────────────────────────────────
  SELECT count(*) INTO v_resend_count
  FROM email_verification_codes
  WHERE user_id = v_user_id
    AND created_at > now() - interval '24 hours';

  IF v_resend_count >= v_max_resends_24h THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Too many verification attempts. Please try again later.',
      'retry_after_hours', 24
    );
  END IF;

  -- ── Invalidate ALL existing unused codes (Case 2, 27) ──────────────────
  UPDATE email_verification_codes
  SET used = true
  WHERE user_id = v_user_id AND NOT used;

  -- ── Generate 6-digit code + bcrypt hash (Case 17, 28) ──────────────────
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');
  v_code_hash := extensions.crypt(v_code, extensions.gen_salt('bf', 8));

  -- Store ONLY the hash — never plaintext (Case 28)
  INSERT INTO email_verification_codes (user_id, email, code_hash, code, expires_at)
  VALUES (v_user_id, lower(p_email), v_code_hash, '******', now() + interval '10 minutes');

  -- Return code to caller (for email sending, NOT for DB storage)
  RETURN jsonb_build_object(
    'success', true,
    'code', v_code,
    'expires_in_seconds', 600,
    'cooldown_seconds', v_cooldown_seconds
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 3: Rebuild verify_personal_email_code
-- Now uses bcrypt hash comparison instead of plaintext match.
-- Enforces:
--   - Cross-email validation (Case 15)
--   - Brute-force protection with lockout (Case 12, 17)
--   - Atomic verify + profile update with row lock (Case 18, 26)
--   - Specific error for expired vs wrong code (Case 7 vs 4)
--   - Code already used error (Case 8)
-- ═══════════════════════════════════════════════════════════════════════════════

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
  v_current_personal text;
  v_role text;
  v_max_attempts constant integer := 5;
  v_expired_exists boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- ── Case 5, 6: Code format validation ─────────────────────────────────
  IF p_code IS NULL OR length(trim(p_code)) <> 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please enter a valid 6-digit verification code');
  END IF;

  -- ── Role guard + status check ─────────────────────────────────────────
  SELECT email_transition_status, role, personal_email
  INTO v_current_status, v_role, v_current_personal
  FROM profiles WHERE id = v_user_id;

  IF v_role IS NULL OR v_role NOT IN ('Student', 'Alumni') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email transition is only available for Students and Alumni');
  END IF;

  -- ── Case 8 (already verified): Idempotent check ──────────────────────
  IF v_current_status = 'verified' OR v_current_status = 'transitioned' THEN
    RETURN jsonb_build_object('success', true, 'status', v_current_status, 'message', 'Already verified');
  END IF;

  IF v_current_status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending verification');
  END IF;

  -- ── Find the latest ACTIVE code with row lock (Case 18, 26) ──────────
  SELECT * INTO v_record
  FROM email_verification_codes
  WHERE user_id = v_user_id
    AND NOT used
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- ── No active code found — check if there's an expired one (Case 7) ──
  IF v_record IS NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM email_verification_codes
      WHERE user_id = v_user_id
        AND NOT used
        AND expires_at <= now()
    ) INTO v_expired_exists;

    IF v_expired_exists THEN
      -- Invalidate expired codes
      UPDATE email_verification_codes
      SET used = true
      WHERE user_id = v_user_id AND NOT used AND expires_at <= now();

      RETURN jsonb_build_object(
        'success', false,
        'error', 'Your verification code has expired. Please request a new one.',
        'expired', true
      );
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'No active verification code. Please request a new one.');
  END IF;

  -- ── Case 15: Cross-email validation ───────────────────────────────────
  IF v_current_personal IS NULL OR lower(v_record.email) <> lower(v_current_personal) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Verification code does not match current email');
  END IF;

  -- ── Case 12: Brute-force lockout check ────────────────────────────────
  IF v_record.failed_attempts >= v_max_attempts THEN
    UPDATE email_verification_codes SET used = true WHERE id = v_record.id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Too many failed attempts. This code has been invalidated. Please request a new one.',
      'locked', true
    );
  END IF;

  -- ── Hash comparison (Case 17, 28) ─────────────────────────────────────
  IF v_record.code_hash IS NOT NULL 
     AND extensions.crypt(trim(p_code), v_record.code_hash) = v_record.code_hash THEN
    -- ✅ Code matches — atomic verify + update (Case 18)
    
    -- Mark code as used atomically
    UPDATE email_verification_codes SET used = true WHERE id = v_record.id;

    -- Bypass the column guard for this transaction
    PERFORM set_config('app.bypass_email_guard', 'true', true);

    -- Mark personal email as verified atomically
    UPDATE profiles
    SET
      personal_email_verified = true,
      personal_email_verified_at = now(),
      email_transition_status = 'verified',
      updated_at = now()
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true, 'status', 'verified');
  
  ELSIF v_record.code_hash IS NULL AND v_record.code = trim(p_code) THEN
    -- Legacy plaintext fallback (for codes generated before this migration)
    UPDATE email_verification_codes SET used = true WHERE id = v_record.id;

    PERFORM set_config('app.bypass_email_guard', 'true', true);

    UPDATE profiles
    SET
      personal_email_verified = true,
      personal_email_verified_at = now(),
      email_transition_status = 'verified',
      updated_at = now()
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true, 'status', 'verified');
  
  ELSE
    -- ❌ Wrong code (Case 4, 12)
    UPDATE email_verification_codes
    SET failed_attempts = failed_attempts + 1
    WHERE id = v_record.id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Incorrect verification code',
      'attempts_remaining', v_max_attempts - v_record.failed_attempts - 1
    );
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 4: Update remove_personal_email to invalidate codes (Case 24)
-- Already done in migration 076, but ensuring completeness.
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

  SELECT email_transition_status, role INTO v_status, v_role
  FROM profiles WHERE id = v_user_id;

  IF v_role IS NULL OR v_role NOT IN ('Student', 'Alumni') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email transition is only available for Students and Alumni');
  END IF;

  IF v_status = 'transitioned' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot remove personal email after transition is complete');
  END IF;

  -- Bypass the column guard
  PERFORM set_config('app.bypass_email_guard', 'true', true);

  -- Reset all personal email fields (Case 24)
  UPDATE profiles
  SET
    personal_email = NULL,
    personal_email_verified = false,
    personal_email_verified_at = NULL,
    email_transition_status = 'none',
    updated_at = now()
  WHERE id = v_user_id;

  -- Invalidate ALL active verification codes (Case 24, 25)
  UPDATE email_verification_codes
  SET used = true
  WHERE user_id = v_user_id AND NOT used;

  RETURN jsonb_build_object('success', true, 'status', 'none');
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 5: Update request_personal_email_link to invalidate old codes on
-- email change (Case 25)
-- ═══════════════════════════════════════════════════════════════════════════════

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

  -- Check uniqueness: not a college email for someone else
  SELECT id INTO v_existing FROM profiles
  WHERE lower(email) = lower(p_personal_email) AND id <> v_user_id;
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

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 6: Re-grant all updated RPCs
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.generate_email_verification_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_personal_email_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_personal_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_personal_email_link(text) TO authenticated;
