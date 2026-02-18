-- ============================================================================
-- 115_close_global_rls_bypass_profiles_posts.sql
-- Closes stale permissive RLS policies that bypassed college isolation.
-- ============================================================================

BEGIN;

-- Ensure helper exists (used in policy predicates)
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

-- Profiles: remove permissive/stale SELECT policies
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Allow all select" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_same_college" ON public.profiles;

CREATE POLICY "profiles_select_same_college" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR college_domain = public.get_user_college_domain()
    OR college_domain IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.is_active = true
        AND lower(pa.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- Posts: remove permissive/stale SELECT policies
DROP POLICY IF EXISTS "posts_public_read" ON public.posts;
DROP POLICY IF EXISTS "posts_select_public" ON public.posts;
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "posts_select_same_college" ON public.posts;
DROP POLICY IF EXISTS "Posts are viewable by same college" ON public.posts;

CREATE POLICY "posts_select_same_college" ON public.posts
  FOR SELECT USING (
    auth.uid() = user_id
    OR college_domain = public.get_user_college_domain()
    OR college_domain IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.is_active = true
        AND lower(pa.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- Governance: managers are review-only in feed, cannot create/update/delete posts.
-- Existing self policies may still exist from prior migrations, so replace them deterministically.
DROP POLICY IF EXISTS "posts_insert_self" ON public.posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;
CREATE POLICY "posts_insert_self" ON public.posts
  FOR INSERT WITH CHECK (
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
CREATE POLICY "posts_update_self" ON public.posts
  FOR UPDATE USING (
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
CREATE POLICY "posts_delete_self" ON public.posts
  FOR DELETE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND coalesce(lower(p.role::text), '') <> 'manager'
    )
  );

COMMIT;
