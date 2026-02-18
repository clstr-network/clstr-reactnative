-- ============================================================================
-- 065_team_ups.sql - Team-Up system for hackathons and short-term events
-- Separate from long-term Projects (CollabHub)
-- Auto-expiry, structured matching, no free-text spam
-- ============================================================================

BEGIN;

-- ============================================================================
-- TEAM-UP EVENT TYPES ENUM
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_up_event_type') THEN
        CREATE TYPE team_up_event_type AS ENUM (
            'hackathon',
            'college_event',
            'competition',
            'short_term_project'
        );
    END IF;
END$$;

-- ============================================================================
-- TEAM-UP INTENT TYPES ENUM
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_up_intent') THEN
        CREATE TYPE team_up_intent AS ENUM (
            'looking_for_teammates',
            'looking_to_join'
        );
    END IF;
END$$;

-- ============================================================================
-- COMMITMENT LEVELS ENUM
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_up_commitment') THEN
        CREATE TYPE team_up_commitment AS ENUM (
            'core_member',
            'part_time',
            'flexible'
        );
    END IF;
END$$;

-- ============================================================================
-- WORK MODE ENUM
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_up_work_mode') THEN
        CREATE TYPE team_up_work_mode AS ENUM (
            'on_campus',
            'remote',
            'hybrid'
        );
    END IF;
END$$;

-- ============================================================================
-- AVAILABILITY ENUM
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_up_availability') THEN
        CREATE TYPE team_up_availability AS ENUM (
            'weekdays',
            'weekends',
            'evenings',
            'flexible'
        );
    END IF;
END$$;

-- ============================================================================
-- TIME COMMITMENT ENUM
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_up_time_commitment') THEN
        CREATE TYPE team_up_time_commitment AS ENUM (
            'under_5_hours',
            '5_to_10_hours',
            'over_10_hours'
        );
    END IF;
END$$;

-- ============================================================================
-- EXPERIENCE LEVEL ENUM
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_up_experience') THEN
        CREATE TYPE team_up_experience AS ENUM (
            'beginner',
            'intermediate',
            'advanced'
        );
    END IF;
END$$;

-- ============================================================================
-- ROLE TYPE ENUM
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_up_role_type') THEN
        CREATE TYPE team_up_role_type AS ENUM (
            'core_member',
            'support',
            'advisor'
        );
    END IF;
END$$;

-- ============================================================================
-- TEAM-UP REQUEST STATUS ENUM
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_up_request_status') THEN
        CREATE TYPE team_up_request_status AS ENUM (
            'pending',
            'accepted',
            'declined'
        );
    END IF;
END$$;

-- ============================================================================
-- PREDEFINED ROLES FOR TEAM-UPS (controlled vocabulary)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.team_up_role_definitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    category text NOT NULL, -- 'technical', 'design', 'business', 'other'
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Insert predefined roles
INSERT INTO public.team_up_role_definitions (name, category, display_order) VALUES
    ('Frontend', 'technical', 1),
    ('Backend', 'technical', 2),
    ('Full Stack', 'technical', 3),
    ('ML / AI', 'technical', 4),
    ('Data Science', 'technical', 5),
    ('DevOps', 'technical', 6),
    ('Mobile (iOS)', 'technical', 7),
    ('Mobile (Android)', 'technical', 8),
    ('Blockchain', 'technical', 9),
    ('IoT / Hardware', 'technical', 10),
    ('UI/UX Design', 'design', 11),
    ('Graphic Design', 'design', 12),
    ('Product Design', 'design', 13),
    ('Marketing', 'business', 14),
    ('Pitch / Presentation', 'business', 15),
    ('Business Strategy', 'business', 16),
    ('Project Management', 'business', 17),
    ('Research', 'other', 18),
    ('Content Writing', 'other', 19),
    ('Video / Media', 'other', 20)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- TEAM-UPS TABLE (Main entity)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.team_ups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    college_domain text NOT NULL,
    
    -- Intent
    intent team_up_intent NOT NULL,
    
    -- Event context
    event_type text NOT NULL CHECK (event_type IN ('hackathon', 'college_event', 'competition', 'short_term_project')),
    event_name text NOT NULL,
    event_deadline date NOT NULL CHECK (event_deadline >= CURRENT_DATE),
    
    -- Mode A: Looking for teammates
    team_size_target integer CHECK (team_size_target IS NULL OR (team_size_target >= 2 AND team_size_target <= 10)),
    team_size_current integer DEFAULT 1 CHECK (team_size_current >= 0),
    roles_needed text[] DEFAULT '{}'::text[], -- array of role names from team_up_role_definitions
    commitment text CHECK (commitment IS NULL OR commitment IN ('core_member', 'part_time', 'flexible')),
    work_mode text CHECK (work_mode IS NULL OR work_mode IN ('on_campus', 'remote', 'hybrid')),
    
    -- Mode B: Looking to join
    skills_offered text[] DEFAULT '{}'::text[], -- array of role names (skills)
    experience_level text CHECK (experience_level IS NULL OR experience_level IN ('beginner', 'intermediate', 'advanced')),
    availability text CHECK (availability IS NULL OR availability IN ('weekdays', 'weekends', 'evenings', 'flexible')),
    time_commitment text CHECK (time_commitment IS NULL OR time_commitment IN ('under_5_hours', '5_to_10_hours', 'over_10_hours')),
    preferred_role_type text CHECK (preferred_role_type IS NULL OR preferred_role_type IN ('core_member', 'support', 'advisor')),
    
    -- Status & expiry
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'expired', 'matched')),
    auto_expires_at timestamptz NOT NULL, -- event_deadline + 1 day
    
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS team_ups_creator_idx ON public.team_ups(creator_id);
CREATE INDEX IF NOT EXISTS team_ups_college_domain_idx ON public.team_ups(college_domain);
CREATE INDEX IF NOT EXISTS team_ups_intent_idx ON public.team_ups(intent);
CREATE INDEX IF NOT EXISTS team_ups_event_type_idx ON public.team_ups(event_type);
CREATE INDEX IF NOT EXISTS team_ups_status_idx ON public.team_ups(status);
CREATE INDEX IF NOT EXISTS team_ups_expires_idx ON public.team_ups(auto_expires_at);
CREATE INDEX IF NOT EXISTS team_ups_deadline_idx ON public.team_ups(event_deadline);
CREATE INDEX IF NOT EXISTS team_ups_created_idx ON public.team_ups(created_at DESC);

-- ============================================================================
-- TEAM-UP MEMBERS TABLE (for Mode A teams)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.team_up_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_up_id uuid NOT NULL REFERENCES public.team_ups(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    college_domain text NOT NULL,
    role_name text, -- role they were assigned
    is_creator boolean DEFAULT false,
    joined_at timestamptz DEFAULT now(),
    
    UNIQUE(team_up_id, user_id)
);

CREATE INDEX IF NOT EXISTS team_up_members_team_up_idx ON public.team_up_members(team_up_id);
CREATE INDEX IF NOT EXISTS team_up_members_user_idx ON public.team_up_members(user_id);

-- ============================================================================
-- TEAM-UP REQUESTS TABLE (structured requests - no free text)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.team_up_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_up_id uuid NOT NULL REFERENCES public.team_ups(id) ON DELETE CASCADE,
    requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    college_domain text NOT NULL,
    
    -- Request type
    request_type text NOT NULL CHECK (request_type IN ('join_request', 'invite')),
    -- join_request: user wants to join a "looking for teammates" team-up
    -- invite: team owner invites a "looking to join" user
    
    -- Structured data (no free text)
    skills text[] DEFAULT '{}'::text[], -- skills the requester brings
    availability text CHECK (availability IS NULL OR availability IN ('weekdays', 'weekends', 'evenings', 'flexible')),
    
    -- Status
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    responded_at timestamptz,
    
    UNIQUE(team_up_id, requester_id, request_type)
);

CREATE INDEX IF NOT EXISTS team_up_requests_team_up_idx ON public.team_up_requests(team_up_id);
CREATE INDEX IF NOT EXISTS team_up_requests_requester_idx ON public.team_up_requests(requester_id);
CREATE INDEX IF NOT EXISTS team_up_requests_status_idx ON public.team_up_requests(status);

-- ============================================================================
-- AUTO-EXPIRY FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION expire_team_ups()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.team_ups
    SET status = 'expired', updated_at = now()
    WHERE status = 'active'
      AND auto_expires_at < now();
END;
$$;

-- ============================================================================
-- TRIGGER TO SET AUTO-EXPIRY DATE
-- ============================================================================
CREATE OR REPLACE FUNCTION set_team_up_expiry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Auto-expire 1 day after event deadline
    NEW.auto_expires_at := (NEW.event_deadline + INTERVAL '1 day')::timestamptz;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_up_set_expiry ON public.team_ups;
CREATE TRIGGER team_up_set_expiry
    BEFORE INSERT OR UPDATE OF event_deadline ON public.team_ups
    FOR EACH ROW
    EXECUTE FUNCTION set_team_up_expiry();

-- ============================================================================
-- TRIGGER TO UPDATE team_size_current
-- ============================================================================
CREATE OR REPLACE FUNCTION update_team_up_size()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.team_ups
        SET team_size_current = (
            SELECT COUNT(*) FROM public.team_up_members WHERE team_up_id = NEW.team_up_id
        ), updated_at = now()
        WHERE id = NEW.team_up_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.team_ups
        SET team_size_current = (
            SELECT COUNT(*) FROM public.team_up_members WHERE team_up_id = OLD.team_up_id
        ), updated_at = now()
        WHERE id = OLD.team_up_id;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS team_up_member_count ON public.team_up_members;
CREATE TRIGGER team_up_member_count
    AFTER INSERT OR DELETE ON public.team_up_members
    FOR EACH ROW
    EXECUTE FUNCTION update_team_up_size();

-- ============================================================================
-- RATE LIMITING: Prevent spam (max 3 active team-ups per event per user)
-- ============================================================================
CREATE OR REPLACE FUNCTION check_team_up_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    active_count integer;
BEGIN
    SELECT COUNT(*) INTO active_count
    FROM public.team_ups
    WHERE creator_id = NEW.creator_id
      AND event_name = NEW.event_name
      AND status = 'active';
    
    IF active_count >= 3 THEN
        RAISE EXCEPTION 'Rate limit exceeded: maximum 3 active team-ups per event';
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_up_rate_limit ON public.team_ups;
CREATE TRIGGER team_up_rate_limit
    BEFORE INSERT ON public.team_ups
    FOR EACH ROW
    EXECUTE FUNCTION check_team_up_rate_limit();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE public.team_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_up_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_up_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_up_role_definitions ENABLE ROW LEVEL SECURITY;

-- Team-ups: Read own college only
DROP POLICY IF EXISTS "Users can view team-ups in their college" ON public.team_ups;
CREATE POLICY "Users can view team-ups in their college" ON public.team_ups
    FOR SELECT USING (
        college_domain = (SELECT college_domain FROM public.profiles WHERE id = auth.uid())
    );

-- Team-ups: Create own
DROP POLICY IF EXISTS "Users can create their own team-ups" ON public.team_ups;
CREATE POLICY "Users can create their own team-ups" ON public.team_ups
    FOR INSERT WITH CHECK (
        auth.uid() = creator_id
        AND college_domain = (SELECT college_domain FROM public.profiles WHERE id = auth.uid())
    );

-- Team-ups: Update own
DROP POLICY IF EXISTS "Users can update their own team-ups" ON public.team_ups;
CREATE POLICY "Users can update their own team-ups" ON public.team_ups
    FOR UPDATE USING (auth.uid() = creator_id)
    WITH CHECK (auth.uid() = creator_id);

-- Team-ups: Delete own
DROP POLICY IF EXISTS "Users can delete their own team-ups" ON public.team_ups;
CREATE POLICY "Users can delete their own team-ups" ON public.team_ups
    FOR DELETE USING (auth.uid() = creator_id);

-- Team-up members: Read same college
DROP POLICY IF EXISTS "Users can view team-up members in their college" ON public.team_up_members;
CREATE POLICY "Users can view team-up members in their college" ON public.team_up_members
    FOR SELECT USING (
        college_domain = (SELECT college_domain FROM public.profiles WHERE id = auth.uid())
    );

-- Team-up members: Insert (handled by request acceptance)
DROP POLICY IF EXISTS "Team-up creators can add members" ON public.team_up_members;
CREATE POLICY "Team-up creators can add members" ON public.team_up_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.team_ups
            WHERE id = team_up_id AND creator_id = auth.uid()
        )
        OR user_id = auth.uid() -- Allow self-join for creators
    );

-- Team-up requests: Read own or if you're the team-up creator
DROP POLICY IF EXISTS "Users can view requests they sent or received" ON public.team_up_requests;
CREATE POLICY "Users can view requests they sent or received" ON public.team_up_requests
    FOR SELECT USING (
        requester_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.team_ups
            WHERE id = team_up_id AND creator_id = auth.uid()
        )
    );

-- Team-up requests: Create own
DROP POLICY IF EXISTS "Users can create requests" ON public.team_up_requests;
CREATE POLICY "Users can create requests" ON public.team_up_requests
    FOR INSERT WITH CHECK (
        requester_id = auth.uid()
        AND college_domain = (SELECT college_domain FROM public.profiles WHERE id = auth.uid())
    );

-- Team-up requests: Update (team-up creator can accept/decline)
DROP POLICY IF EXISTS "Team-up creators can update request status" ON public.team_up_requests;
CREATE POLICY "Team-up creators can update request status" ON public.team_up_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.team_ups
            WHERE id = team_up_id AND creator_id = auth.uid()
        )
        OR (requester_id = auth.uid() AND request_type = 'invite') -- Invitee can respond to invite
    );

-- Role definitions: Everyone can read
DROP POLICY IF EXISTS "Everyone can view role definitions" ON public.team_up_role_definitions;
CREATE POLICY "Everyone can view role definitions" ON public.team_up_role_definitions
    FOR SELECT USING (true);

-- ============================================================================
-- ADD TO REALTIME PUBLICATION
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_ups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_up_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_up_requests;

-- ============================================================================
-- NOTIFICATION TRIGGER FOR REQUESTS
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_team_up_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    team_up_creator_id uuid;
    requester_name text;
    event_name text;
BEGIN
    -- Get team-up info
    SELECT tu.creator_id, tu.event_name INTO team_up_creator_id, event_name
    FROM public.team_ups tu
    WHERE tu.id = NEW.team_up_id;
    
    -- Get requester name
    SELECT full_name INTO requester_name
    FROM public.profiles
    WHERE id = NEW.requester_id;
    
    -- Insert notification
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
        team_up_creator_id,
        'team_up_request',
        'New Team Request',
        requester_name || ' wants to join your team for ' || event_name,
        jsonb_build_object(
            'team_up_id', NEW.team_up_id,
            'request_id', NEW.id,
            'requester_id', NEW.requester_id
        )
    );
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Don't fail the insert if notification fails
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_up_request_notification ON public.team_up_requests;
CREATE TRIGGER team_up_request_notification
    AFTER INSERT ON public.team_up_requests
    FOR EACH ROW
    WHEN (NEW.request_type = 'join_request')
    EXECUTE FUNCTION notify_team_up_request();

COMMIT;
