-- ============================================================================
-- 068_search_all_rpc_fix.sql - Unified search RPC aligned with UI filters
-- ============================================================================

BEGIN;

-- Ensure enum exists and includes required values for UI
DO $$ BEGIN
  CREATE TYPE public.search_result_type AS ENUM ('profile', 'post', 'club', 'event');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE public.search_result_type ADD VALUE IF NOT EXISTS 'profile';
ALTER TYPE public.search_result_type ADD VALUE IF NOT EXISTS 'post';
ALTER TYPE public.search_result_type ADD VALUE IF NOT EXISTS 'club';
ALTER TYPE public.search_result_type ADD VALUE IF NOT EXISTS 'event';

-- Drop existing signature to allow return type changes
DROP FUNCTION IF EXISTS public.search_all(TEXT, JSONB, INTEGER, INTEGER);

-- Create or replace search RPC with filters + pagination
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
BEGIN
  v_query := COALESCE(TRIM(p_query), '');

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

  IF v_query = '' AND v_batch IS NULL AND v_department IS NULL AND v_date_from IS NULL AND v_date_to IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT *
  FROM (
    -- Profiles
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

    UNION ALL

    -- Posts
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

    UNION ALL

    -- Clubs
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

    UNION ALL

    -- Events
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
      CASE
        WHEN v_query = '' THEN 0
        WHEN e.title ILIKE '%' || v_query || '%' THEN 90
        WHEN e.description ILIKE '%' || v_query || '%' THEN 70
        WHEN e.location ILIKE '%' || v_query || '%' THEN 60
        ELSE 40
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
  ) AS combined
  ORDER BY relevance_score DESC, created_at DESC
  LIMIT p_limit OFFSET p_offset;

END;
$$;

COMMIT;
