-- ============================================================================
-- 069_search_rpc_per_entity_limits.sql - Add per-entity limits to prevent noisy table dominance
-- 
-- Issue addressed:
--   Without per-entity limits, one noisy table (e.g., posts) can dominate results
--   making relevance scores meaningless at scale.
-- 
-- Solution:
--   Add per-entity limits before UNION, then apply final sort/limit.
--   This ensures balanced representation across all entity types.
-- ============================================================================

BEGIN;

-- Drop existing function to update signature
DROP FUNCTION IF EXISTS public.search_all(TEXT, JSONB, INTEGER, INTEGER);

-- Create improved search RPC with per-entity limits
CREATE OR REPLACE FUNCTION public.search_all(
  p_query TEXT,
  p_filters JSONB DEFAULT '{}'::jsonb,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  result_type public.search_result_type,
  title TEXT,
  content TEXT,
  image_url TEXT,
  metadata JSONB,
  relevance_score INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_domain TEXT;
  v_query TEXT;
  v_batch TEXT;
  v_department TEXT;
  v_date_from DATE;
  v_date_to DATE;
  -- Per-entity limit to prevent any single table from dominating results
  -- Formula: (limit * 2.5) ensures enough candidates for final sort while preventing runaway queries
  v_per_entity_limit INTEGER;
BEGIN
  v_query := COALESCE(TRIM(p_query), '');
  v_per_entity_limit := GREATEST(p_limit, 20) * 2.5;

  SELECT college_domain INTO v_user_domain
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_user_domain IS NULL THEN
    RETURN;
  END IF;

  v_batch := NULLIF(p_filters->>'batch', '');
  v_department := NULLIF(p_filters->>'department', '');
  v_date_from := NULLIF(p_filters->>'date_from', '')::date;
  v_date_to := NULLIF(p_filters->>'date_to', '')::date;

  -- Early return if no search criteria provided
  IF v_query = '' AND v_batch IS NULL AND v_department IS NULL AND v_date_from IS NULL AND v_date_to IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT *
  FROM (
    -- Profiles (with per-entity limit)
    SELECT * FROM (
      SELECT
        p.id,
        'profile'::public.search_result_type AS result_type,
        COALESCE(p.full_name, 'Unknown User') AS title,
        COALESCE(p.headline, p.bio, '') AS content,
        p.avatar_url AS image_url,
        jsonb_build_object(
          'role', p.role,
          'branch', p.branch,
          'university', p.university,
          'year_of_completion', p.year_of_completion,
          'is_verified', p.is_verified
        ) AS metadata,
        CASE
          WHEN v_query = '' THEN 0
          WHEN p.full_name ILIKE '%' || v_query || '%' THEN 100
          WHEN p.headline ILIKE '%' || v_query || '%' THEN 80
          WHEN p.bio ILIKE '%' || v_query || '%' THEN 70
          WHEN p.skills::TEXT ILIKE '%' || v_query || '%' THEN 60
          ELSE 40
        END AS relevance_score,
        p.created_at
      FROM public.profiles p
      WHERE p.college_domain = v_user_domain
        AND (v_batch IS NULL OR p.year_of_completion::TEXT = v_batch)
        AND (v_department IS NULL OR p.branch = v_department)
        AND (
          v_query = '' OR
          p.full_name ILIKE '%' || v_query || '%' OR
          p.headline ILIKE '%' || v_query || '%' OR
          p.bio ILIKE '%' || v_query || '%' OR
          p.skills::TEXT ILIKE '%' || v_query || '%'
        )
      ORDER BY 
        CASE
          WHEN v_query = '' THEN 0
          WHEN p.full_name ILIKE '%' || v_query || '%' THEN 100
          WHEN p.headline ILIKE '%' || v_query || '%' THEN 80
          WHEN p.bio ILIKE '%' || v_query || '%' THEN 70
          WHEN p.skills::TEXT ILIKE '%' || v_query || '%' THEN 60
          ELSE 40
        END DESC,
        p.created_at DESC
      LIMIT v_per_entity_limit
    ) profiles_limited

    UNION ALL

    -- Posts (with per-entity limit)
    SELECT * FROM (
      SELECT
        po.id,
        'post'::public.search_result_type AS result_type,
        LEFT(po.content, 120) AS title,
        po.content AS content,
        po.images[1] AS image_url,
        jsonb_build_object(
          'author_name', pr.full_name,
          'author_avatar', pr.avatar_url,
          'likes_count', po.likes_count,
          'comments_count', po.comments_count,
          'shares_count', po.shares_count
        ) AS metadata,
        CASE
          WHEN v_query = '' THEN 0
          WHEN po.content ILIKE '%' || v_query || '%' THEN 90
          ELSE 50
        END AS relevance_score,
        po.created_at
      FROM public.posts po
      LEFT JOIN public.profiles pr ON pr.id = po.user_id
      WHERE po.college_domain = v_user_domain
        AND (
          v_query = '' OR
          po.content ILIKE '%' || v_query || '%'
        )
        AND (v_date_from IS NULL OR po.created_at::DATE >= v_date_from)
        AND (v_date_to IS NULL OR po.created_at::DATE <= v_date_to)
      ORDER BY
        CASE
          WHEN v_query = '' THEN 0
          WHEN po.content ILIKE '%' || v_query || '%' THEN 90
          ELSE 50
        END DESC,
        po.created_at DESC
      LIMIT v_per_entity_limit
    ) posts_limited

    UNION ALL

    -- Clubs (with per-entity limit)
    SELECT * FROM (
      SELECT
        c.id,
        'club'::public.search_result_type AS result_type,
        c.name AS title,
        COALESCE(c.description, '') AS content,
        c.logo_url AS image_url,
        jsonb_build_object(
          'club_type', c.club_type,
          'member_count', c.member_count,
          'category', c.category
        ) AS metadata,
        CASE
          WHEN v_query = '' THEN 0
          WHEN c.name ILIKE '%' || v_query || '%' THEN 90
          WHEN c.description ILIKE '%' || v_query || '%' THEN 70
          WHEN c.category ILIKE '%' || v_query || '%' THEN 60
          ELSE 40
        END AS relevance_score,
        c.created_at
      FROM public.clubs c
      WHERE c.is_active = TRUE
        AND c.college_domain = v_user_domain
        AND (
          v_query = '' OR
          c.name ILIKE '%' || v_query || '%' OR
          c.description ILIKE '%' || v_query || '%' OR
          c.category ILIKE '%' || v_query || '%'
        )
        AND (v_date_from IS NULL OR c.created_at::DATE >= v_date_from)
        AND (v_date_to IS NULL OR c.created_at::DATE <= v_date_to)
      ORDER BY
        CASE
          WHEN v_query = '' THEN 0
          WHEN c.name ILIKE '%' || v_query || '%' THEN 90
          WHEN c.description ILIKE '%' || v_query || '%' THEN 70
          WHEN c.category ILIKE '%' || v_query || '%' THEN 60
          ELSE 40
        END DESC,
        c.created_at DESC
      LIMIT v_per_entity_limit
    ) clubs_limited

    UNION ALL

    -- Events (with per-entity limit + upcoming boost)
    SELECT * FROM (
      SELECT
        e.id,
        'event'::public.search_result_type AS result_type,
        e.title AS title,
        COALESCE(e.description, '') AS content,
        e.cover_image_url AS image_url,
        jsonb_build_object(
          'event_date', e.event_date,
          'location', e.location,
          'is_virtual', e.is_virtual,
          'event_type', CASE WHEN e.tags IS NULL THEN NULL ELSE e.tags[1] END,
          'current_attendees', (
            SELECT COUNT(*)
            FROM public.event_registrations er
            WHERE er.event_id = e.id
          ),
          'start_time', e.event_time
        ) AS metadata,
        -- Relevance score with bonus for upcoming events
        CASE
          WHEN v_query = '' THEN 0
          WHEN e.title ILIKE '%' || v_query || '%' THEN 90
          WHEN e.description ILIKE '%' || v_query || '%' THEN 70
          WHEN e.location ILIKE '%' || v_query || '%' THEN 60
          ELSE 40
        END + 
        -- Add 10 points for events in next 30 days
        CASE 
          WHEN e.event_date IS NOT NULL 
            AND e.event_date >= CURRENT_DATE 
            AND e.event_date <= CURRENT_DATE + INTERVAL '30 days' 
          THEN 10 
          ELSE 0 
        END AS relevance_score,
        e.created_at
      FROM public.events e
      WHERE e.college_domain = v_user_domain
        AND (
          v_query = '' OR
          e.title ILIKE '%' || v_query || '%' OR
          e.description ILIKE '%' || v_query || '%' OR
          e.location ILIKE '%' || v_query || '%'
        )
        AND (v_date_from IS NULL OR e.created_at::DATE >= v_date_from)
        AND (v_date_to IS NULL OR e.created_at::DATE <= v_date_to)
      ORDER BY
        CASE
          WHEN v_query = '' THEN 0
          WHEN e.title ILIKE '%' || v_query || '%' THEN 90
          WHEN e.description ILIKE '%' || v_query || '%' THEN 70
          WHEN e.location ILIKE '%' || v_query || '%' THEN 60
          ELSE 40
        END + 
        CASE 
          WHEN e.event_date IS NOT NULL 
            AND e.event_date >= CURRENT_DATE 
            AND e.event_date <= CURRENT_DATE + INTERVAL '30 days' 
          THEN 10 
          ELSE 0 
        END DESC,
        e.created_at DESC
      LIMIT v_per_entity_limit
    ) events_limited
  ) AS combined
  ORDER BY relevance_score DESC, created_at DESC
  LIMIT p_limit OFFSET p_offset;

END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.search_all(TEXT, JSONB, INTEGER, INTEGER) TO authenticated;

-- Add comment documenting the function
COMMENT ON FUNCTION public.search_all IS 
'Unified search RPC with per-entity limits.
 
Searches across profiles, posts, clubs, and events within the user''s college domain.
Uses relevance scoring with:
- Title/name matches: 90-100
- Headline/description: 70-80
- Content/bio: 60-70
- Other fields: 40-60
- Upcoming events bonus: +10

Per-entity limits prevent any single noisy table from dominating results.
Filters: batch (year_of_completion), department (branch), date_from, date_to.';

COMMIT;
