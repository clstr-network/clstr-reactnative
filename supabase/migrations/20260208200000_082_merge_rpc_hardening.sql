-- ============================================================================
-- 082: Merge RPC Hardening — Fix Critical Identity Transfer Issues
--
-- Fixes applied in this migration:
--
-- 1. CRITICAL: Move bypass_email_guard BEFORE auth.users UPDATE so the
--    sync_profile_email trigger doesn't get blocked by guard_email_transition_columns.
--
-- 2. HIGH: Restore bypass flag in sync_profile_email (lost in 078 regression from 076).
--
-- 3. HIGH: Use atomic UPDATE for identity transfer instead of DELETE + INSERT
--    to preserve created_at/last_sign_in_at and avoid gaps.
--
-- 4. HIGH: Check if old user already has a Google identity and handle collision.
--
-- 5. MEDIUM: Add FOR UPDATE row locking to prevent concurrent merge races.
--
-- 6. MEDIUM: Check new user has no meaningful data before cascade-deleting.
--
-- 7. MEDIUM: Remove redundant profiles.personal_email double-update.
-- ============================================================================

-- ── 1. Fixed merge_transitioned_account() RPC ──

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
  -- ── Validate caller ──
  IF v_new_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- ── Get the new user's email from auth.users ──
  SELECT email INTO v_new_email
  FROM auth.users
  WHERE id = v_new_user_id;

  IF v_new_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Could not determine user email');
  END IF;

  -- ── Find the ORIGINAL profile (with FOR UPDATE lock to prevent races) ──
  SELECT id, email, college_domain
  INTO v_old_user_id, v_old_college_email, v_old_college_domain
  FROM profiles
  WHERE lower(personal_email) = lower(v_new_email)
    AND email_transition_status = 'transitioned'
    AND personal_email_verified = true
    AND onboarding_complete = true
    AND id <> v_new_user_id
  LIMIT 1
  FOR UPDATE;

  IF v_old_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No matching transitioned profile found');
  END IF;

  -- ── Safety check: verify new user has no meaningful data ──
  -- If the new user somehow created posts/connections before merge, abort
  -- rather than cascade-deleting their data.
  SELECT EXISTS(
    SELECT 1 FROM posts WHERE user_id = v_new_user_id
    UNION ALL
    SELECT 1 FROM connections WHERE requester_id = v_new_user_id OR receiver_id = v_new_user_id
    UNION ALL
    SELECT 1 FROM messages WHERE sender_id = v_new_user_id
  ) INTO v_has_data;

  IF v_has_data THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot auto-merge: the new account has existing data. Please contact support.',
      'new_user_id', v_new_user_id,
      'old_user_id', v_old_user_id
    );
  END IF;

  -- ── Get the Google identity from the NEW user (with FOR UPDATE) ──
  SELECT ai.id, ai.provider, ai.provider_id, ai.identity_data
  INTO v_identity_id, v_provider, v_provider_id, v_identity_data
  FROM auth.identities ai
  WHERE ai.user_id = v_new_user_id
    AND ai.provider = 'google'
  LIMIT 1
  FOR UPDATE;

  IF v_identity_id IS NULL THEN
    -- Try any provider identity
    SELECT ai.id, ai.provider, ai.provider_id, ai.identity_data
    INTO v_identity_id, v_provider, v_provider_id, v_identity_data
    FROM auth.identities ai
    WHERE ai.user_id = v_new_user_id
    LIMIT 1
    FOR UPDATE;
  END IF;

  -- ── Transfer identity from new user to old user ──
  IF v_identity_id IS NOT NULL THEN
    -- Check if old user already has an identity from the same provider
    SELECT ai.id INTO v_old_identity_id
    FROM auth.identities ai
    WHERE ai.user_id = v_old_user_id
      AND ai.provider = v_provider
    LIMIT 1;

    IF v_old_identity_id IS NOT NULL THEN
      -- Old user already has this provider identity — remove the old one first
      -- (the new identity has the correct provider_id for the personal email login)
      DELETE FROM auth.identities WHERE id = v_old_identity_id;
    END IF;

    -- Atomic UPDATE: move the identity to the old user (preserves created_at)
    UPDATE auth.identities
    SET user_id = v_old_user_id,
        updated_at = now()
    WHERE id = v_identity_id;
  END IF;

  -- ── SET BYPASS FLAG BEFORE auth.users UPDATE ──
  -- CRITICAL: This must be BEFORE the UPDATE below because it fires
  -- sync_profile_email trigger, which updates profiles, which fires
  -- guard_email_transition_columns. The bypass flag must already be set.
  PERFORM set_config('app.bypass_email_guard', 'true', true);

  -- ── Update old user's auth email to personal email ──
  UPDATE auth.users
  SET
    email = lower(v_new_email),
    updated_at = now()
  WHERE id = v_old_user_id;

  -- NOTE: sync_profile_email trigger fires here and handles the profiles update.
  -- We do NOT need a separate UPDATE profiles SET personal_email = ... because
  -- the trigger already does it (Case 1: transitioned user).

  -- ── Delete the duplicate profile (if handle_new_user created one) ──
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = v_new_user_id)
  INTO v_new_profile_exists;

  IF v_new_profile_exists THEN
    DELETE FROM profiles WHERE id = v_new_user_id;
  END IF;

  -- ── Delete all identities still on the new user (shouldn't be any) ──
  DELETE FROM auth.identities WHERE user_id = v_new_user_id;

  -- ── Delete the duplicate auth user ──
  DELETE FROM auth.users WHERE id = v_new_user_id;

  -- ── Return success with old user info ──
  RETURN jsonb_build_object(
    'success', true,
    'merged_into_user_id', v_old_user_id,
    'college_email', v_old_college_email,
    'college_domain', v_old_college_domain,
    'personal_email', lower(v_new_email),
    'message', 'Account merged successfully. Please sign in again with Google.'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Merge failed: ' || SQLERRM
    );
END;
$$;

-- Re-grant
GRANT EXECUTE ON FUNCTION public.merge_transitioned_account() TO authenticated;


-- ── 2. Fix sync_profile_email: restore bypass flag (regression from 078) ──

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
BEGIN
  v_new_email := NEW.email;

  IF v_new_email IS NOT NULL THEN
    -- Check the user's current transition status
    SELECT email_transition_status, personal_email
    INTO v_current_status, v_current_personal_email
    FROM profiles
    WHERE id = NEW.id;

    -- CRITICAL: Set bypass flag BEFORE any profiles UPDATE so the guard
    -- trigger allows the changes. (This was lost in 078 regression from 076.)
    PERFORM set_config('app.bypass_email_guard', 'true', true);

    -- Case 1: User has transitioned and the new auth email matches their personal email.
    -- This happens when Supabase Auth confirms the email change after transition,
    -- or during merge_transitioned_account RPC.
    -- Do NOT update college email/domain — keep them as identity records.
    IF v_current_status = 'transitioned'
       AND v_current_personal_email IS NOT NULL
       AND lower(v_new_email) = lower(v_current_personal_email) THEN
      -- Only update the personal_email to match exact casing, nothing else
      UPDATE profiles SET
        personal_email = lower(v_new_email),
        updated_at = now()
      WHERE id = NEW.id;
      RETURN NEW;
    END IF;

    -- Case 2: Normal flow — update college email and domain
    v_domain := split_part(v_new_email, '@', 2);
    v_college_domain := lower(v_domain);

    -- Normalize known multi-domain colleges
    IF v_college_domain IN ('raghuinstech.com', 'raghuenggcollege.in') THEN
      v_college_domain := 'raghuenggcollege.in';
    END IF;

    UPDATE profiles SET
      email = v_new_email,
      domain = v_domain,
      college_domain = v_college_domain,
      updated_at = now()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;
