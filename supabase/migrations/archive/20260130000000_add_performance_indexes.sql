-- ============================================================================
-- PERFORMANCE OPTIMIZATION: Add Composite Indexes
-- ============================================================================
-- Created: 2025-01-30
-- Purpose: Optimize common query patterns for profile lookups
-- Impact: Faster queries for domain-based filtering, role checks, and user searches
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. DOMAIN + ROLE COMPOSITE INDEX
-- ============================================================================
-- Optimizes queries that filter by domain AND role (common in ProfileContext)
-- Example: SELECT * FROM profiles WHERE domain = 'university.edu' AND role = 'student'
CREATE INDEX IF NOT EXISTS idx_profiles_domain_role 
ON public.profiles(domain, role) 
WHERE domain IS NOT NULL;

-- ============================================================================
-- 2. DOMAIN + UPDATED_AT INDEX
-- ============================================================================
-- Optimizes queries that get latest profiles from a domain
-- Example: SELECT * FROM profiles WHERE domain = 'university.edu' ORDER BY updated_at DESC
CREATE INDEX IF NOT EXISTS idx_profiles_domain_updated 
ON public.profiles(domain, updated_at DESC) 
WHERE domain IS NOT NULL;

-- ============================================================================
-- 3. PROFILE COMPLETION INDEX
-- ============================================================================
-- Optimizes queries filtering by completion status
-- Example: SELECT * FROM profiles WHERE profile_completion >= 50
CREATE INDEX IF NOT EXISTS idx_profiles_completion 
ON public.profiles(profile_completion) 
WHERE profile_completion IS NOT NULL;

-- ============================================================================
-- 4. EMAIL DOMAIN PARTIAL INDEX
-- ============================================================================
-- Optimizes lookups by email domain for verification
CREATE INDEX IF NOT EXISTS idx_profiles_email_domain 
ON public.profiles(lower(email)) 
WHERE email IS NOT NULL;

-- ============================================================================
-- 5. ONBOARDING STATUS INDEX
-- ============================================================================
-- Optimizes queries filtering users needing onboarding
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding 
ON public.profiles(onboarding_complete, profile_completion) 
WHERE onboarding_complete IS NOT NULL;

-- ============================================================================
-- 6. DOMAIN USER LOOKUP OPTIMIZATION
-- ============================================================================
-- Composite index for the most common ProfileContext query pattern
-- This covers: domain filtering, excludes specific user, orders by updated_at
CREATE INDEX IF NOT EXISTS idx_profiles_domain_users_lookup 
ON public.profiles(domain, updated_at DESC, id) 
WHERE domain IS NOT NULL AND profile_completion IS NOT NULL;

-- ============================================================================
-- 7. ROLE + DOMAIN FOR VERIFICATION QUERIES
-- ============================================================================
-- Optimizes admin queries filtering by role across domains
CREATE INDEX IF NOT EXISTS idx_profiles_role_domain 
ON public.profiles(role, domain) 
WHERE role IS NOT NULL;

-- ============================================================================
-- 8. FULL TEXT SEARCH OPTIMIZATION (if using search)
-- ============================================================================
-- Creates GIN index for faster text searches on names and headlines
CREATE INDEX IF NOT EXISTS idx_profiles_search_text 
ON public.profiles 
USING gin(to_tsvector('english', coalesce(full_name, '') || ' ' || coalesce(headline, '') || ' ' || coalesce(bio, '')));

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify index usage:
-- 
-- EXPLAIN ANALYZE SELECT * FROM profiles WHERE domain = 'university.edu' AND role = 'student';
-- EXPLAIN ANALYZE SELECT * FROM profiles WHERE domain = 'university.edu' ORDER BY updated_at DESC LIMIT 50;
-- EXPLAIN ANALYZE SELECT * FROM profiles WHERE profile_completion >= 50;
-- EXPLAIN ANALYZE SELECT * FROM profiles WHERE onboarding_complete = false;
-- ============================================================================

-- ============================================================================
-- MAINTENANCE NOTES
-- ============================================================================
-- These indexes will be automatically maintained by PostgreSQL
-- Monitor index bloat periodically with: 
--   SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid))
--   FROM pg_stat_user_indexes WHERE schemaname = 'public' AND tablename = 'profiles';
-- 
-- Reindex if needed: REINDEX TABLE public.profiles;
-- ============================================================================
