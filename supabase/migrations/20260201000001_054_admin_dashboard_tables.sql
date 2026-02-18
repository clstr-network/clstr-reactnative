-- ============================================================================
-- 054_admin_dashboard_tables.sql
-- Replace select admin dashboard views with tables for realtime support
-- ============================================================================

BEGIN;

-- ============================================================================
-- ADMIN DASHBOARD KPIS (table)
-- ============================================================================
DROP VIEW IF EXISTS public.admin_dashboard_kpis;

CREATE TABLE IF NOT EXISTS public.admin_dashboard_kpis (
  id integer PRIMARY KEY DEFAULT 1,
  total_users bigint NOT NULL DEFAULT 0,
  active_users_7d bigint NOT NULL DEFAULT 0,
  active_users_30d bigint NOT NULL DEFAULT 0,
  total_students bigint NOT NULL DEFAULT 0,
  total_alumni bigint NOT NULL DEFAULT 0,
  total_faculty bigint NOT NULL DEFAULT 0,
  total_clubs bigint NOT NULL DEFAULT 0,
  verified_clubs bigint NOT NULL DEFAULT 0,
  total_colleges bigint NOT NULL DEFAULT 0,
  total_posts bigint NOT NULL DEFAULT 0,
  posts_this_week bigint NOT NULL DEFAULT 0,
  total_events bigint NOT NULL DEFAULT 0,
  upcoming_events bigint NOT NULL DEFAULT 0,
  total_projects bigint NOT NULL DEFAULT 0,
  active_projects bigint NOT NULL DEFAULT 0,
  total_connections bigint NOT NULL DEFAULT 0,
  total_recruiters bigint NOT NULL DEFAULT 0,
  active_recruiters bigint NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_dashboard_kpis ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_dashboard_kpis'
      AND policyname = 'Platform admins can view admin dashboard kpis'
  ) THEN
    CREATE POLICY "Platform admins can view admin dashboard kpis"
      ON public.admin_dashboard_kpis FOR SELECT
      TO authenticated
      USING (public.is_platform_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_dashboard_kpis'
      AND policyname = 'Platform admins can manage admin dashboard kpis'
  ) THEN
    CREATE POLICY "Platform admins can manage admin dashboard kpis"
      ON public.admin_dashboard_kpis FOR ALL
      TO authenticated
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_admin_dashboard_kpis()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_dashboard_kpis (
    id,
    total_users,
    active_users_7d,
    active_users_30d,
    total_students,
    total_alumni,
    total_faculty,
    total_clubs,
    verified_clubs,
    total_colleges,
    total_posts,
    posts_this_week,
    total_events,
    upcoming_events,
    total_projects,
    active_projects,
    total_connections,
    total_recruiters,
    active_recruiters,
    generated_at
  )
  SELECT
    1,
    (SELECT COUNT(*) FROM public.profiles WHERE role != 'Club'),
    (SELECT COUNT(*) FROM public.profiles WHERE updated_at > NOW() - INTERVAL '7 days' AND role != 'Club'),
    (SELECT COUNT(*) FROM public.profiles WHERE updated_at > NOW() - INTERVAL '30 days' AND role != 'Club'),
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'Student'),
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'Alumni'),
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'Faculty'),
    (SELECT COUNT(*) FROM public.clubs),
    (SELECT COUNT(*) FROM public.clubs WHERE is_verified = true),
    (SELECT COUNT(DISTINCT college_domain) FROM public.profiles WHERE college_domain IS NOT NULL),
    (SELECT COUNT(*) FROM public.posts),
    (SELECT COUNT(*) FROM public.posts WHERE created_at > NOW() - INTERVAL '7 days'),
    (SELECT COUNT(*) FROM public.events),
    (SELECT COUNT(*) FROM public.events WHERE event_date > CURRENT_DATE),
    (SELECT COUNT(*) FROM public.collab_projects),
    (SELECT COUNT(*) FROM public.collab_projects WHERE status = 'active'),
    (SELECT COUNT(*) FROM public.connections WHERE status = 'accepted'),
    (SELECT COUNT(*) FROM public.recruiter_accounts),
    (SELECT COUNT(*) FROM public.recruiter_accounts WHERE status = 'active'),
    NOW()
  ON CONFLICT (id) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    active_users_7d = EXCLUDED.active_users_7d,
    active_users_30d = EXCLUDED.active_users_30d,
    total_students = EXCLUDED.total_students,
    total_alumni = EXCLUDED.total_alumni,
    total_faculty = EXCLUDED.total_faculty,
    total_clubs = EXCLUDED.total_clubs,
    verified_clubs = EXCLUDED.verified_clubs,
    total_colleges = EXCLUDED.total_colleges,
    total_posts = EXCLUDED.total_posts,
    posts_this_week = EXCLUDED.posts_this_week,
    total_events = EXCLUDED.total_events,
    upcoming_events = EXCLUDED.upcoming_events,
    total_projects = EXCLUDED.total_projects,
    active_projects = EXCLUDED.active_projects,
    total_connections = EXCLUDED.total_connections,
    total_recruiters = EXCLUDED.total_recruiters,
    active_recruiters = EXCLUDED.active_recruiters,
    generated_at = EXCLUDED.generated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_admin_dashboard_kpis_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_admin_dashboard_kpis();
  RETURN NULL;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_admin_dashboard_kpis_profiles') THEN
    CREATE TRIGGER trg_refresh_admin_dashboard_kpis_profiles
      AFTER INSERT OR UPDATE OR DELETE ON public.profiles
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_admin_dashboard_kpis_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_admin_dashboard_kpis_clubs') THEN
    CREATE TRIGGER trg_refresh_admin_dashboard_kpis_clubs
      AFTER INSERT OR UPDATE OR DELETE ON public.clubs
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_admin_dashboard_kpis_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_admin_dashboard_kpis_posts') THEN
    CREATE TRIGGER trg_refresh_admin_dashboard_kpis_posts
      AFTER INSERT OR UPDATE OR DELETE ON public.posts
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_admin_dashboard_kpis_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_admin_dashboard_kpis_events') THEN
    CREATE TRIGGER trg_refresh_admin_dashboard_kpis_events
      AFTER INSERT OR UPDATE OR DELETE ON public.events
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_admin_dashboard_kpis_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_admin_dashboard_kpis_projects') THEN
    CREATE TRIGGER trg_refresh_admin_dashboard_kpis_projects
      AFTER INSERT OR UPDATE OR DELETE ON public.collab_projects
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_admin_dashboard_kpis_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_admin_dashboard_kpis_connections') THEN
    CREATE TRIGGER trg_refresh_admin_dashboard_kpis_connections
      AFTER INSERT OR UPDATE OR DELETE ON public.connections
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_admin_dashboard_kpis_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_admin_dashboard_kpis_recruiters') THEN
    CREATE TRIGGER trg_refresh_admin_dashboard_kpis_recruiters
      AFTER INSERT OR UPDATE OR DELETE ON public.recruiter_accounts
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_admin_dashboard_kpis_trigger();
  END IF;
END $$;

SELECT public.refresh_admin_dashboard_kpis();

-- ============================================================================
-- ADMIN DOMAIN STATS (table)
-- ============================================================================
DROP VIEW IF EXISTS public.admin_domain_stats;

CREATE TABLE IF NOT EXISTS public.admin_domain_stats (
  domain text PRIMARY KEY,
  canonical_domain text,
  user_count bigint NOT NULL DEFAULT 0,
  first_seen timestamptz,
  last_seen timestamptz,
  status text NOT NULL DEFAULT 'unknown',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_domain_stats_updated_at_idx
  ON public.admin_domain_stats(updated_at DESC);

ALTER TABLE public.admin_domain_stats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_domain_stats'
      AND policyname = 'Platform admins can view admin domain stats'
  ) THEN
    CREATE POLICY "Platform admins can view admin domain stats"
      ON public.admin_domain_stats FOR SELECT
      TO authenticated
      USING (public.is_platform_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_domain_stats'
      AND policyname = 'Platform admins can manage admin domain stats'
  ) THEN
    CREATE POLICY "Platform admins can manage admin domain stats"
      ON public.admin_domain_stats FOR ALL
      TO authenticated
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_admin_domain_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE public.admin_domain_stats;

  INSERT INTO public.admin_domain_stats (
    domain,
    canonical_domain,
    user_count,
    first_seen,
    last_seen,
    status,
    updated_at
  )
  SELECT 
    p.domain,
    p.college_domain AS canonical_domain,
    COUNT(DISTINCT p.id) AS user_count,
    MIN(p.created_at) AS first_seen,
    MAX(p.created_at) AS last_seen,
    CASE 
      WHEN cda.domain IS NOT NULL THEN 'aliased'
      WHEN p.is_verified THEN 'verified'
      ELSE 'unknown'
    END AS status,
    NOW() AS updated_at
  FROM public.profiles p
  LEFT JOIN public.college_domain_aliases cda ON cda.domain = p.domain
  WHERE p.domain IS NOT NULL
  GROUP BY p.domain, p.college_domain, cda.domain, p.is_verified
  ORDER BY user_count DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_admin_domain_stats_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_admin_domain_stats();
  RETURN NULL;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_admin_domain_stats_profiles') THEN
    CREATE TRIGGER trg_refresh_admin_domain_stats_profiles
      AFTER INSERT OR UPDATE OR DELETE ON public.profiles
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_admin_domain_stats_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_admin_domain_stats_domain_aliases') THEN
    CREATE TRIGGER trg_refresh_admin_domain_stats_domain_aliases
      AFTER INSERT OR UPDATE OR DELETE ON public.college_domain_aliases
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_admin_domain_stats_trigger();
  END IF;
END $$;

SELECT public.refresh_admin_domain_stats();

-- ============================================================================
-- ADMIN ENGAGEMENT METRICS (table)
-- ============================================================================
DROP VIEW IF EXISTS public.admin_engagement_metrics;

CREATE TABLE IF NOT EXISTS public.admin_engagement_metrics (
  date date NOT NULL,
  metric_type text NOT NULL,
  count bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (date, metric_type)
);

CREATE INDEX IF NOT EXISTS admin_engagement_metrics_updated_at_idx
  ON public.admin_engagement_metrics(updated_at DESC);

ALTER TABLE public.admin_engagement_metrics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_engagement_metrics'
      AND policyname = 'Platform admins can view admin engagement metrics'
  ) THEN
    CREATE POLICY "Platform admins can view admin engagement metrics"
      ON public.admin_engagement_metrics FOR SELECT
      TO authenticated
      USING (public.is_platform_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_engagement_metrics'
      AND policyname = 'Platform admins can manage admin engagement metrics'
  ) THEN
    CREATE POLICY "Platform admins can manage admin engagement metrics"
      ON public.admin_engagement_metrics FOR ALL
      TO authenticated
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_admin_engagement_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE public.admin_engagement_metrics;

  INSERT INTO public.admin_engagement_metrics (date, metric_type, count, updated_at)
  SELECT DATE(created_at) AS date, 'posts' AS metric_type, COUNT(*) AS count, NOW() AS updated_at
  FROM public.posts
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at)

  UNION ALL

  SELECT DATE(created_at) AS date, 'comments' AS metric_type, COUNT(*) AS count, NOW() AS updated_at
  FROM public.comments
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at)

  UNION ALL

  SELECT DATE(created_at) AS date, 'connections' AS metric_type, COUNT(*) AS count, NOW() AS updated_at
  FROM public.connections
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at)

  UNION ALL

  SELECT DATE(created_at) AS date, 'events' AS metric_type, COUNT(*) AS count, NOW() AS updated_at
  FROM public.events
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_admin_engagement_metrics_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_admin_engagement_metrics();
  RETURN NULL;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_admin_engagement_metrics_posts') THEN
    CREATE TRIGGER trg_refresh_admin_engagement_metrics_posts
      AFTER INSERT OR UPDATE OR DELETE ON public.posts
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_admin_engagement_metrics_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_admin_engagement_metrics_comments') THEN
    CREATE TRIGGER trg_refresh_admin_engagement_metrics_comments
      AFTER INSERT OR UPDATE OR DELETE ON public.comments
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_admin_engagement_metrics_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_admin_engagement_metrics_connections') THEN
    CREATE TRIGGER trg_refresh_admin_engagement_metrics_connections
      AFTER INSERT OR UPDATE OR DELETE ON public.connections
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_admin_engagement_metrics_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_admin_engagement_metrics_events') THEN
    CREATE TRIGGER trg_refresh_admin_engagement_metrics_events
      AFTER INSERT OR UPDATE OR DELETE ON public.events
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_admin_engagement_metrics_trigger();
  END IF;
END $$;

SELECT public.refresh_admin_engagement_metrics();

-- ============================================================================
-- REALTIME
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_dashboard_kpis;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_domain_stats;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_engagement_metrics;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

COMMIT;
