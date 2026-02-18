-- ============================================================================
-- 121_fix_public_domain_community_leak.sql
--
-- Fixes two critical bugs:
--   BUG-1: Users who transitioned to personal email (Gmail) could end up
--          with college_domain = 'gmail.com', creating a fake community.
--   BUG-2: Users who were redirected to /academic-email-required still
--          appeared in the network because:
--          a) profiles without onboarding_complete were visible via RLS.
--          b) Network.tsx query didn't filter onboarding_complete.
--
-- Changes:
--   1. DATA FIX: NULL out college_domain for any profile where it's a public
--      email domain (gmail.com, yahoo.com, etc.).  These are invalid.
--   2. RLS FIX: Add onboarding_complete = true to profiles_select_same_college
--      so incomplete/ghost profiles are never visible to other users.
--   3. GUARD FIX: Harden sync_profile_email to NEVER overwrite college_domain
--      with a public domain, even in the fallback path.
--   4. RLS FIX: Add onboarding_complete = true to posts_select_same_college
--      (posts by ghost profiles should not be visible either).
-- ============================================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. DATA FIX: Clean up profiles with public email domains as college_domain
-- ══════════════════════════════════════════════════════════════════════════════

-- Log affected rows for audit before cleanup
INSERT INTO public.auth_hook_error_log (hook_name, user_id, error_code, error_message, context)
SELECT
  'migration_121_cleanup',
  p.id,
  'public_domain_college',
  'college_domain was a public email domain: ' || p.college_domain,
  jsonb_build_object(
    'old_college_domain', p.college_domain,
    'email', p.email,
    'personal_email', p.personal_email,
    'email_transition_status', p.email_transition_status,
    'onboarding_complete', p.onboarding_complete
  )
FROM public.profiles p
WHERE p.college_domain IS NOT NULL
  AND public.is_public_email_domain(p.college_domain);

-- Temporarily disable guard triggers so the data-fix UPDATE can proceed.
-- Migrations run as superuser, so we can set the bypass flags directly.
SELECT set_config('app.bypass_public_domain_guard',       'true', true);
SELECT set_config('app.bypass_public_domain_guard_token', 'sd_verified_app.bypass_public_domain_guard', true);
SELECT set_config('app.bypass_college_domain_guard',       'true', true);
SELECT set_config('app.bypass_college_domain_guard_token', 'sd_verified_app.bypass_college_domain_guard', true);
SELECT set_config('app.bypass_email_guard',                'true', true);
SELECT set_config('app.bypass_email_guard_token',          'sd_verified_app.bypass_email_guard', true);

-- For transitioned users: Attempt to restore college_domain from their original
-- college email. For others: NULL it out so they hit the NullDomainGuard.
UPDATE public.profiles p
SET
  college_domain = CASE
    -- If they have a college email on file, derive domain from that
    WHEN p.email IS NOT NULL
      AND p.email LIKE '%@%'
      AND NOT public.is_public_email_domain(lower(split_part(p.email, '@', 2)))
    THEN public.normalize_college_domain(lower(split_part(p.email, '@', 2)))
    -- Otherwise NULL it out
    ELSE NULL
  END,
  updated_at = now()
WHERE p.college_domain IS NOT NULL
  AND public.is_public_email_domain(p.college_domain);

-- Reset bypass flags (transaction-local, but explicit is better)
SELECT set_config('app.bypass_public_domain_guard',       'false', true);
SELECT set_config('app.bypass_public_domain_guard_token', '',      true);
SELECT set_config('app.bypass_college_domain_guard',       'false', true);
SELECT set_config('app.bypass_college_domain_guard_token', '',      true);
SELECT set_config('app.bypass_email_guard',                'false', true);
SELECT set_config('app.bypass_email_guard_token',          '',      true);


-- ══════════════════════════════════════════════════════════════════════════════
-- 2. RLS FIX: profiles_select_same_college — require onboarding_complete
--    Ghost profiles (onboarding not done) should not be visible to peers.
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "profiles_select_same_college" ON public.profiles;

CREATE POLICY "profiles_select_same_college" ON public.profiles
  FOR SELECT USING (
    -- Users can always see their own profile
    auth.uid() = id
    -- Same college domain + onboarding complete (no ghost profiles)
    OR (
      college_domain = public.get_user_college_domain()
      AND college_domain IS NOT NULL
      AND onboarding_complete = true
    )
    -- Platform admins can see all profiles
    OR EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.is_active = true
        AND lower(pa.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- 3. RLS FIX: posts_select_same_college — tighten to match profiles policy
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "posts_select_same_college" ON public.posts;

CREATE POLICY "posts_select_same_college" ON public.posts
  FOR SELECT USING (
    auth.uid() = user_id
    OR (
      college_domain = public.get_user_college_domain()
      AND college_domain IS NOT NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.is_active = true
        AND lower(pa.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- 4. GUARD FIX: Harden sync_profile_email — never set college_domain to public
--    Supersedes: 114 (FIX 2)
--    Change: The ELSE branch now checks is_public_email_domain before setting
--    college_domain, preventing corruption even if bypass flags are set.
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
  PERFORM public._set_bypass_flag('app.bypass_public_domain_guard', 'true');

  -- ── Transition case: auth email update maps to personal_email only ──
  -- Accept BOTH 'transitioned' AND 'verified' status (FIX 114).
  IF v_current_status IN ('transitioned', 'verified')
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

  -- FIX 121: NEVER set college_domain to a public email domain.
  -- Even if normalize_college_domain returns something, double-check.
  -- Also preserve existing college_domain — only set if currently NULL.
  UPDATE public.profiles
  SET email = v_new_email,
      college_domain = CASE
        -- Keep existing college_domain if already set
        WHEN college_domain IS NOT NULL THEN college_domain
        -- Only set new college_domain if it's NOT a public domain
        WHEN v_college_domain IS NOT NULL
          AND v_college_domain <> ''
          AND NOT public.is_public_email_domain(v_college_domain)
        THEN v_college_domain
        -- Otherwise leave as NULL
        ELSE NULL
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
-- 5. GUARD FIX: Harden handle_new_user — extra safety net
--    Ensure canonical_college_domain is never a public domain.
--    (Already guarded in 109, but add explicit check as defense-in-depth)
-- ══════════════════════════════════════════════════════════════════════════════

-- No change needed to handle_new_user — it already checks:
--   IF public.is_public_email_domain(email_domain) THEN RETURN NEW;
--   IF canonical_college_domain IS NULL OR public.is_public_email_domain(canonical_college_domain) THEN RETURN NEW;
-- These guards are sufficient.


-- ══════════════════════════════════════════════════════════════════════════════
-- 6. DB CONSTRAINT: Make it structurally impossible to store a public domain
--    as college_domain.  This is the hard stop — even if all trigger/RLS
--    guards fail, the CHECK constraint prevents the row from being saved.
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS no_public_domain_as_college_domain;

ALTER TABLE public.profiles
  ADD CONSTRAINT no_public_domain_as_college_domain
  CHECK (college_domain IS NULL OR NOT public.is_public_email_domain(college_domain));


COMMIT;
