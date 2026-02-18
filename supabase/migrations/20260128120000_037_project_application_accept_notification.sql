-- ============================================================================
-- 037_project_application_accept_notification.sql
-- Ensure project application notifications are tied to action id and include acceptance events
-- ============================================================================

BEGIN;

-- Update project application notification to use the application id as related_id (action id)
CREATE OR REPLACE FUNCTION public.notify_project_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_owner_id uuid;
  v_applicant_name text;
  v_project_title text;
  v_content text;
BEGIN
  -- Get the project owner and title
  SELECT owner_id, title INTO v_project_owner_id, v_project_title
  FROM public.collab_projects
  WHERE id = NEW.project_id;

  -- Get applicant name
  SELECT full_name INTO v_applicant_name
  FROM public.profiles
  WHERE id = NEW.applicant_id;

  v_content := COALESCE(v_applicant_name, 'Someone') || ' applied to your project: ' || COALESCE(v_project_title, 'your project');

  -- Use the application id as the action id
  PERFORM public.create_notification(
    v_project_owner_id,
    'project',
    v_content,
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_project_application ON public.collab_project_applications;
CREATE TRIGGER notify_project_application
  AFTER INSERT ON public.collab_project_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_project_application();

-- Notify applicants when their application is accepted
CREATE OR REPLACE FUNCTION public.notify_project_application_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_title text;
  v_content text;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT title INTO v_project_title
    FROM public.collab_projects
    WHERE id = NEW.project_id;

    v_content := 'Your application to ' || COALESCE(v_project_title, 'this project') || ' was accepted';

    PERFORM public.create_notification(
      NEW.applicant_id,
      'project',
      v_content,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_project_application_status ON public.collab_project_applications;
CREATE TRIGGER notify_project_application_status
  AFTER UPDATE OF status ON public.collab_project_applications
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_project_application_status();

COMMIT;
