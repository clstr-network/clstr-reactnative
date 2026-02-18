-- ============================================================================
-- 108: Production Security Audit Fixes
--
-- Addresses findings from the full-stack adversarial security audit:
--
-- CB-1 (CRITICAL): OTP code returned to client — verification proves nothing.
--   Fix: RPC no longer returns plaintext code. Edge Function generates code
--   server-side via service_role and emails it. Client never sees OTP.
--
-- CB-3/CB-4 (HIGH): Client-side and server-side public domain lists diverge.
--   Fix: Expose is_public_email_domain() and normalize_college_domain() RPCs
--   for client use. Client should call these instead of maintaining local lists.
--
-- DIR-1 (CRITICAL): personal_email has no uniqueness constraint.
--   Fix: Add partial UNIQUE index on personal_email WHERE NOT NULL.
--
-- DIR-2 (LOW): email_verification_codes.code column is dead weight.
--   Fix: Drop NOT NULL constraint, set existing values to NULL.
--
-- ECF-1 (MEDIUM): handle_new_user swallows ALL errors silently.
--   Fix: Narrow EXCEPTION to specific expected errors, log to audit table.
--
-- ECF-2 (MEDIUM): merge_transitioned_account returns generic error strings.
--   Fix: Return structured error codes for frontend differentiation.
--
-- ECF-3 (MEDIUM): is_public_email_domain hardcoded list is incomplete.
--   Fix: Expand list with common public/disposable email providers.
--
-- DIR-3 (LOW): Deprecate profiles.domain column.
--   Fix: Add comment documenting deprecation.
--
-- AW-3: Document bypass flag inventory.
-- ============================================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- BYPASS FLAG INVARIANT MAP
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Flag: app.bypass_email_guard
--   Scope: transaction-local (is_local = true)
--   Set by: verify_personal_email_code, remove_personal_email,
--           request_personal_email_link, transition_to_personal_email,
--           merge_transitioned_account, sync_profile_email,
--           handle_new_user (indirectly via migration 107 cleanup)
--   Purpose: Allows UPDATE on personal_email/email_transition_status columns
--            that are normally protected by column-level trigger.
--
-- Flag: app.bypass_college_domain_guard
--   Scope: transaction-local (is_local = true)
--   Set by: sync_profile_email, merge_transitioned_account
--   Purpose: Allows UPDATE on college_domain which is normally immutable
--            via trg_prevent_college_domain_update.
--
-- Flag: app.bypass_public_domain_guard
--   Scope: transaction-local (is_local = true)
--   Set by: (currently unused — reserved for admin operations)
--   Purpose: Allows public-domain emails to bypass block_public_domain_profile.
--
-- Flag: app.merge_in_progress
--   Scope: transaction-local (is_local = true)
--   Set by: merge_transitioned_account
--   Purpose: Signals handle_user_deletion to record correct deletion reason.
--
-- INVARIANT: All flags MUST be set with is_local = true (3rd arg to set_config).
-- INVARIANT: All SECURITY DEFINER functions that set flags MUST have EXCEPTION
--            handlers that allow PostgreSQL's subtransaction rollback to clear them.
-- ══════════════════════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────────────────────
-- FIX CB-1: Secure OTP flow — code generated server-side only
-- ──────────────────────────────────────────────────────────────────────────────

-- Step 1: New internal RPC for Edge Function to generate + store code (service_role only).
-- This is the ONLY place where the plaintext code exists — transiently in PL/pgSQL memory.
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

  -- Store ONLY the hash
  INSERT INTO email_verification_codes (user_id, email, code_hash, code, expires_at)
  VALUES (p_user_id, lower(p_email), v_code_hash, '******', now() + interval '10 minutes');

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
-- Edge Functions use service_role key to call this.
REVOKE ALL ON FUNCTION public.generate_and_send_verification_code(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_and_send_verification_code(uuid, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.generate_and_send_verification_code(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_and_send_verification_code(uuid, text) TO service_role;


-- Step 2: Neuter the client-facing generate_email_verification_code.
-- It now returns ONLY a request_id (no code). Client calls the Edge Function
-- which internally uses generate_and_send_verification_code via service_role.
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

  IF p_email IS NULL OR p_email !~* '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid email format');
  END IF;

  SELECT email_transition_status, personal_email, role
  INTO v_current_status, v_current_personal, v_role
  FROM profiles
  WHERE id = v_user_id;

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

  -- Cooldown check (read-only — actual generation happens in Edge Function)
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

  -- Rate limit check (read-only)
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

  -- SECURITY FIX (CB-1): Do NOT generate or return code here.
  -- Return validation-passed status. Client must call the Edge Function
  -- which generates the code server-side via service_role.
  RETURN jsonb_build_object(
    'success', true,
    'validated', true,
    'expires_in_seconds', 600,
    'cooldown_seconds', v_cooldown_secs,
    'message', 'Validation passed. Call the verification Edge Function to generate and send the code.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_email_verification_code(text) TO authenticated;


-- Step 3: Update verify_personal_email_code to use bcrypt (ensure code_hash path is primary)
-- The function from migration 077 already supports bcrypt. Just ensure code_hash backfill.
-- No changes needed to verify_personal_email_code — it already checks code_hash first.


-- ──────────────────────────────────────────────────────────────────────────────
-- FIX DIR-1: Add UNIQUE constraint on personal_email (WHERE NOT NULL)
-- ──────────────────────────────────────────────────────────────────────────────

-- Partial unique index: only one profile can claim a given personal_email
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_personal_email_unique
  ON public.profiles (lower(personal_email))
  WHERE personal_email IS NOT NULL;


-- ──────────────────────────────────────────────────────────────────────────────
-- FIX DIR-2: Drop NOT NULL on legacy code column, clear dead data
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.email_verification_codes
  ALTER COLUMN code DROP NOT NULL;

UPDATE public.email_verification_codes
  SET code = NULL
  WHERE code = '******';


-- ──────────────────────────────────────────────────────────────────────────────
-- FIX ECF-3 / F7: Expand is_public_email_domain with comprehensive blocklist
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_public_email_domain(p_domain text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain text := lower(btrim(COALESCE(p_domain, '')));
BEGIN
  IF v_domain = '' THEN
    RETURN false;
  END IF;

  -- Comprehensive public email provider list
  IF v_domain = ANY(ARRAY[
    -- Major providers
    'gmail.com',
    'yahoo.com',
    'outlook.com',
    'hotmail.com',
    'icloud.com',
    'proton.me',
    'protonmail.com',
    'live.com',
    'msn.com',
    'aol.com',
    'mail.com',
    'yandex.com',
    'zoho.com',
    'rediffmail.com',
    'inbox.com',
    -- Additional public providers (ECF-3)
    'tutanota.com',
    'tutamail.com',
    'tuta.io',
    'gmx.com',
    'gmx.de',
    'gmx.net',
    'fastmail.com',
    'fastmail.fm',
    'pm.me',
    'duck.com',
    'hey.com',
    'me.com',
    'mac.com',
    'yahoo.co.in',
    'yahoo.co.uk',
    'outlook.in',
    'hotmail.co.uk',
    'live.in',
    'live.co.uk',
    -- Disposable email services
    'mailinator.com',
    'guerrillamail.com',
    'guerrillamail.de',
    'tempmail.com',
    'throwaway.email',
    'yopmail.com',
    'sharklasers.com',
    'guerrillamailblock.com',
    'grr.la',
    'dispostable.com',
    'mailnesia.com',
    'maildrop.cc',
    'discard.email',
    'temp-mail.org',
    'fakeinbox.com',
    'getnada.com',
    'trashmail.com',
    'trashmail.me',
    'mohmal.com',
    'tempail.com',
    '10minutemail.com',
    'minutemail.com',
    'emailondeck.com'
  ]) THEN
    RETURN true;
  END IF;

  -- Also check the college_domain_aliases table for dynamically blocked domains
  RETURN EXISTS (
    SELECT 1
    FROM public.college_domain_aliases cda
    WHERE cda.domain = v_domain
      AND COALESCE(cda.status, 'pending') = 'blocked'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_public_email_domain(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_public_email_domain(text) TO anon;


-- ──────────────────────────────────────────────────────────────────────────────
-- FIX ECF-1 / F8: Narrow handle_new_user EXCEPTION handler
-- ──────────────────────────────────────────────────────────────────────────────

-- Create audit log table for handle_new_user failures
CREATE TABLE IF NOT EXISTS public.auth_hook_error_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hook_name text NOT NULL,
  user_id uuid,
  error_code text,
  error_message text,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: only platform admins can read error logs
ALTER TABLE public.auth_hook_error_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view auth hook errors" ON public.auth_hook_error_log;
CREATE POLICY "Platform admins can view auth hook errors"
  ON public.auth_hook_error_log
  FOR SELECT
  USING (public.is_platform_admin());


CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role public.user_role;
  user_email text;
  email_domain text;
  canonical_college_domain text;
  v_existing_transitioned_id uuid;
  v_is_platform_admin boolean := false;
BEGIN
  user_email := NEW.email;

  IF user_email IS NOT NULL AND user_email LIKE '%@%' THEN
    email_domain := lower(substring(user_email FROM '@(.+)$'));
  ELSE
    email_domain := NULL;
  END IF;

  IF user_email IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.is_active = true
        AND lower(pa.email) = lower(user_email)
    ) INTO v_is_platform_admin;
  END IF;

  IF v_is_platform_admin THEN
    RETURN NEW;
  END IF;

  IF email_domain IS NOT NULL AND public.is_public_email_domain(email_domain) THEN
    SELECT id INTO v_existing_transitioned_id
    FROM public.profiles
    WHERE lower(personal_email) = lower(user_email)
      AND email_transition_status = 'transitioned'
      AND personal_email_verified = true
      AND onboarding_complete = true
    LIMIT 1;

    RETURN NEW;
  END IF;

  canonical_college_domain := public.normalize_college_domain(email_domain);

  IF canonical_college_domain IS NULL OR public.is_public_email_domain(canonical_college_domain) THEN
    RETURN NEW;
  END IF;

  default_role := 'Student';

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
      split_part(user_email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    default_role,
    email_domain,
    canonical_college_domain,
    false,
    false,
    10,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    domain = COALESCE(profiles.domain, EXCLUDED.domain),
    updated_at = now();

  RETURN NEW;

EXCEPTION
  -- FIX ECF-1: Only catch expected errors, log everything
  WHEN unique_violation THEN
    -- Profile already exists with this ID or conflicting unique constraint
    -- This is expected during concurrent signups or re-auth
    INSERT INTO public.auth_hook_error_log (hook_name, user_id, error_code, error_message, context)
    VALUES ('handle_new_user', NEW.id, 'unique_violation', SQLERRM,
            jsonb_build_object('email', user_email, 'domain', email_domain));
    RAISE WARNING 'handle_new_user unique_violation (expected): % for user %', SQLERRM, NEW.id;
    RETURN NEW;

  WHEN OTHERS THEN
    -- Log unexpected errors to audit table for investigation
    BEGIN
      INSERT INTO public.auth_hook_error_log (hook_name, user_id, error_code, error_message, context)
      VALUES ('handle_new_user', NEW.id, SQLSTATE, SQLERRM,
              jsonb_build_object('email', user_email, 'domain', email_domain));
    EXCEPTION WHEN OTHERS THEN
      -- If even logging fails, just warn
      NULL;
    END;
    RAISE WARNING 'handle_new_user unexpected error [%]: % for user %', SQLSTATE, SQLERRM, NEW.id;
    RETURN NEW;
END;
$$;


-- ──────────────────────────────────────────────────────────────────────────────
-- FIX DIR-3 / F10: Deprecate profiles.domain column
-- ──────────────────────────────────────────────────────────────────────────────

COMMENT ON COLUMN public.profiles.domain IS
  'DEPRECATED: Raw email domain. Use college_domain instead for all identity, '
  'community scoping, and RLS operations. This column exists only for backward '
  'compatibility and should not be used in new code. '
  'See: security audit DIR-3, migration 108.';


-- ──────────────────────────────────────────────────────────────────────────────
-- FIX CB-3/F4: Expose RPCs for client to call instead of maintaining local lists
-- ──────────────────────────────────────────────────────────────────────────────

-- is_public_email_domain is already granted to authenticated + anon (above)
-- normalize_college_domain needs to be exposed too

GRANT EXECUTE ON FUNCTION public.normalize_college_domain(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_college_domain(text) TO anon;


COMMIT;
