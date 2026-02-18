-- Create unified search RPC function with college domain isolation
BEGIN;

-- Enable pg_trgm extension for trigram-based text search
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Create search result type
DO $$ BEGIN
  CREATE TYPE public.search_result_type AS ENUM ('profile', 'post', 'club', 'event');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Unified search function that searches across multiple tables
-- Returns results filtered by college_domain for security
CREATE OR REPLACE FUNCTION public.search_all(
  p_query text,
  p_filters jsonb DEFAULT '{}',
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  result_type public.search_result_type,
  title text,
  content text,
  image_url text,
  metadata jsonb,
  relevance_score integer,
  created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_domain text;
  v_batch_filter text;
  v_department_filter text;
  v_date_from date;
  v_date_to date;
BEGIN
  -- Get current user's college domain
  SELECT college_domain INTO v_user_domain
  FROM public.profiles
  WHERE id = auth.uid();

  -- If no user domain found, return empty result
  IF v_user_domain IS NULL THEN
    RETURN;
  END IF;

  -- Extract filters from jsonb
  v_batch_filter := p_filters->>'batch';
  v_department_filter := p_filters->>'department';
  v_date_from := (p_filters->>'date_from')::date;
  v_date_to := (p_filters->>'date_to')::date;

  -- Search profiles (people)
  RETURN QUERY
  SELECT 
    p.id,
    'profile'::public.search_result_type,
    COALESCE(p.full_name, 'Unknown') as title,
    COALESCE(p.bio, '') as content,
    p.avatar_url as image_url,
    jsonb_build_object(
      'email', p.email,
      'role', p.role,
      'branch', p.branch,
      'year_of_completion', p.year_of_completion,
      'university', p.university,
      'is_verified', p.is_verified
    ) as metadata,
    CASE 
      WHEN p.full_name ILIKE '%' || p_query || '%' THEN 100
      WHEN p.bio ILIKE '%' || p_query || '%' THEN 75
      WHEN p.branch ILIKE '%' || p_query || '%' THEN 50
      WHEN p.university ILIKE '%' || p_query || '%' THEN 40
      ELSE 25
    END as relevance_score,
    p.created_at
  FROM public.profiles p
  WHERE p.college_domain = v_user_domain
    AND (
      p_query = '' OR
      p.full_name ILIKE '%' || p_query || '%' OR
      p.bio ILIKE '%' || p_query || '%' OR
      p.branch ILIKE '%' || p_query || '%' OR
      p.university ILIKE '%' || p_query || '%' OR
      p.year_of_completion ILIKE '%' || p_query || '%'
    )
    AND (v_batch_filter IS NULL OR p.year_of_completion = v_batch_filter)
    AND (v_department_filter IS NULL OR p.branch = v_department_filter);

  -- Search posts
  RETURN QUERY
  SELECT 
    po.id,
    'post'::public.search_result_type,
    COALESCE(pr.full_name, 'Unknown User') as title,
    COALESCE(po.content, '') as content,
    CASE 
      WHEN array_length(po.images, 1) > 0 THEN po.images[1]
      ELSE pr.avatar_url
    END as image_url,
    jsonb_build_object(
      'author_name', pr.full_name,
      'author_avatar', pr.avatar_url,
      'author_id', po.user_id,
      'likes_count', po.likes_count,
      'comments_count', po.comments_count,
      'shares_count', po.shares_count
    ) as metadata,
    CASE 
      WHEN po.content ILIKE '%' || p_query || '%' THEN 90
      ELSE 30
    END as relevance_score,
    po.created_at
  FROM public.posts po
  INNER JOIN public.profiles pr ON pr.id = po.user_id
  WHERE pr.college_domain = v_user_domain
    AND (p_query = '' OR po.content ILIKE '%' || p_query || '%');

  -- Search clubs
  RETURN QUERY
  SELECT 
    cp.id,
    'club'::public.search_result_type,
    COALESCE(pr.full_name, 'Unknown Club') as title,
    COALESCE(pr.bio, '') as content,
    pr.avatar_url as image_url,
    jsonb_build_object(
      'club_type', cp.club_type,
      'member_count', cp.member_count,
      'founded_date', cp.founded_date,
      'registration_number', cp.registration_number
    ) as metadata,
    CASE 
      WHEN pr.full_name ILIKE '%' || p_query || '%' THEN 95
      WHEN pr.bio ILIKE '%' || p_query || '%' THEN 70
      WHEN cp.club_type ILIKE '%' || p_query || '%' THEN 60
      ELSE 35
    END as relevance_score,
    pr.created_at
  FROM public.club_profiles cp
  INNER JOIN public.profiles pr ON pr.id = cp.user_id
  WHERE pr.college_domain = v_user_domain
    AND (
      p_query = '' OR
      pr.full_name ILIKE '%' || p_query || '%' OR
      pr.bio ILIKE '%' || p_query || '%' OR
      cp.club_type ILIKE '%' || p_query || '%'
    );

  -- Search events
  RETURN QUERY
  SELECT 
    e.id,
    'event'::public.search_result_type,
    COALESCE(e.title, 'Untitled Event') as title,
    COALESCE(e.description, '') as content,
    e.banner_url as image_url,
    jsonb_build_object(
      'event_type', e.event_type,
      'location', e.location,
      'event_date', e.event_date,
      'start_time', e.start_time,
      'end_time', e.end_time,
      'creator_name', pr.full_name,
      'is_virtual', e.is_virtual,
      'max_attendees', e.max_attendees,
      'current_attendees', e.current_attendees
    ) as metadata,
    CASE 
      WHEN e.title ILIKE '%' || p_query || '%' THEN 100
      WHEN e.description ILIKE '%' || p_query || '%' THEN 80
      WHEN e.event_type ILIKE '%' || p_query || '%' THEN 60
      WHEN e.location ILIKE '%' || p_query || '%' THEN 50
      ELSE 30
    END as relevance_score,
    e.created_at
  FROM public.events e
  LEFT JOIN public.profiles pr ON pr.id = e.creator_id
  WHERE e.college_domain = v_user_domain
    AND (
      p_query = '' OR
      e.title ILIKE '%' || p_query || '%' OR
      e.description ILIKE '%' || p_query || '%' OR
      e.event_type ILIKE '%' || p_query || '%' OR
      e.location ILIKE '%' || p_query || '%'
    )
    AND (v_date_from IS NULL OR e.event_date >= v_date_from)
    AND (v_date_to IS NULL OR e.event_date <= v_date_to)
  ORDER BY relevance_score DESC, created_at DESC
  LIMIT p_limit
  OFFSET p_offset;

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.search_all TO authenticated;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS profiles_full_name_trgm_idx ON public.profiles USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_bio_trgm_idx ON public.profiles USING gin (bio gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_branch_idx ON public.profiles(branch);
CREATE INDEX IF NOT EXISTS profiles_year_completion_idx ON public.profiles(year_of_completion);
CREATE INDEX IF NOT EXISTS profiles_college_domain_idx ON public.profiles(college_domain);

CREATE INDEX IF NOT EXISTS posts_content_trgm_idx ON public.posts USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS posts_user_college_domain_idx ON public.posts(user_id);

CREATE INDEX IF NOT EXISTS events_title_trgm_idx ON public.events USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS events_description_trgm_idx ON public.events USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS events_date_idx ON public.events(event_date);
CREATE INDEX IF NOT EXISTS events_college_domain_idx ON public.events(college_domain);

-- Enable pg_trgm extension for better text search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

COMMIT;
