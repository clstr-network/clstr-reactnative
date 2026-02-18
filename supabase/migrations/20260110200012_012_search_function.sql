-- ============================================================================
-- 012_search_function.sql - Global Search RPC Function
-- U-Hub Platform Database Baseline
-- ============================================================================

BEGIN;

-- ============================================================================
-- SEARCH RESULT TYPE (ensure exists)
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE public.search_result_type AS ENUM ('user', 'post', 'event', 'job', 'club', 'project');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- GLOBAL SEARCH FUNCTION
-- Unified search across profiles, posts, events, jobs, clubs, and projects
-- ============================================================================
CREATE OR REPLACE FUNCTION public.search_all(
  search_query TEXT,
  result_types TEXT[] DEFAULT NULL,
  max_results INTEGER DEFAULT 20
)
RETURNS TABLE (
  result_type public.search_result_type,
  id UUID,
  title TEXT,
  subtitle TEXT,
  image_url TEXT,
  relevance REAL,
  created_at TIMESTAMPTZ,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_query TEXT;
  tsquery_value TSQUERY;
BEGIN
  -- Normalize the search query
  normalized_query := LOWER(TRIM(search_query));
  
  -- Create tsquery for full-text search
  tsquery_value := plainto_tsquery('english', normalized_query);
  
  RETURN QUERY
  WITH all_results AS (
    -- Search Profiles
    SELECT
      'user'::public.search_result_type AS result_type,
      p.id,
      COALESCE(p.full_name, 'Anonymous User') AS title,
      p.headline AS subtitle,
      p.avatar_url AS image_url,
      (
        CASE 
          WHEN p.full_name ILIKE '%' || normalized_query || '%' THEN 1.0
          WHEN p.headline ILIKE '%' || normalized_query || '%' THEN 0.8
          WHEN p.bio ILIKE '%' || normalized_query || '%' THEN 0.6
          ELSE 0.4
        END
      )::REAL AS relevance,
      p.created_at,
      jsonb_build_object(
        'role', p.role,
        'is_verified', p.is_verified,
        'university', p.university
      ) AS metadata
    FROM public.profiles p
    WHERE 
      (result_types IS NULL OR 'user' = ANY(result_types))
      AND (
        p.full_name ILIKE '%' || normalized_query || '%'
        OR p.headline ILIKE '%' || normalized_query || '%'
        OR p.bio ILIKE '%' || normalized_query || '%'
        OR p.skills::TEXT ILIKE '%' || normalized_query || '%'
      )
    
    UNION ALL
    
    -- Search Posts
    SELECT
      'post'::public.search_result_type AS result_type,
      po.id,
      LEFT(po.content, 100) AS title,
      (SELECT full_name FROM public.profiles WHERE id = po.user_id) AS subtitle,
      po.media_urls[1] AS image_url,
      (
        CASE 
          WHEN po.content ILIKE '%' || normalized_query || '%' THEN 0.9
          ELSE 0.5
        END
      )::REAL AS relevance,
      po.created_at,
      jsonb_build_object(
        'likes_count', po.likes_count,
        'comments_count', po.comments_count,
        'user_id', po.user_id
      ) AS metadata
    FROM public.posts po
    WHERE 
      (result_types IS NULL OR 'post' = ANY(result_types))
      AND po.content ILIKE '%' || normalized_query || '%'
    
    UNION ALL
    
    -- Search Events
    SELECT
      'event'::public.search_result_type AS result_type,
      e.id,
      e.title,
      e.location AS subtitle,
      e.image_url,
      (
        CASE 
          WHEN e.title ILIKE '%' || normalized_query || '%' THEN 1.0
          WHEN e.description ILIKE '%' || normalized_query || '%' THEN 0.7
          ELSE 0.5
        END
      )::REAL AS relevance,
      e.created_at,
      jsonb_build_object(
        'event_date', e.event_date,
        'event_type', e.event_type,
        'is_online', e.is_online,
        'organizer_id', e.organizer_id
      ) AS metadata
    FROM public.events e
    WHERE 
      (result_types IS NULL OR 'event' = ANY(result_types))
      AND e.is_published = true
      AND (
        e.title ILIKE '%' || normalized_query || '%'
        OR e.description ILIKE '%' || normalized_query || '%'
        OR e.location ILIKE '%' || normalized_query || '%'
      )
    
    UNION ALL
    
    -- Search Jobs
    SELECT
      'job'::public.search_result_type AS result_type,
      j.id,
      j.title,
      j.company AS subtitle,
      NULL::TEXT AS image_url,
      (
        CASE 
          WHEN j.title ILIKE '%' || normalized_query || '%' THEN 1.0
          WHEN j.company ILIKE '%' || normalized_query || '%' THEN 0.8
          WHEN j.description ILIKE '%' || normalized_query || '%' THEN 0.6
          ELSE 0.4
        END
      )::REAL AS relevance,
      j.created_at,
      jsonb_build_object(
        'job_type', j.job_type,
        'location', j.location,
        'salary_range', j.salary_range,
        'is_remote', j.is_remote
      ) AS metadata
    FROM public.jobs j
    WHERE 
      (result_types IS NULL OR 'job' = ANY(result_types))
      AND j.is_active = true
      AND (
        j.title ILIKE '%' || normalized_query || '%'
        OR j.company ILIKE '%' || normalized_query || '%'
        OR j.description ILIKE '%' || normalized_query || '%'
        OR j.requirements::TEXT ILIKE '%' || normalized_query || '%'
      )
    
    UNION ALL
    
    -- Search Clubs
    SELECT
      'club'::public.search_result_type AS result_type,
      c.id,
      c.name AS title,
      c.category AS subtitle,
      c.image_url,
      (
        CASE 
          WHEN c.name ILIKE '%' || normalized_query || '%' THEN 1.0
          WHEN c.description ILIKE '%' || normalized_query || '%' THEN 0.7
          ELSE 0.5
        END
      )::REAL AS relevance,
      c.created_at,
      jsonb_build_object(
        'category', c.category,
        'member_count', c.member_count,
        'university', c.university
      ) AS metadata
    FROM public.clubs c
    WHERE 
      (result_types IS NULL OR 'club' = ANY(result_types))
      AND c.is_active = true
      AND (
        c.name ILIKE '%' || normalized_query || '%'
        OR c.description ILIKE '%' || normalized_query || '%'
        OR c.category ILIKE '%' || normalized_query || '%'
      )
    
    UNION ALL
    
    -- Search Projects
    SELECT
      'project'::public.search_result_type AS result_type,
      cp.id,
      cp.title,
      cp.category AS subtitle,
      cp.image_url,
      (
        CASE 
          WHEN cp.title ILIKE '%' || normalized_query || '%' THEN 1.0
          WHEN cp.description ILIKE '%' || normalized_query || '%' THEN 0.7
          ELSE 0.5
        END
      )::REAL AS relevance,
      cp.created_at,
      jsonb_build_object(
        'category', cp.category,
        'status', cp.status,
        'visibility', cp.visibility,
        'owner_id', cp.owner_id,
        'team_size', cp.team_size
      ) AS metadata
    FROM public.collab_projects cp
    WHERE 
      (result_types IS NULL OR 'project' = ANY(result_types))
      AND cp.visibility = 'public'
      AND (
        cp.title ILIKE '%' || normalized_query || '%'
        OR cp.description ILIKE '%' || normalized_query || '%'
        OR cp.required_skills::TEXT ILIKE '%' || normalized_query || '%'
      )
  )
  SELECT 
    ar.result_type,
    ar.id,
    ar.title,
    ar.subtitle,
    ar.image_url,
    ar.relevance,
    ar.created_at,
    ar.metadata
  FROM all_results ar
  ORDER BY ar.relevance DESC, ar.created_at DESC
  LIMIT max_results;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.search_all(TEXT, TEXT[], INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_all(TEXT, TEXT[], INTEGER) TO anon;

COMMIT;
