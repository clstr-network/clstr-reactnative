-- ============================================================================
-- 053_admin_college_stats_table.sql
-- Replace admin_college_stats VIEW with a materialized TABLE for realtime
-- ============================================================================

BEGIN;

-- Drop the view if it exists (views can't be added to realtime publications)
DROP VIEW IF EXISTS public.admin_college_stats;

-- Create a cached table for admin college stats
CREATE TABLE IF NOT EXISTS public.admin_college_stats (
  college_domain text PRIMARY KEY,
  total_users bigint NOT NULL DEFAULT 0,
  student_count bigint NOT NULL DEFAULT 0,
  alumni_count bigint NOT NULL DEFAULT 0,
  faculty_count bigint NOT NULL DEFAULT 0,
  club_count bigint NOT NULL DEFAULT 0,
  event_count bigint NOT NULL DEFAULT 0,
  post_count bigint NOT NULL DEFAULT 0,
  active_users_7d bigint NOT NULL DEFAULT 0,
  first_user_at timestamptz,
  latest_user_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_college_stats_updated_at_idx
  ON public.admin_college_stats(updated_at DESC);

ALTER TABLE public.admin_college_stats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_college_stats'
      AND policyname = 'Platform admins can view admin college stats'
  ) THEN
    CREATE POLICY "Platform admins can view admin college stats"
      ON public.admin_college_stats FOR SELECT
      TO authenticated
      USING (public.is_platform_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_college_stats'
      AND policyname = 'Platform admins can manage admin college stats'
  ) THEN
    CREATE POLICY "Platform admins can manage admin college stats"
      ON public.admin_college_stats FOR ALL
      TO authenticated
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

-- Refresh function to recompute cached stats
CREATE OR REPLACE FUNCTION public.refresh_admin_college_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE public.admin_college_stats;

  INSERT INTO public.admin_college_stats (
    college_domain,
    total_users,
    student_count,
    alumni_count,
    faculty_count,
    club_count,
    event_count,
    post_count,
    active_users_7d,
    first_user_at,
    latest_user_at,
    updated_at
  )
  SELECT 
    p.college_domain,
    COUNT(DISTINCT p.id) AS total_users,
    COUNT(DISTINCT CASE WHEN p.role = 'Student' THEN p.id END) AS student_count,
    COUNT(DISTINCT CASE WHEN p.role = 'Alumni' THEN p.id END) AS alumni_count,
    COUNT(DISTINCT CASE WHEN p.role = 'Faculty' THEN p.id END) AS faculty_count,
    COUNT(DISTINCT c.id) AS club_count,
    COUNT(DISTINCT e.id) AS event_count,
    COUNT(DISTINCT po.id) AS post_count,
    COUNT(DISTINCT CASE WHEN p.updated_at > NOW() - INTERVAL '7 days' THEN p.id END) AS active_users_7d,
    MIN(p.created_at) AS first_user_at,
    MAX(p.created_at) AS latest_user_at,
    NOW() AS updated_at
  FROM public.profiles p
  LEFT JOIN public.clubs c ON c.college_domain = p.college_domain
  LEFT JOIN public.events e ON e.college_domain = p.college_domain
  LEFT JOIN public.posts po ON po.college_domain = p.college_domain
  WHERE p.college_domain IS NOT NULL
  GROUP BY p.college_domain
  ORDER BY total_users DESC;
END;
$$;

-- Trigger function
CREATE OR REPLACE FUNCTION public.refresh_admin_college_stats_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_admin_college_stats();
  RETURN NULL;
END;
$$;

-- Attach triggers to source tables (statement-level)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_admin_college_stats_profiles') THEN
    CREATE TRIGGER trg_refresh_admin_college_stats_profiles
      AFTER INSERT OR UPDATE OR DELETE ON public.profiles
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_admin_college_stats_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_admin_college_stats_clubs') THEN
    CREATE TRIGGER trg_refresh_admin_college_stats_clubs
      AFTER INSERT OR UPDATE OR DELETE ON public.clubs
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_admin_college_stats_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_admin_college_stats_events') THEN
    CREATE TRIGGER trg_refresh_admin_college_stats_events
      AFTER INSERT OR UPDATE OR DELETE ON public.events
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_admin_college_stats_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_admin_college_stats_posts') THEN
    CREATE TRIGGER trg_refresh_admin_college_stats_posts
      AFTER INSERT OR UPDATE OR DELETE ON public.posts
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_admin_college_stats_trigger();
  END IF;
END $$;

-- Initial refresh
SELECT public.refresh_admin_college_stats();

-- Realtime publication (table only)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_college_stats;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

COMMIT;
