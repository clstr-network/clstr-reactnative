-- ============================================================================
-- 044_college_domain_aliases.sql - Domain aliasing / canonical college identity
-- ============================================================================

BEGIN;

-- Map multiple email domains to a single canonical college identity.
-- This keeps domain-based isolation intact while allowing controlled unification.
CREATE TABLE IF NOT EXISTS public.college_domain_aliases (
  domain text PRIMARY KEY,
  canonical_domain text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS college_domain_aliases_canonical_domain_idx
  ON public.college_domain_aliases(canonical_domain);

ALTER TABLE public.college_domain_aliases ENABLE ROW LEVEL SECURITY;

-- No public policies required; normalization is done via a SECURITY DEFINER function.

-- Seed Raghu domain aliases (treat as one campus identity)
INSERT INTO public.college_domain_aliases(domain, canonical_domain)
VALUES
  ('raghuenggcollege.in', 'raghuenggcollege.in'),
  ('raghuinstech.com', 'raghuenggcollege.in')
ON CONFLICT (domain) DO UPDATE
SET canonical_domain = EXCLUDED.canonical_domain,
    updated_at = now();

-- Canonicalize a domain into a single college identity.
-- STABLE because it may read from `college_domain_aliases`.
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

  SELECT a.canonical_domain
    INTO v_canonical
  FROM public.college_domain_aliases a
  WHERE a.domain = v_domain
  LIMIT 1;

  RETURN COALESCE(v_canonical, v_domain);
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_college_domain(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_college_domain(text) TO anon;

-- Update auth hooks to write canonical `college_domain` while preserving raw `domain`.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role public.user_role;
  user_email TEXT;
  email_domain TEXT;
  canonical_college_domain TEXT;
BEGIN
  user_email := NEW.email;

  IF user_email IS NOT NULL AND user_email LIKE '%@%' THEN
    email_domain := LOWER(SUBSTRING(user_email FROM '@(.+)$'));
  ELSE
    email_domain := NULL;
  END IF;

  canonical_college_domain := public.normalize_college_domain(email_domain);

  default_role := 'Student';

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    role,
    domain,
    college_domain,
    is_verified,
    onboarding_complete,
    profile_completion,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    user_email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(user_email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    default_role,
    email_domain,
    canonical_college_domain,
    false,
    false,
    10,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    domain = COALESCE(profiles.domain, EXCLUDED.domain),
    college_domain = COALESCE(public.normalize_college_domain(profiles.college_domain), EXCLUDED.college_domain),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_domain TEXT;
  new_college_domain TEXT;
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    IF NEW.email IS NOT NULL AND NEW.email LIKE '%@%' THEN
      new_domain := LOWER(SUBSTRING(NEW.email FROM '@(.+)$'));
    ELSE
      new_domain := NULL;
    END IF;

    new_college_domain := public.normalize_college_domain(new_domain);

    UPDATE public.profiles
    SET
      email = NEW.email,
      domain = new_domain,
      college_domain = new_college_domain,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill canonical college domains across ALL public tables that store `college_domain`
-- (posts, events, clubs, ecocampus, notifications, etc.).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'college_domain'
      AND t.table_type = 'BASE TABLE'
  ) LOOP
    EXECUTE format(
      'UPDATE public.%I
       SET college_domain = public.normalize_college_domain(college_domain)
       WHERE college_domain IN (SELECT domain FROM public.college_domain_aliases);',
      r.table_name
    );
  END LOOP;
END $$;

COMMIT;
