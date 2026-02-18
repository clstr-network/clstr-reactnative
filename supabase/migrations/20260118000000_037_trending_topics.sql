-- ============================================================================
-- 037_trending_topics.sql - Hashtag extraction and trending topics aggregation
-- Fixes TrendingTopics.tsx to use real Supabase-persisted data
-- ============================================================================

BEGIN;

-- ============================================================================
-- POST HASHTAGS TABLE
-- Stores extracted hashtags from posts for efficient aggregation
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.post_hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  hashtag text NOT NULL,
  college_domain text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT post_hashtags_lower_hashtag CHECK (hashtag = lower(hashtag))
);

-- Indexes for efficient trending queries
CREATE INDEX IF NOT EXISTS post_hashtags_hashtag_idx ON public.post_hashtags(hashtag);
CREATE INDEX IF NOT EXISTS post_hashtags_college_domain_idx ON public.post_hashtags(college_domain);
CREATE INDEX IF NOT EXISTS post_hashtags_created_at_idx ON public.post_hashtags(created_at DESC);
CREATE INDEX IF NOT EXISTS post_hashtags_post_id_idx ON public.post_hashtags(post_id);
-- Composite index for trending query performance
CREATE INDEX IF NOT EXISTS post_hashtags_domain_created_idx 
  ON public.post_hashtags(college_domain, created_at DESC);

-- Prevent duplicate hashtags per post
CREATE UNIQUE INDEX IF NOT EXISTS post_hashtags_post_hashtag_unique 
  ON public.post_hashtags(post_id, hashtag);

-- ============================================================================
-- FUNCTION: Extract hashtags from text
-- ============================================================================
CREATE OR REPLACE FUNCTION public.extract_hashtags(p_content text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_hashtags text[];
BEGIN
  -- Extract all #word patterns, lowercase them, remove duplicates
  SELECT ARRAY(
    SELECT DISTINCT lower(m[1])
    FROM regexp_matches(p_content, '#([a-zA-Z][a-zA-Z0-9_]{1,49})', 'g') AS m
  ) INTO v_hashtags;
  
  RETURN COALESCE(v_hashtags, '{}');
END;
$$;

-- ============================================================================
-- FUNCTION: Sync hashtags for a post
-- Called by trigger on post insert/update
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_post_hashtags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hashtags text[];
  v_tag text;
BEGIN
  -- Extract hashtags from the new content
  v_hashtags := public.extract_hashtags(NEW.content);
  
  -- Delete old hashtags for this post (for updates)
  DELETE FROM public.post_hashtags WHERE post_id = NEW.id;
  
  -- Insert new hashtags
  FOREACH v_tag IN ARRAY v_hashtags LOOP
    INSERT INTO public.post_hashtags (post_id, hashtag, college_domain, created_at)
    VALUES (NEW.id, v_tag, NEW.college_domain, NEW.created_at)
    ON CONFLICT (post_id, hashtag) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGER: Auto-extract hashtags on post insert/update
-- ============================================================================
DROP TRIGGER IF EXISTS tr_sync_post_hashtags ON public.posts;
CREATE TRIGGER tr_sync_post_hashtags
  AFTER INSERT OR UPDATE OF content ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_post_hashtags();

-- ============================================================================
-- FUNCTION: Get trending topics with recent posts
-- Returns hashtags ranked by post count within the time window
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_trending_topics(
  p_college_domain text DEFAULT NULL,
  p_time_window_hours integer DEFAULT 168, -- 7 days default
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  hashtag text,
  post_count bigint,
  recent_posts jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cutoff_time timestamptz;
BEGIN
  v_cutoff_time := now() - (p_time_window_hours || ' hours')::interval;
  
  RETURN QUERY
  WITH hashtag_counts AS (
    SELECT
      ph.hashtag,
      COUNT(DISTINCT ph.post_id) AS post_count
    FROM public.post_hashtags ph
    WHERE 
      ph.created_at >= v_cutoff_time
      AND (p_college_domain IS NULL OR ph.college_domain = p_college_domain)
    GROUP BY ph.hashtag
    HAVING COUNT(DISTINCT ph.post_id) >= 1
    ORDER BY COUNT(DISTINCT ph.post_id) DESC
    LIMIT p_limit
  ),
  recent_post_data AS (
    SELECT
      ph.hashtag,
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'author', COALESCE(pr.full_name, 'Anonymous'),
          'author_avatar', pr.avatar_url,
          'excerpt', LEFT(p.content, 100),
          'timestamp', p.created_at
        )
        ORDER BY p.created_at DESC
      ) FILTER (WHERE rn <= 3) AS posts
    FROM (
      SELECT
        ph.hashtag,
        ph.post_id,
        ROW_NUMBER() OVER (PARTITION BY ph.hashtag ORDER BY ph.created_at DESC) AS rn
      FROM public.post_hashtags ph
      INNER JOIN hashtag_counts hc ON hc.hashtag = ph.hashtag
      WHERE ph.created_at >= v_cutoff_time
        AND (p_college_domain IS NULL OR ph.college_domain = p_college_domain)
    ) ph
    INNER JOIN public.posts p ON p.id = ph.post_id
    LEFT JOIN public.profiles pr ON pr.id = p.user_id
    WHERE ph.rn <= 3
    GROUP BY ph.hashtag
  )
  SELECT
    hc.hashtag,
    hc.post_count,
    COALESCE(rpd.posts, '[]'::jsonb) AS recent_posts
  FROM hashtag_counts hc
  LEFT JOIN recent_post_data rpd ON rpd.hashtag = hc.hashtag
  ORDER BY hc.post_count DESC, hc.hashtag;
END;
$$;

-- ============================================================================
-- RLS POLICIES for post_hashtags
-- ============================================================================

-- Enable RLS
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;

-- Read policy: Users can read hashtags from their college domain or public
CREATE POLICY "post_hashtags_select_policy"
  ON public.post_hashtags
  FOR SELECT
  USING (
    college_domain IS NULL
    OR college_domain = (SELECT college_domain FROM public.profiles WHERE id = auth.uid())
  );

-- Insert/Update/Delete managed by trigger, but allow service role
CREATE POLICY "post_hashtags_service_write"
  ON public.post_hashtags
  FOR ALL
  USING (auth.role() = 'service_role');

-- Allow authenticated users to insert their own post hashtags (for edge cases)
CREATE POLICY "post_hashtags_insert_own"
  ON public.post_hashtags
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts p 
      WHERE p.id = post_id AND p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- REALTIME: Enable realtime for post_hashtags
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_hashtags;

-- ============================================================================
-- BACKFILL: Extract hashtags from existing posts
-- ============================================================================
DO $$
DECLARE
  v_post RECORD;
  v_hashtags text[];
  v_tag text;
BEGIN
  FOR v_post IN SELECT id, content, college_domain, created_at FROM public.posts LOOP
    v_hashtags := public.extract_hashtags(v_post.content);
    FOREACH v_tag IN ARRAY v_hashtags LOOP
      INSERT INTO public.post_hashtags (post_id, hashtag, college_domain, created_at)
      VALUES (v_post.id, v_tag, v_post.college_domain, v_post.created_at)
      ON CONFLICT (post_id, hashtag) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

COMMIT;
