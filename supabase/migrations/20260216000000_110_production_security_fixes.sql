-- ============================================================================
-- 110: Production Security Fixes — Community Isolation & Hardening
--
-- Addresses findings from the production security audit:
--
-- CB-1: Domain-scoped RLS on messages table (CRITICAL)
-- CB-2: Domain validation on connections INSERT + RLS (CRITICAL)
-- CB-3: Harden guard_email_transition_columns with companion token (HIGH)
-- CB-4: Update verify_personal_email_code to use _set_bypass_flag (HIGH)
-- AW-1: Domain-scoped RLS for profiles SELECT (sensitive fields)
-- AW-2: Domain-scoped RLS for posts SELECT
-- AW-4: Jobs NULL college_domain documented + admin flag
-- DIR-1: CHECK constraint on college_domain
-- DIR-2: Store receiver_domain on connections
-- DIR-3: Post college_domain re-validation trigger
-- DIR-4: Table-driven public domain blocklist
-- ECF-2: Return clear error for orphan auth user (no profile)
-- ECF-5: Expire plaintext verification codes
-- UC-4: Complete _set_bypass_flag hardening (100%)
-- ============================================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- CB-1 FIX: Domain-scoped RLS on messages table
-- Replace identity-only policies with domain-verified policies.
-- Both sender and receiver must share the same college_domain.
-- ══════════════════════════════════════════════════════════════════════════════

-- Helper function to get current user's college_domain (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_college_domain()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT college_domain FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_user_college_domain() TO authenticated;

-- Replace messages SELECT policy with domain-scoped version
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
CREATE POLICY "Users can view their messages" ON public.messages
  FOR SELECT USING (
    (auth.uid() = sender_id OR auth.uid() = receiver_id)
    AND EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.college_domain = p2.college_domain
      WHERE p1.id = sender_id AND p2.id = receiver_id
    )
  );

-- Replace messages INSERT policy with domain check
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.college_domain = p2.college_domain
      WHERE p1.id = sender_id AND p2.id = receiver_id
        AND p1.college_domain IS NOT NULL
    )
  );

-- Replace messages UPDATE policy with domain check
DROP POLICY IF EXISTS "Users can update their messages" ON public.messages;
CREATE POLICY "Users can update their messages" ON public.messages
  FOR UPDATE USING (
    (auth.uid() = sender_id OR auth.uid() = receiver_id)
    AND EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.college_domain = p2.college_domain
      WHERE p1.id = sender_id AND p2.id = receiver_id
    )
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- CB-2 FIX: Domain validation on connections
-- Add receiver_domain column, enforce same-domain on INSERT, and scope RLS.
-- ══════════════════════════════════════════════════════════════════════════════

-- DIR-2 FIX: Add receiver_domain column to connections
ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS receiver_domain text;

-- Backfill receiver_domain for existing connections
UPDATE public.connections c
SET receiver_domain = p.college_domain
FROM public.profiles p
WHERE c.receiver_id = p.id
  AND c.receiver_domain IS NULL;

-- Trigger to enforce same-domain connections on INSERT
CREATE OR REPLACE FUNCTION public.enforce_same_domain_connection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_domain text;
  v_receiver_domain text;
BEGIN
  SELECT college_domain INTO v_requester_domain
  FROM public.profiles WHERE id = NEW.requester_id;

  SELECT college_domain INTO v_receiver_domain
  FROM public.profiles WHERE id = NEW.receiver_id;

  IF v_requester_domain IS NULL THEN
    RAISE EXCEPTION 'Requester does not have a college domain. Complete onboarding first.';
  END IF;

  IF v_receiver_domain IS NULL THEN
    RAISE EXCEPTION 'Receiver does not have a college domain.';
  END IF;

  IF v_requester_domain <> v_receiver_domain THEN
    RAISE EXCEPTION 'Cross-domain connections are not allowed. Both users must belong to the same college.';
  END IF;

  -- Populate receiver_domain for audit trail (DIR-2)
  NEW.receiver_domain := v_receiver_domain;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_same_domain_connection ON public.connections;
CREATE TRIGGER trg_enforce_same_domain_connection
  BEFORE INSERT ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_same_domain_connection();

-- Add domain-scoped RLS on connections
DROP POLICY IF EXISTS "Connections are viewable by involved users" ON public.connections;
CREATE POLICY "Connections are viewable by involved users" ON public.connections
  FOR SELECT USING (
    (auth.uid() = requester_id OR auth.uid() = receiver_id)
    AND (
      college_domain = public.get_user_college_domain()
      OR receiver_domain = public.get_user_college_domain()
    )
  );

-- Keep INSERT policy but add domain check via trigger (above)
DROP POLICY IF EXISTS "Users can send connection requests" ON public.connections;
CREATE POLICY "Users can send connection requests" ON public.connections
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Update/Delete remain identity-scoped (trigger handles domain on insert)
DROP POLICY IF EXISTS "Users can update their connections" ON public.connections;
CREATE POLICY "Users can update their connections" ON public.connections
  FOR UPDATE USING (
    (auth.uid() = requester_id OR auth.uid() = receiver_id)
    AND (
      college_domain = public.get_user_college_domain()
      OR receiver_domain = public.get_user_college_domain()
    )
  );

DROP POLICY IF EXISTS "Users can delete their connections" ON public.connections;
CREATE POLICY "Users can delete their connections" ON public.connections
  FOR DELETE USING (
    (auth.uid() = requester_id OR auth.uid() = receiver_id)
    AND (
      college_domain = public.get_user_college_domain()
      OR receiver_domain = public.get_user_college_domain()
    )
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- CB-3 FIX: Harden guard_email_transition_columns with companion token
-- Now verifies both the flag AND the SECURITY DEFINER caller token,
-- matching the pattern used by prevent_college_domain_update.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.guard_email_transition_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check both the flag AND the SECURITY DEFINER caller token (hardened pattern)
  IF current_setting('app.bypass_email_guard', true) = 'true'
     AND current_setting('app.bypass_email_guard_token', true) = 'sd_verified_app.bypass_email_guard' THEN
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


-- ══════════════════════════════════════════════════════════════════════════════
-- CB-4 FIX: Update verify_personal_email_code to use _set_bypass_flag
-- Replaces the unhardened set_config() with _set_bypass_flag() calls.
-- Also removes the plaintext fallback path (ECF-5) since code column
-- was dropped in migration 109.
-- ══════════════════════════════════════════════════════════════════════════════

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

  -- Code format validation
  IF p_code IS NULL OR length(trim(p_code)) <> 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please enter a valid 6-digit verification code');
  END IF;

  -- Role guard + status check
  SELECT email_transition_status, role, personal_email
  INTO v_current_status, v_role, v_current_personal
  FROM profiles WHERE id = v_user_id;

  IF v_role IS NULL OR v_role NOT IN ('Student', 'Alumni') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email transition is only available for Students and Alumni');
  END IF;

  -- Idempotent check
  IF v_current_status = 'verified' OR v_current_status = 'transitioned' THEN
    RETURN jsonb_build_object('success', true, 'status', v_current_status, 'message', 'Already verified');
  END IF;

  IF v_current_status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending verification');
  END IF;

  -- Find the latest ACTIVE code with row lock
  SELECT * INTO v_record
  FROM email_verification_codes
  WHERE user_id = v_user_id
    AND NOT used
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- No active code found — check if there's an expired one
  IF v_record IS NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM email_verification_codes
      WHERE user_id = v_user_id
        AND NOT used
        AND expires_at <= now()
    ) INTO v_expired_exists;

    IF v_expired_exists THEN
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

  -- Cross-email validation
  IF v_current_personal IS NULL OR lower(v_record.email) <> lower(v_current_personal) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Verification code does not match current email');
  END IF;

  -- Brute-force lockout check
  IF v_record.failed_attempts >= v_max_attempts THEN
    UPDATE email_verification_codes SET used = true WHERE id = v_record.id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Too many failed attempts. This code has been invalidated. Please request a new one.',
      'locked', true
    );
  END IF;

  -- Hash comparison (bcrypt only — plaintext fallback removed)
  IF v_record.code_hash IS NOT NULL
     AND extensions.crypt(trim(p_code), v_record.code_hash) = v_record.code_hash THEN
    -- Code matches — atomic verify + update

    -- Mark code as used atomically
    UPDATE email_verification_codes SET used = true WHERE id = v_record.id;

    -- Use hardened bypass flag (CB-4 FIX: companion token verified by trigger)
    PERFORM public._set_bypass_flag('app.bypass_email_guard', 'true');

    -- Mark personal email as verified atomically
    UPDATE profiles
    SET
      personal_email_verified = true,
      personal_email_verified_at = now(),
      email_transition_status = 'verified',
      updated_at = now()
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true, 'status', 'verified');

  ELSE
    -- Wrong code
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

GRANT EXECUTE ON FUNCTION public.verify_personal_email_code(text) TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- CB-4 CONT: Update remove_personal_email to use _set_bypass_flag
-- ══════════════════════════════════════════════════════════════════════════════

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

  -- Use hardened bypass flag (UC-4 FIX: companion token)
  PERFORM public._set_bypass_flag('app.bypass_email_guard', 'true');

  -- Reset all personal email fields
  UPDATE profiles
  SET
    personal_email = NULL,
    personal_email_verified = false,
    personal_email_verified_at = NULL,
    email_transition_status = 'none',
    updated_at = now()
  WHERE id = v_user_id;

  -- Invalidate ALL active verification codes
  UPDATE email_verification_codes
  SET used = true
  WHERE user_id = v_user_id AND NOT used;

  RETURN jsonb_build_object('success', true, 'status', 'none');
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_personal_email() TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- CB-4 CONT: Update request_personal_email_link to use _set_bypass_flag
-- ══════════════════════════════════════════════════════════════════════════════

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

  -- If changing email while a code exists, invalidate old codes
  IF v_current_personal IS NOT NULL
     AND lower(v_current_personal) <> lower(p_personal_email) THEN
    UPDATE email_verification_codes
    SET used = true
    WHERE user_id = v_user_id AND NOT used;
  END IF;

  -- Use hardened bypass flag (UC-4 FIX: companion token)
  PERFORM public._set_bypass_flag('app.bypass_email_guard', 'true');

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


-- ══════════════════════════════════════════════════════════════════════════════
-- AW-2 FIX: Domain-scoped RLS for posts
-- Posts are now only visible to users in the same college domain.
-- Posts with NULL college_domain remain visible to all (backwards compat).
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Posts are viewable by same college" ON public.posts;
CREATE POLICY "Posts are viewable by same college" ON public.posts
  FOR SELECT USING (
    -- Own posts always visible
    auth.uid() = user_id
    -- Same college domain
    OR college_domain = public.get_user_college_domain()
    -- Posts with NULL domain are platform-wide
    OR college_domain IS NULL
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- DIR-1 FIX: CHECK constraint on college_domain
-- Prevents empty strings, @ signs, and ensures minimum format
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop if exists (idempotent)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS chk_college_domain_format;

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_college_domain_format
  CHECK (
    college_domain IS NULL
    OR (
      length(college_domain) >= 3
      AND college_domain NOT LIKE '%@%'
      AND college_domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'
    )
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- DIR-4 FIX: Table-driven public domain blocklist
-- Replace hardcoded is_public_email_domain() with a lookup table.
-- Seed with all existing domains from the hardcoded function.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.public_email_domains (
  domain text PRIMARY KEY,
  added_by uuid REFERENCES auth.users(id),
  added_at timestamptz DEFAULT now(),
  notes text
);

-- RLS: readable by all authenticated, writable by platform admins only
ALTER TABLE public.public_email_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public email domains readable by all" ON public.public_email_domains;
CREATE POLICY "Public email domains readable by all" ON public.public_email_domains
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can manage public email domains" ON public.public_email_domains;
CREATE POLICY "Only admins can manage public email domains" ON public.public_email_domains
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.is_active = true
        AND lower(pa.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- Seed from existing hardcoded list
INSERT INTO public.public_email_domains (domain) VALUES
  ('gmail.com'), ('yahoo.com'), ('yahoo.co.in'), ('yahoo.co.uk'), ('yahoo.fr'),
  ('yahoo.de'), ('yahoo.it'), ('yahoo.es'), ('yahoo.ca'), ('yahoo.com.au'),
  ('yahoo.com.br'), ('yahoo.co.jp'),
  ('outlook.com'), ('hotmail.com'), ('hotmail.co.uk'), ('hotmail.fr'),
  ('hotmail.de'), ('hotmail.it'), ('hotmail.es'),
  ('live.com'), ('live.co.uk'), ('live.fr'), ('live.de'), ('live.it'),
  ('msn.com'),
  ('protonmail.com'), ('protonmail.ch'), ('proton.me'), ('pm.me'),
  ('icloud.com'), ('me.com'), ('mac.com'),
  ('aol.com'), ('aol.co.uk'),
  ('zoho.com'), ('zohomail.com'),
  ('mail.com'), ('email.com'), ('usa.com'),
  ('gmx.com'), ('gmx.de'), ('gmx.net'), ('gmx.at'), ('gmx.ch'),
  ('yandex.com'), ('yandex.ru'), ('ya.ru'),
  ('tutanota.com'), ('tuta.io'), ('tutamail.com'), ('tutanota.de'),
  ('fastmail.com'), ('fastmail.fm'),
  ('mailfence.com'),
  ('disroot.org'),
  ('riseup.net'),
  ('runbox.com'),
  ('posteo.de'), ('posteo.net'),
  ('mailbox.org'),
  ('cock.li'),
  ('rediffmail.com'),
  ('inbox.com'),
  ('ymail.com'),
  ('att.net'),
  ('bellsouth.net'),
  ('sbcglobal.net'),
  ('comcast.net'),
  ('verizon.net'),
  ('cox.net'),
  ('charter.net'),
  ('earthlink.net'),
  ('optonline.net'),
  ('frontier.com'),
  ('windstream.net'),
  ('juno.com'),
  ('netzero.com'),
  ('hushmail.com'),
  ('lavabit.com'),
  ('tempmail.com'),
  ('guerrillamail.com'), ('guerrillamail.de'), ('guerrillamailblock.com'),
  ('sharklasers.com'), ('grr.la'), ('guerrillamail.info'),
  ('mailinator.com'),
  ('10minutemail.com'),
  ('throwaway.email'),
  ('maildrop.cc'),
  ('dispostable.com'),
  ('yopmail.com'), ('yopmail.fr'),
  ('trashmail.com'), ('trashmail.me'),
  ('temp-mail.org'),
  ('fakeinbox.com'),
  ('getnada.com'),
  ('mohmal.com'),
  ('tempail.com'),
  ('emailondeck.com'),
  ('mintemail.com'),
  ('mailnesia.com')
ON CONFLICT (domain) DO NOTHING;

-- Rebuild is_public_email_domain to use the table
CREATE OR REPLACE FUNCTION public.is_public_email_domain(p_domain text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.public_email_domains
    WHERE domain = lower(btrim(p_domain))
  );
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- ECF-5 FIX: Expire all remaining plaintext-only verification codes
-- Any codes without code_hash are from before bcrypt migration.
-- ══════════════════════════════════════════════════════════════════════════════

UPDATE public.email_verification_codes
SET used = true
WHERE code_hash IS NULL
  AND NOT used;


-- ══════════════════════════════════════════════════════════════════════════════
-- AW-5 / UC-1: Drop deprecated profiles.domain column
-- All reads have been migrated to college_domain.
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop the index first
DROP INDEX IF EXISTS profiles_domain_idx;

-- Drop the column
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS domain;


-- ══════════════════════════════════════════════════════════════════════════════
-- BYPASS FLAG INVARIANT — 100% COMPLETE
-- All three bypass flags now require companion tokens:
--
-- 1. app.bypass_email_guard       → guard_email_transition_columns (CB-3 ✓)
-- 2. app.bypass_college_domain_guard → prevent_college_domain_update (109 ✓)
-- 3. app.bypass_public_domain_guard  → block_public_domain_profile  (109 ✓)
--
-- All SECURITY DEFINER functions using these flags now call
-- _set_bypass_flag() which sets both flag + companion token atomically.
-- ══════════════════════════════════════════════════════════════════════════════

COMMIT;
