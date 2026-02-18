-- ============================================================================
-- 056_statistics_tables.sql
-- Replace statistics views with tables for realtime support
-- ============================================================================

BEGIN;

-- ============================================================================
-- DOMAIN STATISTICS (table)
-- ============================================================================
DROP VIEW IF EXISTS public.domain_statistics CASCADE;

CREATE TABLE IF NOT EXISTS public.domain_statistics (
  domain text PRIMARY KEY,
  user_count bigint NOT NULL DEFAULT 0,
  verified_count bigint NOT NULL DEFAULT 0,
  student_count bigint NOT NULL DEFAULT 0,
  alumni_count bigint NOT NULL DEFAULT 0,
  faculty_count bigint NOT NULL DEFAULT 0,
  industry_count bigint NOT NULL DEFAULT 0,
  first_user_at timestamptz,
  last_user_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS domain_statistics_updated_at_idx
  ON public.domain_statistics(updated_at DESC);

ALTER TABLE public.domain_statistics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'domain_statistics'
      AND policyname = 'Authenticated can view domain statistics'
  ) THEN
    CREATE POLICY "Authenticated can view domain statistics"
      ON public.domain_statistics FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_domain_statistics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE public.domain_statistics;

  INSERT INTO public.domain_statistics (
    domain,
    user_count,
    verified_count,
    student_count,
    alumni_count,
    faculty_count,
    industry_count,
    first_user_at,
    last_user_at,
    updated_at
  )
  SELECT 
    LOWER(SUBSTRING(p.email FROM '@(.+)$')) AS domain,
    COUNT(*) AS user_count,
    COUNT(*) FILTER (WHERE p.is_verified = true) AS verified_count,
    COUNT(*) FILTER (WHERE p.role = 'Student') AS student_count,
    COUNT(*) FILTER (WHERE p.role = 'Alumni') AS alumni_count,
    COUNT(*) FILTER (WHERE p.role = 'Faculty') AS faculty_count,
    COUNT(*) FILTER (WHERE p.role = 'Organization') AS industry_count,
    MIN(p.created_at) AS first_user_at,
    MAX(p.created_at) AS last_user_at,
    NOW() AS updated_at
  FROM public.profiles p
  WHERE p.email IS NOT NULL
  GROUP BY LOWER(SUBSTRING(p.email FROM '@(.+)$'))
  ORDER BY user_count DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_domain_statistics_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_domain_statistics();
  RETURN NULL;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_domain_statistics_profiles') THEN
    CREATE TRIGGER trg_refresh_domain_statistics_profiles
      AFTER INSERT OR UPDATE OR DELETE ON public.profiles
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_domain_statistics_trigger();
  END IF;
END $$;

SELECT public.refresh_domain_statistics();

-- ============================================================================
-- PROFILE COMPLETION STATS (table)
-- ============================================================================
DROP VIEW IF EXISTS public.profile_completion_stats CASCADE;

CREATE TABLE IF NOT EXISTS public.profile_completion_stats (
  id uuid PRIMARY KEY,
  full_name text,
  role text,
  onboarding_complete boolean,
  completion_percentage integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_completion_stats_updated_at_idx
  ON public.profile_completion_stats(updated_at DESC);

ALTER TABLE public.profile_completion_stats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profile_completion_stats'
      AND policyname = 'Authenticated can view profile completion stats'
  ) THEN
    CREATE POLICY "Authenticated can view profile completion stats"
      ON public.profile_completion_stats FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_profile_completion_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE public.profile_completion_stats;

  INSERT INTO public.profile_completion_stats (
    id,
    full_name,
    role,
    onboarding_complete,
    completion_percentage,
    updated_at
  )
  SELECT 
    p.id,
    p.full_name,
    p.role,
    p.onboarding_complete,
    (
      CASE WHEN p.full_name IS NOT NULL THEN 10 ELSE 0 END +
      CASE WHEN p.avatar_url IS NOT NULL THEN 15 ELSE 0 END +
      CASE WHEN p.headline IS NOT NULL THEN 10 ELSE 0 END +
      CASE WHEN p.bio IS NOT NULL THEN 15 ELSE 0 END +
      CASE WHEN p.interests IS NOT NULL AND array_length(p.interests, 1) > 0 THEN 15 ELSE 0 END +
      CASE WHEN p.university IS NOT NULL THEN 10 ELSE 0 END +
      CASE WHEN p.location IS NOT NULL THEN 5 ELSE 0 END +
      CASE WHEN p.social_links IS NOT NULL AND (p.social_links->>'linkedin') IS NOT NULL THEN 5 ELSE 0 END +
      CASE WHEN p.social_links IS NOT NULL AND (p.social_links->>'github') IS NOT NULL THEN 5 ELSE 0 END +
      CASE WHEN p.social_links IS NOT NULL AND (p.social_links->>'website') IS NOT NULL THEN 5 ELSE 0 END +
      CASE WHEN p.major IS NOT NULL THEN 5 ELSE 0 END
    ) AS completion_percentage,
    NOW() AS updated_at
  FROM public.profiles p;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_profile_completion_stats_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_profile_completion_stats();
  RETURN NULL;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_profile_completion_stats_profiles') THEN
    CREATE TRIGGER trg_refresh_profile_completion_stats_profiles
      AFTER INSERT OR UPDATE OR DELETE ON public.profiles
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_profile_completion_stats_trigger();
  END IF;
END $$;

SELECT public.refresh_profile_completion_stats();

-- ============================================================================
-- USER ACTIVITY SUMMARY (table)
-- ============================================================================
DROP VIEW IF EXISTS public.user_activity_summary CASCADE;

CREATE TABLE IF NOT EXISTS public.user_activity_summary (
  user_id uuid PRIMARY KEY,
  full_name text,
  posts_count bigint NOT NULL DEFAULT 0,
  comments_count bigint NOT NULL DEFAULT 0,
  likes_given bigint NOT NULL DEFAULT 0,
  likes_received bigint NOT NULL DEFAULT 0,
  connections_count bigint NOT NULL DEFAULT 0,
  events_registered bigint NOT NULL DEFAULT 0,
  job_applications bigint NOT NULL DEFAULT 0,
  projects_joined bigint NOT NULL DEFAULT 0,
  last_active_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_activity_summary_updated_at_idx
  ON public.user_activity_summary(updated_at DESC);

ALTER TABLE public.user_activity_summary ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_activity_summary'
      AND policyname = 'Authenticated can view user activity summary'
  ) THEN
    CREATE POLICY "Authenticated can view user activity summary"
      ON public.user_activity_summary FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_user_activity_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE public.user_activity_summary;

  INSERT INTO public.user_activity_summary (
    user_id,
    full_name,
    posts_count,
    comments_count,
    likes_given,
    likes_received,
    connections_count,
    events_registered,
    job_applications,
    projects_joined,
    last_active_at,
    updated_at
  )
  SELECT 
    p.id AS user_id,
    p.full_name,
    (SELECT COUNT(*) FROM public.posts WHERE user_id = p.id) AS posts_count,
    (SELECT COUNT(*) FROM public.comments WHERE user_id = p.id) AS comments_count,
    (SELECT COUNT(*) FROM public.post_likes WHERE user_id = p.id) AS likes_given,
    (SELECT COUNT(*) FROM public.post_likes l JOIN public.posts po ON l.post_id = po.id WHERE po.user_id = p.id) AS likes_received,
    (SELECT COUNT(*) FROM public.connections WHERE (requester_id = p.id OR receiver_id = p.id) AND status = 'accepted') AS connections_count,
    (SELECT COUNT(*) FROM public.event_registrations WHERE user_id = p.id) AS events_registered,
    (SELECT COUNT(*) FROM public.job_applications WHERE user_id = p.id) AS job_applications,
    (SELECT COUNT(*) FROM public.collab_team_members WHERE user_id = p.id) AS projects_joined,
    p.last_seen AS last_active_at,
    NOW() AS updated_at
  FROM public.profiles p;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_user_activity_summary_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_user_activity_summary();
  RETURN NULL;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_user_activity_summary_profiles') THEN
    CREATE TRIGGER trg_refresh_user_activity_summary_profiles
      AFTER INSERT OR UPDATE OR DELETE ON public.profiles
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_user_activity_summary_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_user_activity_summary_posts') THEN
    CREATE TRIGGER trg_refresh_user_activity_summary_posts
      AFTER INSERT OR UPDATE OR DELETE ON public.posts
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_user_activity_summary_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_user_activity_summary_comments') THEN
    CREATE TRIGGER trg_refresh_user_activity_summary_comments
      AFTER INSERT OR UPDATE OR DELETE ON public.comments
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_user_activity_summary_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_user_activity_summary_post_likes') THEN
    CREATE TRIGGER trg_refresh_user_activity_summary_post_likes
      AFTER INSERT OR UPDATE OR DELETE ON public.post_likes
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_user_activity_summary_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_user_activity_summary_connections') THEN
    CREATE TRIGGER trg_refresh_user_activity_summary_connections
      AFTER INSERT OR UPDATE OR DELETE ON public.connections
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_user_activity_summary_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_user_activity_summary_event_registrations') THEN
    CREATE TRIGGER trg_refresh_user_activity_summary_event_registrations
      AFTER INSERT OR UPDATE OR DELETE ON public.event_registrations
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_user_activity_summary_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_user_activity_summary_job_applications') THEN
    CREATE TRIGGER trg_refresh_user_activity_summary_job_applications
      AFTER INSERT OR UPDATE OR DELETE ON public.job_applications
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_user_activity_summary_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_user_activity_summary_collab_team_members') THEN
    CREATE TRIGGER trg_refresh_user_activity_summary_collab_team_members
      AFTER INSERT OR UPDATE OR DELETE ON public.collab_team_members
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_user_activity_summary_trigger();
  END IF;
END $$;

SELECT public.refresh_user_activity_summary();

-- ============================================================================
-- PLATFORM STATS (table)
-- ============================================================================
DROP VIEW IF EXISTS public.platform_stats CASCADE;

CREATE TABLE IF NOT EXISTS public.platform_stats (
  id integer PRIMARY KEY DEFAULT 1,
  total_users bigint NOT NULL DEFAULT 0,
  verified_users bigint NOT NULL DEFAULT 0,
  new_users_last_week bigint NOT NULL DEFAULT 0,
  active_users_24h bigint NOT NULL DEFAULT 0,
  total_posts bigint NOT NULL DEFAULT 0,
  posts_last_24h bigint NOT NULL DEFAULT 0,
  upcoming_events bigint NOT NULL DEFAULT 0,
  active_jobs bigint NOT NULL DEFAULT 0,
  active_projects bigint NOT NULL DEFAULT 0,
  total_connections bigint NOT NULL DEFAULT 0,
  total_messages bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_stats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'platform_stats'
      AND policyname = 'Authenticated can view platform stats'
  ) THEN
    CREATE POLICY "Authenticated can view platform stats"
      ON public.platform_stats FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_platform_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.platform_stats (
    id,
    total_users,
    verified_users,
    new_users_last_week,
    active_users_24h,
    total_posts,
    posts_last_24h,
    upcoming_events,
    active_jobs,
    active_projects,
    total_connections,
    total_messages,
    updated_at
  )
  SELECT
    1,
    (SELECT COUNT(*) FROM public.profiles),
    (SELECT COUNT(*) FROM public.profiles WHERE is_verified = true),
    (SELECT COUNT(*) FROM public.profiles WHERE created_at > NOW() - INTERVAL '7 days'),
    (SELECT COUNT(*) FROM public.profiles WHERE last_seen > NOW() - INTERVAL '24 hours'),
    (SELECT COUNT(*) FROM public.posts),
    (SELECT COUNT(*) FROM public.posts WHERE created_at > NOW() - INTERVAL '24 hours'),
    (SELECT COUNT(*) FROM public.events WHERE event_date > NOW()),
    (SELECT COUNT(*) FROM public.jobs WHERE is_active = true),
    (SELECT COUNT(*) FROM public.collab_projects WHERE status = 'active'),
    (SELECT COUNT(*) FROM public.connections WHERE status = 'accepted'),
    (SELECT COUNT(*) FROM public.messages),
    NOW()
  ON CONFLICT (id) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    verified_users = EXCLUDED.verified_users,
    new_users_last_week = EXCLUDED.new_users_last_week,
    active_users_24h = EXCLUDED.active_users_24h,
    total_posts = EXCLUDED.total_posts,
    posts_last_24h = EXCLUDED.posts_last_24h,
    upcoming_events = EXCLUDED.upcoming_events,
    active_jobs = EXCLUDED.active_jobs,
    active_projects = EXCLUDED.active_projects,
    total_connections = EXCLUDED.total_connections,
    total_messages = EXCLUDED.total_messages,
    updated_at = EXCLUDED.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_platform_stats_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_platform_stats();
  RETURN NULL;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_platform_stats_profiles') THEN
    CREATE TRIGGER trg_refresh_platform_stats_profiles
      AFTER INSERT OR UPDATE OR DELETE ON public.profiles
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_platform_stats_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_platform_stats_posts') THEN
    CREATE TRIGGER trg_refresh_platform_stats_posts
      AFTER INSERT OR UPDATE OR DELETE ON public.posts
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_platform_stats_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_platform_stats_events') THEN
    CREATE TRIGGER trg_refresh_platform_stats_events
      AFTER INSERT OR UPDATE OR DELETE ON public.events
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_platform_stats_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_platform_stats_jobs') THEN
    CREATE TRIGGER trg_refresh_platform_stats_jobs
      AFTER INSERT OR UPDATE OR DELETE ON public.jobs
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_platform_stats_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_platform_stats_projects') THEN
    CREATE TRIGGER trg_refresh_platform_stats_projects
      AFTER INSERT OR UPDATE OR DELETE ON public.collab_projects
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_platform_stats_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_platform_stats_connections') THEN
    CREATE TRIGGER trg_refresh_platform_stats_connections
      AFTER INSERT OR UPDATE OR DELETE ON public.connections
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_platform_stats_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_platform_stats_messages') THEN
    CREATE TRIGGER trg_refresh_platform_stats_messages
      AFTER INSERT OR UPDATE OR DELETE ON public.messages
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_platform_stats_trigger();
  END IF;
END $$;

SELECT public.refresh_platform_stats();

-- ============================================================================
-- REALTIME
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.domain_statistics;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_completion_stats;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity_summary;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_stats;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

COMMIT;
