-- ============================================================================
-- 101_mentorship_audit_fixes.sql
-- Fixes from second production audit:
--   CRIT-A: Rename transition guard trigger to fire first alphabetically
--   CRIT-B: Column-access guard trigger for feedback spoofing prevention
-- ============================================================================

BEGIN;

-- ============================================================================
-- CRIT-A: Trigger Firing Order — Rename transition guard trigger
--
-- PostgreSQL fires BEFORE triggers alphabetically. The current name
-- "trg_guard_mentorship_status_transition" sorts AFTER
-- "trg_guard_mentor_slot_overflow", meaning an invalid transition
-- (e.g. completed → accepted) hits the slot overflow check first,
-- acquires a FOR UPDATE lock on mentorship_offers, and only then
-- gets rejected by the transition guard. Rename so it sorts first.
--
-- Firing order after fix:
--   1. trg_a_guard_mentorship_status_transition  (this one — blocks invalid transitions)
--   2. trg_guard_mentor_slot_overflow             (only reached for valid transitions)
-- ============================================================================
DROP TRIGGER IF EXISTS trg_guard_mentorship_status_transition ON public.mentorship_requests;
DROP TRIGGER IF EXISTS trg_a_guard_mentorship_status_transition ON public.mentorship_requests;

CREATE TRIGGER trg_a_guard_mentorship_status_transition
  BEFORE UPDATE ON public.mentorship_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_mentorship_status_transition();


-- ============================================================================
-- CRIT-B: Column-access guard trigger for mentorship_requests
--
-- PostgreSQL RLS cannot restrict per-column access. The current UPDATE policy
-- allows any involved user (mentor OR mentee) to set ANY column. This means:
--   - A mentee could spoof mentor_feedback via direct API call
--   - A mentor could spoof mentee_feedback via direct API call
--
-- Fix: A BEFORE UPDATE trigger that checks which columns changed and
-- validates caller identity. Only the mentor can change mentor_feedback,
-- and only the mentee can change mentee_feedback. Neither can change
-- the other's ID column.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.guard_mentorship_column_access()
RETURNS TRIGGER AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_mentor boolean := (v_caller = OLD.mentor_id);
  v_is_mentee boolean := (v_caller = OLD.mentee_id);
BEGIN
  -- Allow SECURITY DEFINER functions (triggers, cron) to bypass column guards
  -- They run as the function owner, not as a regular user
  IF v_caller IS NULL THEN
    RETURN NEW;
  END IF;

  -- Mentee cannot modify mentor-owned columns
  IF v_is_mentee AND NOT v_is_mentor THEN
    IF NEW.mentor_feedback IS DISTINCT FROM OLD.mentor_feedback THEN
      RAISE EXCEPTION 'Mentee cannot modify mentor_feedback';
    END IF;
    IF NEW.mentor_id IS DISTINCT FROM OLD.mentor_id THEN
      RAISE EXCEPTION 'Mentee cannot modify mentor_id';
    END IF;
  END IF;

  -- Mentor cannot modify mentee-owned columns
  IF v_is_mentor AND NOT v_is_mentee THEN
    IF NEW.mentee_feedback IS DISTINCT FROM OLD.mentee_feedback THEN
      RAISE EXCEPTION 'Mentor cannot modify mentee_feedback';
    END IF;
    IF NEW.mentee_id IS DISTINCT FROM OLD.mentee_id THEN
      RAISE EXCEPTION 'Mentor cannot modify mentee_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql STABLE;

DROP TRIGGER IF EXISTS trg_a_guard_mentorship_column_access ON public.mentorship_requests;

-- Named trg_a_... so it fires early (alongside the status transition guard)
CREATE TRIGGER trg_a_guard_mentorship_column_access
  BEFORE UPDATE ON public.mentorship_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_mentorship_column_access();

COMMIT;
