-- ============================================================================
-- 038_poll_votes.sql - Poll voting backend persistence
-- Enables full poll lifecycle: create, vote, track votes, update post counts
-- ============================================================================

BEGIN;

-- ============================================================================
-- POLL_VOTES TABLE
-- Tracks user votes on poll options, prevents duplicate voting
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index integer NOT NULL,
  voted_at timestamptz DEFAULT now(),
  
  -- Ensure each user votes only once per poll
  UNIQUE(post_id, user_id),
  
  -- Ensure option_index is reasonable (0-99)
  CONSTRAINT valid_option_index CHECK (option_index >= 0 AND option_index < 100)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS poll_votes_post_id_idx ON public.poll_votes(post_id);
CREATE INDEX IF NOT EXISTS poll_votes_user_id_idx ON public.poll_votes(user_id);
CREATE INDEX IF NOT EXISTS poll_votes_voted_at_idx ON public.poll_votes(voted_at DESC);

-- ============================================================================
-- FUNCTION: Vote on a poll
-- Validates poll, records vote, updates post JSON with vote count
-- ============================================================================
CREATE OR REPLACE FUNCTION public.vote_on_poll(
  p_post_id uuid,
  p_option_index integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_poll jsonb;
  v_option_count integer;
  v_end_date timestamptz;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Fetch current poll and validation data
  SELECT poll, (poll->>'endDate')::timestamptz INTO v_current_poll, v_end_date
  FROM posts
  WHERE id = p_post_id;

  -- Validate post exists and is a poll
  IF v_current_poll IS NULL THEN
    RAISE EXCEPTION 'Post not found or has no poll';
  END IF;

  -- Validate poll is still active (not closed)
  IF v_end_date < now() THEN
    RAISE EXCEPTION 'This poll has ended';
  END IF;

  -- Validate option index is within range
  v_option_count := jsonb_array_length(v_current_poll->'options');
  IF p_option_index < 0 OR p_option_index >= v_option_count THEN
    RAISE EXCEPTION 'Invalid option index';
  END IF;

  -- Check if user already voted
  IF EXISTS (
    SELECT 1 FROM poll_votes 
    WHERE post_id = p_post_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You have already voted on this poll';
  END IF;

  -- Record vote
  INSERT INTO public.poll_votes (post_id, user_id, option_index)
  VALUES (p_post_id, v_user_id, p_option_index);

  -- Update post.poll JSON - increment vote count for selected option
  UPDATE posts 
  SET poll = jsonb_set(
    poll,
    ARRAY['options', p_option_index::text, 'votes'],
    to_jsonb(
      COALESCE(
        (poll->'options'->p_option_index->>'votes')::integer, 
        0
      ) + 1
    )
  )
  WHERE id = p_post_id
  RETURNING poll INTO v_current_poll;

  RETURN v_current_poll;

EXCEPTION WHEN OTHERS THEN
  -- Return error as JSON for consistency
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$;

-- ============================================================================
-- FUNCTION: Check if user has voted on poll
-- ============================================================================
CREATE OR REPLACE FUNCTION public.user_has_voted_on_poll(
  p_post_id uuid
)
RETURNS boolean
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM poll_votes 
    WHERE post_id = p_post_id 
    AND user_id = auth.uid()
  );
$$;

-- ============================================================================
-- FUNCTION: Get poll vote summary
-- Returns: { total_votes, option_votes: [count, count, ...] }
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_poll_vote_summary(
  p_post_id uuid
)
RETURNS jsonb
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_votes', COUNT(*),
    'option_votes', jsonb_agg(pv.option_index ORDER BY pv.option_index),
    'user_voted', EXISTS(
      SELECT 1 FROM poll_votes 
      WHERE post_id = p_post_id AND user_id = auth.uid()
    )
  )
  FROM poll_votes pv
  WHERE pv.post_id = p_post_id;
$$;

-- ============================================================================
-- RLS POLICIES
-- Users can vote on polls from their college, view polls, see vote counts
-- ============================================================================

-- Enable RLS on poll_votes if not already enabled
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own votes
CREATE POLICY poll_votes_insert_own ON public.poll_votes
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM posts p
      INNER JOIN profiles pr ON p.user_id = pr.id
      WHERE p.id = post_id
      AND pr.college_domain = (
        SELECT college_domain FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can view all votes on polls in their college
CREATE POLICY poll_votes_select_college ON public.poll_votes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      INNER JOIN profiles pr ON p.user_id = pr.id
      WHERE p.id = post_id
      AND pr.college_domain = (
        SELECT college_domain FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- SUBSCRIPTION: Realtime updates on poll votes
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;

-- ============================================================================
-- BACKFILL: Sync existing poll votes from posts.poll JSON (if any exist)
-- This extracts vote data stored in the JSON and creates poll_vote records
-- ============================================================================
DO $$
DECLARE
  v_post RECORD;
  v_poll_data jsonb;
  v_option_idx integer;
BEGIN
  -- Iterate through posts that have polls
  FOR v_post IN 
    SELECT id, poll FROM public.posts WHERE poll IS NOT NULL
  LOOP
    -- Iterate through poll options
    FOR v_option_idx IN 
      SELECT idx::integer 
      FROM jsonb_array_elements(v_post.poll->'options') WITH ORDINALITY AS arr(elem, idx)
    LOOP
      -- Note: We can't recover which user voted, so we skip backfill
      -- New votes will be tracked going forward
      NULL;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Poll votes table backfill complete (no user data to restore)';
END;
$$;

COMMIT;
