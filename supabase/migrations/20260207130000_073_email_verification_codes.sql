-- ============================================================================
-- 073: Email Verification Codes
-- Adds a secure, time-limited verification code system for personal email
-- verification. Replaces the broken signInWithOtp approach.
-- ============================================================================

-- 1. Create verification codes table
CREATE TABLE IF NOT EXISTS public.email_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Only one active code per user at a time
  CONSTRAINT email_verification_codes_email_check CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

-- Index for lookup during verification
CREATE INDEX IF NOT EXISTS idx_email_verification_codes_lookup
  ON public.email_verification_codes (user_id, code, used)
  WHERE NOT used;

-- Auto-cleanup old codes (older than 24h)
CREATE INDEX IF NOT EXISTS idx_email_verification_codes_cleanup
  ON public.email_verification_codes (expires_at)
  WHERE NOT used;

-- RLS
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own codes (but shouldn't need to — RPCs handle everything)
CREATE POLICY "Users can view own verification codes"
  ON public.email_verification_codes FOR SELECT
  USING (auth.uid() = user_id);

-- No direct INSERT/UPDATE/DELETE — only through SECURITY DEFINER RPCs
CREATE POLICY "No direct inserts"
  ON public.email_verification_codes FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct updates"
  ON public.email_verification_codes FOR UPDATE
  USING (false);

CREATE POLICY "No direct deletes"
  ON public.email_verification_codes FOR DELETE
  USING (false);

-- 2. Add prompt_dismissed_at column to profiles for persistent dismissal
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS personal_email_prompt_dismissed_at timestamptz;

-- 3. RPC: Generate a 6-digit verification code and store it
-- Returns the code so the client can display guidance (code is also
-- theoretically emailed via Edge Function or Supabase Auth hook).
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
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
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

-- 4. RPC: Verify the code and mark personal email as verified
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
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_code IS NULL OR length(trim(p_code)) <> 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid verification code format');
  END IF;

  -- Check current status
  SELECT email_transition_status INTO v_current_status
  FROM profiles WHERE id = v_user_id;

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

-- 5. RPC: Dismiss the personal email prompt (persisted)
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
  SET
    personal_email_prompt_dismissed_at = now(),
    updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. Update get_email_transition_status to include prompt dismissal
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
    role,
    personal_email_prompt_dismissed_at
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
    ),
    'prompt_dismissed_at', v_row.personal_email_prompt_dismissed_at
  );
END;
$$;

-- 7. Cleanup function for expired codes (can be called by cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM email_verification_codes
  WHERE expires_at < now() - interval '24 hours';
END;
$$;

-- 8. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_email_verification_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_personal_email_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_personal_email_prompt() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_verification_codes() TO service_role;
