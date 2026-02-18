-- Replace search_all RPC with schema-aligned version (profiles, posts, clubs, events)
BEGIN;

DO $$
BEGIN
  CREATE TYPE public.search_result_type AS ENUM ('profile', 'post', 'club', 'event');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Drop older signatures to avoid confusion
DROP FUNCTION IF EXISTS public.search_all(TEXT, TEXT[], INTEGER);
DROP FUNCTION IF EXISTS public.search_all(TEXT, JSONB, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.search_all(TEXT, JSON, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.search_all(
  p_query   TEXT,
  p_filters JSONB DEFAULT '{}'::jsonb,
  p_limit   INTEGER DEFAULT 20,
  p_offset  INTEGER DEFAULT 0
)
RETURNS TABLE (
  result_type    public.search_result_type,
  id             UUID,
  title          TEXT,
  content        TEXT,
  image_url      TEXT,
  metadata       JSONB,
  relevance_score REAL,
  created_at     TIMESTAMPTZ
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
WITH ctx AS (
  SELECT
    auth.uid() AS user_id,
    (SELECT college_domain FROM public.profiles WHERE id = auth.uid()) AS college_domain
),
filters AS (
  SELECT
    COALESCE(NULLIF(TRIM(p_query), ''), '') AS normalized_query,
    NULLIF(p_filters->>'batch', '') AS batch,
    NULLIF(p_filters->>'department', '') AS department,
    NULLIF(p_filters->>'date_from', '')::timestamptz AS date_from,
    NULLIF(p_filters->>'date_to', '')::timestamptz AS date_to
),
results AS (
  -- Profiles
  SELECT
    'profile'::public.search_result_type AS result_type,
    p.id,
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
    1.0::REAL AS relevance_score,
    p.created_at
  FROM public.profiles p, ctx, filters f
  WHERE
    (f.normalized_query = ''
      OR p.full_name ILIKE '%' || f.normalized_query || '%'
      OR p.headline ILIKE '%' || f.normalized_query || '%'
      OR p.bio ILIKE '%' || f.normalized_query || '%'
    )
    AND (f.batch IS NULL OR p.year_of_completion::TEXT = f.batch)
    AND (f.department IS NULL OR p.branch = f.department)
    AND (ctx.college_domain IS NULL OR p.college_domain IS NULL OR p.college_domain = ctx.college_domain)

  UNION ALL

  -- Posts
  SELECT
    'post'::public.search_result_type AS result_type,
    po.id,
    LEFT(po.content, 120) AS title,
    po.content AS content,
    COALESCE(po.images[1], NULL) AS image_url,
    jsonb_build_object(
      'author_name', prof.full_name,
      'author_avatar', prof.avatar_url,
      'likes_count', po.likes_count,
      'comments_count', po.comments_count,
      'shares_count', po.shares_count
    ) AS metadata,
    CASE
      WHEN f.normalized_query = '' THEN 0.5
      WHEN po.content ILIKE '%' || f.normalized_query || '%' THEN 1.0
      ELSE 0.6
    END::REAL AS relevance_score,
    po.created_at
  FROM public.posts po
  LEFT JOIN public.profiles prof ON prof.id = po.user_id,
  ctx,
  filters f
  WHERE
    (f.normalized_query = '' OR po.content ILIKE '%' || f.normalized_query || '%')
    AND (f.date_from IS NULL OR po.created_at >= f.date_from)
    AND (f.date_to IS NULL OR po.created_at <= f.date_to)
    AND (ctx.college_domain IS NULL OR po.college_domain IS NULL OR po.college_domain = ctx.college_domain)

  UNION ALL

  -- Clubs
  SELECT
    'club'::public.search_result_type AS result_type,
    c.id,
    c.name AS title,
    COALESCE(c.description, '') AS content,
    NULL::TEXT AS image_url,
    '{}'::jsonb AS metadata,
    CASE
      WHEN f.normalized_query = '' THEN 0.5
      WHEN c.name ILIKE '%' || f.normalized_query || '%' THEN 1.0
      WHEN c.description ILIKE '%' || f.normalized_query || '%' THEN 0.7
      ELSE 0.6
    END::REAL AS relevance_score,
    c.created_at
  FROM public.clubs c, ctx, filters f
  WHERE
    c.is_active = TRUE
    AND (f.normalized_query = ''
      OR c.name ILIKE '%' || f.normalized_query || '%'
      OR c.description ILIKE '%' || f.normalized_query || '%')
    AND (f.date_from IS NULL OR c.created_at >= f.date_from)
    AND (f.date_to IS NULL OR c.created_at <= f.date_to)
    AND (ctx.college_domain IS NULL OR c.college_domain IS NULL OR c.college_domain = ctx.college_domain)

  UNION ALL

  -- Events
  SELECT
    'event'::public.search_result_type AS result_type,
    e.id,
    e.title,
    COALESCE(e.description, '') AS content,
    NULL::TEXT AS image_url,
    jsonb_build_object(
      'event_date', e.event_date,
      'location', e.location,
      'is_virtual', e.is_virtual,
      'category', e.category
    ) AS metadata,
    CASE
      WHEN f.normalized_query = '' THEN 0.5
      WHEN e.title ILIKE '%' || f.normalized_query || '%' THEN 1.0
      WHEN e.description ILIKE '%' || f.normalized_query || '%' THEN 0.7
      ELSE 0.6
    END::REAL AS relevance_score,
    COALESCE(e.created_at, e.event_date::timestamptz)
  FROM public.events e, ctx, filters f
  WHERE
    (f.normalized_query = ''
      OR e.title ILIKE '%' || f.normalized_query || '%'
      OR e.description ILIKE '%' || f.normalized_query || '%'
      OR e.location ILIKE '%' || f.normalized_query || '%'
      OR e.category ILIKE '%' || f.normalized_query || '%'
    )
    AND (f.date_from IS NULL OR COALESCE(e.created_at, e.event_date::timestamptz) >= f.date_from)
    AND (f.date_to IS NULL OR COALESCE(e.created_at, e.event_date::timestamptz) <= f.date_to)
    AND (ctx.college_domain IS NULL OR e.college_domain IS NULL OR e.college_domain = ctx.college_domain)
)
SELECT
  result_type,
  id,
  title,
  content,
  image_url,
  metadata,
  relevance_score,
  created_at
FROM results
ORDER BY relevance_score DESC, created_at DESC NULLS LAST
OFFSET p_offset
LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_all(TEXT, JSONB, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_all(TEXT, JSONB, INTEGER, INTEGER) TO anon;

COMMIT;
