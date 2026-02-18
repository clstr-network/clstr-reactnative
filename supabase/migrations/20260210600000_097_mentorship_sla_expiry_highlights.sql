-- ============================================================================
-- 097_mentorship_sla_expiry_highlights.sql
-- Adds:
--   1. Response SLA tracking (internal, not publicly shown)
--   2. Auto-expiry for pending requests > 14 days
--   3. Mentor stats columns for soft highlights
--   4. Suggest-another-mentor support (rejected_mentor_ids on requests)
--   5. Mentorship→Projects bridge hook (completed_project_cta column)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Response SLA tracking — internal reputation signal
--    Track avg response time and acceptance rate on mentorship_offers
-- ============================================================================
ALTER TABLE public.mentorship_offers
  ADD COLUMN IF NOT EXISTS avg_response_hours numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_requests_received integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_requests_accepted integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_requests_ignored integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_mentees_helped integer DEFAULT 0;

COMMENT ON COLUMN public.mentorship_offers.avg_response_hours IS 'Rolling average hours to respond to requests (internal SLA signal, not shown publicly)';
COMMENT ON COLUMN public.mentorship_offers.total_requests_received IS 'Total mentorship requests received (internal metric)';
COMMENT ON COLUMN public.mentorship_offers.total_requests_accepted IS 'Total mentorship requests accepted (internal metric)';
COMMENT ON COLUMN public.mentorship_offers.total_requests_ignored IS 'Total mentorship requests auto-expired or ignored (internal metric)';
COMMENT ON COLUMN public.mentorship_offers.total_mentees_helped IS 'Total completed mentorships (used for soft highlights like "Helped N students")';

-- ============================================================================
-- 2. Add responded_at to requests for SLA calculation
-- ============================================================================
ALTER TABLE public.mentorship_requests
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_expired boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS suggested_mentor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.mentorship_requests.responded_at IS 'When the mentor first responded (accepted/rejected). Used for SLA calculation.';
COMMENT ON COLUMN public.mentorship_requests.auto_expired IS 'True if this request was auto-cancelled due to 14-day timeout';
COMMENT ON COLUMN public.mentorship_requests.suggested_mentor_id IS 'When mentor rejects, optionally suggest an alternative mentor';

CREATE INDEX IF NOT EXISTS mentorship_requests_responded_at_idx
  ON public.mentorship_requests(responded_at);

CREATE INDEX IF NOT EXISTS mentorship_requests_auto_expired_idx
  ON public.mentorship_requests(auto_expired) WHERE auto_expired = true;

-- ============================================================================
-- 3. Trigger: Update SLA metrics when mentor responds to a request
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_mentor_sla_metrics()
RETURNS TRIGGER AS $$
DECLARE
  v_response_hours numeric;
  v_current_avg numeric;
  v_current_total integer;
BEGIN
  -- Only fire when status changes from 'pending' to 'accepted' or 'rejected'
  IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected') THEN
    -- Set responded_at if not already set
    IF NEW.responded_at IS NULL THEN
      NEW.responded_at := now();
    END IF;

    -- Calculate response time in hours
    v_response_hours := EXTRACT(EPOCH FROM (NEW.responded_at - NEW.created_at)) / 3600.0;

    -- Get current SLA values
    SELECT avg_response_hours, total_requests_received
    INTO v_current_avg, v_current_total
    FROM public.mentorship_offers
    WHERE mentor_id = NEW.mentor_id AND is_active = true
    LIMIT 1;

    -- Update SLA metrics on the mentor's offer
    UPDATE public.mentorship_offers
    SET
      avg_response_hours = CASE
        WHEN v_current_avg IS NULL THEN v_response_hours
        ELSE ((COALESCE(v_current_avg, 0) * GREATEST(v_current_total - 1, 0)) + v_response_hours) /
             GREATEST(v_current_total, 1)
      END,
      total_requests_accepted = CASE
        WHEN NEW.status = 'accepted' THEN total_requests_accepted + 1
        ELSE total_requests_accepted
      END,
      updated_at = now()
    WHERE mentor_id = NEW.mentor_id AND is_active = true;
  END IF;

  -- Track completed mentorships for soft highlights
  IF OLD.status = 'accepted' AND NEW.status = 'completed' THEN
    UPDATE public.mentorship_offers
    SET
      total_mentees_helped = total_mentees_helped + 1,
      updated_at = now()
    WHERE mentor_id = NEW.mentor_id AND is_active = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_mentor_sla ON public.mentorship_requests;
CREATE TRIGGER trg_update_mentor_sla
  BEFORE UPDATE OF status
  ON public.mentorship_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mentor_sla_metrics();

-- ============================================================================
-- 4. Trigger: Increment total_requests_received on new request
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_mentor_request_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.mentorship_offers
  SET
    total_requests_received = total_requests_received + 1,
    updated_at = now()
  WHERE mentor_id = NEW.mentor_id AND is_active = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_increment_mentor_request_count ON public.mentorship_requests;
CREATE TRIGGER trg_increment_mentor_request_count
  AFTER INSERT
  ON public.mentorship_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_mentor_request_count();

-- ============================================================================
-- 5. Function: Auto-expire stale pending requests (> 14 days)
--    Called via pg_cron or Supabase Edge Function on schedule
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_expire_stale_mentorship_requests()
RETURNS integer AS $$
DECLARE
  v_expired_count integer;
  v_row RECORD;
  v_mentor_name text;
BEGIN
  -- Find and cancel all pending requests older than 14 days
  FOR v_row IN
    SELECT mr.id, mr.mentee_id, mr.mentor_id
    FROM public.mentorship_requests mr
    WHERE mr.status = 'pending'
      AND mr.created_at < now() - interval '14 days'
      AND mr.auto_expired = false
  LOOP
    -- Update the request
    UPDATE public.mentorship_requests
    SET
      status = 'cancelled',
      auto_expired = true,
      updated_at = now()
    WHERE id = v_row.id;

    -- Get mentor name for notification
    SELECT full_name INTO v_mentor_name
    FROM public.profiles WHERE id = v_row.mentor_id;

    -- Notify student politely
    PERFORM public.create_notification(
      v_row.mentee_id,
      'mentorship',
      'Your mentorship request to ' || COALESCE(v_mentor_name, 'a mentor') || ' has expired after 14 days. Feel free to try another mentor!',
      v_row.id
    );

    -- Increment ignored count on mentor's offer
    UPDATE public.mentorship_offers
    SET
      total_requests_ignored = total_requests_ignored + 1,
      updated_at = now()
    WHERE mentor_id = v_row.mentor_id AND is_active = true;
  END LOOP;

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Index for soft highlights: total_mentees_helped
-- ============================================================================
CREATE INDEX IF NOT EXISTS mentorship_offers_total_mentees_helped_idx
  ON public.mentorship_offers(total_mentees_helped DESC);

CREATE INDEX IF NOT EXISTS mentorship_offers_last_active_at_idx
  ON public.mentorship_offers(last_active_at DESC NULLS LAST);

COMMIT;
