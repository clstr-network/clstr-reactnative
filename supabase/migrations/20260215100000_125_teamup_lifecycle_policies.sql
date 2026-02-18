-- ============================================================================
-- 125_teamup_lifecycle_policies.sql
-- TeamUp lifecycle fixes:
--   1. RLS DELETE policy on team_up_requests (requesters cancel pending)
--   2. Notification trigger on team_up deletion (notify accepted members)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Allow requesters to delete their own PENDING requests
-- ============================================================================
DROP POLICY IF EXISTS "Requesters can delete own pending requests" ON public.team_up_requests;
CREATE POLICY "Requesters can delete own pending requests" ON public.team_up_requests
  FOR DELETE USING (
    requester_id = (SELECT auth.uid())
    AND status = 'pending'
  );

-- ============================================================================
-- 2. Notify accepted members when a team-up is deleted
--    Uses BEFORE DELETE so we can still read team_up_members / team_ups data.
--    Runs as SECURITY DEFINER to call create_notification (service_role only).
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_team_up_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  member_record RECORD;
  v_event_name text;
  v_creator_name text;
BEGIN
  -- Capture info before the row disappears
  v_event_name := OLD.event_name;

  SELECT full_name INTO v_creator_name
  FROM public.profiles
  WHERE id = OLD.creator_id;

  -- Notify every accepted member (excluding the creator who initiated the delete)
  FOR member_record IN
    SELECT user_id
    FROM public.team_up_members
    WHERE team_up_id = OLD.id
      AND user_id <> OLD.creator_id
  LOOP
    PERFORM public.create_notification(
      member_record.user_id,
      'team_up_deleted',
      COALESCE(v_creator_name, 'Someone') || ' deleted the team-up "' || COALESCE(v_event_name, 'Untitled') || '"',
      OLD.id
    );
  END LOOP;

  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  -- Never block the delete if notification fails
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS team_up_deletion_notification ON public.team_ups;
CREATE TRIGGER team_up_deletion_notification
  BEFORE DELETE ON public.team_ups
  FOR EACH ROW
  EXECUTE FUNCTION notify_team_up_deletion();

-- ============================================================================
-- 3. Notify accepted members when a team-up is CLOSED by owner
--    Fires on UPDATE when status transitions to 'closed'.
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_team_up_closed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  member_record RECORD;
  v_creator_name text;
BEGIN
  -- Only fire when status changes TO 'closed'
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status <> 'closed' THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_creator_name
  FROM public.profiles
  WHERE id = NEW.creator_id;

  FOR member_record IN
    SELECT user_id
    FROM public.team_up_members
    WHERE team_up_id = NEW.id
      AND user_id <> NEW.creator_id
  LOOP
    PERFORM public.create_notification(
      member_record.user_id,
      'team_up_closed',
      COALESCE(v_creator_name, 'Someone') || ' closed the team-up "' || COALESCE(NEW.event_name, 'Untitled') || '"',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_up_closed_notification ON public.team_ups;
CREATE TRIGGER team_up_closed_notification
  AFTER UPDATE ON public.team_ups
  FOR EACH ROW
  EXECUTE FUNCTION notify_team_up_closed();

COMMIT;
