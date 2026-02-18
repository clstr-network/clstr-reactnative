-- ============================================================================
-- 117_profile_visibility_enforcement.sql
-- Enforce user_settings.profile_visibility at RLS layer and propagate changes
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.can_view_profile(p_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer_id uuid := auth.uid();
  v_viewer_domain text;
  v_target_domain text;
  v_visibility text;
  v_is_admin boolean := false;
BEGIN
  IF p_profile_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT p.college_domain, COALESCE(us.profile_visibility, 'public')
  INTO v_target_domain, v_visibility
  FROM public.profiles p
  LEFT JOIN public.user_settings us ON us.user_id = p.id
  WHERE p.id = p_profile_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_viewer_id IS NULL THEN
    RETURN v_visibility = 'public' AND v_target_domain IS NULL;
  END IF;

  IF v_viewer_id = p_profile_id THEN
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins pa
    WHERE pa.is_active = true
      AND lower(pa.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  INTO v_is_admin;

  IF v_is_admin THEN
    RETURN true;
  END IF;

  SELECT p.college_domain
  INTO v_viewer_domain
  FROM public.profiles p
  WHERE p.id = v_viewer_id;

  IF v_target_domain IS NOT NULL AND v_viewer_domain IS DISTINCT FROM v_target_domain THEN
    RETURN false;
  END IF;

  IF v_visibility = 'private' THEN
    RETURN false;
  END IF;

  IF v_visibility = 'public' THEN
    RETURN true;
  END IF;

  IF v_visibility = 'connections' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.connections c
      WHERE c.status = 'accepted'
        AND (
          (c.requester_id = p_profile_id AND c.receiver_id = v_viewer_id)
          OR (c.requester_id = v_viewer_id AND c.receiver_id = p_profile_id)
        )
    );
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO authenticated, anon;

DROP POLICY IF EXISTS "profiles_select_same_college" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Allow all select" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;

CREATE POLICY "profiles_select_same_college" ON public.profiles
  FOR SELECT USING (public.can_view_profile(id));

DROP POLICY IF EXISTS "Student profiles viewable by all" ON public.student_profiles;
DROP POLICY IF EXISTS "student_profiles_select_visible_profile" ON public.student_profiles;
CREATE POLICY "student_profiles_select_visible_profile" ON public.student_profiles
  FOR SELECT USING (public.can_view_profile(user_id));

DROP POLICY IF EXISTS "Alumni profiles viewable by all" ON public.alumni_profiles;
DROP POLICY IF EXISTS "alumni_profiles_select_visible_profile" ON public.alumni_profiles;
CREATE POLICY "alumni_profiles_select_visible_profile" ON public.alumni_profiles
  FOR SELECT USING (public.can_view_profile(user_id));

DROP POLICY IF EXISTS "Faculty profiles viewable by all" ON public.faculty_profiles;
DROP POLICY IF EXISTS "faculty_profiles_select_visible_profile" ON public.faculty_profiles;
CREATE POLICY "faculty_profiles_select_visible_profile" ON public.faculty_profiles
  FOR SELECT USING (public.can_view_profile(user_id));

DROP POLICY IF EXISTS "Club profiles viewable by all" ON public.club_profiles;
DROP POLICY IF EXISTS "club_profiles_select_visible_profile" ON public.club_profiles;
CREATE POLICY "club_profiles_select_visible_profile" ON public.club_profiles
  FOR SELECT USING (public.can_view_profile(user_id));

DROP POLICY IF EXISTS "Organization profiles viewable by all" ON public.organization_profiles;
DROP POLICY IF EXISTS "organization_profiles_select_visible_profile" ON public.organization_profiles;
CREATE POLICY "organization_profiles_select_visible_profile" ON public.organization_profiles
  FOR SELECT USING (public.can_view_profile(user_id));

DROP POLICY IF EXISTS "Experience is viewable by everyone" ON public.profile_experience;
DROP POLICY IF EXISTS "profile_experience_select_visible_profile" ON public.profile_experience;
CREATE POLICY "profile_experience_select_visible_profile" ON public.profile_experience
  FOR SELECT USING (public.can_view_profile(profile_id));

DROP POLICY IF EXISTS "Education is viewable by everyone" ON public.profile_education;
DROP POLICY IF EXISTS "profile_education_select_visible_profile" ON public.profile_education;
CREATE POLICY "profile_education_select_visible_profile" ON public.profile_education
  FOR SELECT USING (public.can_view_profile(profile_id));

DROP POLICY IF EXISTS "Skills are viewable by everyone" ON public.profile_skills;
DROP POLICY IF EXISTS "profile_skills_select_visible_profile" ON public.profile_skills;
CREATE POLICY "profile_skills_select_visible_profile" ON public.profile_skills
  FOR SELECT USING (public.can_view_profile(profile_id));

DROP POLICY IF EXISTS "Profile projects viewable by all" ON public.profile_projects;
DROP POLICY IF EXISTS "profile_projects_select_visible_profile" ON public.profile_projects;
CREATE POLICY "profile_projects_select_visible_profile" ON public.profile_projects
  FOR SELECT USING (public.can_view_profile(profile_id));

DROP POLICY IF EXISTS "Achievements viewable by all" ON public.profile_achievements;
DROP POLICY IF EXISTS "profile_achievements_select_visible_profile" ON public.profile_achievements;
CREATE POLICY "profile_achievements_select_visible_profile" ON public.profile_achievements
  FOR SELECT USING (public.can_view_profile(profile_id));

DROP POLICY IF EXISTS "Certifications viewable by all" ON public.profile_certifications;
DROP POLICY IF EXISTS "profile_certifications_select_visible_profile" ON public.profile_certifications;
CREATE POLICY "profile_certifications_select_visible_profile" ON public.profile_certifications
  FOR SELECT USING (public.can_view_profile(profile_id));

CREATE OR REPLACE FUNCTION public.touch_profile_on_visibility_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.profile_visibility IS DISTINCT FROM OLD.profile_visibility THEN
    UPDATE public.profiles
    SET updated_at = now()
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_profile_on_visibility_change ON public.user_settings;
CREATE TRIGGER trg_touch_profile_on_visibility_change
  AFTER UPDATE OF profile_visibility ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_profile_on_visibility_change();

COMMIT;
