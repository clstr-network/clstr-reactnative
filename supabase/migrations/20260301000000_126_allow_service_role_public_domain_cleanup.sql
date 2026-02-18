-- Migration 126: allow service_role for public-domain cleanup admin RPCs
--
-- Root cause:
-- - get_public_domain_profile_audit() and delete_public_domain_user() only allow
--   callers that pass is_platform_admin().
-- - In server-side/service-role contexts, auth.uid() is often NULL, so
--   is_platform_admin() returns false and blocks legitimate ops.
--
-- This migration keeps platform-admin enforcement, and additionally permits
-- service_role callers for backend/ops execution.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_public_domain_profile_audit()
RETURNS TABLE (
  id uuid,
  email text,
  college_domain text,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_platform_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.college_domain,
    CASE
      WHEN p.college_domain IS NULL THEN 'missing_college_domain'
      WHEN public.is_public_email_domain(p.college_domain) THEN 'public_college_domain'
      WHEN public.is_public_email_domain(lower(split_part(COALESCE(p.email, ''), '@', 2))) THEN 'public_primary_email'
      ELSE 'unknown'
    END AS reason
  FROM public.profiles p
  WHERE (
      p.college_domain IS NULL
      OR public.is_public_email_domain(p.college_domain)
      OR public.is_public_email_domain(lower(split_part(COALESCE(p.email, ''), '@', 2)))
    )
    AND NOT (
      p.college_domain IS NOT NULL
      AND NOT public.is_public_email_domain(p.college_domain)
    )
  ORDER BY p.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_domain_profile_audit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_domain_profile_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_domain_profile_audit() TO service_role;

CREATE OR REPLACE FUNCTION public.delete_public_domain_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_email_domain text;
  v_has_posts boolean := false;
  v_has_connections boolean := false;
  v_has_messages boolean := false;
  v_has_content boolean := false;
  v_auth_exists boolean := false;
BEGIN
  IF NOT (public.is_platform_admin() OR auth.role() = 'service_role') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied: platform admin required');
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  v_email_domain := lower(split_part(COALESCE(v_profile.email, ''), '@', 2));

  IF NOT (
    v_profile.college_domain IS NULL
    OR public.is_public_email_domain(v_profile.college_domain)
    OR public.is_public_email_domain(v_email_domain)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile has academic college_domain and is not eligible');
  END IF;

  IF v_profile.college_domain IS NOT NULL
     AND NOT public.is_public_email_domain(v_profile.college_domain) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Academic link exists; cleanup blocked');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.posts WHERE user_id = p_user_id)
  INTO v_has_posts;

  SELECT EXISTS(
    SELECT 1
    FROM public.connections
    WHERE requester_id = p_user_id OR receiver_id = p_user_id
  ) INTO v_has_connections;

  SELECT EXISTS(
    SELECT 1
    FROM public.messages
    WHERE sender_id = p_user_id OR receiver_id = p_user_id
  ) INTO v_has_messages;

  v_has_content := v_has_posts OR v_has_connections OR v_has_messages;

  IF v_has_content THEN
    INSERT INTO public.public_domain_account_quarantine (
      user_id,
      email,
      college_domain,
      quarantine_reason,
      has_posts,
      has_connections,
      has_messages,
      profile_snapshot
    )
    VALUES (
      v_profile.id,
      v_profile.email,
      v_profile.college_domain,
      'Invalid standalone public-domain account with existing social graph content',
      v_has_posts,
      v_has_connections,
      v_has_messages,
      to_jsonb(v_profile)
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      college_domain = EXCLUDED.college_domain,
      quarantine_reason = EXCLUDED.quarantine_reason,
      has_posts = EXCLUDED.has_posts,
      has_connections = EXCLUDED.has_connections,
      has_messages = EXCLUDED.has_messages,
      profile_snapshot = EXCLUDED.profile_snapshot,
      created_at = now();

    RETURN jsonb_build_object(
      'success', true,
      'action', 'quarantined',
      'user_id', p_user_id,
      'has_posts', v_has_posts,
      'has_connections', v_has_connections,
      'has_messages', v_has_messages
    );
  END IF;

  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO v_auth_exists;

  IF v_auth_exists THEN
    DELETE FROM auth.users WHERE id = p_user_id;
  ELSE
    DELETE FROM public.profiles WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action', 'hard_deleted',
    'user_id', p_user_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_public_domain_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_public_domain_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_public_domain_user(uuid) TO service_role;

COMMIT;
