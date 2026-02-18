-- ============================================================================
-- 052_admin_reports.sql - Persisted admin reports
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
  file_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  generated_by text,
  generated_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_reports_type_idx ON public.admin_reports(report_type);
CREATE INDEX IF NOT EXISTS admin_reports_status_idx ON public.admin_reports(status);
CREATE INDEX IF NOT EXISTS admin_reports_generated_at_idx ON public.admin_reports(generated_at DESC);

ALTER TABLE public.admin_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_reports'
      AND policyname = 'Platform admins can view reports'
  ) THEN
    CREATE POLICY "Platform admins can view reports"
      ON public.admin_reports FOR SELECT
      TO authenticated
      USING (public.is_platform_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_reports'
      AND policyname = 'Platform admins can manage reports'
  ) THEN
    CREATE POLICY "Platform admins can manage reports"
      ON public.admin_reports FOR ALL
      TO authenticated
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_reports;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

COMMIT;
