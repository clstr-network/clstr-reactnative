-- Migration 085: Handle orphaned duplicate auth users in finalize_auth_email_change
--
-- Problem: When a transitioned user signs in with Google using their personal
-- email, Supabase creates a NEW auth.users row. If the merge_transitioned_account
-- RPC fails, that duplicate auth user is left behind. When finalize_auth_email_change
-- tries to set auth.users.email on the original account, it hits the
-- users_email_partial_key unique constraint.
--
-- Fix: Before updating the email, detect and clean up the orphaned duplicate
-- auth user (the one that has no real profile / has an incomplete profile).

CREATE OR REPLACE FUNCTION public.finalize_auth_email_change()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_personal_email text;
  v_verified boolean;
  v_status text;
  v_current_auth_email text;
  v_duplicate_user_id uuid;
  v_duplicate_has_data boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT personal_email, personal_email_verified, email_transition_status
  INTO v_personal_email, v_verified, v_status
  FROM profiles WHERE id = v_user_id;

  IF v_status <> 'transitioned' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account has not been transitioned yet');
  END IF;

  IF v_personal_email IS NULL OR NOT v_verified THEN
    RETURN jsonb_build_object('success', false, 'error', 'Personal email not verified');
  END IF;

  SELECT email INTO v_current_auth_email FROM auth.users WHERE id = v_user_id;

  -- Already up to date
  IF lower(v_current_auth_email) = lower(v_personal_email) THEN
    RETURN jsonb_build_object(
      'success', true, 'already_current', true,
      'message', 'Your login email is already up to date. No changes needed.'
    );
  END IF;

  -- ── Clean up orphaned duplicate auth user ──
  -- Find any OTHER auth.users row that has the target personal email
  SELECT id INTO v_duplicate_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_personal_email)
    AND id <> v_user_id
  LIMIT 1;

  IF v_duplicate_user_id IS NOT NULL THEN
    -- Safety check: only delete if the duplicate has no real data
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

    -- Delete the orphaned duplicate (profile first, then identities, then auth user)
    DELETE FROM profiles WHERE id = v_duplicate_user_id;
    DELETE FROM auth.identities WHERE user_id = v_duplicate_user_id;

    -- Set merge flag so handle_user_deletion records the correct reason
    PERFORM set_config('app.merge_in_progress', 'true', true);

    DELETE FROM auth.users WHERE id = v_duplicate_user_id;
  END IF;

  -- Set bypass before updating auth.users (triggers sync_profile_email)
  PERFORM set_config('app.bypass_email_guard', 'true', true);

  UPDATE auth.users
  SET email = lower(v_personal_email),
      email_confirmed_at = now(),
      updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true, 'already_current', false,
    'duplicate_cleaned', v_duplicate_user_id IS NOT NULL,
    'message', 'Login email updated to ' || v_personal_email || '. You can now sign in with Google using this email.'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to update auth email: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_auth_email_change() TO authenticated;

-- Also update transition_to_personal_email to handle the same edge case
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

  -- Bypass the column guard
  PERFORM set_config('app.bypass_email_guard', 'true', true);

  -- Update profile status
  UPDATE profiles
  SET email_transition_status = 'transitioned', updated_at = now()
  WHERE id = v_user_id;

  -- Clean up any orphaned duplicate auth user with this email
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

    IF NOT v_duplicate_has_data THEN
      DELETE FROM profiles WHERE id = v_duplicate_user_id;
      DELETE FROM auth.identities WHERE user_id = v_duplicate_user_id;
      PERFORM set_config('app.merge_in_progress', 'true', true);
      DELETE FROM auth.users WHERE id = v_duplicate_user_id;
    END IF;
  END IF;

  -- Directly update auth.users.email
  SELECT email INTO v_current_auth_email FROM auth.users WHERE id = v_user_id;

  IF lower(v_current_auth_email) <> lower(v_personal_email) THEN
    UPDATE auth.users
    SET email = lower(v_personal_email),
        email_confirmed_at = now(),
        updated_at = now()
    WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'status', 'transitioned',
    'college_email', v_college_email, 'new_primary_email', v_personal_email,
    'auth_email_updated', true
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', true, 'status', 'transitioned',
      'college_email', v_college_email, 'new_primary_email', v_personal_email,
      'auth_email_updated', false,
      'auth_error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_to_personal_email() TO authenticated;
