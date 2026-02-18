-- ============================================================================
-- 096_mentorship_enhancements.sql
-- Adds: commitment_level, help_type, mentor status badge support,
--        mentorship feedback, pause toggle, auto-connect triggers,
--        gentle reminder support, and current_mentees auto-update.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Enhance mentorship_offers: commitment level + help type + pause
-- ============================================================================
ALTER TABLE public.mentorship_offers
  ADD COLUMN IF NOT EXISTS help_type text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS commitment_level text DEFAULT 'occasional',
  ADD COLUMN IF NOT EXISTS is_paused boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();

COMMENT ON COLUMN public.mentorship_offers.help_type IS 'What kind of help: occasional_guidance, career_advice, project_guidance, exam_guidance, general';
COMMENT ON COLUMN public.mentorship_offers.commitment_level IS 'occasional, moderate, dedicated';
COMMENT ON COLUMN public.mentorship_offers.is_paused IS 'When true, mentor is hidden from discovery but existing chats still work';
COMMENT ON COLUMN public.mentorship_offers.last_active_at IS 'Last time the mentor responded to a request or updated their offer';

-- ============================================================================
-- 2. Enhance mentorship_requests: completed_at + feedback
-- ============================================================================
ALTER TABLE public.mentorship_requests
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS mentee_feedback boolean,
  ADD COLUMN IF NOT EXISTS mentor_feedback boolean;

COMMENT ON COLUMN public.mentorship_requests.accepted_at IS 'Timestamp when request was accepted';
COMMENT ON COLUMN public.mentorship_requests.completed_at IS 'Timestamp when mentorship was marked completed';
COMMENT ON COLUMN public.mentorship_requests.mentee_feedback IS 'true = helpful, false = not helpful, null = no feedback';
COMMENT ON COLUMN public.mentorship_requests.mentor_feedback IS 'true = helpful, false = not helpful, null = no feedback';

-- ============================================================================
-- 3. Function: auto-update current_mentees count on mentorship_offers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_mentor_mentee_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the mentor's current_mentees count
  UPDATE public.mentorship_offers
  SET current_mentees = (
    SELECT COUNT(*)
    FROM public.mentorship_requests
    WHERE mentor_id = COALESCE(NEW.mentor_id, OLD.mentor_id)
      AND status = 'accepted'
  ),
  updated_at = now()
  WHERE mentor_id = COALESCE(NEW.mentor_id, OLD.mentor_id)
    AND is_active = true;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_mentee_count ON public.mentorship_requests;
CREATE TRIGGER trg_update_mentee_count
  AFTER INSERT OR UPDATE OF status OR DELETE
  ON public.mentorship_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mentor_mentee_count();

-- ============================================================================
-- 4. Function: auto-create connection + notification on mentorship acceptance
-- ============================================================================
CREATE OR REPLACE FUNCTION public.on_mentorship_request_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_college_domain text;
  v_mentor_name text;
  v_mentee_name text;
BEGIN
  -- Only fire when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Set accepted_at timestamp
    NEW.accepted_at := now();

    -- Get college_domain and names
    SELECT college_domain INTO v_college_domain
    FROM public.profiles WHERE id = NEW.mentor_id;

    SELECT full_name INTO v_mentor_name
    FROM public.profiles WHERE id = NEW.mentor_id;

    SELECT full_name INTO v_mentee_name
    FROM public.profiles WHERE id = NEW.mentee_id;

    -- Auto-create connection if not exists
    INSERT INTO public.connections (requester_id, receiver_id, status, college_domain, message)
    VALUES (
      NEW.mentor_id,
      NEW.mentee_id,
      'accepted',
      COALESCE(v_college_domain, NEW.college_domain),
      'Connected via mentorship'
    )
    ON CONFLICT (requester_id, receiver_id) DO UPDATE
    SET status = 'accepted', updated_at = now()
    WHERE connections.status != 'blocked';

    -- Send system message to start the conversation
    INSERT INTO public.messages (sender_id, receiver_id, college_domain, content, read)
    VALUES (
      NEW.mentor_id,
      NEW.mentee_id,
      COALESCE(v_college_domain, NEW.college_domain),
      '🎓 Mentorship started between ' || COALESCE(v_mentor_name, 'Mentor') || ' and ' || COALESCE(v_mentee_name, 'Student') || '. Feel free to start chatting!',
      false
    );

    -- Notify mentee that request was accepted
    PERFORM public.create_notification(
      NEW.mentee_id,
      'mentorship',
      COALESCE(v_mentor_name, 'A mentor') || ' accepted your mentorship request!',
      NEW.id
    );

    -- Update mentor's last_active_at
    UPDATE public.mentorship_offers
    SET last_active_at = now(), updated_at = now()
    WHERE mentor_id = NEW.mentor_id AND is_active = true;
  END IF;

  -- Handle completion
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    NEW.completed_at := now();
  END IF;

  -- Handle rejection notification
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    SELECT full_name INTO v_mentor_name
    FROM public.profiles WHERE id = NEW.mentor_id;

    PERFORM public.create_notification(
      NEW.mentee_id,
      'mentorship',
      COALESCE(v_mentor_name, 'A mentor') || ' was unable to accept your mentorship request at this time.',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_mentorship_request_accepted ON public.mentorship_requests;
CREATE TRIGGER trg_mentorship_request_accepted
  BEFORE UPDATE OF status
  ON public.mentorship_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.on_mentorship_request_accepted();

-- ============================================================================
-- 5. Function: notify mentor when a new request arrives
-- ============================================================================
CREATE OR REPLACE FUNCTION public.on_mentorship_request_created()
RETURNS TRIGGER AS $$
DECLARE
  v_mentee_name text;
BEGIN
  SELECT full_name INTO v_mentee_name
  FROM public.profiles WHERE id = NEW.mentee_id;

  PERFORM public.create_notification(
    NEW.mentor_id,
    'mentorship',
    COALESCE(v_mentee_name, 'A student') || ' sent you a mentorship request.',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_mentorship_request_created ON public.mentorship_requests;
CREATE TRIGGER trg_mentorship_request_created
  AFTER INSERT
  ON public.mentorship_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.on_mentorship_request_created();

-- ============================================================================
-- 6. Index for faster mentor discovery (hide paused mentors)
-- ============================================================================
CREATE INDEX IF NOT EXISTS mentorship_offers_is_paused_idx
  ON public.mentorship_offers(is_paused);

CREATE INDEX IF NOT EXISTS mentorship_offers_help_type_idx
  ON public.mentorship_offers(help_type);

CREATE INDEX IF NOT EXISTS mentorship_requests_accepted_at_idx
  ON public.mentorship_requests(accepted_at);

CREATE INDEX IF NOT EXISTS mentorship_requests_completed_at_idx
  ON public.mentorship_requests(completed_at);

-- ============================================================================
-- 7. Enable realtime for mentorship tables (idempotent)
-- ============================================================================
DO $$
BEGIN
  -- Ensure mentorship_offers is in the realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'mentorship_offers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mentorship_offers;
  END IF;

  -- Ensure mentorship_requests is in the realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'mentorship_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mentorship_requests;
  END IF;
END;
$$;

COMMIT;
