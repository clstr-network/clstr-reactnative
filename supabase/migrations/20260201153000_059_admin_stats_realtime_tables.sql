-- ============================================================================
-- 059_admin_stats_realtime_tables.sql
-- Replace admin stats and analytics views with realtime-capable tables
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- Drop views (realtime does not support views)
-- --------------------------------------------------------------------------
DROP VIEW IF EXISTS public.admin_domain_stats_v2;
DROP VIEW IF EXISTS public.admin_college_stats_v2;
DROP VIEW IF EXISTS public.event_funnel_analytics;

-- --------------------------------------------------------------------------
-- Admin domain stats table
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_domain_stats_v2 (
  id uuid NOT NULL,
  domain text NOT NULL,
  college_id uuid,
  college_name text,
  status text,
  first_seen timestamptz,
  last_seen timestamptz,
  user_count bigint DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_domain_stats_v2 ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_domain_stats_v2_pkey'
      AND conrelid = 'public.admin_domain_stats_v2'::regclass
  ) THEN
    ALTER TABLE public.admin_domain_stats_v2
      ADD CONSTRAINT admin_domain_stats_v2_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS admin_domain_stats_v2_domain_idx
  ON public.admin_domain_stats_v2(domain);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_domain_stats_v2'
      AND policyname = 'Platform admins can view admin domain stats v2'
  ) THEN
    CREATE POLICY "Platform admins can view admin domain stats v2"
      ON public.admin_domain_stats_v2 FOR SELECT
      TO authenticated
      USING (public.is_platform_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_domain_stats_v2'
      AND policyname = 'Platform admins can manage admin domain stats v2'
  ) THEN
    CREATE POLICY "Platform admins can manage admin domain stats v2"
      ON public.admin_domain_stats_v2 FOR ALL
      TO authenticated
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- Admin college stats table
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_college_stats_v2 (
  id uuid NOT NULL,
  name text,
  canonical_domain text,
  city text,
  country text,
  status text,
  confidence_score numeric,
  created_at timestamptz,
  updated_at timestamptz,
  domains_count bigint DEFAULT 0,
  total_users bigint DEFAULT 0,
  student_count bigint DEFAULT 0,
  alumni_count bigint DEFAULT 0,
  faculty_count bigint DEFAULT 0,
  active_users_7d bigint DEFAULT 0,
  first_user_at timestamptz,
  latest_user_at timestamptz,
  posts_count bigint DEFAULT 0,
  clubs_count bigint DEFAULT 0,
  events_count bigint DEFAULT 0,
  stats_refreshed_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_college_stats_v2 ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_college_stats_v2_pkey'
      AND conrelid = 'public.admin_college_stats_v2'::regclass
  ) THEN
    ALTER TABLE public.admin_college_stats_v2
      ADD CONSTRAINT admin_college_stats_v2_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS admin_college_stats_v2_canonical_domain_idx
  ON public.admin_college_stats_v2(canonical_domain);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_college_stats_v2'
      AND policyname = 'Platform admins can view admin college stats v2'
  ) THEN
    CREATE POLICY "Platform admins can view admin college stats v2"
      ON public.admin_college_stats_v2 FOR SELECT
      TO authenticated
      USING (public.is_platform_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_college_stats_v2'
      AND policyname = 'Platform admins can manage admin college stats v2'
  ) THEN
    CREATE POLICY "Platform admins can manage admin college stats v2"
      ON public.admin_college_stats_v2 FOR ALL
      TO authenticated
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- Event funnel analytics table (daily rollup)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_funnel_analytics (
  day timestamptz NOT NULL,
  public_views bigint DEFAULT 0,
  cta_clicks bigint DEFAULT 0,
  signups_started bigint DEFAULT 0,
  signups_completed bigint DEFAULT 0,
  redirects_successful bigint DEFAULT 0,
  conversion_rate_pct numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.event_funnel_analytics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'event_funnel_analytics_pkey'
      AND conrelid = 'public.event_funnel_analytics'::regclass
  ) THEN
    ALTER TABLE public.event_funnel_analytics
      ADD CONSTRAINT event_funnel_analytics_pkey PRIMARY KEY (day);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'event_funnel_analytics'
      AND policyname = 'Platform admins can view event funnel analytics'
  ) THEN
    CREATE POLICY "Platform admins can view event funnel analytics"
      ON public.event_funnel_analytics FOR SELECT
      TO authenticated
      USING (public.is_platform_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'event_funnel_analytics'
      AND policyname = 'Platform admins can manage event funnel analytics'
  ) THEN
    CREATE POLICY "Platform admins can manage event funnel analytics"
      ON public.event_funnel_analytics FOR ALL
      TO authenticated
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- Refresh functions
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_admin_domain_stats_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  TRUNCATE TABLE public.admin_domain_stats_v2;

  INSERT INTO public.admin_domain_stats_v2 (
    id,
    domain,
    college_id,
    college_name,
    status,
    first_seen,
    last_seen,
    user_count,
    updated_at
  )
  SELECT
    cda.id,
    cda.domain,
    c.id AS college_id,
    c.name AS college_name,
    cda.status,
    cda.created_at AS first_seen,
    cda.updated_at AS last_seen,
    COALESCE(user_counts.user_count, 0) AS user_count,
    now() AS updated_at
  FROM public.college_domain_aliases cda
  LEFT JOIN public.colleges c ON c.id = cda.college_id
  LEFT JOIN (
    SELECT
      p.domain,
      COUNT(DISTINCT p.id) AS user_count
    FROM public.profiles p
    WHERE p.domain IS NOT NULL
    GROUP BY p.domain
  ) user_counts ON user_counts.domain = cda.domain
  ORDER BY user_counts.user_count DESC NULLS LAST, cda.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_admin_college_stats_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  TRUNCATE TABLE public.admin_college_stats_v2;

  INSERT INTO public.admin_college_stats_v2 (
    id,
    name,
    canonical_domain,
    city,
    country,
    status,
    confidence_score,
    created_at,
    updated_at,
    domains_count,
    total_users,
    student_count,
    alumni_count,
    faculty_count,
    active_users_7d,
    first_user_at,
    latest_user_at,
    posts_count,
    clubs_count,
    events_count,
    stats_refreshed_at
  )
  SELECT
    c.id,
    c.name,
    c.canonical_domain,
    c.city,
    c.country,
    c.status,
    c.confidence_score,
    c.created_at,
    c.updated_at,
    COALESCE(domain_counts.domains_count, 0) AS domains_count,
    COALESCE(user_counts.total_users, 0) AS total_users,
    COALESCE(user_counts.student_count, 0) AS student_count,
    COALESCE(user_counts.alumni_count, 0) AS alumni_count,
    COALESCE(user_counts.faculty_count, 0) AS faculty_count,
    COALESCE(user_counts.active_users_7d, 0) AS active_users_7d,
    user_counts.first_user_at,
    user_counts.latest_user_at,
    COALESCE(engagement.posts_count, 0) AS posts_count,
    COALESCE(club_counts.clubs_count, 0) AS clubs_count,
    COALESCE(event_counts.events_count, 0) AS events_count,
    now() AS stats_refreshed_at
  FROM public.colleges c
  LEFT JOIN (
    SELECT
      cda.college_id,
      COUNT(DISTINCT cda.domain) AS domains_count
    FROM public.college_domain_aliases cda
    WHERE cda.college_id IS NOT NULL
    GROUP BY cda.college_id
  ) domain_counts ON domain_counts.college_id = c.id
  LEFT JOIN (
    SELECT
      p.college_domain,
      COUNT(DISTINCT p.id) AS total_users,
      COUNT(DISTINCT CASE WHEN p.role = 'Student' THEN p.id END) AS student_count,
      COUNT(DISTINCT CASE WHEN p.role = 'Alumni' THEN p.id END) AS alumni_count,
      COUNT(DISTINCT CASE WHEN p.role = 'Faculty' THEN p.id END) AS faculty_count,
      COUNT(DISTINCT CASE WHEN p.updated_at > NOW() - INTERVAL '7 days' THEN p.id END) AS active_users_7d,
      MIN(p.created_at) AS first_user_at,
      MAX(p.created_at) AS latest_user_at
    FROM public.profiles p
    WHERE p.college_domain IS NOT NULL
    GROUP BY p.college_domain
  ) user_counts ON user_counts.college_domain = c.canonical_domain
  LEFT JOIN (
    SELECT
      po.college_domain,
      COUNT(DISTINCT po.id) AS posts_count
    FROM public.posts po
    WHERE po.college_domain IS NOT NULL
    GROUP BY po.college_domain
  ) engagement ON engagement.college_domain = c.canonical_domain
  LEFT JOIN (
    SELECT
      cl.college_domain,
      COUNT(DISTINCT cl.id) AS clubs_count
    FROM public.clubs cl
    WHERE cl.college_domain IS NOT NULL
    GROUP BY cl.college_domain
  ) club_counts ON club_counts.college_domain = c.canonical_domain
  LEFT JOIN (
    SELECT
      ev.college_domain,
      COUNT(DISTINCT ev.id) AS events_count
    FROM public.events ev
    WHERE ev.college_domain IS NOT NULL
    GROUP BY ev.college_domain
  ) event_counts ON event_counts.college_domain = c.canonical_domain
  ORDER BY user_counts.total_users DESC NULLS LAST, c.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_event_funnel_analytics_day(p_day timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_day timestamptz := date_trunc('day', p_day);
BEGIN
  DELETE FROM public.event_funnel_analytics
  WHERE day = v_day;

  INSERT INTO public.event_funnel_analytics (
    day,
    public_views,
    cta_clicks,
    signups_started,
    signups_completed,
    redirects_successful,
    conversion_rate_pct,
    updated_at
  )
  SELECT
    date_trunc('day', created_at) AS day,
    COUNT(*) FILTER (WHERE event_type = 'public_event_view') AS public_views,
    COUNT(*) FILTER (WHERE event_type = 'explore_events_cta_click') AS cta_clicks,
    COUNT(*) FILTER (WHERE event_type = 'signup_started') AS signups_started,
    COUNT(*) FILTER (WHERE event_type = 'signup_completed') AS signups_completed,
    COUNT(*) FILTER (WHERE event_type = 'redirect_success') AS redirects_successful,
    ROUND(
      CASE
        WHEN COUNT(*) FILTER (WHERE event_type = 'public_event_view') > 0
        THEN COUNT(*) FILTER (WHERE event_type = 'signup_completed')::numeric /
             COUNT(*) FILTER (WHERE event_type = 'public_event_view')::numeric * 100
        ELSE 0
      END, 2
    ) AS conversion_rate_pct,
    now() AS updated_at
  FROM public.analytics_events
  WHERE created_at >= v_day
    AND created_at < v_day + interval '1 day'
  GROUP BY date_trunc('day', created_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_event_funnel_analytics_all(p_days integer DEFAULT 30)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  TRUNCATE TABLE public.event_funnel_analytics;

  INSERT INTO public.event_funnel_analytics (
    day,
    public_views,
    cta_clicks,
    signups_started,
    signups_completed,
    redirects_successful,
    conversion_rate_pct,
    updated_at
  )
  SELECT
    date_trunc('day', created_at) AS day,
    COUNT(*) FILTER (WHERE event_type = 'public_event_view') AS public_views,
    COUNT(*) FILTER (WHERE event_type = 'explore_events_cta_click') AS cta_clicks,
    COUNT(*) FILTER (WHERE event_type = 'signup_started') AS signups_started,
    COUNT(*) FILTER (WHERE event_type = 'signup_completed') AS signups_completed,
    COUNT(*) FILTER (WHERE event_type = 'redirect_success') AS redirects_successful,
    ROUND(
      CASE
        WHEN COUNT(*) FILTER (WHERE event_type = 'public_event_view') > 0
        THEN COUNT(*) FILTER (WHERE event_type = 'signup_completed')::numeric /
             COUNT(*) FILTER (WHERE event_type = 'public_event_view')::numeric * 100
        ELSE 0
      END, 2
    ) AS conversion_rate_pct,
    now() AS updated_at
  FROM public.analytics_events
  WHERE created_at > now() - (p_days || ' days')::interval
  GROUP BY date_trunc('day', created_at)
  ORDER BY day DESC;
END;
$$;

-- --------------------------------------------------------------------------
-- Trigger functions
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_refresh_admin_stats_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  PERFORM public.refresh_admin_domain_stats_v2();
  PERFORM public.refresh_admin_college_stats_v2();
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_refresh_event_funnel_analytics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.refresh_event_funnel_analytics_day(NEW.created_at);
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.refresh_event_funnel_analytics_day(OLD.created_at);
  END IF;
  RETURN NULL;
END;
$$;

-- --------------------------------------------------------------------------
-- Triggers (statement-level for admin stats, row-level for analytics)
-- --------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_refresh_admin_stats_v2_colleges ON public.colleges;
CREATE TRIGGER trg_refresh_admin_stats_v2_colleges
AFTER INSERT OR UPDATE OR DELETE ON public.colleges
FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_admin_stats_v2();

DROP TRIGGER IF EXISTS trg_refresh_admin_stats_v2_college_domains ON public.college_domain_aliases;
CREATE TRIGGER trg_refresh_admin_stats_v2_college_domains
AFTER INSERT OR UPDATE OR DELETE ON public.college_domain_aliases
FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_admin_stats_v2();

DROP TRIGGER IF EXISTS trg_refresh_admin_stats_v2_profiles ON public.profiles;
CREATE TRIGGER trg_refresh_admin_stats_v2_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_admin_stats_v2();

DROP TRIGGER IF EXISTS trg_refresh_admin_stats_v2_posts ON public.posts;
CREATE TRIGGER trg_refresh_admin_stats_v2_posts
AFTER INSERT OR UPDATE OR DELETE ON public.posts
FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_admin_stats_v2();

DROP TRIGGER IF EXISTS trg_refresh_admin_stats_v2_clubs ON public.clubs;
CREATE TRIGGER trg_refresh_admin_stats_v2_clubs
AFTER INSERT OR UPDATE OR DELETE ON public.clubs
FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_admin_stats_v2();

DROP TRIGGER IF EXISTS trg_refresh_admin_stats_v2_events ON public.events;
CREATE TRIGGER trg_refresh_admin_stats_v2_events
AFTER INSERT OR UPDATE OR DELETE ON public.events
FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_admin_stats_v2();

DROP TRIGGER IF EXISTS trg_refresh_event_funnel_analytics ON public.analytics_events;
CREATE TRIGGER trg_refresh_event_funnel_analytics
AFTER INSERT OR UPDATE OR DELETE ON public.analytics_events
FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_event_funnel_analytics();

-- --------------------------------------------------------------------------
-- Realtime publication (tables only)
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_domain_stats_v2;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_college_stats_v2;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.event_funnel_analytics;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- Initial refresh (seed tables)
-- --------------------------------------------------------------------------
SELECT public.refresh_admin_domain_stats_v2();
SELECT public.refresh_admin_college_stats_v2();
SELECT public.refresh_event_funnel_analytics_all(30);

COMMIT;
