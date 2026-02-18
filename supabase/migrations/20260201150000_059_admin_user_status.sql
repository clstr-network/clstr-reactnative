-- ============================================================================
-- 059_admin_user_status.sql
-- Admin RPCs for user activation/suspension and role changes (RLS-safe)
-- ============================================================================

BEGIN;

-- ============================================================================
-- Admin: set user status (active/suspended/pending)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_set_user_status(
  p_user_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role_data jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  IF p_status NOT IN ('active', 'suspended', 'pending') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  SELECT role_data INTO v_role_data
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF p_status = 'suspended' THEN
    UPDATE public.profiles
    SET
      role_data = COALESCE(v_role_data, '{}'::jsonb)
        || jsonb_build_object(
          'suspended', true,
          'suspended_at', now(),
          'suspended_reason', p_reason
        ),
      updated_at = now()
    WHERE id = p_user_id;
  ELSIF p_status = 'active' THEN
    UPDATE public.profiles
    SET
      is_verified = true,
      role_data = (COALESCE(v_role_data, '{}'::jsonb) - 'suspended' - 'suspended_at' - 'suspended_reason')
        || jsonb_build_object(
          'suspended', false,
          'suspended_at', NULL,
          'suspended_reason', NULL
        ),
      updated_at = now()
    WHERE id = p_user_id;
  ELSE
    UPDATE public.profiles
    SET
      is_verified = false,
      role_data = (COALESCE(v_role_data, '{}'::jsonb) - 'suspended' - 'suspended_at' - 'suspended_reason')
        || jsonb_build_object(
          'suspended', false,
          'suspended_at', NULL,
          'suspended_reason', NULL
        ),
      updated_at = now()
    WHERE id = p_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_status(uuid, text, text) TO authenticated;

-- ============================================================================
-- Admin: update user role (Student/Alumni/Faculty)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  p_user_id uuid,
  p_role text,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  IF p_role NOT IN ('Student', 'Alumni', 'Faculty') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  UPDATE public.profiles
  SET
    role = p_role::public.user_role,
    updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Optional: record change reason in role_data for audit visibility
  IF p_reason IS NOT NULL THEN
    UPDATE public.profiles
    SET role_data = COALESCE(role_data, '{}'::jsonb) || jsonb_build_object('role_change_reason', p_reason)
    WHERE id = p_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_role(uuid, text, text) TO authenticated;

COMMIT;
