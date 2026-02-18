-- ============================================================================
-- 098_mentorship_edge_cases.sql
-- Implements mentorship behavioral edge cases from authoritative spec:
--   1. Auto-cancel mentorships when a user blocks the other (Edge Case #6)
--   2. Prevent duplicate active mentorships between same two users (Edge Case #7)
--   3. Slot overflow guard on acceptance (Edge Case #9 — DB-level safety net)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Edge Case #6: Auto-cancel mentorships when a connection is blocked
--    When one user blocks another, ALL active (pending/accepted) mentorship
--    requests between them are automatically cancelled.
--    Blocking is a safety boundary that overrides mentorship.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cancel_mentorships_on_block()
RETURNS TRIGGER AS $$
DECLARE
  v_user_a uuid;
  v_user_b uuid;
  v_cancelled_count integer := 0;
BEGIN
  -- Only fire when connection status changes to 'blocked'
  IF NEW.status = 'blocked' AND (OLD.status IS NULL OR OLD.status != 'blocked') THEN
    v_user_a := NEW.requester_id;
    v_user_b := NEW.receiver_id;

    -- Cancel all pending or accepted mentorship requests between these two users
    -- in BOTH directions (user A mentored by B, or B mentored by A)
    UPDATE public.mentorship_requests
    SET
      status = 'cancelled',
      updated_at = now()
    WHERE status IN ('pending', 'accepted')
      AND (
        (mentee_id = v_user_a AND mentor_id = v_user_b)
        OR
        (mentee_id = v_user_b AND mentor_id = v_user_a)
      );

    GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;

    -- Notify both users if mentorships were cancelled
    IF v_cancelled_count > 0 THEN
      -- Notify user A
      PERFORM public.create_notification(
        v_user_a,
        'mentorship',
        'A mentorship connection has been cancelled due to a blocked relationship.',
        NULL
      );
      -- Notify user B
      PERFORM public.create_notification(
        v_user_b,
        'mentorship',
        'A mentorship connection has been cancelled due to a blocked relationship.',
        NULL
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_cancel_mentorships_on_block ON public.connections;
CREATE TRIGGER trg_cancel_mentorships_on_block
  AFTER UPDATE OF status
  ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.cancel_mentorships_on_block();

-- ============================================================================
-- 2. Edge Case #7: Prevent duplicate active mentorships
--    Only one pending or accepted mentorship between the same two users at a time.
--    Multiple completed/cancelled/rejected entries are allowed historically.
--    This uses a partial unique index (most efficient enforcement).
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS mentorship_requests_active_pair_uniq
  ON public.mentorship_requests (mentee_id, mentor_id)
  WHERE status IN ('pending', 'accepted');

-- ============================================================================
-- 3. Edge Case #9: Slot overflow guard on acceptance (DB-level safety net)
--    The app already checks slots before accept, but this trigger is a
--    server-side safety net to prevent race conditions where multiple
--    accepts happen simultaneously.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.guard_mentor_slot_overflow()
RETURNS TRIGGER AS $$
DECLARE
  v_available integer;
  v_current integer;
BEGIN
  -- Only check when status is being set to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    SELECT available_slots, current_mentees
    INTO v_available, v_current
    FROM public.mentorship_offers
    WHERE mentor_id = NEW.mentor_id AND is_active = true
    LIMIT 1;

    -- If mentor has an offer and slots are full, reject the accept
    IF v_available IS NOT NULL AND v_current >= v_available THEN
      RAISE EXCEPTION 'Mentor has no available mentorship slots (% of % used)', v_current, v_available;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_guard_mentor_slot_overflow ON public.mentorship_requests;
CREATE TRIGGER trg_guard_mentor_slot_overflow
  BEFORE UPDATE OF status
  ON public.mentorship_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_mentor_slot_overflow();

COMMIT;
