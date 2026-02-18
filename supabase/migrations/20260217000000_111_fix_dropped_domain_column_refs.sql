-- Migration 111: Fix references to dropped profiles.domain column
-- Migration 110 dropped profiles.domain in favour of profiles.college_domain,
-- but several functions/views still referenced p.domain, causing:
--   ERROR: column p.domain does not exist
--
-- This migration recreates every affected object so it reads
-- p.college_domain instead.

BEGIN;

-- ============================================================================
-- 1. get_admin_domains_list()  (from 055, used by the Admin Domains page)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_admin_domains_list()
RETURNS TABLE (
  id uuid,
  domain text,
  college_id uuid,
  college_name text,
  status text,
  user_count bigint,
  first_seen timestamptz,
  last_seen timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  RETURN QUERY
  SELECT
    cda.id,
    cda.domain,
    c.id   AS college_id,
    c.name AS college_name,
    COALESCE(cda.status, 'pending') AS status,
    COALESCE(uc.user_count, 0)::bigint AS user_count,
    cda.created_at AS first_seen,
    cda.updated_at AS last_seen
  FROM public.college_domain_aliases cda
  LEFT JOIN public.colleges c ON c.id = cda.college_id
  LEFT JOIN (
    SELECT p.college_domain AS domain, COUNT(DISTINCT p.id) AS user_count
    FROM public.profiles p
    WHERE p.college_domain IS NOT NULL
    GROUP BY p.college_domain
  ) uc ON uc.domain = cda.domain
  ORDER BY uc.user_count DESC NULLS LAST, cda.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_domains_list() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_domains_list() TO authenticated;


-- ============================================================================
-- 2. refresh_admin_domain_stats()  (from 054)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.refresh_admin_domain_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE public.admin_domain_stats;

  INSERT INTO public.admin_domain_stats (
    domain,
    canonical_domain,
    user_count,
    first_seen,
    last_seen,
    status,
    updated_at
  )
  SELECT
    p.college_domain AS domain,
    p.college_domain AS canonical_domain,
    COUNT(DISTINCT p.id) AS user_count,
    MIN(p.created_at) AS first_seen,
    MAX(p.created_at) AS last_seen,
    CASE
      WHEN cda.domain IS NOT NULL THEN 'aliased'
      WHEN p.is_verified THEN 'verified'
      ELSE 'unknown'
    END AS status,
    NOW() AS updated_at
  FROM public.profiles p
  LEFT JOIN public.college_domain_aliases cda ON cda.domain = p.college_domain
  WHERE p.college_domain IS NOT NULL
  GROUP BY p.college_domain, cda.domain, p.is_verified
  ORDER BY user_count DESC;
END;
$$;


-- ============================================================================
-- 3. refresh_admin_domain_stats_v2()  (from 059)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.refresh_admin_domain_stats_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  TRUNCATE TABLE public.admin_domain_stats_v2;

  INSERT INTO public.admin_domain_stats_v2 (
    id,
    domain,
    college_id,
    college_name,
    status,
    first_seen,
    last_seen,
    user_count,
    updated_at
  )
  SELECT
    cda.id,
    cda.domain,
    c.id   AS college_id,
    c.name AS college_name,
    cda.status,
    cda.created_at AS first_seen,
    cda.updated_at AS last_seen,
    COALESCE(user_counts.user_count, 0) AS user_count,
    now() AS updated_at
  FROM public.college_domain_aliases cda
  LEFT JOIN public.colleges c ON c.id = cda.college_id
  LEFT JOIN (
    SELECT
      p.college_domain AS domain,
      COUNT(DISTINCT p.id) AS user_count
    FROM public.profiles p
    WHERE p.college_domain IS NOT NULL
    GROUP BY p.college_domain
  ) user_counts ON user_counts.domain = cda.domain
  ORDER BY user_counts.user_count DESC NULLS LAST, cda.created_at DESC;
END;
$$;


-- ============================================================================
-- 4. admin_domain_stats VIEW  (from 050, may have been replaced by the table
--    in 054/059 — recreate only if the view still exists)
-- ============================================================================
DO $$
BEGIN
  -- Only recreate if it is still a view (not a table)
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'admin_domain_stats'
  ) THEN
    CREATE OR REPLACE VIEW public.admin_domain_stats AS
    SELECT
      p.college_domain AS domain,
      p.college_domain AS canonical_domain,
      COUNT(DISTINCT p.id) AS user_count,
      MIN(p.created_at) AS first_seen,
      MAX(p.created_at) AS last_seen,
      CASE
        WHEN cda.domain IS NOT NULL THEN 'aliased'
        WHEN p.is_verified THEN 'verified'
        ELSE 'unknown'
      END AS status
    FROM public.profiles p
    LEFT JOIN public.college_domain_aliases cda ON cda.domain = p.college_domain
    WHERE p.college_domain IS NOT NULL
    GROUP BY p.college_domain, cda.domain, p.is_verified
    ORDER BY user_count DESC;
  END IF;
END $$;


-- ============================================================================
-- 5. get_identity_context()  (from 090) — selects p.domain which no longer exists
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_identity_context()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_profile RECORD;
  v_source  text;
  v_result  jsonb;
BEGIN
  -- 1. Must be authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- 2. Fetch profile (single source of truth post-onboarding)
  SELECT
    p.id,
    p.email,
    p.college_domain,
    p.personal_email,
    p.personal_email_verified,
    p.email_transition_status,
    p.role,
    p.full_name,
    p.avatar_url,
    p.university,
    p.major,
    p.graduation_year,
    p.onboarding_complete,
    p.is_verified,
    p.profile_completion
  INTO v_profile
  FROM profiles p
  WHERE p.id = v_user_id;

  -- 3. No profile yet → might be mid-onboarding alumni
  IF v_profile IS NULL THEN
    DECLARE
      v_invite RECORD;
    BEGIN
      SELECT
        ai.college_email,
        ai.college_domain,
        ai.personal_email,
        ai.full_name,
        ai.grad_year,
        ai.degree,
        ai.major
      INTO v_invite
      FROM alumni_invites ai
      WHERE ai.auth_user_id = v_user_id
        AND ai.status = 'accepted'
      LIMIT 1;

      IF v_invite IS NOT NULL THEN
        RETURN jsonb_build_object(
          'user_id',        v_user_id,
          'role',           'Alumni',
          'college_email',  v_invite.college_email,
          'college_domain', v_invite.college_domain,
          'personal_email', v_invite.personal_email,
          'full_name',      v_invite.full_name,
          'source',         'alumni_invite_pending_onboarding',
          'onboarding_complete', false,
          'has_profile',    false
        );
      END IF;
    END;

    RETURN jsonb_build_object(
      'user_id',        v_user_id,
      'error',          'no_profile',
      'has_profile',    false,
      'onboarding_complete', false
    );
  END IF;

  -- 4. Determine identity source
  IF v_profile.role = 'Alumni' THEN
    v_source := 'alumni';
  ELSIF v_profile.role IN ('Faculty', 'Principal', 'Dean') THEN
    v_source := 'faculty';
  ELSIF v_profile.role = 'Club' THEN
    v_source := 'club';
  ELSE
    v_source := 'student';
  END IF;

  -- 5. Build canonical identity tuple
  v_result := jsonb_build_object(
    'user_id',              v_user_id,
    'role',                 v_profile.role,
    'college_email',        v_profile.email,
    'college_domain',       v_profile.college_domain,
    'personal_email',       v_profile.personal_email,
    'source',               v_source,
    'full_name',            v_profile.full_name,
    'avatar_url',           v_profile.avatar_url,
    'university',           v_profile.university,
    'major',                v_profile.major,
    'graduation_year',      v_profile.graduation_year,
    'onboarding_complete',  COALESCE(v_profile.onboarding_complete, false),
    'has_profile',          true,
    'is_verified',          COALESCE(v_profile.is_verified, false),
    'profile_completion',   COALESCE(v_profile.profile_completion, 0),
    'email_transition_status', v_profile.email_transition_status,
    'personal_email_verified', COALESCE(v_profile.personal_email_verified, false)
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_identity_context() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_identity_context() TO authenticated;

COMMIT;
