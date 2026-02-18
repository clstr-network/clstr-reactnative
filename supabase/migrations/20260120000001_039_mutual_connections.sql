-- ============================================================================
-- 039_mutual_connections.sql - Mutual connections calculation
-- Enables counting shared connections between users for social insights
-- ============================================================================

BEGIN;

-- ============================================================================
-- FUNCTION: Count mutual connections
-- Returns the number of shared connections between two users
-- ============================================================================
CREATE OR REPLACE FUNCTION public.count_mutual_connections(
  p_user_id uuid,
  p_other_user_id uuid
)
RETURNS integer
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT c1.requester_id)
  FROM connections c1
  INNER JOIN connections c2 ON 
    (c1.requester_id = c2.requester_id OR c1.requester_id = c2.receiver_id
     OR c1.receiver_id = c2.requester_id OR c1.receiver_id = c2.receiver_id)
  WHERE 
    -- Connections from first user
    ((c1.requester_id = p_user_id OR c1.receiver_id = p_user_id)
    -- Connections from second user
    AND (c2.requester_id = p_other_user_id OR c2.receiver_id = p_other_user_id))
    -- Both connections must be accepted
    AND c1.status = 'accepted'
    AND c2.status = 'accepted'
    -- Filter out the original users (no counting themselves as mutual)
    AND c1.requester_id NOT IN (p_user_id, p_other_user_id)
    AND c1.receiver_id NOT IN (p_user_id, p_other_user_id)
    AND c2.requester_id NOT IN (p_user_id, p_other_user_id)
    AND c2.receiver_id NOT IN (p_user_id, p_other_user_id);
$$;

-- ============================================================================
-- FUNCTION: Get mutual connections list
-- Returns detailed list of shared connections between two users
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_mutual_connections(
  p_user_id uuid,
  p_other_user_id uuid,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  mutual_user_id uuid,
  full_name text,
  avatar_url text,
  role text,
  college_domain text
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH mutual_ids AS (
    SELECT DISTINCT 
      CASE 
        WHEN c1.requester_id NOT IN (p_user_id, p_other_user_id) THEN c1.requester_id
        WHEN c1.receiver_id NOT IN (p_user_id, p_other_user_id) THEN c1.receiver_id
      END as user_id
    FROM connections c1
    INNER JOIN connections c2 ON 
      (c1.requester_id = c2.requester_id OR c1.requester_id = c2.receiver_id
       OR c1.receiver_id = c2.requester_id OR c1.receiver_id = c2.receiver_id)
    WHERE 
      ((c1.requester_id = p_user_id OR c1.receiver_id = p_user_id)
      AND (c2.requester_id = p_other_user_id OR c2.receiver_id = p_other_user_id))
      AND c1.status = 'accepted'
      AND c2.status = 'accepted'
      AND c1.requester_id NOT IN (p_user_id, p_other_user_id)
      AND c1.receiver_id NOT IN (p_user_id, p_other_user_id)
      AND c2.requester_id NOT IN (p_user_id, p_other_user_id)
      AND c2.receiver_id NOT IN (p_user_id, p_other_user_id)
  )
  SELECT 
    m.user_id,
    pr.full_name,
    pr.avatar_url,
    pr.role::text,
    pr.college_domain
  FROM mutual_ids m
  INNER JOIN profiles pr ON m.user_id = pr.id
  LIMIT p_limit;
$$;

-- ============================================================================
-- FUNCTION: Batch count mutual connections
-- Returns mutual connection counts for multiple users at once (for trending)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.count_mutual_connections_batch(
  p_user_id uuid,
  p_other_user_ids uuid[]
)
RETURNS TABLE (
  other_user_id uuid,
  mutual_count integer
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    p_uid::uuid as other_user_id,
    (
      SELECT COUNT(DISTINCT c1.requester_id)
      FROM connections c1
      INNER JOIN connections c2 ON 
        (c1.requester_id = c2.requester_id OR c1.requester_id = c2.receiver_id
         OR c1.receiver_id = c2.requester_id OR c1.receiver_id = c2.receiver_id)
      WHERE 
        ((c1.requester_id = p_user_id OR c1.receiver_id = p_user_id)
        AND (c2.requester_id = p_uid OR c2.receiver_id = p_uid))
        AND c1.status = 'accepted'
        AND c2.status = 'accepted'
        AND c1.requester_id NOT IN (p_user_id, p_uid)
        AND c1.receiver_id NOT IN (p_user_id, p_uid)
        AND c2.requester_id NOT IN (p_user_id, p_uid)
        AND c2.receiver_id NOT IN (p_user_id, p_uid)
    )::integer as mutual_count
  FROM UNNEST(p_other_user_ids) as p_uid;
$$;

COMMIT;
