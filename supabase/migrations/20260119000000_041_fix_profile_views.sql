-- ============================================================================
-- 041_fix_profile_views.sql - Fix profile views tracking RLS and deduplication
-- Addresses data integrity issues with profile_views table
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Add view_date column if it doesn't exist (for daily deduplication)
-- ============================================================================
ALTER TABLE public.profile_views 
  ADD COLUMN IF NOT EXISTS view_date date GENERATED ALWAYS AS (viewed_at::date) STORED;

-- ============================================================================
-- 2. Create unique index for daily deduplication (one view per viewer per profile per day)
-- This prevents spam/gaming of profile views
-- ============================================================================
DROP INDEX IF EXISTS profile_views_daily_unique;
CREATE UNIQUE INDEX profile_views_daily_unique 
  ON public.profile_views (profile_id, viewer_id, view_date)
  WHERE viewer_id IS NOT NULL;

-- Add index for faster view_date queries
CREATE INDEX IF NOT EXISTS profile_views_view_date_idx 
  ON public.profile_views(view_date);

-- ============================================================================
-- 3. Fix RLS policies for better security
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Profile views viewable by profile owner" ON public.profile_views;
DROP POLICY IF EXISTS "Anyone can record profile views" ON public.profile_views;
DROP POLICY IF EXISTS "profile_views_owner_select" ON public.profile_views;
DROP POLICY IF EXISTS "profile_views_viewer_insert" ON public.profile_views;
DROP POLICY IF EXISTS "profile_views_viewer_select" ON public.profile_views;

-- Policy 1: Profile owner can see ALL views on their profile
CREATE POLICY "profile_views_owner_can_read"
  ON public.profile_views
  FOR SELECT
  USING (profile_id = auth.uid());

-- Policy 2: Viewers can see their own view records (for transparency)
CREATE POLICY "profile_views_viewer_can_read_own"
  ON public.profile_views
  FOR SELECT
  USING (viewer_id = auth.uid());

-- Policy 3: Authenticated users can insert views, but only as themselves
-- This prevents spoofing viewer_id
CREATE POLICY "profile_views_authenticated_insert"
  ON public.profile_views
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND viewer_id = auth.uid()
    AND profile_id <> auth.uid()  -- Can't view your own profile
  );

-- ============================================================================
-- 4. Create/update the secure RPC function for counting views
-- SECURITY DEFINER bypasses RLS but function logic controls access
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_profile_views_count(p_profile_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  view_count integer;
BEGIN
  -- Allow anyone to get view count (it's semi-public info like connection count)
  -- But use SECURITY DEFINER to bypass RLS for the count query
  SELECT COUNT(*)::integer INTO view_count
  FROM public.profile_views
  WHERE profile_id = p_profile_id;
  
  RETURN COALESCE(view_count, 0);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_profile_views_count(uuid) TO authenticated;

-- ============================================================================
-- 5. Create RPC function for tracking views (handles deduplication gracefully)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.track_profile_view(
  p_profile_id uuid,
  p_viewer_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer uuid;
BEGIN
  -- Get the actual viewer (authenticated user)
  v_viewer := COALESCE(p_viewer_id, auth.uid());
  
  -- Validation
  IF v_viewer IS NULL THEN
    RETURN false;  -- Not authenticated
  END IF;
  
  IF v_viewer = p_profile_id THEN
    RETURN false;  -- Can't view your own profile
  END IF;
  
  -- Insert with ON CONFLICT to handle daily deduplication
  INSERT INTO public.profile_views (profile_id, viewer_id, viewed_at)
  VALUES (p_profile_id, v_viewer, now())
  ON CONFLICT (profile_id, viewer_id, view_date) 
  WHERE viewer_id IS NOT NULL
  DO NOTHING;
  
  RETURN true;
EXCEPTION
  WHEN others THEN
    -- Log but don't fail - view tracking is non-critical
    RAISE WARNING 'Failed to track profile view: %', SQLERRM;
    RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_profile_view(uuid, uuid) TO authenticated;

-- ============================================================================
-- 6. Ensure realtime is enabled for profile_views
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'profile_views'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_views;
  END IF;
END;
$$;

-- ============================================================================
-- 7. Clean up any duplicate views (keep earliest per day)
-- ============================================================================
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY profile_id, viewer_id, view_date 
    ORDER BY viewed_at ASC
  ) AS rn
  FROM public.profile_views
  WHERE viewer_id IS NOT NULL
)
DELETE FROM public.profile_views
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

COMMIT;
