-- ============================================================================
-- Public domain standalone-account cleanup script
--
-- Prerequisite:
-- 1) Apply migration 20260213140000_107_public_domain_enforcement.sql
-- 2) Apply migration 20260301000000_126_allow_service_role_public_domain_cleanup.sql
-- 3) Run with a platform-admin authenticated JWT, or service_role
-- ============================================================================

-- 0) Preflight: verify execution context before running audit/cleanup
DO $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := auth.role();
  v_is_admin boolean := public.is_platform_admin();
BEGIN
  RAISE NOTICE 'auth.uid=% auth.role=% is_platform_admin=%', v_uid, v_role, v_is_admin;

  IF NOT (COALESCE(v_role, '') = 'service_role' OR COALESCE(v_is_admin, false)) THEN
    RAISE EXCEPTION 'Preflight failed: requires platform admin JWT or service_role (uid=%, role=%)', v_uid, v_role;
  END IF;
END;
$$;

-- 1) Audit candidates
SELECT *
FROM public.get_public_domain_profile_audit();

-- 2) Dry-run counts
SELECT
  COUNT(*) AS total_candidates,
  COUNT(*) FILTER (WHERE reason = 'public_primary_email') AS public_primary_email,
  COUNT(*) FILTER (WHERE reason = 'public_college_domain') AS public_college_domain,
  COUNT(*) FILTER (WHERE reason = 'missing_college_domain') AS missing_college_domain
FROM public.get_public_domain_profile_audit();

-- 3) Execute cleanup for all candidates (hard-delete if no content, quarantine otherwise)
DO $$
DECLARE
  r record;
  v_result jsonb;
BEGIN
  FOR r IN
    SELECT id
    FROM public.get_public_domain_profile_audit()
    ORDER BY id
  LOOP
    SELECT public.delete_public_domain_user(r.id) INTO v_result;
    RAISE NOTICE 'cleanup user % => %', r.id, v_result;
  END LOOP;
END;
$$;

-- 4) Review quarantine output
SELECT
  user_id,
  email,
  college_domain,
  has_posts,
  has_connections,
  has_messages,
  quarantine_reason,
  created_at
FROM public.public_domain_account_quarantine
ORDER BY created_at DESC;
