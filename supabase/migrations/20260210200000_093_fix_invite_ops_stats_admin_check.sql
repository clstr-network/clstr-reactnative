-- Migration 093: Fix get_invite_ops_stats() admin check
--
-- ROOT CAUSE: The original get_invite_ops_stats() (migration 090) queried
--   `platform_admins.user_id` — a column that does NOT exist on the table.
--   The platform_admins table identifies admins by `email`, not `user_id`.
--   This caused an immediate SQL error ("column user_id does not exist"),
--   surfacing as "Failed to load pipeline stats" in the admin UI.
--
-- FIX: Replace the broken `user_id` lookup with `is_platform_admin()`,
--   which correctly looks up auth.users.email → platform_admins.email.
--   This is the same pattern used by every other admin-gated RPC.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_invite_ops_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Must be a platform admin (checks email via auth.users → platform_admins)
  IF NOT public.is_platform_admin() THEN
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

-- Permissions unchanged
REVOKE ALL ON FUNCTION public.get_invite_ops_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_ops_stats() TO authenticated;

COMMENT ON FUNCTION public.get_invite_ops_stats() IS
  'Operational statistics for the alumni invite pipeline. Admin-only (uses is_platform_admin()).';

COMMIT;
