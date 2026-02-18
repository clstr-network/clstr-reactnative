-- 067_team_up_request_notifications_fix.sql
-- Fix team-up request notifications to use canonical notifications schema

BEGIN;

CREATE OR REPLACE FUNCTION notify_team_up_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  team_up_creator_id uuid;
  requester_name text;
  event_name text;
  content text;
  notification_type text;
BEGIN
  -- Get team-up info
  SELECT tu.creator_id, tu.event_name INTO team_up_creator_id, event_name
  FROM public.team_ups tu
  WHERE tu.id = NEW.team_up_id;

  -- Get requester name
  SELECT full_name INTO requester_name
  FROM public.profiles
  WHERE id = NEW.requester_id;

  IF NEW.request_type = 'invite' THEN
    notification_type := 'team_up_invite';
    content := COALESCE(requester_name, 'Someone') || ' invited you to join their team for ' || COALESCE(event_name, 'a team-up');
  ELSE
    notification_type := 'team_up_request';
    content := COALESCE(requester_name, 'Someone') || ' wants to join your team for ' || COALESCE(event_name, 'a team-up');
  END IF;

  PERFORM public.create_notification(
    team_up_creator_id,
    notification_type,
    content,
    NEW.id
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the insert if notification fails
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_up_request_notification ON public.team_up_requests;
CREATE TRIGGER team_up_request_notification
  AFTER INSERT ON public.team_up_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_team_up_request();

COMMIT;
