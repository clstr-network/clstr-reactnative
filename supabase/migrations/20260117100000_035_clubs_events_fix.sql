-- ============================================================================
-- 035_clubs_events_fix.sql - Fix clubs and events features
-- U-Hub Platform - January 17, 2026
-- ============================================================================
-- 
-- Key Changes:
-- 1. Add external_registration_link to events table for Google Forms / external links
-- 2. Add registration_click_count to events to track "Register Now" clicks
-- 3. Create function to auto-create club entry when user signs up with role='Club'
-- 4. Add trigger to sync club profiles with clubs table
-- ============================================================================

BEGIN;

-- ============================================================================
-- ADD MISSING COLUMNS TO CLUBS TABLE (if not exist)
-- ============================================================================
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS short_description text;

ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT true;

ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS members_count integer DEFAULT 0;

ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS member_count integer DEFAULT 0;

-- ============================================================================
-- ADD EXTERNAL REGISTRATION LINK TO EVENTS
-- ============================================================================
-- This allows club organizers to add Google Form or external registration links

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS external_registration_link text;

COMMENT ON COLUMN public.events.external_registration_link IS 'External URL (e.g., Google Form) for event registration. When set, Register Now redirects here.';

-- ============================================================================
-- ADD REGISTRATION CLICK COUNT TO EVENTS
-- ============================================================================
-- Tracks how many times "Register Now" was clicked, regardless of actual registration

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS registration_click_count integer DEFAULT 0;

COMMENT ON COLUMN public.events.registration_click_count IS 'Count of Register Now button clicks for external link events.';

-- ============================================================================
-- CREATE FUNCTION TO INCREMENT REGISTRATION CLICK COUNT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_event_registration_click(event_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE public.events 
  SET registration_click_count = COALESCE(registration_click_count, 0) + 1
  WHERE id = event_id_param
  RETURNING registration_click_count INTO new_count;
  
  RETURN new_count;
END;
$$;

COMMENT ON FUNCTION public.increment_event_registration_click(uuid) IS 'Atomically increments the registration click count for an event with external registration link.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_event_registration_click(uuid) TO authenticated;

-- ============================================================================
-- AUTO-CREATE CLUB ENTRY FOR CLUB ROLE USERS
-- ============================================================================
-- When a user's profile has role='Club', automatically create a clubs entry

CREATE OR REPLACE FUNCTION public.sync_club_profile_to_clubs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only proceed if role is 'Club'
  IF NEW.role = 'Club' THEN
    -- Check if club already exists for this user
    IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE created_by = NEW.id) THEN
      -- Insert new club entry using profile data
      INSERT INTO public.clubs (
        name,
        description,
        short_description,
        college_domain,
        contact_email,
        logo_url,
        created_by,
        is_active,
        is_verified,
        requires_approval,
        members_count,
        member_count
      ) VALUES (
        COALESCE(NEW.full_name, 'New Club'),
        COALESCE(NEW.bio, 'Club profile'),
        COALESCE(NEW.headline, ''),
        NEW.college_domain,
        NEW.email,
        NEW.avatar_url,
        NEW.id,
        true,
        COALESCE(NEW.is_verified, false),
        true,
        1,
        1
      );
      
      -- Also make the user an admin member of their own club
      INSERT INTO public.club_members (
        club_id,
        user_id,
        role,
        status
      ) 
      SELECT c.id, NEW.id, 'admin', 'approved'
      FROM public.clubs c
      WHERE c.created_by = NEW.id
      ON CONFLICT (club_id, user_id) DO NOTHING;
    ELSE
      -- Update existing club with profile changes
      UPDATE public.clubs
      SET 
        name = COALESCE(NEW.full_name, name),
        description = COALESCE(NEW.bio, description),
        short_description = COALESCE(NEW.headline, short_description),
        college_domain = COALESCE(NEW.college_domain, college_domain),
        contact_email = COALESCE(NEW.email, contact_email),
        logo_url = COALESCE(NEW.avatar_url, logo_url),
        is_verified = COALESCE(NEW.is_verified, is_verified),
        updated_at = now()
      WHERE created_by = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_club_profile_to_clubs() IS 'Automatically creates/updates club entry when profile role is Club';

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS sync_club_profile_trigger ON public.profiles;

-- Create trigger to run on profile insert/update
CREATE TRIGGER sync_club_profile_trigger
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_club_profile_to_clubs();

-- ============================================================================
-- SYNC EXISTING CLUB PROFILES
-- ============================================================================
-- One-time sync for existing users with role='Club' who don't have clubs entries

INSERT INTO public.clubs (
  name,
  description,
  short_description,
  college_domain,
  contact_email,
  logo_url,
  created_by,
  is_active,
  is_verified,
  requires_approval,
  members_count,
  member_count
)
SELECT 
  COALESCE(p.full_name, 'Club'),
  COALESCE(p.bio, 'Club profile'),
  COALESCE(p.headline, ''),
  p.college_domain,
  p.email,
  p.avatar_url,
  p.id,
  true,
  COALESCE(p.is_verified, false),
  true,
  1,
  1
FROM public.profiles p
WHERE p.role = 'Club'
  AND NOT EXISTS (SELECT 1 FROM public.clubs c WHERE c.created_by = p.id);

-- Make existing club users admin members of their clubs
INSERT INTO public.club_members (club_id, user_id, role, status)
SELECT c.id, c.created_by, 'admin', 'approved'
FROM public.clubs c
JOIN public.profiles p ON p.id = c.created_by
WHERE p.role = 'Club'
ON CONFLICT (club_id, user_id) DO UPDATE SET role = 'admin', status = 'approved';

-- ============================================================================
-- ADD INDEX FOR FASTER CLUB LOOKUPS
-- ============================================================================

CREATE INDEX IF NOT EXISTS clubs_created_by_idx ON public.clubs(created_by);

-- ============================================================================
-- ENABLE REALTIME FOR EVENTS TABLE UPDATES
-- ============================================================================
-- Note: Using DO block to handle tables that may already be in publication

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'clubs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clubs;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'club_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.club_members;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

COMMIT;
