-- ============================================================================
-- 057_admin_domains_collab_flags.sql
-- Fix admin domain mapping canonical_domain + normalize collab project flagging
-- ============================================================================

BEGIN;

-- ============================================================================
-- Fix admin_map_domain_to_college to set canonical_domain correctly
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_map_domain_to_college(
  p_domain text,
  p_college_id uuid DEFAULT NULL,
  p_create_college boolean DEFAULT false,
  p_college_name text DEFAULT NULL,
  p_college_city text DEFAULT NULL,
  p_college_country text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_domain text;
  v_college_id uuid;
  v_canonical_domain text;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  v_domain := lower(trim(p_domain));

  IF v_domain IS NULL OR v_domain = '' THEN
    RAISE EXCEPTION 'Domain is required';
  END IF;

  IF v_domain IN (
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
    'live.com', 'msn.com', 'aol.com', 'protonmail.com', 'mail.com',
    'yandex.com', 'zoho.com', 'rediffmail.com', 'inbox.com'
  ) THEN
    RAISE EXCEPTION 'Cannot map public email domains to colleges';
  END IF;

  IF p_create_college THEN
    INSERT INTO public.colleges (
      canonical_domain,
      name,
      city,
      country,
      status,
      created_at,
      updated_at
    )
    VALUES (
      v_domain,
      COALESCE(p_college_name, initcap(replace(replace(replace(v_domain, '.edu.in', ''), '.ac.in', ''), '.in', ''))),
      p_college_city,
      COALESCE(p_college_country, 'India'),
      'unverified',
      now(),
      now()
    )
    ON CONFLICT (canonical_domain) DO UPDATE SET
      name = COALESCE(public.colleges.name, EXCLUDED.name),
      city = COALESCE(public.colleges.city, EXCLUDED.city),
      country = COALESCE(public.colleges.country, EXCLUDED.country),
      updated_at = now()
    RETURNING id, canonical_domain INTO v_college_id, v_canonical_domain;
  ELSIF p_college_id IS NOT NULL THEN
    SELECT id, canonical_domain
      INTO v_college_id, v_canonical_domain
    FROM public.colleges
    WHERE id = p_college_id;

    IF v_college_id IS NULL THEN
      RAISE EXCEPTION 'College not found';
    END IF;
  ELSE
    v_college_id := NULL;
    v_canonical_domain := v_domain;
  END IF;

  INSERT INTO public.college_domain_aliases (
    domain,
    canonical_domain,
    college_id,
    status,
    created_at,
    updated_at
  )
  VALUES (
    v_domain,
    v_canonical_domain,
    v_college_id,
    CASE WHEN v_college_id IS NOT NULL THEN 'approved' ELSE 'pending' END,
    now(),
    now()
  )
  ON CONFLICT (domain) DO UPDATE SET
    canonical_domain = EXCLUDED.canonical_domain,
    college_id = EXCLUDED.college_id,
    status = CASE WHEN EXCLUDED.college_id IS NOT NULL THEN 'approved' ELSE college_domain_aliases.status END,
    updated_at = now();

  RETURN json_build_object(
    'success', true,
    'domain', v_domain,
    'college_id', v_college_id,
    'canonical_domain', v_canonical_domain
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_map_domain_to_college(text, uuid, boolean, text, text, text) TO authenticated;

-- ============================================================================
-- Normalize collab project flagging into columns (avoid JSON-only state)
-- ============================================================================
ALTER TABLE public.collab_projects
  ADD COLUMN IF NOT EXISTS flagged boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_reason text,
  ADD COLUMN IF NOT EXISTS flagged_at timestamptz;

UPDATE public.collab_projects
SET
  flagged = COALESCE((metadata->>'flagged')::boolean, false),
  flagged_reason = COALESCE(metadata->>'flagged_reason', flagged_reason),
  flagged_at = COALESCE((metadata->>'flagged_at')::timestamptz, flagged_at)
WHERE metadata ? 'flagged';

CREATE INDEX IF NOT EXISTS collab_projects_flagged_idx ON public.collab_projects(flagged);

COMMIT;
