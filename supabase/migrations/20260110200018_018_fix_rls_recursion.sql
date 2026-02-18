-- ============================================================================
-- 018_fix_rls_recursion.sql - Fix Infinite Recursion in RLS Policies
-- U-Hub Platform Database
-- ============================================================================
-- This migration fixes the infinite recursion issue caused by RLS policies
-- that query their own table within the policy definition.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create SECURITY DEFINER functions to check roles without RLS
-- These functions bypass RLS and prevent recursion
-- ============================================================================

-- Function to check if user is an admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE user_id = check_user_id
  );
$$;

-- Function to check if user can manage posts (bypasses RLS)
CREATE OR REPLACE FUNCTION public.can_manage_posts(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE user_id = check_user_id 
    AND can_manage_posts = true
  );
$$;

-- Function to check if user can verify users (bypasses RLS)
CREATE OR REPLACE FUNCTION public.can_verify_users(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE user_id = check_user_id 
    AND can_verify_users = true
  );
$$;

-- Function to check if user can manage jobs (bypasses RLS)
CREATE OR REPLACE FUNCTION public.can_manage_jobs(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE user_id = check_user_id 
    AND can_manage_jobs = true
  );
$$;

-- Function to check if user can manage events (bypasses RLS)
CREATE OR REPLACE FUNCTION public.can_manage_events(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE user_id = check_user_id 
    AND can_manage_events = true
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_posts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_verify_users(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_jobs(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_events(uuid) TO authenticated;

-- ============================================================================
-- STEP 2: Fix admin_roles RLS policy (was causing recursion)
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view admin roles" ON public.admin_roles;

-- Allow users to view their own admin role record (no recursion)
CREATE POLICY "Users can view their own admin role" ON public.admin_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Allow superadmins to view all (checked via function, no recursion)
CREATE POLICY "Superadmins can view all admin roles" ON public.admin_roles
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ============================================================================
-- STEP 3: Fix moderation_actions RLS policy (was using recursive check)
-- ============================================================================
DROP POLICY IF EXISTS "Moderators can view actions" ON public.moderation_actions;

CREATE POLICY "Moderators can view actions" ON public.moderation_actions
  FOR SELECT USING (public.can_manage_posts(auth.uid()));

-- ============================================================================
-- STEP 4: Fix verification_requests policies (allow admins to view all)
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all verification requests" ON public.verification_requests;
CREATE POLICY "Admins can view all verification requests" ON public.verification_requests
  FOR SELECT USING (public.can_verify_users(auth.uid()));

DROP POLICY IF EXISTS "Admins can update verification requests" ON public.verification_requests;
CREATE POLICY "Admins can update verification requests" ON public.verification_requests
  FOR UPDATE USING (public.can_verify_users(auth.uid()));

-- ============================================================================
-- STEP 5: Fix role_change_history policies (allow admins to insert/view)
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all role history" ON public.role_change_history;
CREATE POLICY "Admins can view all role history" ON public.role_change_history
  FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert role history" ON public.role_change_history;
CREATE POLICY "Admins can insert role history" ON public.role_change_history
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================================
-- STEP 6: Fix account_deletion_audit (allow admins to view)
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view deletion audit" ON public.account_deletion_audit;
CREATE POLICY "Admins can view deletion audit" ON public.account_deletion_audit
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ============================================================================
-- STEP 7: Fix moderation_reports (allow admins to view all)
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all reports" ON public.moderation_reports;
CREATE POLICY "Admins can view all reports" ON public.moderation_reports
  FOR SELECT USING (public.can_manage_posts(auth.uid()));

DROP POLICY IF EXISTS "Admins can update reports" ON public.moderation_reports;
CREATE POLICY "Admins can update reports" ON public.moderation_reports
  FOR UPDATE USING (public.can_manage_posts(auth.uid()));

-- ============================================================================
-- STEP 8: Add admin policies for post_reports
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all post reports" ON public.post_reports;
CREATE POLICY "Admins can view all post reports" ON public.post_reports
  FOR SELECT USING (public.can_manage_posts(auth.uid()));

COMMIT;
