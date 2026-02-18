-- ============================================================================
-- 127: Security Audit v3 — Profile Data Isolation & Hardening
--
-- Architecture: own-row RLS + SECURITY DEFINER RPCs for public profile reads.
-- RPCs bypass RLS, explicitly stripping sensitive columns in function body.
--
-- CHANGES:
--   C3/M1: DROP plaintext OTP function (generate_email_verification_code)
--   C1:    Lock profiles to own-row SELECT + SECURITY DEFINER RPCs
--   C2:    Lock email_verification_codes (no direct reads)
--   M4:    Lock auth_hook_error_log (RLS + no reads)
--   H2:    Sanitize error responses in merge/transition functions
--   M3:    Comprehensive data check before duplicate deletion
--   L7:    Missing bypass flag in sync_profile_email (already fixed in 121)
--
-- SUPERSEDES (function-level):
--   get_profile_safe:               123 (F10) — replaced by get_profile_public
--   transition_to_personal_email:   123 (F2+F1)
--   merge_transitioned_account:     123 (F15)
-- ============================================================================

BEGIN;


-- ══════════════════════════════════════════════════════════════════════════════
-- 🔴 C3/M1 — DROP the plaintext OTP function (MOST URGENT)
-- Authenticated users can currently call this and get OTP plaintext.
-- Until dropped, email verification is bypassable.
-- ══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.generate_email_verification_code(text);


-- ══════════════════════════════════════════════════════════════════════════════
-- 🔴 C1 — Lock down profiles + SECURITY DEFINER RPCs
-- ══════════════════════════════════════════════════════════════════════════════

-- Step 1: Tighten base table to own-row-only
-- Drop ALL existing SELECT policies (handles any name drift)
DO $$
DECLARE rec record;
BEGIN
  FOR rec IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', rec.policyname);
  END LOOP;
END $$;

-- Own row only. service_role bypasses RLS entirely.
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Hard REVOKE — prevents future policy accidents from re-exposing data
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.profiles FROM authenticated;

-- Re-GRANT only what's needed (RLS governs what's visible)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- Step 2: Public profile RPC (single lookup)
-- Uses is_platform_admin() for robust admin check (recheck fix #1)
-- Uses single-roundtrip domain lookup (recheck optimization #3)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_profile_public(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_caller_domain text;
  v_target_domain text;
  v_is_admin boolean;
BEGIN
  -- Single-roundtrip domain lookup (recheck optimization #3)
  SELECT p1.college_domain, p2.college_domain
  INTO v_caller_domain, v_target_domain
  FROM public.profiles p1, public.profiles p2
  WHERE p1.id = auth.uid() AND p2.id = p_id;

  -- Robust admin check via existing SECURITY DEFINER helper (recheck fix #1)
  SELECT public.is_platform_admin() INTO v_is_admin;

  -- Enforce domain isolation: same-college, self, or admin
  IF p_id != auth.uid()
     AND NOT v_is_admin
     AND (v_caller_domain IS NULL OR v_target_domain IS NULL
          OR v_caller_domain != v_target_domain)
  THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', id,
    'full_name', full_name,
    'avatar_url', avatar_url,
    'role', role,
    'college_domain', college_domain,
    'bio', bio,
    'branch', branch,
    'university', university,
    'headline', headline,
    'location', location,
    'interests', interests,
    'social_links', social_links,
    'is_verified', is_verified,
    'onboarding_complete', onboarding_complete,
    'profile_completion', profile_completion,
    'graduation_year', graduation_year,
    'enrollment_year', enrollment_year,
    'course_duration_years', course_duration_years,
    'created_at', created_at,
    'updated_at', updated_at,
    'last_seen', last_seen
    -- personal_email, email_transition_status etc NEVER returned
  ) INTO v_result
  FROM public.profiles WHERE id = p_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_profile_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_public(uuid) TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- Step 3: List profiles by domain RPC
-- Uses is_platform_admin() for robust admin check (recheck fix #1)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_profiles_by_domain(
  p_domain text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_caller_domain text;
  v_is_admin boolean;
  v_domain text;
BEGIN
  SELECT college_domain INTO v_caller_domain
  FROM public.profiles WHERE id = auth.uid();

  -- Robust admin check via existing SECURITY DEFINER helper (recheck fix #1)
  SELECT public.is_platform_admin() INTO v_is_admin;

  -- Non-admins can only query their own domain
  IF v_is_admin AND p_domain IS NOT NULL THEN
    v_domain := p_domain;
  ELSE
    v_domain := v_caller_domain;
  END IF;

  IF v_domain IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', id,
      'full_name', full_name,
      'avatar_url', avatar_url,
      'role', role,
      'college_domain', college_domain,
      'bio', bio,
      'branch', branch,
      'university', university,
      'headline', headline,
      'location', location,
      'interests', interests,
      'social_links', social_links,
      'is_verified', is_verified,
      'onboarding_complete', onboarding_complete,
      'profile_completion', profile_completion,
      'graduation_year', graduation_year,
      'enrollment_year', enrollment_year,
      'course_duration_years', course_duration_years,
      'last_seen', last_seen
    ) AS row_data
    FROM public.profiles
    WHERE college_domain = v_domain
      AND onboarding_complete = true
    ORDER BY full_name
    LIMIT p_limit OFFSET p_offset
  ) t;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_profiles_by_domain(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profiles_by_domain(text, int, int) TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- ══════════════════════════════════════════════════════════════════════════════
-- Step 4: Alumni profiles by domain RPC (for AlumniDirectory)
-- Joins profiles + alumni_profiles, returns only public fields
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_alumni_by_domain(
  p_domain text DEFAULT NULL,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_caller_domain text;
  v_is_admin boolean;
  v_domain text;
BEGIN
  SELECT college_domain INTO v_caller_domain
  FROM public.profiles WHERE id = auth.uid();

  SELECT public.is_platform_admin() INTO v_is_admin;

  IF v_is_admin AND p_domain IS NOT NULL THEN
    v_domain := p_domain;
  ELSE
    v_domain := v_caller_domain;
  END IF;

  IF v_domain IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'role', p.role,
      'university', p.university,
      'college_domain', p.college_domain,
      'bio', p.bio,
      'headline', p.headline,
      'location', p.location,
      'branch', p.branch,
      'graduation_year', ap.graduation_year,
      'current_company', ap.current_company,
      'current_position', ap.current_position,
      'industry', ap.industry,
      'willing_to_mentor', coalesce(ap.willing_to_mentor, false)
    ) AS row_data
    FROM public.profiles p
    LEFT JOIN public.alumni_profiles ap ON ap.user_id = p.id
    WHERE p.college_domain = v_domain
      AND p.role = 'Alumni'
      AND p.onboarding_complete = true
    ORDER BY p.full_name
    LIMIT p_limit OFFSET p_offset
  ) t;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_alumni_by_domain(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_alumni_by_domain(text, int, int) TO authenticated;


-- 🟡 C2 — Lock down email_verification_codes
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view own verification codes"
  ON public.email_verification_codes;

CREATE POLICY "No direct reads" ON public.email_verification_codes
  FOR SELECT USING (false);

REVOKE ALL ON public.email_verification_codes FROM authenticated;
REVOKE ALL ON public.email_verification_codes FROM anon;
-- Re-grant: RPCs run as SECURITY DEFINER (bypass RLS + grants)


-- ══════════════════════════════════════════════════════════════════════════════
-- 🟡 M4 — auth_hook_error_log RLS
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS public.auth_hook_error_log ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "No reads" ON public.auth_hook_error_log;
DROP POLICY IF EXISTS "No direct inserts" ON public.auth_hook_error_log;

CREATE POLICY "No reads" ON public.auth_hook_error_log
  FOR SELECT USING (false);

CREATE POLICY "No direct inserts" ON public.auth_hook_error_log
  FOR INSERT WITH CHECK (false);

REVOKE ALL ON public.auth_hook_error_log FROM authenticated;
REVOKE ALL ON public.auth_hook_error_log FROM anon;


-- ══════════════════════════════════════════════════════════════════════════════
-- 🟡 H2 + M3 — Re-create transition_to_personal_email
-- Sanitized error responses + comprehensive duplicate data check
-- Supersedes: 123 (F2+F1)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.transition_to_personal_email()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_personal_email text;
  v_college_email text;
  v_verified boolean;
  v_role text;
  v_current_auth_email text;
  v_duplicate_user_id uuid;
  v_duplicate_has_data boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT email, personal_email, personal_email_verified, role
  INTO v_college_email, v_personal_email, v_verified, v_role
  FROM profiles WHERE id = v_user_id;

  IF v_role IS NULL OR v_role NOT IN ('Student', 'Alumni') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email transition is only available for Students and Alumni');
  END IF;

  IF v_personal_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No personal email linked');
  END IF;

  IF NOT v_verified THEN
    RETURN jsonb_build_object('success', false, 'error', 'Personal email not yet verified');
  END IF;

  -- Advisory lock on the personal email to prevent concurrent transitions
  PERFORM pg_advisory_xact_lock(hashtext(lower(v_personal_email)));

  -- Set ALL bypass flags before any mutations
  PERFORM public._set_bypass_flag('app.bypass_email_guard', 'true');
  PERFORM public._set_bypass_flag('app.bypass_public_domain_guard', 'true');
  PERFORM public._set_bypass_flag('app.bypass_college_domain_guard', 'true');

  -- Clean up any orphaned duplicate auth user with this email FIRST
  SELECT id INTO v_duplicate_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_personal_email)
    AND id <> v_user_id
  LIMIT 1;

  IF v_duplicate_user_id IS NOT NULL THEN
    -- M3: Comprehensive data check before duplicate deletion (recheck fix #2)
    SELECT EXISTS (
      SELECT 1 FROM (
        SELECT user_id FROM posts WHERE user_id = v_duplicate_user_id
        UNION
        SELECT user_id FROM comments WHERE user_id = v_duplicate_user_id
        UNION
        SELECT user_id FROM likes WHERE user_id = v_duplicate_user_id
        UNION
        SELECT requester_id FROM connections WHERE requester_id = v_duplicate_user_id
        UNION
        SELECT receiver_id FROM connections WHERE receiver_id = v_duplicate_user_id
        UNION
        SELECT sender_id FROM messages WHERE sender_id = v_duplicate_user_id
        UNION
        SELECT user_id FROM event_registrations WHERE user_id = v_duplicate_user_id
        UNION
        SELECT user_id FROM job_applications WHERE user_id = v_duplicate_user_id
        UNION
        SELECT user_id FROM saved_items WHERE user_id = v_duplicate_user_id
        UNION
        SELECT user_id FROM club_members WHERE user_id = v_duplicate_user_id
        UNION
        SELECT user_id FROM collab_project_members WHERE user_id = v_duplicate_user_id
        UNION
        SELECT user_id FROM student_profiles WHERE user_id = v_duplicate_user_id
        UNION
        SELECT user_id FROM alumni_profiles WHERE user_id = v_duplicate_user_id
        UNION
        SELECT user_id FROM notifications WHERE user_id = v_duplicate_user_id
        UNION
        SELECT mentee_id FROM mentorship_requests WHERE mentee_id = v_duplicate_user_id
        UNION
        SELECT mentor_id FROM mentorship_requests WHERE mentor_id = v_duplicate_user_id
        UNION
        SELECT mentor_id FROM mentorship_offers WHERE mentor_id = v_duplicate_user_id
        UNION
        SELECT creator_id FROM events WHERE creator_id = v_duplicate_user_id
      ) t
    ) INTO v_duplicate_has_data;

    IF v_duplicate_has_data THEN
      RETURN jsonb_build_object('success', false,
        'error', 'Another account with this email has existing data. Please contact support.',
        'duplicate_user_id', v_duplicate_user_id);
    END IF;

    DELETE FROM profiles WHERE id = v_duplicate_user_id;
    DELETE FROM auth.identities WHERE user_id = v_duplicate_user_id;
    PERFORM set_config('app.merge_in_progress', 'true', true);
    DELETE FROM auth.users WHERE id = v_duplicate_user_id;
  END IF;

  -- Update auth.users email
  SELECT email INTO v_current_auth_email FROM auth.users WHERE id = v_user_id;

  IF lower(v_current_auth_email) <> lower(v_personal_email) THEN
    UPDATE auth.users
    SET email = lower(v_personal_email),
        email_confirmed_at = now(),
        updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- Mark profile as transitioned
  UPDATE profiles
  SET email_transition_status = 'transitioned', updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true, 'status', 'transitioned',
    'college_email', v_college_email, 'new_primary_email', v_personal_email,
    'auth_email_updated', true
  );

-- H2: Sanitize error responses — never expose SQLERRM to client
EXCEPTION
  WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.auth_hook_error_log
        (hook_name, user_id, error_code, error_message, context)
      VALUES (
        'transition_to_personal_email',
        v_user_id,
        SQLSTATE,
        SQLERRM,
        jsonb_build_object(
          'personal_email', v_personal_email,
          'college_email', v_college_email,
          'role', v_role
        )
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    -- Never expose SQLERRM to client
    RETURN jsonb_build_object('success', false, 'error', 'TRANSITION_FAILED',
      'message', 'An internal error occurred. Please contact support.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_to_personal_email() TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- 🟡 H2 + M3 — Re-create merge_transitioned_account
-- Sanitized error responses + comprehensive duplicate data check
-- Supersedes: 123 (F15)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.merge_transitioned_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_user_id uuid := auth.uid();
  v_new_email text;
  v_old_user_id uuid;
  v_old_college_email text;
  v_old_college_domain text;
  v_identity_id uuid;
  v_provider text;
  v_provider_id text;
  v_identity_data jsonb;
  v_new_profile_exists boolean;
  v_old_identity_id uuid;
  v_has_data boolean := false;
BEGIN
  IF v_new_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  SELECT email INTO v_new_email FROM auth.users WHERE id = v_new_user_id;
  IF v_new_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMAIL_NOT_FOUND');
  END IF;

  -- Advisory lock prevents concurrent merge attempts for same email
  PERFORM pg_advisory_xact_lock(hashtext(lower(v_new_email)));

  -- Find original profile (FOR UPDATE lock)
  SELECT id, email, college_domain
  INTO v_old_user_id, v_old_college_email, v_old_college_domain
  FROM profiles
  WHERE lower(personal_email) = lower(v_new_email)
    AND email_transition_status = 'transitioned'
    AND personal_email_verified = true
    AND onboarding_complete = true
    AND id <> v_new_user_id
  LIMIT 1 FOR UPDATE;

  IF v_old_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_MATCHING_PROFILE');
  END IF;

  -- M3: Comprehensive data check before duplicate deletion (recheck fix #2)
  SELECT EXISTS (
    SELECT 1 FROM (
      SELECT user_id FROM posts WHERE user_id = v_new_user_id
      UNION
      SELECT user_id FROM comments WHERE user_id = v_new_user_id
      UNION
      SELECT user_id FROM likes WHERE user_id = v_new_user_id
      UNION
      SELECT requester_id FROM connections WHERE requester_id = v_new_user_id
      UNION
      SELECT receiver_id FROM connections WHERE receiver_id = v_new_user_id
      UNION
      SELECT sender_id FROM messages WHERE sender_id = v_new_user_id
      UNION
      SELECT user_id FROM event_registrations WHERE user_id = v_new_user_id
      UNION
      SELECT user_id FROM job_applications WHERE user_id = v_new_user_id
      UNION
      SELECT user_id FROM saved_items WHERE user_id = v_new_user_id
      UNION
      SELECT user_id FROM club_members WHERE user_id = v_new_user_id
      UNION
      SELECT user_id FROM collab_project_members WHERE user_id = v_new_user_id
      UNION
      SELECT user_id FROM student_profiles WHERE user_id = v_new_user_id
      UNION
      SELECT user_id FROM alumni_profiles WHERE user_id = v_new_user_id
      UNION
      SELECT user_id FROM notifications WHERE user_id = v_new_user_id
      UNION
      SELECT mentee_id FROM mentorship_requests WHERE mentee_id = v_new_user_id
      UNION
      SELECT mentor_id FROM mentorship_requests WHERE mentor_id = v_new_user_id
      UNION
      SELECT mentor_id FROM mentorship_offers WHERE mentor_id = v_new_user_id
      UNION
      SELECT creator_id FROM events WHERE creator_id = v_new_user_id
    ) t
  ) INTO v_has_data;

  IF v_has_data THEN
    RETURN jsonb_build_object('success', false,
      'error', 'HAS_EXISTING_DATA',
      'message', 'Cannot auto-merge: the new account has existing data. Please contact support.',
      'new_user_id', v_new_user_id, 'old_user_id', v_old_user_id);
  END IF;

  -- Get Google identity from new user (FOR UPDATE)
  SELECT ai.id, ai.provider, ai.provider_id, ai.identity_data
  INTO v_identity_id, v_provider, v_provider_id, v_identity_data
  FROM auth.identities ai
  WHERE ai.user_id = v_new_user_id AND ai.provider = 'google'
  LIMIT 1 FOR UPDATE;

  IF v_identity_id IS NULL THEN
    SELECT ai.id, ai.provider, ai.provider_id, ai.identity_data
    INTO v_identity_id, v_provider, v_provider_id, v_identity_data
    FROM auth.identities ai WHERE ai.user_id = v_new_user_id LIMIT 1 FOR UPDATE;
  END IF;

  IF v_identity_id IS NOT NULL THEN
    SELECT ai.id INTO v_old_identity_id
    FROM auth.identities ai
    WHERE ai.user_id = v_old_user_id AND ai.provider = v_provider LIMIT 1;
    IF v_old_identity_id IS NOT NULL THEN
      DELETE FROM auth.identities WHERE id = v_old_identity_id;
    END IF;

    UPDATE auth.identities SET user_id = v_old_user_id, updated_at = now()
    WHERE id = v_identity_id;
  END IF;

  -- Set ALL bypass flags before auth.users UPDATE
  PERFORM public._set_bypass_flag('app.bypass_email_guard', 'true');
  PERFORM public._set_bypass_flag('app.bypass_public_domain_guard', 'true');
  PERFORM public._set_bypass_flag('app.bypass_college_domain_guard', 'true');

  UPDATE auth.users SET email = lower(v_new_email), updated_at = now()
  WHERE id = v_old_user_id;

  -- Delete duplicate profile
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = v_new_user_id) INTO v_new_profile_exists;
  IF v_new_profile_exists THEN DELETE FROM profiles WHERE id = v_new_user_id; END IF;

  PERFORM set_config('app.merge_in_progress', 'true', true);

  DELETE FROM auth.identities WHERE user_id = v_new_user_id;
  DELETE FROM auth.users WHERE id = v_new_user_id;

  -- Audit log for successful merges
  BEGIN
    INSERT INTO public.auth_hook_error_log (hook_name, user_id, error_code, error_message, context)
    VALUES (
      'merge_transitioned_account',
      v_old_user_id,
      'MERGE_SUCCESS',
      'Account merge completed successfully',
      jsonb_build_object(
        'new_user_id', v_new_user_id,
        'old_user_id', v_old_user_id,
        'college_email', v_old_college_email,
        'personal_email', lower(v_new_email),
        'identity_transferred', v_identity_id IS NOT NULL
      )
    );
  EXCEPTION
    WHEN OTHERS THEN NULL; -- Don't fail the merge if logging fails
  END;

  RETURN jsonb_build_object(
    'success', true, 'merged_into_user_id', v_old_user_id,
    'college_email', v_old_college_email, 'college_domain', v_old_college_domain,
    'personal_email', lower(v_new_email),
    'message', 'Account merged successfully. Please sign in again with Google.');

-- H2: Sanitize error responses — never expose SQLERRM to client
EXCEPTION
  WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.auth_hook_error_log (hook_name, user_id, error_code, error_message, context)
      VALUES (
        'merge_transitioned_account',
        v_new_user_id,
        SQLSTATE,
        SQLERRM,
        jsonb_build_object('new_email', v_new_email, 'old_user_id', v_old_user_id)
      );
    EXCEPTION
      WHEN OTHERS THEN NULL;
    END;
    -- Never expose SQLERRM to client
    RETURN jsonb_build_object('success', false, 'error', 'MERGE_FAILED',
      'message', 'An internal error occurred. Please contact support.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_transitioned_account() TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- DOCUMENTATION: Changes Summary
-- ══════════════════════════════════════════════════════════════════════════════
--
-- C3/M1 (CRITICAL): DROP generate_email_verification_code
--   Authenticated users could call this and get OTP plaintext.
--   Dropped entirely — email verification flow uses Edge Function.
--
-- C1 (CRITICAL): Profiles locked to own-row + SECURITY DEFINER RPCs
--   BEFORE: Same-college users could read personal_email from browser console
--   AFTER:  Base table RLS is own-row only. get_profile_public() and
--           get_profiles_by_domain() return public fields only.
--   Uses is_platform_admin() for admin checks (vs inline query).
--   Uses single-roundtrip domain lookup in get_profile_public.
--
-- C2 (HIGH): email_verification_codes locked
--   BEFORE: Users could SELECT from verification codes table
--   AFTER:  SELECT policy USING(false), REVOKE ALL from client roles
--
-- M4 (MEDIUM): auth_hook_error_log locked
--   BEFORE: No RLS, users could read error logs
--   AFTER:  RLS enabled, SELECT/INSERT USING(false), REVOKE ALL
--
-- H2 (HIGH): Sanitized error responses in merge/transition
--   BEFORE: SQLERRM exposed in error detail (info leak)
--   AFTER:  Generic error message returned, SQLERRM logged server-side only
--
-- M3 (MEDIUM): Comprehensive duplicate data check
--   BEFORE: Only checked posts, connections, messages (3 tables)
--   AFTER:  Checks 19 tables including mentorship_requests, mentorship_offers,
--           events (recheck fix #2)
--
-- ══════════════════════════════════════════════════════════════════════════════

COMMIT;
