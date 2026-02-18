-- ============================================================================
-- 112: Unify Raghu domain aliases — ensure raghuinstech.com + raghuenggcollege.in
--      are treated as a single college identity everywhere.
--
-- Problem:
--   Migration 044 seeded the aliases WITHOUT a status column.
--   Migration 051 added status DEFAULT 'pending'. The original Raghu aliases
--   may therefore have status='pending', which causes functions that filter
--   by status='approved' to miss the alias lookup.
--
--   Additionally, older profiles/content rows may still carry the raw
--   'raghuinstech.com' as college_domain instead of the canonical
--   'raghuenggcollege.in'.
--
-- Fix:
--   1. Ensure both aliases exist with status = 'approved' and are linked to
--      the same college entity.
--   2. Backfill ALL tables that have a college_domain column so every row
--      using 'raghuinstech.com' is normalized to 'raghuenggcollege.in'.
--   3. Re-create normalize_college_domain() to also honour the status filter
--      (approved OR self-canonical) for future-proofing.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Ensure both domain alias rows exist and are approved
-- ============================================================================
INSERT INTO public.college_domain_aliases (domain, canonical_domain, status, created_at, updated_at)
VALUES
  ('raghuenggcollege.in', 'raghuenggcollege.in', 'approved', now(), now()),
  ('raghuinstech.com',    'raghuenggcollege.in', 'approved', now(), now())
ON CONFLICT (domain) DO UPDATE SET
  canonical_domain = EXCLUDED.canonical_domain,
  status           = 'approved',
  updated_at       = now();

-- ============================================================================
-- STEP 2: Link aliases to the same colleges row (if a colleges entry exists)
-- ============================================================================
DO $$
DECLARE
  v_college_id uuid;
BEGIN
  -- Find the college entity for raghuenggcollege.in
  SELECT id INTO v_college_id
  FROM public.colleges
  WHERE canonical_domain = 'raghuenggcollege.in'
  LIMIT 1;

  IF v_college_id IS NOT NULL THEN
    UPDATE public.college_domain_aliases
    SET college_id = v_college_id, updated_at = now()
    WHERE domain IN ('raghuenggcollege.in', 'raghuinstech.com')
      AND (college_id IS DISTINCT FROM v_college_id);
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Backfill ALL tables with college_domain = 'raghuinstech.com'
--         → normalize to 'raghuenggcollege.in'
--
-- Dynamically iterates every BASE TABLE in the public schema that has a
-- college_domain column to avoid missing any table.
-- ============================================================================
DO $$
DECLARE
  r record;
  v_count integer;
BEGIN
  -- Use hardened bypass helper so immutable college_domain trigger allows this
  -- one-time canonicalization backfill.
  PERFORM public._set_bypass_flag('app.bypass_college_domain_guard', 'true');

  FOR r IN (
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON  t.table_schema = c.table_schema
      AND t.table_name   = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name  = 'college_domain'
      AND t.table_type   = 'BASE TABLE'
  ) LOOP
    EXECUTE format(
      'UPDATE public.%I SET college_domain = %L WHERE lower(college_domain) = %L',
      r.table_name,
      'raghuenggcollege.in',
      'raghuinstech.com'
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
      RAISE NOTICE 'Backfilled % rows in public.% (raghuinstech.com → raghuenggcollege.in)',
                    v_count, r.table_name;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 4: Harden normalize_college_domain() to respect approved/self-canonical
--         status, while still falling back gracefully.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.normalize_college_domain(p_domain text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain text;
  v_canonical text;
BEGIN
  IF p_domain IS NULL OR btrim(p_domain) = '' THEN
    RETURN NULL;
  END IF;

  v_domain := lower(btrim(p_domain));

  -- Look up canonical domain from the aliases table.
  -- Prefer approved rows; fall back to any row if none approved.
  SELECT a.canonical_domain
    INTO v_canonical
  FROM public.college_domain_aliases a
  WHERE a.domain = v_domain
    AND (a.status = 'approved' OR a.domain = a.canonical_domain)
  LIMIT 1;

  -- Fallback: try without status filter (backwards compat)
  IF v_canonical IS NULL THEN
    SELECT a.canonical_domain
      INTO v_canonical
    FROM public.college_domain_aliases a
    WHERE a.domain = v_domain
    LIMIT 1;
  END IF;

  RETURN COALESCE(v_canonical, v_domain);
END;
$$;

COMMIT;
