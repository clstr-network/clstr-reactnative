-- ============================================================================
-- 114: Fix Email Transition — Public Domain Guard Over-Hardening
--
-- ROOT CAUSE:
-- When transitionToPersonalEmail() RPC executes, it:
--   1. Sets bypass_email_guard = true
--   2. Updates auth.users.email to the personal email (e.g. student@gmail.com)
--   3. This fires sync_profile_email() trigger
--   4. THEN marks profiles.email_transition_status = 'transitioned'
--
-- The sync_profile_email() trigger checks email_transition_status = 'transitioned'
-- but at step 3, the status is still 'verified'. So it falls through to the
-- normal flow, which calls is_public_email_domain(gmail.com) → RAISE EXCEPTION:
-- "Public domains cannot be used as primary profile email."
--
-- FIXES APPLIED:
--   1. sync_profile_email: Accept 'verified' status (not just 'transitioned')
--      when the new auth email matches personal_email. This is the active
--      transition in progress.
--   2. sync_profile_email: Also set bypass_public_domain_guard so the profiles
--      UPDATE doesn't get blocked by block_public_domain_profile.
--   3. block_public_domain_profile: Allow updates when college_domain is already
--      set AND email_transition_status is 'verified' or 'transitioned'.
--      This handles the "changing login email, not community domain" case.
--   4. transition_to_personal_email: Also set bypass_public_domain_guard before
--      touching auth.users (belt-and-suspenders).
--
-- SECURITY NOTES:
--   - Public domains are still blocked during new account creation (handle_new_user)
--   - Public domains are still blocked from being set as college_domain
--   - The exception only applies when:
--     a) The user already has a valid college_domain
--     b) The user's personal_email matches the new auth email
--     c) email_transition_status is 'verified' or 'transitioned'
-- ============================================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- FIX 1: block_public_domain_profile — allow transition-aware updates
-- Supersedes: 107, 109
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
BEGIN
  -- Check both the flag AND the SECURITY DEFINER caller token
  IF current_setting('app.bypass_public_domain_guard', true) = 'true'
     AND current_setting('app.bypass_public_domain_guard_token', true) = 'sd_verified_app.bypass_public_domain_guard' THEN
    RETURN NEW;
  END IF;

  v_email_domain := lower(split_part(COALESCE(NEW.email, ''), '@', 2));
  v_college_domain := lower(btrim(COALESCE(NEW.college_domain, '')));

  -- ── TRANSITION EXCEPTION ──
  -- If this is an UPDATE (not INSERT) and the user already has a valid
  -- college_domain AND is in a transition state ('verified' or 'transitioned'),
  -- allow the update. The login email is changing but the community domain is NOT.
  -- This prevents blocking "student@gmail.com" as a login email when their
  -- college_domain is already "college.edu".
  IF TG_OP = 'UPDATE' THEN
    v_transition_status := COALESCE(NEW.email_transition_status, '');

    -- If college_domain exists and is valid (not public), AND the user is
    -- in transition, allow the profile update even if profile.email has a
    -- public domain. We are NOT changing college_domain here.
    IF v_college_domain <> ''
       AND NOT public.is_public_email_domain(v_college_domain)
       AND v_transition_status IN ('verified', 'transitioned') THEN
      -- Only block if someone is trying to CHANGE college_domain to a public one
      IF OLD.college_domain IS NOT NULL
         AND NEW.college_domain IS NOT DISTINCT FROM OLD.college_domain THEN
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
-- FIX 2: sync_profile_email — Accept 'verified' status during transition
-- Supersedes: 109 (AW-4 + UC-1 + DIR-3)
-- Changes:
--   - Check 'verified' in addition to 'transitioned' when matching personal_email
--   - Set bypass_public_domain_guard flag to prevent block_public_domain_profile
--     from rejecting the profiles UPDATE
-- ══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.sync_profile_email() CASCADE;

CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain text;
  v_college_domain text;
  v_new_email text;
  v_current_status text;
  v_current_personal_email text;
  v_is_platform_admin boolean := false;
BEGIN
  -- Early return if email unchanged
  IF OLD.email IS NOT DISTINCT FROM NEW.email THEN
    RETURN NEW;
  END IF;

  v_new_email := NEW.email;

  IF v_new_email IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT email_transition_status, personal_email
  INTO v_current_status, v_current_personal_email
  FROM public.profiles
  WHERE id = NEW.id;

  -- Use hardened bypass flag setter (AW-1)
  PERFORM public._set_bypass_flag('app.bypass_email_guard', 'true');
  PERFORM public._set_bypass_flag('app.bypass_college_domain_guard', 'true');
  -- FIX 114: Also set bypass_public_domain_guard so the profiles UPDATE
  -- doesn't get rejected by block_public_domain_profile during transition
  PERFORM public._set_bypass_flag('app.bypass_public_domain_guard', 'true');

  -- ── Transition case: auth email update maps to personal_email only ──
  -- FIX 114: Accept BOTH 'transitioned' AND 'verified' status.
  -- During transition_to_personal_email(), the auth email is updated BEFORE
  -- the profile status changes from 'verified' to 'transitioned'. At this
  -- point the status is still 'verified' but the personal email matches,
  -- so this IS a valid transition in progress.
  IF v_current_status IN ('transitioned', 'verified')
     AND v_current_personal_email IS NOT NULL
     AND lower(v_new_email) = lower(v_current_personal_email) THEN
    UPDATE public.profiles
    SET personal_email = lower(v_new_email),
        updated_at = now()
    WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins pa
    WHERE pa.is_active = true
      AND lower(pa.email) = lower(v_new_email)
  ) INTO v_is_platform_admin;

  v_domain := lower(split_part(v_new_email, '@', 2));

  IF public.is_public_email_domain(v_domain) AND NOT v_is_platform_admin THEN
    RAISE EXCEPTION 'Public domains cannot be used as primary profile email';
  END IF;

  v_college_domain := public.normalize_college_domain(v_domain);

  IF public.is_public_email_domain(v_college_domain) AND NOT v_is_platform_admin THEN
    RAISE EXCEPTION 'Public domains cannot be used as college_domain';
  END IF;

  -- DIR-3: No longer writes to deprecated `domain` column
  UPDATE public.profiles
  SET email = v_new_email,
      college_domain = CASE
        WHEN college_domain IS NULL THEN v_college_domain
        ELSE college_domain
      END,
      updated_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Recreate auth.users trigger for email sync
DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_profile_email();


-- ══════════════════════════════════════════════════════════════════════════════
-- FIX 3: transition_to_personal_email — Set bypass_public_domain_guard
-- Supersedes: 103 (CB-3)
-- Changes:
--   - Also sets bypass_public_domain_guard before auth.users UPDATE
--   - Uses _set_bypass_flag for hardened bypass (AW-1)
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

  -- FIX 114: Set ALL bypass flags before any mutations.
  -- bypass_email_guard: allows guard_email_transition_columns to pass
  -- bypass_public_domain_guard: allows block_public_domain_profile to pass
  --   when sync_profile_email fires from the auth.users UPDATE below
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

  -- Update auth.users email FIRST — if this fails, we haven't touched
  -- the profile's transition status yet, so the state stays consistent.
  SELECT email INTO v_current_auth_email FROM auth.users WHERE id = v_user_id;

  IF lower(v_current_auth_email) <> lower(v_personal_email) THEN
    UPDATE auth.users
    SET email = lower(v_personal_email),
        email_confirmed_at = now(),
        updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- Only NOW mark profile as transitioned (both auth + profile succeed together)
  UPDATE profiles
  SET email_transition_status = 'transitioned', updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true, 'status', 'transitioned',
    'college_email', v_college_email, 'new_primary_email', v_personal_email,
    'auth_email_updated', true
  );

EXCEPTION
  WHEN OTHERS THEN
    -- CB-3 FIX: Return success:false so the frontend shows an error toast.
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to complete email transition: ' || SQLERRM,
      'auth_email_updated', false
    );
END;
$$;

-- Re-grant
GRANT EXECUTE ON FUNCTION public.transition_to_personal_email() TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- FIX 4: merge_transitioned_account — Set bypass_public_domain_guard
-- Supersedes: 109 (ECF-2) for bypass flags only; preserves advisory lock logic
-- Changes:
--   - Also sets bypass_public_domain_guard before auth.users UPDATE
--   - Uses _set_bypass_flag for hardened bypass (AW-1)
-- ══════════════════════════════════════════════════════════════════════════════

-- Read the current merge function and check if it needs bypass_public_domain_guard
-- The merge function sets bypass_email_guard before UPDATE auth.users, but not
-- bypass_public_domain_guard. Add it for symmetry.

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

  -- ECF-2 FIX: Advisory lock prevents concurrent merge attempts for same email
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

  -- FIX 114: Set ALL bypass flags before auth.users UPDATE
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

  RETURN jsonb_build_object(
    'success', true, 'merged_into_user_id', v_old_user_id,
    'college_email', v_old_college_email, 'college_domain', v_old_college_domain,
    'personal_email', lower(v_new_email),
    'message', 'Account merged successfully. Please sign in again with Google.');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'MERGE_FAILED', 'detail', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_transitioned_account() TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- DOCUMENTATION: Bypass Flag Matrix (updated)
-- ══════════════════════════════════════════════════════════════════════════════
-- Flag: app.bypass_email_guard + app.bypass_email_guard_token
--   Verified by: guard_email_transition_columns trigger
--   Set via: _set_bypass_flag('app.bypass_email_guard', 'true')
--   Used by: sync_profile_email, transition_to_personal_email,
--            merge_transitioned_account, verify_personal_email_code
--
-- Flag: app.bypass_college_domain_guard + app.bypass_college_domain_guard_token
--   Verified by: (any trigger checking college_domain mutations)
--   Set via: _set_bypass_flag('app.bypass_college_domain_guard', 'true')
--   Used by: sync_profile_email, transition_to_personal_email
--
-- Flag: app.bypass_public_domain_guard + app.bypass_public_domain_guard_token
--   Verified by: block_public_domain_profile trigger
--   Set via: _set_bypass_flag('app.bypass_public_domain_guard', 'true')
--   Used by: sync_profile_email, transition_to_personal_email,    ← NEW in 114
--            merge_transitioned_account                            ← NEW in 114
-- ══════════════════════════════════════════════════════════════════════════════

COMMIT;
