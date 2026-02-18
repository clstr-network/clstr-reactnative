-- ============================================================================
-- 009_functions_triggers.sql - Helper functions and triggers
-- U-Hub Platform Database Baseline
-- ============================================================================

BEGIN;

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- DOMAIN EXTRACTION FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.extract_domain_from_email(email text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF email IS NULL OR email = '' THEN
    RETURN NULL;
  END IF;
  RETURN lower(split_part(email, '@', 2));
END;
$$;

-- ============================================================================
-- COLLEGE DOMAIN CHECK FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ensure_same_college_domain(user_a uuid, user_b uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  domain_a text;
  domain_b text;
BEGIN
  SELECT college_domain INTO domain_a FROM public.profiles WHERE id = user_a;
  SELECT college_domain INTO domain_b FROM public.profiles WHERE id = user_b;
  
  IF domain_a IS NULL OR domain_b IS NULL THEN
    RETURN NULL;
  END IF;
  
  IF domain_a = domain_b THEN
    RETURN domain_a;
  END IF;
  
  RETURN NULL;
END;
$$;

-- ============================================================================
-- PROFILE COMPLETION CALCULATOR
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_profile_completion(profile_record record)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  completion integer := 0;
  total_fields integer := 10;
  filled_fields integer := 0;
BEGIN
  IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
    filled_fields := filled_fields + 1;
  END IF;
  
  IF profile_record.email IS NOT NULL AND profile_record.email != '' THEN
    filled_fields := filled_fields + 1;
  END IF;
  
  IF profile_record.avatar_url IS NOT NULL AND profile_record.avatar_url != '' THEN
    filled_fields := filled_fields + 1;
  END IF;
  
  IF profile_record.bio IS NOT NULL AND profile_record.bio != '' THEN
    filled_fields := filled_fields + 1;
  END IF;
  
  IF profile_record.headline IS NOT NULL AND profile_record.headline != '' THEN
    filled_fields := filled_fields + 1;
  END IF;
  
  IF profile_record.university IS NOT NULL AND profile_record.university != '' THEN
    filled_fields := filled_fields + 1;
  END IF;
  
  IF profile_record.major IS NOT NULL AND profile_record.major != '' THEN
    filled_fields := filled_fields + 1;
  END IF;
  
  IF profile_record.location IS NOT NULL AND profile_record.location != '' THEN
    filled_fields := filled_fields + 1;
  END IF;
  
  IF profile_record.graduation_year IS NOT NULL AND profile_record.graduation_year != '' THEN
    filled_fields := filled_fields + 1;
  END IF;
  
  IF profile_record.interests IS NOT NULL AND array_length(profile_record.interests, 1) > 0 THEN
    filled_fields := filled_fields + 1;
  END IF;
  
  completion := (filled_fields * 100) / total_fields;
  RETURN completion;
END;
$$;

-- ============================================================================
-- PROFILE VIEWS COUNT FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_profile_views_count(p_profile_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  view_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO view_count
  FROM public.profile_views
  WHERE profile_id = p_profile_id;
  
  RETURN COALESCE(view_count, 0);
END;
$$;

-- ============================================================================
-- VIEWED DATE FUNCTION
-- Note: This function is used by generated columns in profile_views.
-- We keep the existing function if it exists with correct signature.
-- ============================================================================
-- First check if function exists with wrong return type
DO $$ 
BEGIN
  -- Try to create or replace - will succeed if return type matches
  -- If it fails due to return type mismatch, we need to drop and recreate
  BEGIN
    CREATE OR REPLACE FUNCTION public.viewed_date(ts timestamptz)
    RETURNS text
    LANGUAGE plpgsql
    IMMUTABLE
    AS $func$
    BEGIN
      RETURN to_char(ts, 'YYYY-MM-DD');
    END;
    $func$;
  EXCEPTION 
    WHEN others THEN
      -- Function exists with different return type, keep the existing one
      NULL;
  END;
END $$;

-- ============================================================================
-- POST SHARES INCREMENT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_post_shares(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.posts
  SET shares_count = COALESCE(shares_count, 0) + 1
  WHERE id = post_id;
END;
$$;

-- ============================================================================
-- COLLAB HELPER FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.recalculate_collab_team_size(target_project uuid)
RETURNS void AS $$
DECLARE
  active_members integer;
BEGIN
  SELECT COALESCE(COUNT(*), 0) INTO active_members
  FROM public.collab_team_members
  WHERE project_id = target_project AND status = 'active';

  UPDATE public.collab_projects
  SET team_size_current = active_members
  WHERE id = target_project;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.recalculate_collab_role_fill(target_role uuid)
RETURNS void AS $$
DECLARE
  active_members integer;
BEGIN
  SELECT COALESCE(COUNT(*), 0) INTO active_members
  FROM public.collab_team_members
  WHERE role_id = target_role AND status = 'active';

  UPDATE public.collab_project_roles
  SET spots_filled = active_members
  WHERE id = target_role;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.recalculate_collab_open_roles(target_project uuid)
RETURNS void AS $$
DECLARE
  open_slots integer;
BEGIN
  SELECT COALESCE(SUM(GREATEST(r.spots_total - r.spots_filled, 0)), 0) INTO open_slots
  FROM public.collab_project_roles r
  WHERE r.project_id = target_project AND r.status = 'open';

  UPDATE public.collab_projects
  SET open_role_count = open_slots
  WHERE id = target_project;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- EVENT REGISTRATION COUNTS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.refresh_event_registration_counts(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function can be expanded to update registration counts on events
  -- Currently a placeholder for future implementation
  NULL;
END;
$$;

-- ============================================================================
-- POST COUNT UPDATER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_post_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'post_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'comments' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

-- ============================================================================
-- VERIFICATION FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.approve_verification_request(
  request_id uuid,
  reviewer_id uuid,
  notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_requested_role public.user_role;
  v_existing_role public.user_role;
  is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE user_id = reviewer_id AND can_verify_users = true
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'User does not have permission to verify requests';
  END IF;
  
  SELECT user_id, requested_role, existing_role
  INTO v_user_id, v_requested_role, v_existing_role
  FROM public.verification_requests
  WHERE id = request_id AND status = 'pending';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Verification request not found or already processed';
  END IF;
  
  UPDATE public.verification_requests
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = reviewer_id,
      reviewer_notes = notes
  WHERE id = request_id;
  
  UPDATE public.profiles
  SET role = v_requested_role,
      is_verified = true,
      verified_at = now(),
      verified_by = reviewer_id
  WHERE id = v_user_id;
  
  INSERT INTO public.role_change_history (
    user_id, old_role, new_role, changed_by, reason, verification_request_id
  ) VALUES (
    v_user_id, v_existing_role, v_requested_role, reviewer_id, 
    'Approved verification request', request_id
  );
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_verification_request(
  request_id uuid,
  reviewer_id uuid,
  notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE user_id = reviewer_id AND can_verify_users = true
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'User does not have permission to verify requests';
  END IF;
  
  SELECT user_id INTO v_user_id
  FROM public.verification_requests
  WHERE id = request_id AND status = 'pending';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Verification request not found or already processed';
  END IF;
  
  UPDATE public.verification_requests
  SET status = 'rejected',
      reviewed_at = now(),
      reviewed_by = reviewer_id,
      reviewer_notes = notes
  WHERE id = request_id;
  
  RETURN true;
END;
$$;

-- ============================================================================
-- TRIGGERS FOR PROFILES
-- ============================================================================
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

-- Role-specific profile triggers
DROP TRIGGER IF EXISTS update_student_profiles_updated_at ON public.student_profiles;
CREATE TRIGGER update_student_profiles_updated_at
BEFORE UPDATE ON public.student_profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_profiles_updated_at();

DROP TRIGGER IF EXISTS update_alumni_profiles_updated_at ON public.alumni_profiles;
CREATE TRIGGER update_alumni_profiles_updated_at
BEFORE UPDATE ON public.alumni_profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_profiles_updated_at();

DROP TRIGGER IF EXISTS update_faculty_profiles_updated_at ON public.faculty_profiles;
CREATE TRIGGER update_faculty_profiles_updated_at
BEFORE UPDATE ON public.faculty_profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_profiles_updated_at();

DROP TRIGGER IF EXISTS update_club_profiles_updated_at ON public.club_profiles;
CREATE TRIGGER update_club_profiles_updated_at
BEFORE UPDATE ON public.club_profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_profiles_updated_at();

DROP TRIGGER IF EXISTS update_organization_profiles_updated_at ON public.organization_profiles;
CREATE TRIGGER update_organization_profiles_updated_at
BEFORE UPDATE ON public.organization_profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_profiles_updated_at();

-- ============================================================================
-- TRIGGERS FOR SOCIAL
-- ============================================================================
DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_connections_updated_at ON public.connections;
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON public.connections
FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_likes_count ON public.post_likes;
CREATE TRIGGER update_likes_count AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE PROCEDURE public.update_post_counts();

DROP TRIGGER IF EXISTS update_comments_count ON public.comments;
CREATE TRIGGER update_comments_count AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE PROCEDURE public.update_post_counts();

-- ============================================================================
-- TRIGGERS FOR PROFILE DETAILS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_profile_details_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

DROP TRIGGER IF EXISTS update_profile_experience_updated_at ON public.profile_experience;
CREATE TRIGGER update_profile_experience_updated_at
BEFORE UPDATE ON public.profile_experience
FOR EACH ROW EXECUTE PROCEDURE public.update_profile_details_updated_at();

DROP TRIGGER IF EXISTS update_profile_education_updated_at ON public.profile_education;
CREATE TRIGGER update_profile_education_updated_at
BEFORE UPDATE ON public.profile_education
FOR EACH ROW EXECUTE PROCEDURE public.update_profile_details_updated_at();

DROP TRIGGER IF EXISTS update_profile_skills_updated_at ON public.profile_skills;
CREATE TRIGGER update_profile_skills_updated_at
BEFORE UPDATE ON public.profile_skills
FOR EACH ROW EXECUTE PROCEDURE public.update_profile_details_updated_at();

COMMIT;
