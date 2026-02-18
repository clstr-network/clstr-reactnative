-- Migration 090: Centralized Identity Context RPC
-- Provides a single authoritative endpoint to answer "who is this user, really?"
-- Never reads from auth.users.email directly — always profiles + alumni_invites.

BEGIN;

-- =============================================================================
-- get_identity_context()
-- Returns the canonical identity tuple for the currently authenticated user.
-- All client-side guards/features should derive identity from this single source.
-- =============================================================================
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
    p.domain,
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
    -- Check if they have an accepted invite (onboarding in progress)
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

    -- No profile, no invite → brand new user
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

-- Grant to authenticated users only (never anon)
REVOKE ALL ON FUNCTION public.get_identity_context() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_identity_context() TO authenticated;

-- =============================================================================
-- get_invite_ops_stats()
-- Lightweight operational dashboard stats for admins.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_invite_ops_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_result jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Check admin status
  SELECT EXISTS (
    SELECT 1 FROM platform_admins WHERE user_id = v_user_id AND is_active = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('error', 'Admin access required');
  END IF;

  SELECT jsonb_build_object(
    'total_invites',     COUNT(*),
    'invited',           COUNT(*) FILTER (WHERE status = 'invited'),
    'accepted',          COUNT(*) FILTER (WHERE status = 'accepted'),
    'expired',           COUNT(*) FILTER (WHERE status = 'expired'),
    'disputed',          COUNT(*) FILTER (WHERE status = 'disputed'),
    'cancelled',         COUNT(*) FILTER (WHERE status = 'cancelled'),
    'accepted_today',    COUNT(*) FILTER (WHERE status = 'accepted'   AND accepted_at >= CURRENT_DATE),
    'invited_today',     COUNT(*) FILTER (WHERE status = 'invited'    AND created_at  >= CURRENT_DATE),
    'accepted_7d',       COUNT(*) FILTER (WHERE status = 'accepted'   AND accepted_at >= CURRENT_DATE - INTERVAL '7 days'),
    'invited_7d',        COUNT(*) FILTER (WHERE status = 'invited'    AND created_at  >= CURRENT_DATE - INTERVAL '7 days'),
    'avg_accept_hours',  ROUND(EXTRACT(EPOCH FROM AVG(
                           CASE WHEN status = 'accepted' AND accepted_at IS NOT NULL
                                THEN accepted_at - created_at
                                ELSE NULL END
                         )) / 3600.0, 1),
    'unique_domains',    COUNT(DISTINCT college_domain),
    'pending_expiring_24h', COUNT(*) FILTER (
      WHERE status = 'invited' AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
    )
  ) INTO v_result
  FROM alumni_invites;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_invite_ops_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_ops_stats() TO authenticated;

COMMENT ON FUNCTION public.get_identity_context() IS
  'Canonical identity resolution. Returns the authoritative identity tuple for the current user. '
  'Never uses auth.users.email. All client guards should read from this single source.';

COMMENT ON FUNCTION public.get_invite_ops_stats() IS
  'Operational statistics for the alumni invite pipeline. Admin-only.';

COMMIT;
