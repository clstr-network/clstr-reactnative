-- ============================================================================
-- 062_admin_collab_project_rpcs.sql
-- Admin SECURITY DEFINER functions for CollabHub project management
-- Enables admins to update/archive/flag projects bypassing RLS
-- ============================================================================

BEGIN;

-- ============================================================================
-- Admin: Update project status
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_update_project_status(
  p_project_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_project_exists boolean;
BEGIN
  -- Check admin access
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  -- Validate status
  IF p_status NOT IN ('draft', 'open', 'in_progress', 'closed', 'archived') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be one of: draft, open, in_progress, closed, archived', p_status;
  END IF;

  -- Check project exists
  SELECT EXISTS(SELECT 1 FROM public.collab_projects WHERE id = p_project_id) INTO v_project_exists;
  IF NOT v_project_exists THEN
    RAISE EXCEPTION 'Project not found: %', p_project_id;
  END IF;

  -- Update the project status
  UPDATE public.collab_projects
  SET
    status = p_status,
    updated_at = now()
  WHERE id = p_project_id;

  -- Log admin action
  INSERT INTO public.admin_activity_logs (
    admin_email,
    action_type,
    target_type,
    target_id,
    details
  )
  SELECT
    u.email,
    'update_project_status',
    'collab_project',
    p_project_id::text,
    jsonb_build_object('status', p_status, 'reason', p_reason)
  FROM auth.users u
  WHERE u.id = auth.uid();

  RETURN json_build_object(
    'success', true,
    'project_id', p_project_id,
    'status', p_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_project_status(uuid, text, text) TO authenticated;

-- ============================================================================
-- Admin: Archive project
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_archive_project(
  p_project_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_project_exists boolean;
BEGIN
  -- Check admin access
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  -- Check project exists
  SELECT EXISTS(SELECT 1 FROM public.collab_projects WHERE id = p_project_id) INTO v_project_exists;
  IF NOT v_project_exists THEN
    RAISE EXCEPTION 'Project not found: %', p_project_id;
  END IF;

  -- Archive the project
  UPDATE public.collab_projects
  SET
    status = 'archived',
    updated_at = now()
  WHERE id = p_project_id;

  -- Log admin action
  INSERT INTO public.admin_activity_logs (
    admin_email,
    action_type,
    target_type,
    target_id,
    details
  )
  SELECT
    u.email,
    'archive_project',
    'collab_project',
    p_project_id::text,
    jsonb_build_object('reason', p_reason)
  FROM auth.users u
  WHERE u.id = auth.uid();

  RETURN json_build_object(
    'success', true,
    'project_id', p_project_id,
    'status', 'archived'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_archive_project(uuid, text) TO authenticated;

-- ============================================================================
-- Admin: Flag project
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_flag_project(
  p_project_id uuid,
  p_reason text,
  p_unflag boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_project_exists boolean;
BEGIN
  -- Check admin access
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  -- Reason is required when flagging
  IF NOT p_unflag AND (p_reason IS NULL OR p_reason = '') THEN
    RAISE EXCEPTION 'Reason is required when flagging a project';
  END IF;

  -- Check project exists
  SELECT EXISTS(SELECT 1 FROM public.collab_projects WHERE id = p_project_id) INTO v_project_exists;
  IF NOT v_project_exists THEN
    RAISE EXCEPTION 'Project not found: %', p_project_id;
  END IF;

  IF p_unflag THEN
    -- Unflag the project
    UPDATE public.collab_projects
    SET
      flagged = false,
      flagged_reason = NULL,
      flagged_at = NULL,
      updated_at = now()
    WHERE id = p_project_id;

    -- Log admin action
    INSERT INTO public.admin_activity_logs (
      admin_email,
      action_type,
      target_type,
      target_id,
      details
    )
    SELECT
      u.email,
      'unflag_project',
      'collab_project',
      p_project_id::text,
      jsonb_build_object('reason', p_reason)
    FROM auth.users u
    WHERE u.id = auth.uid();

    RETURN json_build_object(
      'success', true,
      'project_id', p_project_id,
      'flagged', false
    );
  ELSE
    -- Flag the project
    UPDATE public.collab_projects
    SET
      flagged = true,
      flagged_reason = p_reason,
      flagged_at = now(),
      updated_at = now()
    WHERE id = p_project_id;

    -- Log admin action
    INSERT INTO public.admin_activity_logs (
      admin_email,
      action_type,
      target_type,
      target_id,
      details
    )
    SELECT
      u.email,
      'flag_project',
      'collab_project',
      p_project_id::text,
      jsonb_build_object('reason', p_reason)
    FROM auth.users u
    WHERE u.id = auth.uid();

    RETURN json_build_object(
      'success', true,
      'project_id', p_project_id,
      'flagged', true,
      'reason', p_reason
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_flag_project(uuid, text, boolean) TO authenticated;

-- ============================================================================
-- Admin RLS bypass policy for collab_projects (SELECT only for admin views)
-- Admins can already see all projects via existing policies, but this ensures
-- we have explicit admin read access
-- ============================================================================
DROP POLICY IF EXISTS "Platform admins can view all projects" ON public.collab_projects;
CREATE POLICY "Platform admins can view all projects" ON public.collab_projects
  FOR SELECT
  USING (public.is_platform_admin());

COMMIT;
