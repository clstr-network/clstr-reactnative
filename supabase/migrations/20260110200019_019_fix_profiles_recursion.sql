-- ============================================================================
-- 019_fix_profiles_recursion.sql - Fix Profiles Table RLS Recursion
-- U-Hub Platform Database
-- ============================================================================
-- This migration fixes infinite recursion in profiles RLS policies
-- caused by policies that query the profiles table within their own check
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create helper function to get current user's college domain
-- Using SECURITY DEFINER to bypass RLS and prevent recursion
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_current_user_college_domain()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT college_domain FROM public.profiles WHERE id = auth.uid();
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_college_domain() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_college_domain() TO anon;

-- ============================================================================
-- STEP 2: Drop ALL existing policies on profiles table
-- This ensures we remove any legacy policies causing recursion
-- ============================================================================
-- Drop policies with various names that might exist from old migrations
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by same college only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all select" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- ============================================================================
-- STEP 3: Recreate profiles RLS policies WITHOUT recursion
-- Using simple, non-recursive checks
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Allow everyone to view all profiles (public profiles)
-- Domain-scoped visibility (self, same college, platform admin, or NULL domain)
CREATE POLICY "profiles_public_read" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR college_domain = public.get_current_user_college_domain()
    OR college_domain IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.is_active = true
        AND lower(pa.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- INSERT: Users can only insert their own profile
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- UPDATE: Users can only update their own profile
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- DELETE: Users can only delete their own profile
CREATE POLICY "profiles_delete_self" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- ============================================================================
-- STEP 4: Fix posts table policies (also had recursion due to college_domain check)
-- ============================================================================
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Posts viewable by same college only" ON public.posts;
DROP POLICY IF EXISTS "posts_select_public" ON public.posts;

DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can create posts in their college" ON public.posts;
DROP POLICY IF EXISTS "posts_insert_own" ON public.posts;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- SELECT: Domain-scoped visibility (self, same college, platform admin, or NULL domain)
CREATE POLICY "posts_public_read" ON public.posts
  FOR SELECT USING (
    auth.uid() = user_id
    OR college_domain = public.get_current_user_college_domain()
    OR college_domain IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.is_active = true
        AND lower(pa.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- INSERT: Users can only create their own posts
CREATE POLICY "posts_insert_self" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own posts
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "posts_update_self" ON public.posts
  FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: Users can only delete their own posts
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "posts_delete_self" ON public.posts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 5: Fix events table policies
-- ============================================================================
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
DROP POLICY IF EXISTS "Events viewable by same college only" ON public.events;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_public_read" ON public.events
  FOR SELECT USING (true);

-- ============================================================================
-- STEP 6: Fix jobs table policies
-- ============================================================================
DROP POLICY IF EXISTS "Jobs are viewable by everyone" ON public.jobs;
DROP POLICY IF EXISTS "Jobs viewable by same college only" ON public.jobs;

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs_public_read" ON public.jobs
  FOR SELECT USING (true);

-- ============================================================================
-- STEP 7: Fix messages table policies
-- ============================================================================
DROP POLICY IF EXISTS "Messages are viewable by same college only" ON public.messages;

-- ============================================================================
-- STEP 8: Fix connections table policies
-- ============================================================================
DROP POLICY IF EXISTS "Connections viewable by same college only" ON public.connections;

-- ============================================================================
-- STEP 9: Fix mentorship_offers table policies
-- ============================================================================
DROP POLICY IF EXISTS "Mentorship offers viewable by same college only" ON public.mentorship_offers;

ALTER TABLE public.mentorship_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mentorship_public_read" ON public.mentorship_offers
  FOR SELECT USING (true);

-- ============================================================================
-- STEP 10: Fix profile_experience policies (uses profiles lookup)
-- ============================================================================
DROP POLICY IF EXISTS "Users can manage their own experience" ON public.profile_experience;
CREATE POLICY "experience_manage_own" ON public.profile_experience
  FOR ALL USING (profile_id = auth.uid());

-- ============================================================================
-- STEP 11: Fix profile_education policies (uses profiles lookup)
-- ============================================================================
DROP POLICY IF EXISTS "Users can manage their own education" ON public.profile_education;
CREATE POLICY "education_manage_own" ON public.profile_education
  FOR ALL USING (profile_id = auth.uid());

-- ============================================================================
-- STEP 12: Fix profile_skills policies (uses profiles lookup)
-- ============================================================================
DROP POLICY IF EXISTS "Users can manage their own skills" ON public.profile_skills;
CREATE POLICY "skills_manage_own" ON public.profile_skills
  FOR ALL USING (profile_id = auth.uid());

COMMIT;
