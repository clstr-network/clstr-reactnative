-- ============================================================================
-- 055_admin_talent_user_growth_tables.sql
-- Replace admin_talent_edges and admin_user_growth views with tables for realtime
-- ============================================================================

BEGIN;

-- ============================================================================
-- ADMIN TALENT EDGES (table)
-- ============================================================================
DROP VIEW IF EXISTS public.admin_talent_edges;

CREATE TABLE IF NOT EXISTS public.admin_talent_edges (
  source_id uuid NOT NULL,
  source_type text NOT NULL,
  target_id uuid NOT NULL,
  target_type text NOT NULL,
  edge_type text NOT NULL,
  weight integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_id, target_id, edge_type)
);

CREATE INDEX IF NOT EXISTS admin_talent_edges_updated_at_idx
  ON public.admin_talent_edges(updated_at DESC);

ALTER TABLE public.admin_talent_edges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_talent_edges'
      AND policyname = 'Platform admins can view admin talent edges'
  ) THEN
    CREATE POLICY "Platform admins can view admin talent edges"
      ON public.admin_talent_edges FOR SELECT
      TO authenticated
      USING (public.is_platform_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_talent_edges'
      AND policyname = 'Platform admins can manage admin talent edges'
  ) THEN
    CREATE POLICY "Platform admins can manage admin talent edges"
      ON public.admin_talent_edges FOR ALL
      TO authenticated
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_admin_talent_edges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE public.admin_talent_edges;

  INSERT INTO public.admin_talent_edges (
    source_id,
    source_type,
    target_id,
    target_type,
    edge_type,
    weight,
    updated_at
  )
  SELECT 
    mr.mentor_id AS source_id,
    'user' AS source_type,
    mr.mentee_id AS target_id,
    'user' AS target_type,
    'mentorship' AS edge_type,
    1 AS weight,
    NOW() AS updated_at
  FROM public.mentorship_requests mr
  WHERE mr.status = 'accepted'

  UNION ALL

  SELECT 
    cm.user_id AS source_id,
    'user' AS source_type,
    cm.club_id AS target_id,
    'club' AS target_type,
    'leadership' AS edge_type,
    CASE WHEN cm.role IN ('leader', 'president', 'admin') THEN 2 ELSE 1 END AS weight,
    NOW() AS updated_at
  FROM public.club_members cm
  WHERE cm.status = 'active'

  UNION ALL

  SELECT 
    ctm.user_id AS source_id,
    'user' AS source_type,
    ctm.project_id AS target_id,
    'project' AS target_type,
    'collaboration' AS edge_type,
    CASE WHEN ctm.is_owner THEN 2 ELSE 1 END AS weight,
    NOW() AS updated_at
  FROM public.collab_team_members ctm
  WHERE ctm.status = 'active';
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_admin_talent_edges_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_admin_talent_edges();
  RETURN NULL;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_admin_talent_edges_mentorship') THEN
    CREATE TRIGGER trg_refresh_admin_talent_edges_mentorship
      AFTER INSERT OR UPDATE OR DELETE ON public.mentorship_requests
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_admin_talent_edges_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_admin_talent_edges_club_members') THEN
    CREATE TRIGGER trg_refresh_admin_talent_edges_club_members
      AFTER INSERT OR UPDATE OR DELETE ON public.club_members
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_admin_talent_edges_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_admin_talent_edges_collab_team_members') THEN
    CREATE TRIGGER trg_refresh_admin_talent_edges_collab_team_members
      AFTER INSERT OR UPDATE OR DELETE ON public.collab_team_members
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_admin_talent_edges_trigger();
  END IF;
END $$;

SELECT public.refresh_admin_talent_edges();

-- ============================================================================
-- ADMIN USER GROWTH (table)
-- ============================================================================
DROP VIEW IF EXISTS public.admin_user_growth;

CREATE TABLE IF NOT EXISTS public.admin_user_growth (
  date date PRIMARY KEY,
  signups bigint NOT NULL DEFAULT 0,
  student_signups bigint NOT NULL DEFAULT 0,
  alumni_signups bigint NOT NULL DEFAULT 0,
  faculty_signups bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_user_growth_updated_at_idx
  ON public.admin_user_growth(updated_at DESC);

ALTER TABLE public.admin_user_growth ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_user_growth'
      AND policyname = 'Platform admins can view admin user growth'
  ) THEN
    CREATE POLICY "Platform admins can view admin user growth"
      ON public.admin_user_growth FOR SELECT
      TO authenticated
      USING (public.is_platform_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_user_growth'
      AND policyname = 'Platform admins can manage admin user growth'
  ) THEN
    CREATE POLICY "Platform admins can manage admin user growth"
      ON public.admin_user_growth FOR ALL
      TO authenticated
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_admin_user_growth()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE public.admin_user_growth;

  INSERT INTO public.admin_user_growth (
    date,
    signups,
    student_signups,
    alumni_signups,
    faculty_signups,
    updated_at
  )
  SELECT 
    DATE(created_at) AS date,
    COUNT(*) AS signups,
    COUNT(CASE WHEN role = 'Student' THEN 1 END) AS student_signups,
    COUNT(CASE WHEN role = 'Alumni' THEN 1 END) AS alumni_signups,
    COUNT(CASE WHEN role = 'Faculty' THEN 1 END) AS faculty_signups,
    NOW() AS updated_at
  FROM public.profiles
  WHERE created_at > NOW() - INTERVAL '90 days'
  GROUP BY DATE(created_at)
  ORDER BY date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_admin_user_growth_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_admin_user_growth();
  RETURN NULL;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_admin_user_growth_profiles') THEN
    CREATE TRIGGER trg_refresh_admin_user_growth_profiles
      AFTER INSERT OR UPDATE OR DELETE ON public.profiles
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.refresh_admin_user_growth_trigger();
  END IF;
END $$;

SELECT public.refresh_admin_user_growth();

-- ============================================================================
-- REALTIME
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_talent_edges;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_user_growth;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

COMMIT;
