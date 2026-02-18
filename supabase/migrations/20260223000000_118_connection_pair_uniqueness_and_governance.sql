BEGIN;

-- Deduplicate opposite-direction pairs before enforcing canonical uniqueness.
-- Keep the strongest relationship state first: accepted > pending > blocked > rejected,
-- then most recently updated/created row.
WITH ranked_connections AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY LEAST(requester_id, receiver_id), GREATEST(requester_id, receiver_id)
      ORDER BY
        CASE status
          WHEN 'accepted' THEN 1
          WHEN 'pending' THEN 2
          WHEN 'blocked' THEN 3
          WHEN 'rejected' THEN 4
          ELSE 5
        END,
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id DESC
    ) AS row_rank
  FROM public.connections
)
DELETE FROM public.connections c
USING ranked_connections rc
WHERE c.id = rc.id
  AND rc.row_rank > 1;

-- Enforce one logical relationship per unordered user pair.
CREATE UNIQUE INDEX IF NOT EXISTS connections_pair_unique_idx
  ON public.connections (
    LEAST(requester_id, receiver_id),
    GREATEST(requester_id, receiver_id)
  );

-- Receiver is the reviewer/approver; requester cannot mutate status after submit.
DROP POLICY IF EXISTS "Users can update their connections" ON public.connections;
CREATE POLICY "Users can update their connections" ON public.connections
  FOR UPDATE USING (
    auth.uid() = receiver_id
    AND (
      college_domain = public.get_user_college_domain()
      OR receiver_domain = public.get_user_college_domain()
    )
  )
  WITH CHECK (
    auth.uid() = receiver_id
    AND (
      college_domain = public.get_user_college_domain()
      OR receiver_domain = public.get_user_college_domain()
    )
  );

-- Immutable pair metadata + constrained status transition governance.
CREATE OR REPLACE FUNCTION public.guard_connection_review_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.requester_id IS DISTINCT FROM OLD.requester_id
     OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id THEN
    RAISE EXCEPTION 'Connection requester/receiver cannot be changed.';
  END IF;

  IF NEW.college_domain IS DISTINCT FROM OLD.college_domain
     OR NEW.receiver_domain IS DISTINCT FROM OLD.receiver_domain THEN
    RAISE EXCEPTION 'Connection domain metadata cannot be changed.';
  END IF;

  IF NEW.message IS DISTINCT FROM OLD.message THEN
    RAISE EXCEPTION 'Connection message cannot be changed after request creation.';
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> OLD.receiver_id THEN
    RAISE EXCEPTION 'Only the receiver can review connection requests.';
  END IF;

  IF OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending requests can be reviewed.';
  END IF;

  IF NEW.status NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Review decision must be accepted or rejected.';
  END IF;

  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_connection_review_transition ON public.connections;
CREATE TRIGGER trg_guard_connection_review_transition
  BEFORE UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_connection_review_transition();

COMMIT;
