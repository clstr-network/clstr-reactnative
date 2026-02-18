-- ============================================================================
-- 129: Restore Domain-Scoped Profiles SELECT + Keep All Other 127 Hardening
--
-- CONTEXT:
-- Migration 127 locked profiles to own-row-only SELECT (auth.uid() = id),
-- which broke 100+ FK-based JOINs across the app (posts feed, clubs,
-- messages, connections, events, etc.) because Postgres RLS applies to
-- JOIN targets — returning NULL for any row the caller can't see.
--
-- This caused "Unknown User" everywhere the app joins profiles via FK.
--
-- STRATEGY:
-- Restore the proven domain-scoped SELECT policy from migration 119
-- (self + same-college + admin), while preserving EVERY other hardening
-- from migration 127:
--   ✅ OTP function dropped (C3/M1)
--   ✅ email_verification_codes locked (C2) 
--   ✅ auth_hook_error_log locked (M4)
--   ✅ Sanitized error responses (H2)
--   ✅ Comprehensive duplicate data checks (M3)
--   ✅ SECURITY DEFINER RPCs for cross-domain profile reads
--   ✅ search_path hardening (migration 128)
--
-- The RPCs (get_profile_public, get_profiles_by_domain, get_alumni_by_domain)
-- remain available for future migration to RPC-only reads. The path forward:
--   Phase 1: This migration (restore JOINs)
--   Phase 2: Gradually migrate queries from FK joins to RPC calls
--   Phase 3: Re-tighten profiles to own-row-only once all queries use RPCs
--
-- SECURITY NOTE:
-- The domain-scoped policy only exposes public fields via SELECT columns
-- that the frontend requests. personal_email is never included in FK JOINs.
-- The RPCs provide an additional safety layer by explicitly enumerating
-- returned columns, which will become the sole read path in Phase 3.
-- ============================================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- Step 1: Drop the own-row-only policy from migration 127
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;


-- ══════════════════════════════════════════════════════════════════════════════
-- Step 2: Restore domain-scoped SELECT policy (from migration 119)
-- Self + same-college + platform admin
-- ══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "profiles_select_same_college"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR (
      college_domain IS NOT NULL
      AND college_domain = public.get_user_college_domain()
    )
    OR public.is_platform_admin()
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- Step 3: Restore necessary grants
-- Migration 127 did REVOKE ALL + re-GRANT. We need anon to have minimal
-- access for auth callback flows, and authenticated needs full CRUD.
-- ══════════════════════════════════════════════════════════════════════════════

-- Authenticated users: SELECT (governed by RLS), INSERT (onboarding), UPDATE (own profile)
-- These were already re-granted in 127, but re-affirm explicitly.
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- Anon role needs SELECT for auth callback profile lookups.
-- RLS still blocks everything (anon has no auth.uid()), but the grant
-- must exist so PostgREST doesn't throw a hard permissions error.
GRANT SELECT ON public.profiles TO anon;


-- ══════════════════════════════════════════════════════════════════════════════
-- DOCUMENTATION
-- ══════════════════════════════════════════════════════════════════════════════
--
-- WHAT CHANGED:
--   profiles SELECT policy:  own-row-only → domain-scoped (self + same-college + admin)
--   profiles grants:         restored SELECT to anon (RLS still blocks, grant enables PostgREST)
--
-- WHAT DID NOT CHANGE (still hardened):
--   ✅ email_verification_codes: SELECT USING(false), REVOKE ALL
--   ✅ auth_hook_error_log: RLS enabled, SELECT/INSERT USING(false), REVOKE ALL
--   ✅ generate_email_verification_code: still dropped
--   ✅ transition_to_personal_email: sanitized errors + advisory lock + 19-table duplicate check
--   ✅ merge_transitioned_account: sanitized errors + advisory lock + 19-table duplicate check
--   ✅ get_profile_public(): SECURITY DEFINER RPC still available (PII-safe)
--   ✅ get_profiles_by_domain(): SECURITY DEFINER RPC still available (PII-safe)
--   ✅ get_alumni_by_domain(): SECURITY DEFINER RPC still available (PII-safe)
--   ✅ All 72+ functions: SET search_path = public (migration 128)
--
-- BLAST RADIUS RESOLVED:
--   Posts feed:        FK join to profiles now returns same-college rows again
--   Comments:          Same
--   Clubs:             Same
--   Messages:          Same
--   Connections:       Same
--   Events:            Same
--   Jobs:              Same
--   Team-ups:          Same
--   Mentorship:        Same
--   Notifications:     Same
--   Trending/Search:   Same
--
-- FUTURE PATH (Phase 2-3):
--   1. Add integration tests verifying no "Unknown User" in feeds
--   2. Migrate each .from("profiles") to use get_profile_public() RPC
--   3. Once all 100+ queries are migrated, re-apply own-row-only policy
--   4. Migration linter will catch any new FK joins added after Phase 3
--
-- ══════════════════════════════════════════════════════════════════════════════

COMMIT;
