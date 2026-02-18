-- ============================================================================
-- 100_mentorship_production_fixes.sql
-- Production audit fixes from Mentorship System Production Audit Report
--
--   CRIT-1:  Role enforcement on INSERT RLS — only Students can request
--   CRIT-2:  Status transition guard trigger — prevent re-accepting cancelled/completed
--   CRIT-3:  Drop NOT NULL on FK columns to allow ON DELETE SET NULL
--   GAP-2:   Auto-cancel mentorships on profile deletion (before FK sets NULL)
--   GAP-3:   Partial unique index on mentorship_offers(mentor_id) WHERE is_active
--   GAP-4:   pg_cron schedule for auto_expire_stale_mentorship_requests
--   GAP-5:   Auto-cancel pending requests when mentor pauses
--   GAP-6:   One-time SLA backfill correction
--   UX-5:    Mentor notification on auto-expiry
-- ============================================================================

BEGIN;

-- ============================================================================
-- CRIT-1: Role enforcement on INSERT RLS policy for mentorship_requests
--
-- The existing INSERT policy only checks auth.uid() = mentee_id.
-- Any authenticated user (Alumni, Faculty, Club) can bypass the frontend and
-- insert a mentorship request directly via the API.
-- Fix: Add a role check so only 'Student' profiles can insert requests.
-- ============================================================================
DROP POLICY IF EXISTS "Mentees can create requests" ON public.mentorship_requests;
CREATE POLICY "Mentees can create requests" ON public.mentorship_requests
  FOR INSERT WITH CHECK (
    auth.uid() = mentee_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'Student'
    )
  );


-- ============================================================================
-- CRIT-2: Status transition guard trigger
--
-- Without this, a mentor can re-accept a cancelled, auto-expired, or completed
-- mentorship by calling the API directly. This creates duplicate connections,
-- sends spurious system messages, and corrupts mentee counts.
--
-- Allowed transitions:
--   pending   → accepted, rejected, cancelled
--   accepted  → completed, cancelled
--   rejected  → (terminal — no transitions)
--   cancelled → (terminal — no transitions)
--   completed → (terminal — no transitions)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.guard_mentorship_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Validate allowed transitions
  CASE OLD.status
    WHEN 'pending' THEN
      IF NEW.status NOT IN ('accepted', 'rejected', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition: pending → %', NEW.status;
      END IF;
    WHEN 'accepted' THEN
      IF NEW.status NOT IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition: accepted → %', NEW.status;
      END IF;
    WHEN 'rejected' THEN
      RAISE EXCEPTION 'Cannot transition from terminal status: rejected';
    WHEN 'cancelled' THEN
      RAISE EXCEPTION 'Cannot transition from terminal status: cancelled';
    WHEN 'completed' THEN
      RAISE EXCEPTION 'Cannot transition from terminal status: completed';
    ELSE
      RAISE EXCEPTION 'Unknown status: %', OLD.status;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists to make migration idempotent
DROP TRIGGER IF EXISTS trg_guard_mentorship_status_transition ON public.mentorship_requests;

-- This trigger must fire BEFORE other BEFORE UPDATE triggers so it blocks
-- invalid transitions before they reach guard_mentor_slot_overflow or SLA triggers.
CREATE TRIGGER trg_guard_mentorship_status_transition
  BEFORE UPDATE ON public.mentorship_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_mentorship_status_transition();


-- ============================================================================
-- CRIT-3: Drop NOT NULL on FK columns to allow ON DELETE SET NULL
--
-- Migration 099 changed FKs to ON DELETE SET NULL, but the NOT NULL constraints
-- were never dropped. When a referenced profile is deleted, PostgreSQL tries
-- to SET NULL but the NOT NULL constraint prevents it, causing the DELETE to fail.
-- ============================================================================
ALTER TABLE public.mentorship_requests
  ALTER COLUMN mentor_id DROP NOT NULL;

ALTER TABLE public.mentorship_requests
  ALTER COLUMN mentee_id DROP NOT NULL;

ALTER TABLE public.mentorship_offers
  ALTER COLUMN mentor_id DROP NOT NULL;


-- ============================================================================
-- GAP-2: Auto-cancel mentorships when a profile is deleted
--
-- Before the FK sets the column to NULL, cancel all pending/accepted mentorships
-- involving the deleted profile. This prevents orphaned active rows.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.on_profile_delete_cancel_mentorships()
RETURNS TRIGGER AS $$
BEGIN
  -- Cancel all pending/accepted mentorship requests where this profile is mentor
  UPDATE public.mentorship_requests
  SET status = 'cancelled', updated_at = now()
  WHERE mentor_id = OLD.id
    AND status IN ('pending', 'accepted');

  -- Cancel all pending/accepted mentorship requests where this profile is mentee
  UPDATE public.mentorship_requests
  SET status = 'cancelled', updated_at = now()
  WHERE mentee_id = OLD.id
    AND status IN ('pending', 'accepted');

  -- Deactivate the mentor's offer
  UPDATE public.mentorship_offers
  SET is_active = false, updated_at = now()
  WHERE mentor_id = OLD.id AND is_active = true;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_profile_delete_cancel_mentorships ON public.profiles;

-- BEFORE DELETE so it fires before the FK SET NULL
CREATE TRIGGER trg_on_profile_delete_cancel_mentorships
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.on_profile_delete_cancel_mentorships();


-- ============================================================================
-- GAP-3: Partial unique index on mentorship_offers(mentor_id) WHERE is_active
--
-- Prevents race condition where two concurrent "Save" clicks create duplicate
-- active offers for the same mentor.
-- ============================================================================
-- First, deduplicate any existing duplicates (keep the most recently updated one)
DO $$
DECLARE
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT mentor_id, array_agg(id ORDER BY updated_at DESC) AS ids
    FROM public.mentorship_offers
    WHERE is_active = true
    GROUP BY mentor_id
    HAVING count(*) > 1
  LOOP
    -- Deactivate all but the first (most recent)
    UPDATE public.mentorship_offers
    SET is_active = false, updated_at = now()
    WHERE id = ANY(v_row.ids[2:]);
  END LOOP;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS mentorship_offers_active_mentor_uniq
  ON public.mentorship_offers (mentor_id)
  WHERE is_active = true;


-- ============================================================================
-- GAP-4: pg_cron schedule for auto_expire_stale_mentorship_requests
--
-- The function exists but was never scheduled. Enable pg_cron extension
-- and schedule it to run daily at 3:00 AM UTC.
-- Note: If pg_cron is not available on this Supabase plan, this will be a no-op
-- and the Edge Function cron alternative should be used instead.
-- ============================================================================
DO $outer$
BEGIN
  -- Attempt to create pg_cron extension (may already exist or not be available)
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron extension not available — use Edge Function cron instead';
  END;

  -- Attempt to schedule the job
  BEGIN
    PERFORM cron.schedule(
      'auto-expire-stale-mentorship-requests',
      '0 3 * * *',  -- daily at 3:00 AM UTC
      $$SELECT public.auto_expire_stale_mentorship_requests()$$
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule pg_cron job — use Edge Function cron instead';
  END;
END;
$outer$;


-- ============================================================================
-- GAP-5: Auto-cancel pending requests when a mentor pauses
--
-- When a mentor sets is_paused = true, students' pending requests sit for
-- up to 14 days with no signal. Cancel them immediately and notify students.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.on_mentor_pause_cancel_pending()
RETURNS TRIGGER AS $$
DECLARE
  v_row RECORD;
  v_mentor_name text;
BEGIN
  -- Only fire when is_paused changes from false to true
  IF NEW.is_paused = true AND (OLD.is_paused IS NULL OR OLD.is_paused = false) THEN
    -- Get mentor name for notifications
    SELECT full_name INTO v_mentor_name
    FROM public.profiles WHERE id = NEW.mentor_id;

    -- Cancel all pending requests to this mentor
    FOR v_row IN
      SELECT id, mentee_id
      FROM public.mentorship_requests
      WHERE mentor_id = NEW.mentor_id
        AND status = 'pending'
    LOOP
      UPDATE public.mentorship_requests
      SET status = 'cancelled', updated_at = now()
      WHERE id = v_row.id;

      -- Notify the student
      PERFORM public.create_notification(
        v_row.mentee_id,
        'mentorship',
        COALESCE(v_mentor_name, 'A mentor') || ' is currently unavailable. Your pending request has been cancelled. Try another mentor!',
        v_row.id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_mentor_pause_cancel_pending ON public.mentorship_offers;

CREATE TRIGGER trg_on_mentor_pause_cancel_pending
  AFTER UPDATE ON public.mentorship_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.on_mentor_pause_cancel_pending();


-- ============================================================================
-- GAP-6: One-time SLA backfill correction
--
-- The original backfill in 099 incorrectly set:
--   total_requests_responded = total_requests_accepted + total_requests_ignored
-- But ignored requests are NOT responses. The correct formula is only accepted
-- requests (we don't have a separate rejected count, so we re-derive from the
-- requests table).
-- ============================================================================
UPDATE public.mentorship_offers mo
SET total_requests_responded = sub.responded_count
FROM (
  SELECT
    mr.mentor_id,
    COUNT(*) FILTER (WHERE mr.status IN ('accepted', 'rejected')) AS responded_count
  FROM public.mentorship_requests mr
  GROUP BY mr.mentor_id
) sub
WHERE mo.mentor_id = sub.mentor_id
  AND mo.is_active = true;

-- Also recalculate avg_response_hours from actual data for active offers
UPDATE public.mentorship_offers mo
SET avg_response_hours = sub.avg_hrs
FROM (
  SELECT
    mr.mentor_id,
    AVG(EXTRACT(EPOCH FROM (mr.responded_at - mr.created_at)) / 3600.0) AS avg_hrs
  FROM public.mentorship_requests mr
  WHERE mr.status IN ('accepted', 'rejected')
    AND mr.responded_at IS NOT NULL
  GROUP BY mr.mentor_id
) sub
WHERE mo.mentor_id = sub.mentor_id
  AND mo.is_active = true;


-- ============================================================================
-- UX-5: Mentor notification on auto-expiry
--
-- The auto-expire function notifies the mentee but not the mentor. A mentor
-- who missed the initial request notification has no signal that requests
-- are being expired.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_expire_stale_mentorship_requests()
RETURNS integer AS $$
DECLARE
  v_expired_count integer := 0;
  v_row RECORD;
  v_mentor_name text;
  v_mentee_name text;
BEGIN
  -- Find and cancel all pending requests older than 14 days
  FOR v_row IN
    SELECT mr.id, mr.mentee_id, mr.mentor_id
    FROM public.mentorship_requests mr
    WHERE mr.status = 'pending'
      AND mr.created_at < now() - interval '14 days'
      AND mr.auto_expired = false
  LOOP
    -- Update the request status to cancelled with auto_expired flag
    -- Note: The status transition guard allows pending → cancelled
    UPDATE public.mentorship_requests
    SET
      status = 'cancelled',
      auto_expired = true,
      updated_at = now()
    WHERE id = v_row.id;

    -- Increment manual counter
    v_expired_count := v_expired_count + 1;

    -- Get names for notifications
    SELECT full_name INTO v_mentor_name
    FROM public.profiles WHERE id = v_row.mentor_id;

    SELECT full_name INTO v_mentee_name
    FROM public.profiles WHERE id = v_row.mentee_id;

    -- Notify student (mentee)
    PERFORM public.create_notification(
      v_row.mentee_id,
      'mentorship',
      'Your mentorship request to ' || COALESCE(v_mentor_name, 'a mentor') || ' has expired after 14 days. Feel free to try another mentor!',
      v_row.id
    );

    -- UX-5 FIX: Also notify the mentor
    PERFORM public.create_notification(
      v_row.mentor_id,
      'mentorship',
      'A mentorship request from ' || COALESCE(v_mentee_name, 'a student') || ' expired after 14 days without response.',
      v_row.id
    );

    -- Increment ignored count on mentor's offer
    UPDATE public.mentorship_offers
    SET
      total_requests_ignored = total_requests_ignored + 1,
      updated_at = now()
    WHERE mentor_id = v_row.mentor_id AND is_active = true;
  END LOOP;

  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
