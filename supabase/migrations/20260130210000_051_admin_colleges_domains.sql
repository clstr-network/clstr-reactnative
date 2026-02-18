-- ============================================================================
-- 051_admin_colleges_domains.sql - Admin Colleges & Domains Metadata
-- Adds normalized college entities + domain status for admin dashboard
-- ============================================================================

BEGIN;

-- ============================================================================
-- COLLEGES TABLE (canonical college entities)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_domain text UNIQUE NOT NULL,
  name text,
  city text,
  country text,
  status text NOT NULL DEFAULT 'unverified'
    CHECK (status IN ('verified', 'unverified', 'flagged')),
  confidence_score numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS colleges_canonical_domain_idx ON public.colleges(canonical_domain);
CREATE INDEX IF NOT EXISTS colleges_status_idx ON public.colleges(status);

ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

-- Platform admins can read/manage colleges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'colleges'
      AND policyname = 'Platform admins can view colleges'
  ) THEN
    CREATE POLICY "Platform admins can view colleges"
      ON public.colleges FOR SELECT
      TO authenticated
      USING (public.is_platform_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'colleges'
      AND policyname = 'Platform admins can manage colleges'
  ) THEN
    CREATE POLICY "Platform admins can manage colleges"
      ON public.colleges FOR ALL
      TO authenticated
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

-- ============================================================================
-- COLLEGE DOMAIN ALIASES: add UUID + status for admin workflows
-- ============================================================================
ALTER TABLE public.college_domain_aliases
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('approved', 'pending', 'blocked'));

UPDATE public.college_domain_aliases
SET id = COALESCE(id, gen_random_uuid()),
    status = COALESCE(status, 'approved')
WHERE id IS NULL OR status IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS college_domain_aliases_id_idx
  ON public.college_domain_aliases(id);

-- Platform admins can read/manage domain aliases
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'college_domain_aliases'
      AND policyname = 'Platform admins can view domain aliases'
  ) THEN
    CREATE POLICY "Platform admins can view domain aliases"
      ON public.college_domain_aliases FOR SELECT
      TO authenticated
      USING (public.is_platform_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'college_domain_aliases'
      AND policyname = 'Platform admins can manage domain aliases'
  ) THEN
    CREATE POLICY "Platform admins can manage domain aliases"
      ON public.college_domain_aliases FOR ALL
      TO authenticated
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

-- ============================================================================
-- BACKFILL COLLEGES FROM EXISTING DATA
-- ============================================================================
INSERT INTO public.colleges (canonical_domain, name, status, confidence_score, created_at, updated_at)
SELECT DISTINCT
  p.college_domain,
  p.college_domain,
  'unverified',
  0,
  now(),
  now()
FROM public.profiles p
WHERE p.college_domain IS NOT NULL
ON CONFLICT (canonical_domain) DO NOTHING;

INSERT INTO public.colleges (canonical_domain, name, status, confidence_score, created_at, updated_at)
SELECT DISTINCT
  cda.canonical_domain,
  cda.canonical_domain,
  'unverified',
  0,
  now(),
  now()
FROM public.college_domain_aliases cda
ON CONFLICT (canonical_domain) DO NOTHING;

-- ============================================================================
-- REALTIME
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.colleges;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.college_domain_aliases;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

COMMIT;
