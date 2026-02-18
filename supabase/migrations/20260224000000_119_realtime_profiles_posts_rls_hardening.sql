-- ============================================================================
-- 119_realtime_profiles_posts_rls_hardening.sql
-- Final hardening for profiles/posts RLS so realtime cannot leak cross-college.
-- This migration is forward-only and safe for environments where prior policies
-- were already applied under different names.
-- ============================================================================

BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_user_college_domain()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT college_domain FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_user_college_domain() TO authenticated;

-- Remove every existing SELECT policy on profiles/posts, regardless of old naming.
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', rec.policyname);
  END LOOP;

  FOR rec IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'posts'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.posts', rec.policyname);
  END LOOP;
END
$$;

-- Profiles visibility: self, same-college, or active platform admin.
-- IMPORTANT: no global read fallback and no college_domain IS NULL wildcard read.
CREATE POLICY "profiles_select_same_college"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR (
      college_domain IS NOT NULL
      AND college_domain = public.get_user_college_domain()
    )
    OR EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.is_active = true
        AND lower(pa.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- Posts visibility: self, same-college, or active platform admin.
-- IMPORTANT: no global read fallback and no college_domain IS NULL wildcard read.
CREATE POLICY "posts_select_same_college"
  ON public.posts
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      college_domain IS NOT NULL
      AND college_domain = public.get_user_college_domain()
    )
    OR EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.is_active = true
        AND lower(pa.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- Governance: managers are review-only; no write access to posts.
DROP POLICY IF EXISTS "posts_insert_self" ON public.posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;
CREATE POLICY "posts_insert_self"
  ON public.posts
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND coalesce(lower(p.role::text), '') <> 'manager'
    )
  );

DROP POLICY IF EXISTS "posts_update_self" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "posts_update_self"
  ON public.posts
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND coalesce(lower(p.role::text), '') <> 'manager'
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND coalesce(lower(p.role::text), '') <> 'manager'
    )
  );

DROP POLICY IF EXISTS "posts_delete_self" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "posts_delete_self"
  ON public.posts
  FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND coalesce(lower(p.role::text), '') <> 'manager'
    )
  );

COMMIT;
