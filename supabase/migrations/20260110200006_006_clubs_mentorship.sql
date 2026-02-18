-- ============================================================================
-- 006_clubs_mentorship.sql - Clubs and Mentorship tables
-- U-Hub Platform Database Baseline
-- ============================================================================

BEGIN;

-- ============================================================================
-- CLUBS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  short_description text,
  club_type text,
  college_domain text,
  category text,
  logo_url text,
  cover_image_url text,
  contact_email text,
  website_url text,
  meeting_location text,
  meeting_schedule text,
  social_links jsonb DEFAULT '{}'::jsonb,
  tags text[] DEFAULT '{}',
  member_count integer DEFAULT 0,
  members_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  requires_approval boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clubs_college_domain_idx ON public.clubs(college_domain);
CREATE INDEX IF NOT EXISTS clubs_category_idx ON public.clubs(category);
CREATE INDEX IF NOT EXISTS clubs_is_active_idx ON public.clubs(is_active);
CREATE INDEX IF NOT EXISTS clubs_created_at_idx ON public.clubs(created_at DESC);

-- ============================================================================
-- CLUB MEMBERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member',
  status text DEFAULT 'active',
  join_reason text,
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(club_id, user_id)
);

CREATE INDEX IF NOT EXISTS club_members_club_id_idx ON public.club_members(club_id);
CREATE INDEX IF NOT EXISTS club_members_user_id_idx ON public.club_members(user_id);
CREATE INDEX IF NOT EXISTS club_members_role_idx ON public.club_members(role);

-- ============================================================================
-- MENTORSHIP OFFERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mentorship_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  college_domain text,
  expertise_areas text[] DEFAULT '{}',
  mentorship_type text,
  available_slots integer DEFAULT 3,
  current_mentees integer DEFAULT 0,
  is_active boolean DEFAULT true,
  availability_schedule text,
  session_duration text,
  preferred_communication text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mentorship_offers_mentor_id_idx ON public.mentorship_offers(mentor_id);
CREATE INDEX IF NOT EXISTS mentorship_offers_college_domain_idx ON public.mentorship_offers(college_domain);
CREATE INDEX IF NOT EXISTS mentorship_offers_is_active_idx ON public.mentorship_offers(is_active);

-- ============================================================================
-- MENTORSHIP REQUESTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mentorship_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mentor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  college_domain text,
  message text,
  topics text[] DEFAULT '{}',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mentorship_requests_mentee_id_idx ON public.mentorship_requests(mentee_id);
CREATE INDEX IF NOT EXISTS mentorship_requests_mentor_id_idx ON public.mentorship_requests(mentor_id);
CREATE INDEX IF NOT EXISTS mentorship_requests_status_idx ON public.mentorship_requests(status);

COMMIT;
