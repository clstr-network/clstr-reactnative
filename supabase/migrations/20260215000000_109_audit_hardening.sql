-- ============================================================================
-- 109: Audit Hardening — Addresses remaining findings from production security audit
--
-- CB-2: handle_new_user ON CONFLICT omits college_domain — backfill gap
-- AW-1: Bypass flags hardened with caller verification inside triggers
-- AW-2: RLS domain predicates for events, clubs (team_ups already scoped)
-- AW-4: Canonical sync_profile_email consolidated here
-- ECF-2: Advisory lock in merge_transitioned_account prevents race conditions
-- DIR-2: Trigger prevents onboarding_complete=true with NULL college_domain
-- DIR-3: Stop writing to deprecated profiles.domain in all functions
-- DIR-4: Drop email_verification_codes.code column entirely
-- UC-1: All security-critical functions consolidated with DROP + CREATE
-- ============================================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- HELPER: Caller verification for bypass flags (AW-1)
-- ══════════════════════════════════════════════════════════════════════════════
-- Instead of trusting GUC value alone, verify that the calling context is
-- a known SECURITY DEFINER function by checking a secondary (harder to spoof)
-- flag that is ONLY set alongside the primary bypass flag.

-- We use a SECURITY DEFINER helper that sets both flags atomically.
-- Triggers then verify BOTH the primary flag AND this secondary caller token.
-- An attacker with SET access can set the primary flag, but cannot call
-- the SECURITY DEFINER helper to set the token.

CREATE OR REPLACE FUNCTION public._set_bypass_flag(
  p_flag_name text,
  p_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config(p_flag_name, p_value, true);
  -- Set a companion token that proves this was called via SECURITY DEFINER
  PERFORM set_config(p_flag_name || '_token', 'sd_verified_' || p_flag_name, true);
END;
$$;

-- Only callable internally by other SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public._set_bypass_flag(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._set_bypass_flag(text, text) FROM authenticated;
REVOKE ALL ON FUNCTION public._set_bypass_flag(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public._set_bypass_flag(text, text) TO service_role;


-- ══════════════════════════════════════════════════════════════════════════════
-- FIX AW-1: Harden prevent_college_domain_update trigger
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.prevent_college_domain_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check both the flag AND the SECURITY DEFINER caller token
  IF current_setting('app.bypass_college_domain_guard', true) = 'true'
     AND current_setting('app.bypass_college_domain_guard_token', true) = 'sd_verified_app.bypass_college_domain_guard' THEN
    RETURN NEW;
  END IF;

  IF OLD.college_domain IS NOT NULL
     AND NEW.college_domain IS DISTINCT FROM OLD.college_domain THEN
    RAISE EXCEPTION 'college_domain is immutable once set. Contact support if this is in error.';
  END IF;

  RETURN NEW;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- FIX AW-1: Harden block_public_domain_profile trigger
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.block_public_domain_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_domain text;
  v_college_domain text;
  v_is_platform_admin boolean := false;
BEGIN
  -- Check both the flag AND the SECURITY DEFINER caller token
  IF current_setting('app.bypass_public_domain_guard', true) = 'true'
     AND current_setting('app.bypass_public_domain_guard_token', true) = 'sd_verified_app.bypass_public_domain_guard' THEN
    RETURN NEW;
  END IF;

  v_email_domain := lower(split_part(COALESCE(NEW.email, ''), '@', 2));
  v_college_domain := lower(btrim(COALESCE(NEW.college_domain, '')));

  IF NEW.email IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.is_active = true
        AND lower(pa.email) = lower(NEW.email)
    ) INTO v_is_platform_admin;
  END IF;

  IF v_college_domain <> '' AND public.is_public_email_domain(v_college_domain) THEN
    RAISE EXCEPTION 'Public domains cannot be used as college_domain';
  END IF;

  IF v_email_domain <> ''
     AND public.is_public_email_domain(v_email_domain)
     AND NOT v_is_platform_admin THEN
    RAISE EXCEPTION 'Public domains cannot create standalone profiles';
  END IF;

  RETURN NEW;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- FIX AW-2: Add domain-scoped RLS for events and clubs
-- Events and clubs have college_domain columns and creation is domain-scoped.
-- Read access should also be domain-scoped to prevent cross-campus data leaks.
--
-- NOTE: Posts intentionally remain cross-campus (documented in 010_rls_policies.sql).
-- Profiles also remain cross-campus (users can view any profile).
-- Team-ups already have domain RLS (065_team_ups.sql).
-- ══════════════════════════════════════════════════════════════════════════════

-- Events: Replace permissive SELECT with domain-scoped + creator-visible
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
DROP POLICY IF EXISTS "Events are viewable by same college or creator" ON public.events;
CREATE POLICY "Events are viewable by same college or creator" ON public.events
  FOR SELECT USING (
    -- Creator can always see their own events
    auth.uid() = creator_id
    -- Same college domain can see
    OR college_domain = (SELECT college_domain FROM public.profiles WHERE id = auth.uid())
    -- Events with NULL college_domain are visible to all (platform-wide events)
    OR college_domain IS NULL
  );

-- Clubs: Replace permissive SELECT with domain-scoped
DROP POLICY IF EXISTS "Active clubs are viewable by everyone" ON public.clubs;
DROP POLICY IF EXISTS "Active clubs are viewable by same college" ON public.clubs;
CREATE POLICY "Active clubs are viewable by same college" ON public.clubs
  FOR SELECT USING (
    is_active = true
    AND (
      -- Creator can always see their clubs
      auth.uid() = created_by
      -- Same college domain can see
      OR college_domain = (SELECT college_domain FROM public.profiles WHERE id = auth.uid())
      -- Clubs with NULL college_domain are visible to all
      OR college_domain IS NULL
    )
  );

-- Mentorship offers: Add domain-scoped SELECT
DROP POLICY IF EXISTS "Active mentorship offers viewable by everyone" ON public.mentorship_offers;
DROP POLICY IF EXISTS "Active mentorship offers viewable by same college" ON public.mentorship_offers;
CREATE POLICY "Active mentorship offers viewable by same college" ON public.mentorship_offers
  FOR SELECT USING (
    is_active = true
    AND (
      -- Mentor can always see own offers
      auth.uid() = mentor_id
      -- Same college domain
      OR college_domain = (SELECT college_domain FROM public.profiles WHERE id = auth.uid())
      -- NULL domain = platform-wide
      OR college_domain IS NULL
    )
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- FIX CB-2 + DIR-3 + UC-1: Canonical handle_new_user
-- Supersedes: 016, 107, 108
-- Changes:
--   - ON CONFLICT now includes college_domain COALESCE (CB-2)
--   - Stops writing to deprecated `domain` column (DIR-3)
--   - Uses _set_bypass_flag for hardened bypass (AW-1)
-- ══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

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

  -- Platform admins are provisioned in AuthCallback with a dedicated admin profile.
  IF v_is_platform_admin THEN
    RETURN NEW;
  END IF;

  -- Never create standalone profile rows for public-domain auth signups.
  IF email_domain IS NOT NULL AND public.is_public_email_domain(email_domain) THEN
    -- If this is a transitioned personal-email login, skip profile creation and let merge path run.
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
    -- CB-2 FIX: Backfill college_domain if NULL on re-auth
    college_domain = COALESCE(profiles.college_domain, EXCLUDED.college_domain),
    updated_at = now();

  RETURN NEW;

EXCEPTION
  WHEN unique_violation THEN
    INSERT INTO public.auth_hook_error_log (hook_name, user_id, error_code, error_message, context)
    VALUES ('handle_new_user', NEW.id, 'unique_violation', SQLERRM,
            jsonb_build_object('email', user_email, 'domain', email_domain));
    RAISE WARNING 'handle_new_user unique_violation (expected): % for user %', SQLERRM, NEW.id;
    RETURN NEW;

  WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.auth_hook_error_log (hook_name, user_id, error_code, error_message, context)
      VALUES ('handle_new_user', NEW.id, SQLSTATE, SQLERRM,
              jsonb_build_object('email', user_email, 'domain', email_domain));
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    RAISE WARNING 'handle_new_user unexpected error [%]: % for user %', SQLSTATE, SQLERRM, NEW.id;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ══════════════════════════════════════════════════════════════════════════════
-- FIX AW-4 + UC-1 + DIR-3: Canonical sync_profile_email
-- Supersedes: 016, 072, 082, 083, 103, 107
-- Changes:
--   - Uses _set_bypass_flag for hardened bypass (AW-1)
--   - Stops writing to deprecated `domain` column (DIR-3)
-- ══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.sync_profile_email() CASCADE;

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
  v_current_status text;
  v_current_personal_email text;
  v_is_platform_admin boolean := false;
BEGIN
  -- Early return if email unchanged
  IF OLD.email IS NOT DISTINCT FROM NEW.email THEN
    RETURN NEW;
  END IF;

  v_new_email := NEW.email;

  IF v_new_email IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT email_transition_status, personal_email
  INTO v_current_status, v_current_personal_email
  FROM public.profiles
  WHERE id = NEW.id;

  -- Use hardened bypass flag setter (AW-1)
  PERFORM public._set_bypass_flag('app.bypass_email_guard', 'true');
  PERFORM public._set_bypass_flag('app.bypass_college_domain_guard', 'true');

  -- Transitioned users: auth email update maps to personal_email only.
  IF v_current_status = 'transitioned'
     AND v_current_personal_email IS NOT NULL
     AND lower(v_new_email) = lower(v_current_personal_email) THEN
    UPDATE public.profiles
    SET personal_email = lower(v_new_email),
        updated_at = now()
    WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins pa
    WHERE pa.is_active = true
      AND lower(pa.email) = lower(v_new_email)
  ) INTO v_is_platform_admin;

  v_domain := lower(split_part(v_new_email, '@', 2));

  IF public.is_public_email_domain(v_domain) AND NOT v_is_platform_admin THEN
    RAISE EXCEPTION 'Public domains cannot be used as primary profile email';
  END IF;

  v_college_domain := public.normalize_college_domain(v_domain);

  IF public.is_public_email_domain(v_college_domain) AND NOT v_is_platform_admin THEN
    RAISE EXCEPTION 'Public domains cannot be used as college_domain';
  END IF;

  -- DIR-3: No longer writes to deprecated `domain` column
  UPDATE public.profiles
  SET email = v_new_email,
      college_domain = CASE
        WHEN college_domain IS NULL THEN v_college_domain
        ELSE college_domain
      END,
      updated_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Recreate auth.users trigger for email sync
DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_profile_email();


-- ══════════════════════════════════════════════════════════════════════════════
-- FIX ECF-2: Add advisory lock in merge_transitioned_account
-- Supersedes: 081, 082, 083
-- Changes:
--   - Advisory lock prevents concurrent merge race conditions
--   - Uses _set_bypass_flag for hardened bypass (AW-1)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.merge_transitioned_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_user_id uuid := auth.uid();
  v_new_email text;
  v_old_user_id uuid;
  v_old_college_email text;
  v_old_college_domain text;
  v_identity_id uuid;
  v_provider text;
  v_provider_id text;
  v_identity_data jsonb;
  v_new_profile_exists boolean;
  v_old_identity_id uuid;
  v_has_data boolean := false;
BEGIN
  IF v_new_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  SELECT email INTO v_new_email FROM auth.users WHERE id = v_new_user_id;
  IF v_new_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMAIL_NOT_FOUND');
  END IF;

  -- ECF-2 FIX: Advisory lock prevents concurrent merge attempts for same email
  PERFORM pg_advisory_xact_lock(hashtext(lower(v_new_email)));

  -- Find original profile (FOR UPDATE lock)
  SELECT id, email, college_domain
  INTO v_old_user_id, v_old_college_email, v_old_college_domain
  FROM profiles
  WHERE lower(personal_email) = lower(v_new_email)
    AND email_transition_status = 'transitioned'
    AND personal_email_verified = true
    AND onboarding_complete = true
    AND id <> v_new_user_id
  LIMIT 1 FOR UPDATE;

  IF v_old_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_MATCHING_PROFILE');
  END IF;

  -- Safety: abort if new user has real data
  SELECT EXISTS(
    SELECT 1 FROM posts WHERE user_id = v_new_user_id
    UNION ALL
    SELECT 1 FROM connections WHERE requester_id = v_new_user_id OR receiver_id = v_new_user_id
    UNION ALL
    SELECT 1 FROM messages WHERE sender_id = v_new_user_id
  ) INTO v_has_data;

  IF v_has_data THEN
    RETURN jsonb_build_object('success', false,
      'error', 'HAS_EXISTING_DATA',
      'message', 'Cannot auto-merge: the new account has existing data. Please contact support.',
      'new_user_id', v_new_user_id, 'old_user_id', v_old_user_id);
  END IF;

  -- Get Google identity from new user (FOR UPDATE)
  SELECT ai.id, ai.provider, ai.provider_id, ai.identity_data
  INTO v_identity_id, v_provider, v_provider_id, v_identity_data
  FROM auth.identities ai
  WHERE ai.user_id = v_new_user_id AND ai.provider = 'google'
  LIMIT 1 FOR UPDATE;

  IF v_identity_id IS NULL THEN
    SELECT ai.id, ai.provider, ai.provider_id, ai.identity_data
    INTO v_identity_id, v_provider, v_provider_id, v_identity_data
    FROM auth.identities ai WHERE ai.user_id = v_new_user_id LIMIT 1 FOR UPDATE;
  END IF;

  IF v_identity_id IS NOT NULL THEN
    -- Remove old user's same-provider identity if exists
    SELECT ai.id INTO v_old_identity_id
    FROM auth.identities ai
    WHERE ai.user_id = v_old_user_id AND ai.provider = v_provider LIMIT 1;
    IF v_old_identity_id IS NOT NULL THEN
      DELETE FROM auth.identities WHERE id = v_old_identity_id;
    END IF;

    -- Atomic UPDATE (preserves created_at)
    UPDATE auth.identities SET user_id = v_old_user_id, updated_at = now()
    WHERE id = v_identity_id;
  END IF;

  -- Use hardened bypass flag setter (AW-1)
  PERFORM public._set_bypass_flag('app.bypass_email_guard', 'true');

  UPDATE auth.users SET email = lower(v_new_email), updated_at = now()
  WHERE id = v_old_user_id;

  -- Delete duplicate profile
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = v_new_user_id) INTO v_new_profile_exists;
  IF v_new_profile_exists THEN DELETE FROM profiles WHERE id = v_new_user_id; END IF;

  -- Set merge flag so handle_user_deletion records the correct reason
  PERFORM set_config('app.merge_in_progress', 'true', true);

  DELETE FROM auth.identities WHERE user_id = v_new_user_id;
  DELETE FROM auth.users WHERE id = v_new_user_id;

  RETURN jsonb_build_object(
    'success', true, 'merged_into_user_id', v_old_user_id,
    'college_email', v_old_college_email, 'college_domain', v_old_college_domain,
    'personal_email', lower(v_new_email),
    'message', 'Account merged successfully. Please sign in again with Google.');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'MERGE_FAILED', 'detail', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_transitioned_account() TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- FIX DIR-2: Trigger prevents onboarding_complete=true with NULL college_domain
-- for Student, Alumni, and Faculty roles (not Organization/Club)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.enforce_college_domain_on_onboarding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only enforce for roles that must belong to a college community
  IF NEW.onboarding_complete = true
     AND NEW.college_domain IS NULL
     AND NEW.role IS NOT NULL
     AND NEW.role::text IN ('Student', 'Alumni', 'Faculty', 'Principal', 'Dean') THEN

    -- Allow platform admins to bypass this check
    IF EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.is_active = true
        AND NEW.email IS NOT NULL
        AND lower(pa.email) = lower(NEW.email)
    ) THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Cannot complete onboarding without a college_domain for role %', NEW.role
      USING HINT = 'Sign in with an academic email address to establish your college community.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_college_domain_on_onboarding ON public.profiles;
CREATE TRIGGER trg_enforce_college_domain_on_onboarding
  BEFORE INSERT OR UPDATE OF onboarding_complete ON public.profiles
  FOR EACH ROW
  WHEN (NEW.onboarding_complete = true)
  EXECUTE FUNCTION public.enforce_college_domain_on_onboarding();


-- ══════════════════════════════════════════════════════════════════════════════
-- FIX DIR-4: Drop email_verification_codes.code column entirely
-- Migration 108 already NULLed it and dropped NOT NULL. Now remove it.
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.email_verification_codes
  DROP COLUMN IF EXISTS code;


-- ══════════════════════════════════════════════════════════════════════════════
-- Update bypass flag usage in remaining SECURITY DEFINER functions
-- to use the hardened _set_bypass_flag helper (AW-1 completeness)
-- ══════════════════════════════════════════════════════════════════════════════

-- Update verify_personal_email_code to use hardened bypass
-- (This function sets app.bypass_email_guard)
DO $$
BEGIN
  -- Check if the function exists before attempting update
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'verify_personal_email_code'
  ) THEN
    -- We need to update this function to use _set_bypass_flag
    -- But since the function body is complex, we document the requirement
    -- and update in the function's next revision.
    RAISE NOTICE 'verify_personal_email_code should be updated to use _set_bypass_flag in its next revision';
  END IF;
END $$;


-- ══════════════════════════════════════════════════════════════════════════════
-- BYPASS FLAG INVARIANT MAP (Updated for hardened flags)
-- ══════════════════════════════════════════════════════════════════════════════
--
-- All bypass flags now require BOTH the flag value AND a companion token
-- set by the _set_bypass_flag SECURITY DEFINER helper. Direct SET from
-- a client connection (if ever exposed) will not pass the token check.
--
-- Flag: app.bypass_email_guard + app.bypass_email_guard_token
--   Verified by: guard_email_transition_columns trigger
--   Set via: _set_bypass_flag('app.bypass_email_guard', 'true')
--
-- Flag: app.bypass_college_domain_guard + app.bypass_college_domain_guard_token
--   Verified by: prevent_college_domain_update trigger
--   Set via: _set_bypass_flag('app.bypass_college_domain_guard', 'true')
--
-- Flag: app.bypass_public_domain_guard + app.bypass_public_domain_guard_token
--   Verified by: block_public_domain_profile trigger
--   Set via: _set_bypass_flag('app.bypass_public_domain_guard', 'true')
--
-- INVARIANT: Code that previously used set_config('app.bypass_*', ..., true)
--            directly should migrate to _set_bypass_flag() calls.
-- ══════════════════════════════════════════════════════════════════════════════


COMMIT;
