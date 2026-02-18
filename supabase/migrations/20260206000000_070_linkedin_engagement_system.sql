-- ============================================================================
-- 070_linkedin_engagement_system.sql - LinkedIn-style Engagement System
-- Implements: reactions, reposts, inline comments, proper notification triggers
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. REACTION TYPES ENUM (LinkedIn-style)
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reaction_type') THEN
    CREATE TYPE public.reaction_type AS ENUM (
      'like',       -- 👍
      'celebrate',  -- 🎉
      'support',    -- 🤝
      'love',       -- ❤️
      'insightful', -- 💡
      'curious',    -- 🤔
      'laugh'       -- 😂
    );
  END IF;
END $$;

-- ============================================================================
-- 2. ENHANCE POST_LIKES TABLE FOR REACTIONS
-- Already has reaction_type column (text), upgrade to use proper checks
-- ============================================================================

-- Add constraint if not exists for valid reaction types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'post_likes_reaction_type_check'
  ) THEN
    ALTER TABLE public.post_likes 
    ADD CONSTRAINT post_likes_reaction_type_check 
    CHECK (reaction_type IN ('like', 'celebrate', 'support', 'love', 'insightful', 'curious', 'laugh'));
  END IF;
END $$;

-- Ensure default is 'like'
ALTER TABLE public.post_likes 
  ALTER COLUMN reaction_type SET DEFAULT 'like';

-- Update any NULL reaction_types to 'like'
UPDATE public.post_likes SET reaction_type = 'like' WHERE reaction_type IS NULL;

-- Add index for reaction_type queries
CREATE INDEX IF NOT EXISTS post_likes_reaction_type_idx ON public.post_likes(reaction_type);

-- ============================================================================
-- 3. CREATE REPOSTS TABLE (True social reposts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reposts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  college_domain text,
  commentary_text text, -- NULL = quick repost, text = repost with thoughts
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Prevent duplicate reposts of same post by same user
  UNIQUE(original_post_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS reposts_original_post_id_idx ON public.reposts(original_post_id);
CREATE INDEX IF NOT EXISTS reposts_user_id_idx ON public.reposts(user_id);
CREATE INDEX IF NOT EXISTS reposts_college_domain_idx ON public.reposts(college_domain);
CREATE INDEX IF NOT EXISTS reposts_created_at_idx ON public.reposts(created_at DESC);

-- Enable RLS
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reposts
CREATE POLICY "Reposts viewable by same college only" ON public.reposts
  FOR SELECT
  USING (
    college_domain IN (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create reposts in same college" ON public.reposts
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND college_domain IN (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own reposts" ON public.reposts
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. UPDATE POSTS TABLE - Add reposts_count
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'reposts_count'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN reposts_count integer DEFAULT 0;
  END IF;
END $$;

-- ============================================================================
-- 5. COUNTER TRIGGERS FOR REPOSTS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_reposts_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.posts
      SET reposts_count = GREATEST(COALESCE(reposts_count, 0) + 1, 0)
      WHERE id = NEW.original_post_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.posts
      SET reposts_count = GREATEST(COALESCE(reposts_count, 0) - 1, 0)
      WHERE id = OLD.original_post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_reposts_count ON public.reposts;
CREATE TRIGGER trg_update_reposts_count
  AFTER INSERT OR DELETE ON public.reposts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reposts_count();

-- ============================================================================
-- 6. REACTION AGGREGATION VIEW (Top 2 reactions + counts)
-- ============================================================================
CREATE OR REPLACE VIEW public.post_reaction_summary AS
SELECT 
  pl.post_id,
  array_agg(DISTINCT pl.reaction_type ORDER BY pl.reaction_type) AS reaction_types,
  COUNT(*) AS total_reactions,
  jsonb_object_agg(
    pl.reaction_type, 
    (SELECT COUNT(*) FROM public.post_likes WHERE post_id = pl.post_id AND reaction_type = pl.reaction_type)
  ) AS reaction_counts
FROM public.post_likes pl
GROUP BY pl.post_id;

-- ============================================================================
-- 7. FUNCTION TO GET TOP REACTIONS FOR A POST
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_post_top_reactions(p_post_id uuid)
RETURNS TABLE (
  reaction_type text,
  count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pl.reaction_type::text,
    COUNT(*)::bigint as count
  FROM public.post_likes pl
  WHERE pl.post_id = p_post_id
  GROUP BY pl.reaction_type
  ORDER BY count DESC
  LIMIT 3;
END;
$$;

-- ============================================================================
-- 8. FUNCTION TO GET USER'S REACTION ON A POST
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_reaction(p_post_id uuid, p_user_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_reaction text;
BEGIN
  -- Use provided user_id or current auth user
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT reaction_type INTO v_reaction
  FROM public.post_likes
  WHERE post_id = p_post_id AND user_id = v_user_id;
  
  RETURN v_reaction;
END;
$$;

-- ============================================================================
-- 9. FUNCTION TO TOGGLE/CHANGE REACTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.toggle_reaction(
  p_post_id uuid,
  p_reaction_type text DEFAULT 'like'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_college_domain text;
  v_existing_reaction text;
  v_result jsonb;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Validate reaction type
  IF p_reaction_type NOT IN ('like', 'celebrate', 'support', 'love', 'insightful', 'curious', 'laugh') THEN
    RAISE EXCEPTION 'Invalid reaction type: %', p_reaction_type;
  END IF;
  
  -- Get user's college domain
  SELECT college_domain INTO v_college_domain
  FROM public.profiles WHERE id = v_user_id;
  
  IF v_college_domain IS NULL THEN
    RAISE EXCEPTION 'Profile missing college domain';
  END IF;
  
  -- Check post belongs to same college domain
  IF NOT EXISTS (
    SELECT 1 FROM public.posts 
    WHERE id = p_post_id 
    AND (college_domain = v_college_domain OR college_domain IS NULL)
  ) THEN
    RAISE EXCEPTION 'Post not found or not accessible';
  END IF;
  
  -- Check for existing reaction
  SELECT reaction_type INTO v_existing_reaction
  FROM public.post_likes
  WHERE post_id = p_post_id AND user_id = v_user_id;
  
  IF v_existing_reaction IS NOT NULL THEN
    IF v_existing_reaction = p_reaction_type THEN
      -- Same reaction = remove it
      DELETE FROM public.post_likes
      WHERE post_id = p_post_id AND user_id = v_user_id;
      
      v_result := jsonb_build_object(
        'action', 'removed',
        'reaction', NULL
      );
    ELSE
      -- Different reaction = update it
      UPDATE public.post_likes
      SET reaction_type = p_reaction_type,
          created_at = now()
      WHERE post_id = p_post_id AND user_id = v_user_id;
      
      v_result := jsonb_build_object(
        'action', 'changed',
        'reaction', p_reaction_type,
        'previous', v_existing_reaction
      );
    END IF;
  ELSE
    -- No existing reaction = insert new one
    INSERT INTO public.post_likes (post_id, user_id, reaction_type, college_domain)
    VALUES (p_post_id, v_user_id, p_reaction_type, v_college_domain);
    
    v_result := jsonb_build_object(
      'action', 'added',
      'reaction', p_reaction_type
    );
  END IF;
  
  -- Add updated counts to result
  SELECT v_result || jsonb_build_object(
    'total_reactions', (SELECT COUNT(*) FROM public.post_likes WHERE post_id = p_post_id),
    'top_reactions', (
      SELECT jsonb_agg(jsonb_build_object('type', r.reaction_type, 'count', r.count))
      FROM (
        SELECT reaction_type, COUNT(*) as count
        FROM public.post_likes
        WHERE post_id = p_post_id
        GROUP BY reaction_type
        ORDER BY count DESC
        LIMIT 3
      ) r
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- 10. UPDATE NOTIFICATION TRIGGER - REMOVE LIKE NOTIFICATIONS
-- Per spec: Do NOT notify for likes/reaction changes
-- ============================================================================
DROP TRIGGER IF EXISTS notify_post_like ON public.post_likes;

-- Don't create a new trigger - likes should NOT generate notifications per spec

-- ============================================================================
-- 11. REPOST NOTIFICATION TRIGGER (with thoughts only)
-- Per spec: Notify ONLY for reposts with commentary (thoughts)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_repost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post_author_id uuid;
  v_reposter_name text;
  v_content text;
BEGIN
  -- Only notify for reposts WITH commentary (thoughts)
  IF NEW.commentary_text IS NULL OR TRIM(NEW.commentary_text) = '' THEN
    RETURN NEW;
  END IF;
  
  -- Get the original post author
  SELECT user_id INTO v_post_author_id
  FROM public.posts
  WHERE id = NEW.original_post_id;
  
  -- Don't notify if user reposted their own post
  IF v_post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get the reposter's name
  SELECT full_name INTO v_reposter_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  v_content := COALESCE(v_reposter_name, 'Someone') || ' reposted your post with their thoughts';
  
  PERFORM public.create_notification(
    v_post_author_id,
    'repost',
    v_content,
    NEW.original_post_id
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_repost ON public.reposts;
CREATE TRIGGER notify_repost
  AFTER INSERT ON public.reposts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_repost();

-- ============================================================================
-- 12. FUNCTION TO CREATE REPOST
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_repost(
  p_original_post_id uuid,
  p_commentary_text text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_college_domain text;
  v_repost_id uuid;
  v_result jsonb;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get user's college domain
  SELECT college_domain INTO v_college_domain
  FROM public.profiles WHERE id = v_user_id;
  
  IF v_college_domain IS NULL THEN
    RAISE EXCEPTION 'Profile missing college domain';
  END IF;
  
  -- Check post exists and is from same college
  IF NOT EXISTS (
    SELECT 1 FROM public.posts 
    WHERE id = p_original_post_id 
    AND (college_domain = v_college_domain OR college_domain IS NULL)
  ) THEN
    RAISE EXCEPTION 'Post not found or not accessible';
  END IF;
  
  -- Check for existing repost
  IF EXISTS (
    SELECT 1 FROM public.reposts 
    WHERE original_post_id = p_original_post_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You have already reposted this post';
  END IF;
  
  -- Create repost
  INSERT INTO public.reposts (original_post_id, user_id, college_domain, commentary_text)
  VALUES (p_original_post_id, v_user_id, v_college_domain, NULLIF(TRIM(p_commentary_text), ''))
  RETURNING id INTO v_repost_id;
  
  v_result := jsonb_build_object(
    'success', true,
    'repost_id', v_repost_id,
    'has_commentary', p_commentary_text IS NOT NULL AND TRIM(p_commentary_text) <> ''
  );
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- 13. FUNCTION TO DELETE REPOST
-- ============================================================================
CREATE OR REPLACE FUNCTION public.delete_repost(p_original_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  DELETE FROM public.reposts
  WHERE original_post_id = p_original_post_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Repost not found';
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- 14. FEED RANKING FUNCTION (Engagement-weighted)
-- Weighted scoring: Comment=5, Repost w/thoughts=4, Repost=3, Reaction=1
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_post_engagement_score(
  p_likes_count integer,
  p_comments_count integer,
  p_reposts_count integer,
  p_shares_count integer
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN COALESCE(p_comments_count, 0) * 5 +
         COALESCE(p_reposts_count, 0) * 3 +
         COALESCE(p_likes_count, 0) * 1;
END;
$$;

-- ============================================================================
-- 15. UPDATE comments_count TRIGGER - Only count top-level comments
-- Per spec: comments_count increments only for top-level comments
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Only count top-level comments (no parent_id)
    IF NEW.parent_id IS NULL THEN
      UPDATE public.posts
        SET comments_count = GREATEST(COALESCE(comments_count, 0) + 1, 0)
        WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    -- Only decrement for top-level comments
    IF OLD.parent_id IS NULL THEN
      UPDATE public.posts
        SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0)
        WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Replace existing trigger
DROP TRIGGER IF EXISTS trg_update_post_comments_count ON public.comments;
DROP TRIGGER IF EXISTS update_post_comments_count_trigger ON public.comments;

CREATE TRIGGER trg_update_post_comments_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_post_comments_count();

-- ============================================================================
-- 16. ADD REALTIME FOR REPOSTS
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'reposts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reposts;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL; -- Publication doesn't exist, skip
END $$;

-- ============================================================================
-- 17. CLEANUP - Update existing likes_count to reactions_count naming
-- Note: Keeping likes_count as the column name for backward compatibility
-- but it now represents total reactions count
-- ============================================================================

-- Ensure all existing post_likes have correct reaction_type
UPDATE public.post_likes 
SET reaction_type = 'like' 
WHERE reaction_type IS NULL OR reaction_type = '';

COMMIT;
