-- ============================================================================
-- 122_profile_stats_rpc_functions.sql
-- Add SECURITY DEFINER RPC functions for connection count and post count
-- so that any authenticated user can read another profile's public stats
-- without being blocked by row-level security.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Connection count RPC
--    The connections RLS policy restricts row visibility to participants only.
--    This function lets any authenticated user fetch the *count* of accepted
--    connections for a given profile without exposing the actual rows.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_connection_count(p_profile_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conn_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO conn_count
  FROM public.connections
  WHERE status = 'accepted'
    AND (requester_id = p_profile_id OR receiver_id = p_profile_id);

  RETURN COALESCE(conn_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_connection_count(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_connection_count(uuid) FROM anon;

-- ============================================================================
-- 2. User posts count RPC
--    Posts RLS enforces college-domain isolation.  This function returns the
--    count of posts authored by a target user that are visible to the calling
--    user (same college domain), without the need for the client to perform
--    separate college-domain look-ups that can throw and cascade-fail.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_posts_count(
  p_target_user_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_domain text;
  target_domain text;
  post_count integer;
BEGIN
  -- Retrieve college domains
  SELECT college_domain INTO viewer_domain
  FROM public.profiles
  WHERE id = auth.uid();

  SELECT college_domain INTO target_domain
  FROM public.profiles
  WHERE id = p_target_user_id;

  -- If either domain is null or they don't match, return 0
  IF viewer_domain IS NULL OR target_domain IS NULL OR viewer_domain <> target_domain THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*)::integer INTO post_count
  FROM public.posts
  WHERE user_id = p_target_user_id
    AND college_domain = viewer_domain;

  RETURN COALESCE(post_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_posts_count(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_posts_count(uuid) FROM anon;

COMMIT;
