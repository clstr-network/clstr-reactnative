-- ============================================================================
-- 123: Email Transition Security Hardening v2
--
-- Based on verified security audit findings.
-- Addresses Findings: #1, #2, #3, #4, #5, #10, #12
--
-- CHANGES:
--   F2:  Advisory lock in transition_to_personal_email (race condition)
--   F1:  Re-RAISE exception after logging (no more swallowing errors)
--   F3:  Harden block_public_domain_profile value check
--   F4:  Partial unique index on active verification codes
--   F5:  Role freeze trigger during transition lifecycle
--   F10: RPC to hide personal_email from non-owners
--   F15: Merge audit logging
--
-- SUPERSEDES (function-level):
--   transition_to_personal_email:   114 (FIX 3)
--   block_public_domain_profile:    114 (FIX 1)
--   merge_transitioned_account:     114 (FIX 4)
-- ============================================================================

BEGIN;


-- ══════════════════════════════════════════════════════════════════════════════
-- FIX F2 + F1: transition_to_personal_email
--   - Add pg_advisory_xact_lock to prevent race conditions
--   - Replace EXCEPTION swallowing with re-RAISE after logging
-- Supersedes: 114 FIX 3
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

  -- FIX F2: Advisory lock on the personal email to prevent concurrent transitions
  -- with the same email. Mirrors merge_transitioned_account pattern.
  PERFORM pg_advisory_xact_lock(hashtext(lower(v_personal_email)));

  -- Set ALL bypass flags before any mutations.
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
    SELECT EXISTS(
      SELECT 1 FROM posts WHERE user_id = v_duplicate_user_id
      UNION ALL
      SELECT 1 FROM connections WHERE requester_id = v_duplicate_user_id OR receiver_id = v_duplicate_user_id
      UNION ALL
      SELECT 1 FROM messages WHERE sender_id = v_duplicate_user_id
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

  -- FIX F1: No EXCEPTION swallow. If anything above fails, the entire
  -- transaction rolls back automatically (PostgreSQL default behavior).
  -- The caller receives a proper Supabase error with SQLERRM details.
  --
  -- We use a separate EXCEPTION block ONLY to log the error before re-raising.
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error for debugging, then re-raise so the transaction rolls back
    BEGIN
      INSERT INTO public.auth_hook_error_log (hook_name, user_id, error_code, error_message, context)
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
    EXCEPTION
      WHEN OTHERS THEN
        -- If logging itself fails, don't block the re-raise
        NULL;
    END;

    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_to_personal_email() TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- FIX F3: block_public_domain_profile — add value check
--   The transition exception branch now also verifies that the new email
--   matches the user's personal_email, not just any email change.
-- Supersedes: 114 FIX 1
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.block_public_domain_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_domain text;
  v_college_domain text;
  v_is_platform_admin boolean := false;
  v_transition_status text;
  v_personal_email text;
BEGIN
  -- Check both the flag AND the SECURITY DEFINER caller token
  IF current_setting('app.bypass_public_domain_guard', true) = 'true'
     AND current_setting('app.bypass_public_domain_guard_token', true) = 'sd_verified_app.bypass_public_domain_guard' THEN
    RETURN NEW;
  END IF;

  v_email_domain := lower(split_part(COALESCE(NEW.email, ''), '@', 2));
  v_college_domain := lower(btrim(COALESCE(NEW.college_domain, '')));

  -- ── TRANSITION EXCEPTION ──
  -- If this is an UPDATE and the user already has a valid college_domain
  -- AND is in a transition state, allow ONLY if the new email matches
  -- their personal_email (the intended swap).
  IF TG_OP = 'UPDATE' THEN
    v_transition_status := COALESCE(NEW.email_transition_status, '');
    v_personal_email := COALESCE(NEW.personal_email, '');

    IF v_college_domain <> ''
       AND NOT public.is_public_email_domain(v_college_domain)
       AND v_transition_status IN ('verified', 'transitioned') THEN
      -- FIX F3: Only allow if college_domain is unchanged AND the new email
      -- matches the user's personal_email. This prevents arbitrary public
      -- email changes under the guise of transition.
      IF OLD.college_domain IS NOT NULL
         AND NEW.college_domain IS NOT DISTINCT FROM OLD.college_domain
         AND v_personal_email <> ''
         AND lower(NEW.email) = lower(v_personal_email) THEN
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  IF NEW.email IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.is_active = true
        AND lower(pa.email) = lower(NEW.email)
    ) INTO v_is_platform_admin;
  END IF;

  IF v_college_domain <> '' AND public.is_public_email_domain(v_college_domain) THEN
    RAISE EXCEPTION 'Public domains cannot be used as college_domain';
  END IF;

  IF v_email_domain <> ''
     AND public.is_public_email_domain(v_email_domain)
     AND NOT v_is_platform_admin THEN
    RAISE EXCEPTION 'Public domains cannot create standalone profiles';
  END IF;

  RETURN NEW;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- FIX F4: Partial unique index on active verification codes
--   Prevents two concurrent unused codes for the same user.
--   Uses (user_id) WHERE NOT used — simpler than expires_at check since
--   generate_and_send_verification_code already invalidates old codes.
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop if exists (idempotent)
DROP INDEX IF EXISTS idx_email_verification_codes_active_user;

CREATE UNIQUE INDEX idx_email_verification_codes_active_user
  ON public.email_verification_codes (user_id)
  WHERE NOT used;


-- ══════════════════════════════════════════════════════════════════════════════
-- FIX F5: Role freeze during email transition lifecycle
--   Prevents role changes while email_transition_status is 'pending' or
--   'verified'. If an admin changes role mid-transition, subsequent RPCs
--   would fail with confusing errors.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.guard_role_during_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire on role changes
  IF OLD.role IS NOT DISTINCT FROM NEW.role THEN
    RETURN NEW;
  END IF;

  -- Block role changes during active transition
  IF COALESCE(OLD.email_transition_status, 'none') IN ('pending', 'verified') THEN
    RAISE EXCEPTION 'Cannot change role while email transition is in progress (status: %). Complete or cancel the transition first.',
      OLD.email_transition_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_role_during_transition ON public.profiles;
CREATE TRIGGER trg_guard_role_during_transition
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_role_during_transition();


-- ══════════════════════════════════════════════════════════════════════════════
-- FIX F10: RPC to fetch profile with conditional personal_email visibility
--   Returns personal_email ONLY to the profile owner. Other users get NULL.
--   This avoids exposing personal_email via the same-college SELECT policy.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_profile_safe(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_owner boolean;
  v_is_admin boolean := false;
  v_profile record;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  v_is_owner := (v_caller_id = p_user_id);

  -- Check admin status
  IF NOT v_is_owner THEN
    SELECT EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.is_active = true
        AND lower(pa.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    ) INTO v_is_admin;
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;

  -- Return profile data with conditional field visibility
  RETURN jsonb_build_object(
    'id', v_profile.id,
    'email', v_profile.email,
    'full_name', v_profile.full_name,
    'avatar_url', v_profile.avatar_url,
    'bio', v_profile.bio,
    'role', v_profile.role,
    'college_name', v_profile.college_name,
    'college_domain', v_profile.college_domain,
    'graduation_year', v_profile.graduation_year,
    'skills', v_profile.skills,
    'interests', v_profile.interests,
    'linkedin_url', v_profile.linkedin_url,
    'github_url', v_profile.github_url,
    'portfolio_url', v_profile.portfolio_url,
    'is_verified', v_profile.is_verified,
    'onboarding_complete', v_profile.onboarding_complete,
    'visibility', v_profile.visibility,
    'email_transition_status', v_profile.email_transition_status,
    'personal_email_verified', v_profile.personal_email_verified,
    -- SENSITIVE: Only owner and admins see personal_email
    'personal_email', CASE WHEN v_is_owner OR v_is_admin THEN v_profile.personal_email ELSE NULL END,
    'personal_email_verified_at', CASE WHEN v_is_owner OR v_is_admin THEN v_profile.personal_email_verified_at ELSE NULL END,
    'prompt_dismissed_at', CASE WHEN v_is_owner THEN v_profile.prompt_dismissed_at ELSE NULL END,
    'created_at', v_profile.created_at,
    'updated_at', v_profile.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_safe(uuid) TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- FIX F15: Merge audit logging in merge_transitioned_account
--   Log every successful merge to auth_hook_error_log (reusing table,
--   hook_name distinguishes the source).
-- Supersedes: 114 FIX 4
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

  -- Safety: abort if new user has real data
  SELECT EXISTS(
    SELECT 1 FROM posts WHERE user_id = v_new_user_id
    UNION ALL
    SELECT 1 FROM connections WHERE requester_id = v_new_user_id OR receiver_id = v_new_user_id
    UNION ALL
    SELECT 1 FROM messages WHERE sender_id = v_new_user_id
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

  -- FIX F15: Audit log for successful merges
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
EXCEPTION
  WHEN OTHERS THEN
    -- Log merge failure
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

    RETURN jsonb_build_object('success', false, 'error', 'MERGE_FAILED', 'detail', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_transitioned_account() TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- DOCUMENTATION: Changes Summary
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Finding #1 (CRITICAL): transition_to_personal_email EXCEPTION block
--   BEFORE: Returned success:false, swallowed error, left ambiguous state
--   AFTER:  Logs to auth_hook_error_log, then re-RAISEs so PostgreSQL
--           rolls back the entire transaction cleanly
--
-- Finding #2 (CRITICAL): No advisory lock in transition_to_personal_email
--   BEFORE: Two sessions could race with same personal email
--   AFTER:  pg_advisory_xact_lock(hashtext(lower(v_personal_email)))
--           mirrors merge_transitioned_account pattern
--
-- Finding #3 (HIGH): block_public_domain_profile checks state not value
--   BEFORE: Any email update allowed during transition state
--   AFTER:  Also requires lower(NEW.email) = lower(NEW.personal_email)
--
-- Finding #4 (MEDIUM): Verification code row lock per-code not per-user
--   BEFORE: Theoretically two unused codes could exist for same user
--   AFTER:  Partial unique index (user_id) WHERE NOT used
--
-- Finding #5 (MEDIUM): No role freeze during transition
--   BEFORE: Admin could change role mid-transition, breaking RPCs
--   AFTER:  Trigger blocks role changes when status IN ('pending','verified')
--
-- Finding #10 (CRITICAL): personal_email exposed via SELECT to same-college
--   BEFORE: RLS returns all columns including personal_email
--   AFTER:  get_profile_safe() RPC returns personal_email only to owner/admin
--
-- Finding #15 (MEDIUM): merge_transitioned_account lacks success logging
--   BEFORE: Only failures logged
--   AFTER:  Success + failure both logged to auth_hook_error_log
--
-- ══════════════════════════════════════════════════════════════════════════════

COMMIT;
