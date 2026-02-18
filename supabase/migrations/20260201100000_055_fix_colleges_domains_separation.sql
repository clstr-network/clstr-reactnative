-- ============================================================================
-- 055_fix_colleges_domains_separation.sql
-- 
-- CRITICAL FIX: Properly separate colleges (entities) from domains (attributes)
-- 
-- Core Data Model:
-- - colleges: Canonical college entities with name, city, country, UUID
-- - college_domain_aliases: Email domains that map TO colleges via college_id FK
--
-- Rules:
-- 1. A domain is NOT a college (domains are attributes of colleges)
-- 2. Colleges page shows only colleges from `colleges` table
-- 3. Domains page shows only domains from `college_domain_aliases` table
-- 4. Public email domains (gmail.com, etc.) are auto-blocked, never create colleges
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Ensure colleges table has proper structure
-- ============================================================================
ALTER TABLE public.colleges
  ADD COLUMN IF NOT EXISTS college_id uuid;

-- Add unique constraint on ID if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'colleges_id_key' AND conrelid = 'public.colleges'::regclass
  ) THEN
    ALTER TABLE public.colleges ADD CONSTRAINT colleges_id_key UNIQUE (id);
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Ensure college_domain_aliases has college_id FK (not just canonical_domain)
-- ============================================================================
ALTER TABLE public.college_domain_aliases
  ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES public.colleges(id) ON DELETE SET NULL;

-- Create index on college_id for faster lookups
CREATE INDEX IF NOT EXISTS college_domain_aliases_college_id_idx 
  ON public.college_domain_aliases(college_id);

-- ============================================================================
-- STEP 3: Auto-block public email domains
-- ============================================================================
INSERT INTO public.college_domain_aliases (domain, canonical_domain, status, created_at, updated_at)
SELECT 
  d.domain,
  d.domain,
  'blocked',
  now(),
  now()
FROM (VALUES
  ('gmail.com'),
  ('yahoo.com'),
  ('outlook.com'),
  ('hotmail.com'),
  ('icloud.com'),
  ('live.com'),
  ('msn.com'),
  ('aol.com'),
  ('protonmail.com'),
  ('mail.com'),
  ('yandex.com'),
  ('zoho.com'),
  ('rediffmail.com'),
  ('inbox.com')
) AS d(domain)
ON CONFLICT (domain) DO UPDATE SET status = 'blocked', updated_at = now();

-- ============================================================================
-- STEP 4: Clean up colleges table - remove public email domains posing as colleges
-- ============================================================================
DELETE FROM public.colleges 
WHERE canonical_domain IN (
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
  'live.com', 'msn.com', 'aol.com', 'protonmail.com', 'mail.com',
  'yandex.com', 'zoho.com', 'rediffmail.com', 'inbox.com'
);

-- ============================================================================
-- STEP 5: Link existing domain aliases to colleges via college_id
-- ============================================================================
UPDATE public.college_domain_aliases cda
SET college_id = c.id
FROM public.colleges c
WHERE cda.canonical_domain = c.canonical_domain
  AND cda.college_id IS NULL;

-- ============================================================================
-- STEP 6: Create proper admin_domain_stats view
-- This should aggregate from college_domain_aliases, not profiles.domain
-- ============================================================================
DROP VIEW IF EXISTS public.admin_domain_stats_v2;

CREATE OR REPLACE VIEW public.admin_domain_stats_v2 AS
SELECT 
  cda.id,
  cda.domain,
  c.id AS college_id,
  c.name AS college_name,
  cda.status,
  cda.created_at AS first_seen,
  cda.updated_at AS last_seen,
  COALESCE(user_counts.user_count, 0) AS user_count
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

-- ============================================================================
-- STEP 7: Create proper admin_college_stats_v2 view
-- This should aggregate from colleges table, not from domains
-- ============================================================================
DROP VIEW IF EXISTS public.admin_college_stats_v2;

CREATE OR REPLACE VIEW public.admin_college_stats_v2 AS
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
  COALESCE(event_counts.events_count, 0) AS events_count
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

-- ============================================================================
-- STEP 8: Create RPC for domains page (proper data model)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_admin_domains_list()
RETURNS TABLE (
  id uuid,
  domain text,
  college_id uuid,
  college_name text,
  status text,
  user_count bigint,
  first_seen timestamptz,
  last_seen timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;
  
  RETURN QUERY
  SELECT 
    cda.id,
    cda.domain,
    c.id AS college_id,
    c.name AS college_name,
    COALESCE(cda.status, 'pending') AS status,
    COALESCE(uc.user_count, 0)::bigint AS user_count,
    cda.created_at AS first_seen,
    cda.updated_at AS last_seen
  FROM public.college_domain_aliases cda
  LEFT JOIN public.colleges c ON c.id = cda.college_id
  LEFT JOIN (
    SELECT p.domain, COUNT(DISTINCT p.id) AS user_count
    FROM public.profiles p
    WHERE p.domain IS NOT NULL
    GROUP BY p.domain
  ) uc ON uc.domain = cda.domain
  ORDER BY uc.user_count DESC NULLS LAST, cda.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_domains_list() TO authenticated;

-- ============================================================================
-- STEP 9: Create RPC for colleges page (proper data model)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_admin_colleges_list()
RETURNS TABLE (
  id uuid,
  name text,
  canonical_domain text,
  city text,
  country text,
  status text,
  confidence_score numeric,
  domains_count bigint,
  total_users bigint,
  student_count bigint,
  alumni_count bigint,
  faculty_count bigint,
  active_users_7d bigint,
  posts_count bigint,
  clubs_count bigint,
  events_count bigint,
  first_user_at timestamptz,
  latest_user_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.canonical_domain,
    c.city,
    c.country,
    c.status,
    c.confidence_score,
    COALESCE(dc.domains_count, 0)::bigint AS domains_count,
    COALESCE(uc.total_users, 0)::bigint AS total_users,
    COALESCE(uc.student_count, 0)::bigint AS student_count,
    COALESCE(uc.alumni_count, 0)::bigint AS alumni_count,
    COALESCE(uc.faculty_count, 0)::bigint AS faculty_count,
    COALESCE(uc.active_users_7d, 0)::bigint AS active_users_7d,
    COALESCE(engagement.posts_count, 0)::bigint AS posts_count,
    COALESCE(club_counts.clubs_count, 0)::bigint AS clubs_count,
    COALESCE(event_counts.events_count, 0)::bigint AS events_count,
    uc.first_user_at,
    uc.latest_user_at,
    c.created_at
  FROM public.colleges c
  LEFT JOIN (
    SELECT cda.college_id, COUNT(DISTINCT cda.domain) AS domains_count
    FROM public.college_domain_aliases cda
    WHERE cda.college_id IS NOT NULL AND cda.status != 'blocked'
    GROUP BY cda.college_id
  ) dc ON dc.college_id = c.id
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
  ) uc ON uc.college_domain = c.canonical_domain
  LEFT JOIN (
    SELECT college_domain, COUNT(*) AS posts_count
    FROM public.posts
    WHERE college_domain IS NOT NULL
    GROUP BY college_domain
  ) engagement ON engagement.college_domain = c.canonical_domain
  LEFT JOIN (
    SELECT college_domain, COUNT(*) AS clubs_count
    FROM public.clubs
    WHERE college_domain IS NOT NULL
    GROUP BY college_domain
  ) club_counts ON club_counts.college_domain = c.canonical_domain
  LEFT JOIN (
    SELECT college_domain, COUNT(*) AS events_count
    FROM public.events
    WHERE college_domain IS NOT NULL
    GROUP BY college_domain
  ) event_counts ON event_counts.college_domain = c.canonical_domain
  ORDER BY uc.total_users DESC NULLS LAST, c.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_colleges_list() TO authenticated;

-- ============================================================================
-- STEP 10: Create function to map domain to college
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
SET search_path = public
AS $$
DECLARE
  v_domain text;
  v_college_id uuid;
  v_result json;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;
  
  -- Normalize domain
  v_domain := lower(trim(p_domain));
  
  IF v_domain IS NULL OR v_domain = '' THEN
    RAISE EXCEPTION 'Domain is required';
  END IF;
  
  -- Check if domain is a public email domain
  IF v_domain IN ('gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
                  'live.com', 'msn.com', 'aol.com', 'protonmail.com', 'mail.com') THEN
    RAISE EXCEPTION 'Cannot map public email domains to colleges';
  END IF;
  
  -- Create or get college
  IF p_create_college AND p_college_id IS NULL THEN
    -- Create new college
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
      COALESCE(p_college_name, v_domain),
      COALESCE(p_college_name, initcap(replace(replace(replace(v_domain, '.edu.in', ''), '.ac.in', ''), '.in', ''))),
      p_college_city,
      COALESCE(p_college_country, 'India'),
      'unverified',
      now(),
      now()
    )
    RETURNING id INTO v_college_id;
  ELSE
    v_college_id := p_college_id;
  END IF;
  
  -- Upsert domain alias
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
    v_domain,
    v_college_id,
    CASE WHEN v_college_id IS NOT NULL THEN 'approved' ELSE 'pending' END,
    now(),
    now()
  )
  ON CONFLICT (domain) DO UPDATE SET
    college_id = v_college_id,
    status = CASE WHEN v_college_id IS NOT NULL THEN 'approved' ELSE college_domain_aliases.status END,
    updated_at = now();
  
  SELECT json_build_object(
    'success', true,
    'domain', v_domain,
    'college_id', v_college_id
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_map_domain_to_college(text, uuid, boolean, text, text, text) TO authenticated;

-- ============================================================================
-- STEP 11: Create function to block/unblock domain
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_update_domain_status(
  p_domain text,
  p_status text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain text;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;
  
  v_domain := lower(trim(p_domain));
  
  IF p_status NOT IN ('approved', 'pending', 'blocked') THEN
    RAISE EXCEPTION 'Invalid status. Must be: approved, pending, or blocked';
  END IF;
  
  -- Upsert domain with new status
  INSERT INTO public.college_domain_aliases (domain, canonical_domain, status, created_at, updated_at)
  VALUES (v_domain, v_domain, p_status, now(), now())
  ON CONFLICT (domain) DO UPDATE SET
    status = p_status,
    college_id = CASE WHEN p_status = 'blocked' THEN NULL ELSE college_domain_aliases.college_id END,
    updated_at = now();
  
  RETURN json_build_object('success', true, 'domain', v_domain, 'status', p_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_domain_status(text, text) TO authenticated;

-- ============================================================================
-- STEP 12: Ensure realtime publications
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
