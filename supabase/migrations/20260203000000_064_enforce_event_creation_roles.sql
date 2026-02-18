-- ============================================================================
-- 064_enforce_event_creation_roles.sql - Enforce Event Creation Role Restrictions
-- U-Hub Platform - February 3, 2026
-- ============================================================================
-- 
-- CRITICAL FIX: The previous RLS policy allowed ANY authenticated user to create
-- events, but the application's permission matrix restricts event creation to
-- Faculty and Club roles only. This migration enforces that restriction at the
-- database level.
--
-- FINAL Event Permission Matrix:
-- | Feature       | Student | Alumni | Faculty | Club |
-- |---------------|---------|--------|---------|------|
-- | View Events   | ✅      | ✅     | ✅      | ✅   |
-- | Attend / RSVP | ✅      | ✅     | ✅      | ✅   |
-- | Create Events | 🚫      | 🚫     | ✅      | ✅   |
-- | Manage Events | 🚫      | 🚫     | ✅      | ✅   |
-- ============================================================================

BEGIN;

-- ============================================================================
-- DROP AND RECREATE EVENT INSERT POLICY WITH ROLE CHECK
-- ============================================================================

-- Drop the old permissive policy
DROP POLICY IF EXISTS "Users can create events" ON public.events;

-- Create new policy that enforces role restrictions
-- Only Faculty, Principal, Dean, and Club users can create events
CREATE POLICY "Only Faculty and Club can create events" ON public.events
  FOR INSERT WITH CHECK (
    auth.uid() = creator_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Faculty', 'Principal', 'Dean', 'Club')
    )
  );

COMMENT ON POLICY "Only Faculty and Club can create events" ON public.events IS
  'Enforces the permission matrix: only Faculty (including Principal/Dean) and Club profiles can create events. Students and Alumni cannot create events.';

-- ============================================================================
-- UPDATE AND DELETE POLICIES WITH ROLE CHECK
-- ============================================================================

-- Drop and recreate update policy with role check
DROP POLICY IF EXISTS "Creators can update their events" ON public.events;

CREATE POLICY "Only creators with Faculty or Club role can update events" ON public.events
  FOR UPDATE USING (
    auth.uid() = creator_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Faculty', 'Principal', 'Dean', 'Club')
    )
  );

-- Drop and recreate delete policy with role check
DROP POLICY IF EXISTS "Creators can delete their events" ON public.events;

CREATE POLICY "Only creators with Faculty or Club role can delete events" ON public.events
  FOR DELETE USING (
    auth.uid() = creator_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Faculty', 'Principal', 'Dean', 'Club')
    )
  );

-- ============================================================================
-- CLUB INTERACTION POLICIES - Enforce Join vs Follow distinction
-- ============================================================================
-- 
-- Club Interaction Matrix:
-- | Feature     | Student | Alumni | Faculty | Club |
-- |-------------|---------|--------|---------|------|
-- | View Clubs  | ✅      | ✅     | ✅      | ✅   |
-- | Join Club   | ✅      | 🚫     | 🚫      | 🚫   |
-- | Follow Club | 🚫      | ✅     | 🚫      | 🚫   |
-- | Manage Club | 🚫      | 🚫     | 🚫      | ✅   |
--
-- Note: "Join" and "Follow" both use the connections table with:
-- - requester_id = current user
-- - receiver_id = club profile
-- - status = 'accepted'
--
-- The distinction is semantic/UI-level:
-- - Students "join" clubs (implies membership)
-- - Alumni "follow" clubs (implies observation)
-- - Faculty and Club profiles cannot join/follow clubs
-- ============================================================================

-- Ensure the connections policy restricts who can connect to Club profiles
-- We need to add a check that only Students and Alumni can create connections
-- where the receiver is a Club profile

-- First, create a helper function to check if a connection to a Club is valid
CREATE OR REPLACE FUNCTION public.is_valid_club_connection(
  p_requester_id uuid,
  p_receiver_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_requester_role text;
  v_receiver_role text;
BEGIN
  -- Get the roles of both parties
  SELECT role INTO v_requester_role FROM public.profiles WHERE id = p_requester_id;
  SELECT role INTO v_receiver_role FROM public.profiles WHERE id = p_receiver_id;
  
  -- If receiver is not a Club, this function doesn't restrict (normal connection logic applies)
  IF v_receiver_role != 'Club' THEN
    RETURN true;
  END IF;
  
  -- If receiver IS a Club:
  -- - Students can connect (join)
  -- - Alumni can connect (follow)
  -- - Faculty and Club profiles CANNOT connect
  IF v_requester_role IN ('Student', 'Alumni') THEN
    RETURN true;
  END IF;
  
  -- Faculty, Club, or other roles cannot follow/join clubs
  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.is_valid_club_connection(uuid, uuid) IS
  'Validates club connections per permission matrix: Only Students (join) and Alumni (follow) can connect to Club profiles. Faculty and Club profiles cannot.';

-- ============================================================================
-- ENFORCE CLUB CONNECTION POLICY ON CONNECTIONS TABLE
-- ============================================================================
-- This policy uses the helper function to restrict who can connect to Club profiles

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Users can create connections in their college" ON public.connections;
DROP POLICY IF EXISTS "Users can send connection requests" ON public.connections;

-- Create new insert policy that validates club connections
CREATE POLICY "Users can create connections with club validation" ON public.connections
  FOR INSERT WITH CHECK (
    auth.uid() = requester_id
    AND public.is_valid_club_connection(requester_id, receiver_id)
  );

COMMENT ON POLICY "Users can create connections with club validation" ON public.connections IS
  'Allows users to create connections, but validates club connections per permission matrix: only Students and Alumni can connect to Club profiles.';

-- ============================================================================
-- ADD INDEX FOR PERFORMANCE ON ROLE CHECKS
-- ============================================================================

-- Index to speed up the role checks in RLS policies
CREATE INDEX IF NOT EXISTS profiles_id_role_idx ON public.profiles(id, role);

COMMIT;
