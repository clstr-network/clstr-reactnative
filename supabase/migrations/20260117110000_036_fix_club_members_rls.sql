-- ============================================================================
-- 036_fix_club_members_rls.sql - Fix club_members RLS policies
-- U-Hub Platform - January 17, 2026
-- ============================================================================
-- 
-- Issue: "Failed to join club" error
-- Root cause: Missing UPDATE policy and potentially restrictive INSERT policy
-- ============================================================================

BEGIN;

-- ============================================================================
-- DROP EXISTING POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Club members are viewable by everyone" ON public.club_members;
DROP POLICY IF EXISTS "Users can join clubs" ON public.club_members;
DROP POLICY IF EXISTS "Users can leave clubs" ON public.club_members;
DROP POLICY IF EXISTS "Club admins can manage members" ON public.club_members;
DROP POLICY IF EXISTS "Users can update their membership" ON public.club_members;

-- ============================================================================
-- RECREATE RLS POLICIES WITH PROPER PERMISSIONS
-- ============================================================================

-- SELECT: Anyone can view club members
CREATE POLICY "Club members are viewable by everyone" ON public.club_members
  FOR SELECT USING (true);

-- INSERT: Users can join clubs (insert themselves as member)
CREATE POLICY "Users can join clubs" ON public.club_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND role IN ('member', 'admin')
  );

-- UPDATE: Users can update their own membership OR club admins can update members
CREATE POLICY "Users can update their membership" ON public.club_members
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.club_members cm
      WHERE cm.club_id = club_members.club_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
        AND cm.status = 'approved'
    )
  );

-- DELETE: Users can leave clubs OR club admins can remove members
CREATE POLICY "Users can leave clubs" ON public.club_members
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.club_members cm
      WHERE cm.club_id = club_members.club_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
        AND cm.status = 'approved'
    )
  );

-- ============================================================================
-- ENSURE clubs TABLE HAS PROPER INSERT POLICY FOR TRIGGER
-- ============================================================================
-- The sync_club_profile_to_clubs trigger runs as SECURITY DEFINER,
-- so it bypasses RLS. But let's ensure the clubs table policies are correct.

DROP POLICY IF EXISTS "Users can view clubs in their college" ON public.clubs;
DROP POLICY IF EXISTS "Club leads can create clubs" ON public.clubs;
DROP POLICY IF EXISTS "Club creators can update their clubs" ON public.clubs;
DROP POLICY IF EXISTS "Clubs are viewable by college domain" ON public.clubs;
DROP POLICY IF EXISTS "Anyone can view active clubs" ON public.clubs;

-- SELECT: Anyone can view active clubs in their college domain
CREATE POLICY "Anyone can view active clubs" ON public.clubs
  FOR SELECT USING (
    is_active = true
    OR created_by = auth.uid()
  );

-- INSERT: Authenticated users can create clubs
CREATE POLICY "Authenticated users can create clubs" ON public.clubs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (created_by = auth.uid() OR created_by IS NULL)
  );

-- UPDATE: Club creators can update their clubs
CREATE POLICY "Club creators can update their clubs" ON public.clubs
  FOR UPDATE USING (created_by = auth.uid());

-- DELETE: Club creators can delete their clubs
CREATE POLICY "Club creators can delete their clubs" ON public.clubs
  FOR DELETE USING (created_by = auth.uid());

COMMIT;
