-- ============================================================================
-- 066_team_ups_enhancements.sql - Team-Up Production Hardening
-- Addresses: freshness tracking, cooldown, race conditions, social proof, admin visibility
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FRESHNESS TRACKING - Add activity timestamps for staleness detection
-- ============================================================================

-- Add freshness/activity tracking columns
ALTER TABLE public.team_ups 
ADD COLUMN IF NOT EXISTS last_request_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_member_added_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS request_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS decline_count integer DEFAULT 0;

COMMENT ON COLUMN public.team_ups.last_request_at IS 'Timestamp of last request received - used for freshness detection';
COMMENT ON COLUMN public.team_ups.last_member_added_at IS 'Timestamp of last member added - used for activity scoring';
COMMENT ON COLUMN public.team_ups.request_count IS 'Total requests received - used for popularity metrics';
COMMENT ON COLUMN public.team_ups.decline_count IS 'Total declined requests - used for admin abuse detection';

-- Create index for admin queries on stale team-ups
CREATE INDEX IF NOT EXISTS team_ups_last_request_idx ON public.team_ups(last_request_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS team_ups_activity_idx ON public.team_ups(created_at, request_count) WHERE status = 'active';

-- ============================================================================
-- 2. SOCIAL PROOF - Track completed team-ups per user
-- ============================================================================

-- Add completed team-ups counter to profiles (for social proof)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS completed_team_ups_count integer DEFAULT 0;

COMMENT ON COLUMN public.profiles.completed_team_ups_count IS 'Number of successfully completed team-ups - social proof signal';

-- ============================================================================
-- 3. COOLDOWN ENFORCEMENT - Prevent delete/repost spam
-- ============================================================================

-- Create table to track team-up deletion cooldowns
CREATE TABLE IF NOT EXISTS public.team_up_cooldowns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_name text NOT NULL,
    college_domain text NOT NULL,
    deleted_at timestamptz NOT NULL DEFAULT now(),
    cooldown_until timestamptz NOT NULL,
    
    -- Composite index for efficient lookup
    UNIQUE(user_id, event_name, college_domain)
);

CREATE INDEX IF NOT EXISTS team_up_cooldowns_lookup_idx 
ON public.team_up_cooldowns(user_id, event_name, college_domain, cooldown_until);

COMMENT ON TABLE public.team_up_cooldowns IS 'Tracks cooldown periods after team-up deletion to prevent spam';

-- RLS for cooldowns table
ALTER TABLE public.team_up_cooldowns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own cooldowns" ON public.team_up_cooldowns;
CREATE POLICY "Users can view own cooldowns" ON public.team_up_cooldowns
    FOR SELECT USING (user_id = auth.uid());

-- ============================================================================
-- 4. TRIGGER: Update freshness on new request
-- ============================================================================

CREATE OR REPLACE FUNCTION update_team_up_request_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update request count and last_request_at
        UPDATE public.team_ups
        SET 
            last_request_at = now(),
            request_count = COALESCE(request_count, 0) + 1,
            updated_at = now()
        WHERE id = NEW.team_up_id;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Track declines for abuse detection
        IF NEW.status = 'declined' AND OLD.status = 'pending' THEN
            UPDATE public.team_ups
            SET decline_count = COALESCE(decline_count, 0) + 1
            WHERE id = NEW.team_up_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_up_request_stats_trigger ON public.team_up_requests;
CREATE TRIGGER team_up_request_stats_trigger
    AFTER INSERT OR UPDATE ON public.team_up_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_team_up_request_stats();

-- ============================================================================
-- 5. TRIGGER: Update freshness on member addition
-- ============================================================================

CREATE OR REPLACE FUNCTION update_team_up_member_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NOT NEW.is_creator THEN
        -- Update last_member_added_at (only for non-creator members)
        UPDATE public.team_ups
        SET 
            last_member_added_at = now(),
            updated_at = now()
        WHERE id = NEW.team_up_id;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_up_member_stats_trigger ON public.team_up_members;
CREATE TRIGGER team_up_member_stats_trigger
    AFTER INSERT ON public.team_up_members
    FOR EACH ROW
    EXECUTE FUNCTION update_team_up_member_stats();

-- ============================================================================
-- 6. COOLDOWN CHECK FUNCTION - Called before creating new team-up
-- ============================================================================

CREATE OR REPLACE FUNCTION check_team_up_cooldown(
    p_user_id uuid,
    p_event_name text,
    p_college_domain text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cooldown_until timestamptz;
BEGIN
    -- Check for active cooldown
    SELECT cooldown_until INTO v_cooldown_until
    FROM public.team_up_cooldowns
    WHERE user_id = p_user_id
      AND event_name = p_event_name
      AND college_domain = p_college_domain
      AND cooldown_until > now()
    LIMIT 1;
    
    IF v_cooldown_until IS NOT NULL THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'cooldown_until', v_cooldown_until,
            'message', 'You must wait before creating another team-up for this event'
        );
    END IF;
    
    RETURN jsonb_build_object('allowed', true);
END;
$$;

-- ============================================================================
-- 7. TRIGGER: Enforce cooldown on team-up deletion
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_team_up_deletion_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Record 48-hour cooldown when team-up is deleted
    INSERT INTO public.team_up_cooldowns (user_id, event_name, college_domain, deleted_at, cooldown_until)
    VALUES (
        OLD.creator_id, 
        OLD.event_name, 
        OLD.college_domain, 
        now(), 
        now() + INTERVAL '48 hours'
    )
    ON CONFLICT (user_id, event_name, college_domain) 
    DO UPDATE SET 
        deleted_at = now(),
        cooldown_until = now() + INTERVAL '48 hours';
    
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS team_up_deletion_cooldown ON public.team_ups;
CREATE TRIGGER team_up_deletion_cooldown
    BEFORE DELETE ON public.team_ups
    FOR EACH ROW
    EXECUTE FUNCTION enforce_team_up_deletion_cooldown();

-- ============================================================================
-- 8. TEAM SIZE OVERFLOW PROTECTION - Transactional check before accept
-- ============================================================================

CREATE OR REPLACE FUNCTION safe_accept_team_up_request(
    p_request_id uuid,
    p_responder_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request record;
    v_team_up record;
    v_new_member_id uuid;
    v_current_count integer;
BEGIN
    -- Get request with lock
    SELECT * INTO v_request
    FROM public.team_up_requests
    WHERE id = p_request_id
    FOR UPDATE;
    
    IF v_request IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found');
    END IF;
    
    IF v_request.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request already processed');
    END IF;
    
    -- Get team-up with lock
    SELECT * INTO v_team_up
    FROM public.team_ups
    WHERE id = v_request.team_up_id
    FOR UPDATE;
    
    IF v_team_up IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Team-up not found');
    END IF;
    
    -- Verify responder permission
    IF v_request.request_type = 'join_request' THEN
        IF v_team_up.creator_id != p_responder_id THEN
            RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
        END IF;
        v_new_member_id := v_request.requester_id;
    ELSE -- invite
        IF v_request.requester_id != p_responder_id THEN
            RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
        END IF;
        v_new_member_id := v_team_up.creator_id;
    END IF;
    
    -- Check team size overflow (critical race condition fix)
    SELECT COUNT(*) INTO v_current_count
    FROM public.team_up_members
    WHERE team_up_id = v_team_up.id;
    
    IF v_team_up.team_size_target IS NOT NULL AND v_current_count >= v_team_up.team_size_target THEN
        -- Reject the request since team is full
        UPDATE public.team_up_requests
        SET status = 'declined', responded_at = now()
        WHERE id = p_request_id;
        
        RETURN jsonb_build_object('success', false, 'error', 'Team is already full');
    END IF;
    
    -- Update request status
    UPDATE public.team_up_requests
    SET status = 'accepted', responded_at = now()
    WHERE id = p_request_id;
    
    -- Add member
    INSERT INTO public.team_up_members (team_up_id, user_id, college_domain, is_creator)
    VALUES (v_team_up.id, v_new_member_id, v_request.college_domain, false)
    ON CONFLICT (team_up_id, user_id) DO NOTHING;
    
    -- Check if team is now full and auto-close
    SELECT COUNT(*) INTO v_current_count
    FROM public.team_up_members
    WHERE team_up_id = v_team_up.id;
    
    IF v_team_up.team_size_target IS NOT NULL AND v_current_count >= v_team_up.team_size_target THEN
        UPDATE public.team_ups
        SET status = 'matched', updated_at = now()
        WHERE id = v_team_up.id;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'team_full', v_current_count >= COALESCE(v_team_up.team_size_target, 999));
END;
$$;

-- ============================================================================
-- 9. INTENT MISMATCH VALIDATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_team_up_request(
    p_team_up_id uuid,
    p_requester_id uuid,
    p_request_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_team_up record;
BEGIN
    SELECT * INTO v_team_up
    FROM public.team_ups
    WHERE id = p_team_up_id;
    
    IF v_team_up IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Team-up not found');
    END IF;
    
    IF v_team_up.status != 'active' THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Team-up is no longer active');
    END IF;
    
    -- Prevent self-request
    IF v_team_up.creator_id = p_requester_id THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Cannot request to join your own team-up');
    END IF;
    
    -- Validate intent mismatch (Mode A <-> Mode B only)
    IF p_request_type = 'join_request' THEN
        IF v_team_up.intent != 'looking_for_teammates' THEN
            RETURN jsonb_build_object('valid', false, 'error', 'This team-up is not looking for teammates');
        END IF;
    ELSIF p_request_type = 'invite' THEN
        IF v_team_up.intent != 'looking_to_join' THEN
            RETURN jsonb_build_object('valid', false, 'error', 'This user is not looking to join teams');
        END IF;
    ELSE
        RETURN jsonb_build_object('valid', false, 'error', 'Invalid request type');
    END IF;
    
    RETURN jsonb_build_object('valid', true);
END;
$$;

-- ============================================================================
-- 10. ADMIN QUERY: Get stale team-ups (no requests after 72h)
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_get_stale_team_ups(
    p_hours_threshold integer DEFAULT 72
)
RETURNS TABLE (
    id uuid,
    event_name text,
    creator_id uuid,
    creator_name text,
    college_domain text,
    created_at timestamptz,
    hours_since_creation numeric,
    request_count integer,
    status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tu.id,
        tu.event_name,
        tu.creator_id,
        p.full_name as creator_name,
        tu.college_domain,
        tu.created_at,
        EXTRACT(EPOCH FROM (now() - tu.created_at)) / 3600 as hours_since_creation,
        COALESCE(tu.request_count, 0) as request_count,
        tu.status
    FROM public.team_ups tu
    LEFT JOIN public.profiles p ON tu.creator_id = p.id
    WHERE tu.status = 'active'
      AND COALESCE(tu.request_count, 0) = 0
      AND tu.created_at < (now() - (p_hours_threshold || ' hours')::interval)
    ORDER BY tu.created_at ASC;
END;
$$;

-- ============================================================================
-- 11. ADMIN QUERY: Get high rejection ratio users
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_get_high_rejection_team_ups(
    p_min_requests integer DEFAULT 3,
    p_min_rejection_ratio numeric DEFAULT 0.5
)
RETURNS TABLE (
    team_up_id uuid,
    event_name text,
    creator_id uuid,
    creator_name text,
    college_domain text,
    request_count integer,
    decline_count integer,
    rejection_ratio numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tu.id as team_up_id,
        tu.event_name,
        tu.creator_id,
        p.full_name as creator_name,
        tu.college_domain,
        COALESCE(tu.request_count, 0) as request_count,
        COALESCE(tu.decline_count, 0) as decline_count,
        CASE 
            WHEN COALESCE(tu.request_count, 0) > 0 
            THEN ROUND(COALESCE(tu.decline_count, 0)::numeric / tu.request_count, 2)
            ELSE 0
        END as rejection_ratio
    FROM public.team_ups tu
    LEFT JOIN public.profiles p ON tu.creator_id = p.id
    WHERE COALESCE(tu.request_count, 0) >= p_min_requests
      AND COALESCE(tu.decline_count, 0)::numeric / NULLIF(tu.request_count, 0) >= p_min_rejection_ratio
    ORDER BY rejection_ratio DESC, tu.request_count DESC;
END;
$$;

-- ============================================================================
-- 12. UPDATE completed_team_ups_count when team-up is marked 'matched'
-- ============================================================================

CREATE OR REPLACE FUNCTION update_completed_team_ups_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.status = 'matched' AND OLD.status != 'matched' THEN
        -- Increment count for all members
        UPDATE public.profiles
        SET completed_team_ups_count = COALESCE(completed_team_ups_count, 0) + 1
        WHERE id IN (
            SELECT user_id FROM public.team_up_members WHERE team_up_id = NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_up_completion_counter ON public.team_ups;
CREATE TRIGGER team_up_completion_counter
    AFTER UPDATE ON public.team_ups
    FOR EACH ROW
    WHEN (NEW.status = 'matched' AND OLD.status != 'matched')
    EXECUTE FUNCTION update_completed_team_ups_count();

-- ============================================================================
-- 13. ENHANCED RATE LIMIT CHECK (includes cooldown)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_team_up_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    active_count integer;
    cooldown_check jsonb;
BEGIN
    -- Check cooldown first
    cooldown_check := check_team_up_cooldown(NEW.creator_id, NEW.event_name, NEW.college_domain);
    
    IF NOT (cooldown_check->>'allowed')::boolean THEN
        RAISE EXCEPTION 'Cooldown active: %', cooldown_check->>'message';
    END IF;
    
    -- Original rate limit check
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

-- ============================================================================
-- 14. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute on new functions to authenticated users
GRANT EXECUTE ON FUNCTION check_team_up_cooldown(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_accept_team_up_request(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_team_up_request(uuid, uuid, text) TO authenticated;

-- Admin-only functions
GRANT EXECUTE ON FUNCTION admin_get_stale_team_ups(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_high_rejection_team_ups(integer, numeric) TO authenticated;

-- ============================================================================
-- 15. CLEAN UP EXPIRED COOLDOWNS (can be called periodically)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_team_up_cooldowns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.team_up_cooldowns
    WHERE cooldown_until < now() - INTERVAL '1 day';
END;
$$;

COMMIT;
