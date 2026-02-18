-- ============================================================================
-- 099_mentorship_audit_fixes.sql
-- Production audit fixes:
--   BUG-1:  Bidirectional connection handling in on_mentorship_request_accepted
--   BUG-4:  SLA rolling average — use responded count, not total received
--   EDGE-3: ON DELETE SET NULL instead of CASCADE on mentorship foreign keys
--   EDGE-6: FOR UPDATE lock in guard_mentor_slot_overflow trigger
--   EDGE-8: Fix auto_expire_stale_mentorship_requests return value
-- ============================================================================

BEGIN;

-- ============================================================================
-- BUG-1: Fix bidirectional connection handling in on_mentorship_request_accepted
--
-- The original trigger only inserts (mentor_id, mentee_id) direction. If a
-- connection already exists in reverse direction (mentee_id, mentor_id) from
-- a prior connection request, the ON CONFLICT clause won't match because the
-- unique constraint is on (requester_id, receiver_id). This creates duplicate
-- bidirectional connections, corrupting the connections table.
--
-- Fix: Check for existing connection in EITHER direction before inserting.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.on_mentorship_request_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_college_domain text;
  v_mentor_name text;
  v_mentee_name text;
  v_existing_connection_id uuid;
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

    -- BUG-1 FIX: Check for existing connection in EITHER direction
    SELECT id INTO v_existing_connection_id
    FROM public.connections
    WHERE (requester_id = NEW.mentor_id AND receiver_id = NEW.mentee_id)
       OR (requester_id = NEW.mentee_id AND receiver_id = NEW.mentor_id)
    LIMIT 1;

    IF v_existing_connection_id IS NOT NULL THEN
      -- Update existing connection to accepted (regardless of direction)
      UPDATE public.connections
      SET status = 'accepted', updated_at = now()
      WHERE id = v_existing_connection_id
        AND status != 'blocked';
    ELSE
      -- No connection exists in either direction — create one
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
    END IF;

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


-- ============================================================================
-- BUG-4: Fix SLA rolling average — use responded count, not total received
--
-- The original formula uses total_requests_received as the denominator, but
-- that includes requests that haven't been responded to yet. The correct
-- denominator is the count of responded requests (accepted + rejected).
-- We add a total_requests_responded column to track this accurately.
-- ============================================================================
ALTER TABLE public.mentorship_offers
  ADD COLUMN IF NOT EXISTS total_requests_responded integer DEFAULT 0;

COMMENT ON COLUMN public.mentorship_offers.total_requests_responded IS 'Total mentorship requests responded to (accepted + rejected). Used as SLA average denominator.';

-- Backfill total_requests_responded from existing data
UPDATE public.mentorship_offers
SET total_requests_responded = total_requests_accepted + total_requests_ignored
WHERE total_requests_responded = 0
  AND (total_requests_accepted > 0 OR total_requests_ignored > 0);

CREATE OR REPLACE FUNCTION public.update_mentor_sla_metrics()
RETURNS TRIGGER AS $$
DECLARE
  v_response_hours numeric;
  v_current_avg numeric;
  v_current_responded integer;
BEGIN
  -- Only fire when status changes from 'pending' to 'accepted' or 'rejected'
  IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected') THEN
    -- Set responded_at if not already set
    IF NEW.responded_at IS NULL THEN
      NEW.responded_at := now();
    END IF;

    -- Calculate response time in hours
    v_response_hours := EXTRACT(EPOCH FROM (NEW.responded_at - NEW.created_at)) / 3600.0;

    -- Get current SLA values — use total_requests_responded as denominator
    SELECT avg_response_hours, total_requests_responded
    INTO v_current_avg, v_current_responded
    FROM public.mentorship_offers
    WHERE mentor_id = NEW.mentor_id AND is_active = true
    LIMIT 1;

    -- Update SLA metrics on the mentor's offer
    UPDATE public.mentorship_offers
    SET
      avg_response_hours = CASE
        WHEN v_current_avg IS NULL THEN v_response_hours
        ELSE ((COALESCE(v_current_avg, 0) * GREATEST(v_current_responded, 0)) + v_response_hours) /
             (COALESCE(v_current_responded, 0) + 1)
      END,
      total_requests_responded = COALESCE(total_requests_responded, 0) + 1,
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


-- ============================================================================
-- EDGE-6: FOR UPDATE lock in guard_mentor_slot_overflow trigger
--
-- The original trigger reads current_mentees without locking. Concurrent
-- accepts for the same mentor can both pass the guard before either commits.
-- Fix: Use SELECT ... FOR UPDATE to serialize concurrent accepts.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.guard_mentor_slot_overflow()
RETURNS TRIGGER AS $$
DECLARE
  v_available integer;
  v_current integer;
BEGIN
  -- Only check when status is being set to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- FOR UPDATE acquires a row lock, serializing concurrent accepts for the same mentor
    SELECT available_slots, current_mentees
    INTO v_available, v_current
    FROM public.mentorship_offers
    WHERE mentor_id = NEW.mentor_id AND is_active = true
    LIMIT 1
    FOR UPDATE;

    -- If mentor has an offer and slots are full, reject the accept
    IF v_available IS NOT NULL AND v_current >= v_available THEN
      RAISE EXCEPTION 'Mentor has no available mentorship slots (% of % used)', v_current, v_available;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- EDGE-8: Fix auto_expire_stale_mentorship_requests return value
--
-- The original uses GET DIAGNOSTICS after the FOR LOOP which returns the
-- ROW_COUNT of the last single UPDATE (always 1), not the total expired count.
-- Fix: Use a manual counter incremented inside the loop.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_expire_stale_mentorship_requests()
RETURNS integer AS $$
DECLARE
  v_expired_count integer := 0;
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

    -- Increment manual counter
    v_expired_count := v_expired_count + 1;

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

  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- EDGE-3: Change ON DELETE CASCADE to ON DELETE SET NULL
--
-- Cascading deletes destroy historical mentorship records when a profile is
-- deleted, violating the spec "Mentorship records preserved for audit."
-- Change to SET NULL so records show "Former Mentor" / "Former Student".
-- ============================================================================

-- Drop existing foreign key constraints and re-create with SET NULL
-- mentorship_requests.mentor_id
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  -- Find and drop the existing FK constraint on mentor_id
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.mentorship_requests'::regclass
    AND contype = 'f'
    AND (SELECT attname FROM pg_attribute WHERE attrelid = conrelid AND attnum = ANY(conkey) LIMIT 1) = 'mentor_id';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.mentorship_requests DROP CONSTRAINT %I', v_constraint_name);
    ALTER TABLE public.mentorship_requests
      ADD CONSTRAINT mentorship_requests_mentor_id_fkey
      FOREIGN KEY (mentor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- mentorship_requests.mentee_id
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.mentorship_requests'::regclass
    AND contype = 'f'
    AND (SELECT attname FROM pg_attribute WHERE attrelid = conrelid AND attnum = ANY(conkey) LIMIT 1) = 'mentee_id';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.mentorship_requests DROP CONSTRAINT %I', v_constraint_name);
    ALTER TABLE public.mentorship_requests
      ADD CONSTRAINT mentorship_requests_mentee_id_fkey
      FOREIGN KEY (mentee_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- mentorship_offers.mentor_id
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.mentorship_offers'::regclass
    AND contype = 'f'
    AND (SELECT attname FROM pg_attribute WHERE attrelid = conrelid AND attnum = ANY(conkey) LIMIT 1) = 'mentor_id';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.mentorship_offers DROP CONSTRAINT %I', v_constraint_name);
    ALTER TABLE public.mentorship_offers
      ADD CONSTRAINT mentorship_offers_mentor_id_fkey
      FOREIGN KEY (mentor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END;
$$;

COMMIT;
