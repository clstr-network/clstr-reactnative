-- ====================================================================
-- RLS Policies for Email-Verification-First Onboarding Flow
-- ====================================================================
-- DEPRECATED: This migration's policies are superseded by 
-- 20260118000000_fix_profiles_rls_and_add_verification.sql
-- Keeping for historical reference only.
-- ====================================================================

BEGIN;

-- This migration has been superseded - all policy management is now
-- handled by 20260118000000_fix_profiles_rls_and_add_verification.sql
-- to avoid duplicate/conflicting policies.

-- Just ensure RLS is enabled and add performance indexes
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Performance indexes (safe to create multiple times with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_profiles_domain ON profiles(domain);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_complete ON profiles(onboarding_complete);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT DELETE ON profiles TO authenticated;

COMMIT;
