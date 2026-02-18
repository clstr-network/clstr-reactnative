-- Migration 084: Direct auth.users.email update on transition
--
-- Problem: transitionToPersonalEmail() relied on supabase.auth.updateUser()
-- client-side, which triggers Supabase's "Secure email change" flow requiring
-- confirmation links from BOTH old AND new email. If the college email is
-- dead or the Supabase email isn't delivered, the auth-level email never
-- changes. This creates a duplicate-account problem when the user later
-- signs in with Google using their personal email.
--
-- Fix: Since we already verified the personal email via our own 6-digit code
-- (bcrypt-hashed, brute-force protected), the Supabase confirmation is
-- redundant. Update the RPC to directly set auth.users.email, just like
-- merge_transitioned_account already does.
--
-- Also adds finalize_auth_email_change() for users who already transitioned
-- but whose auth.users.email was never updated.

-- ── 1. Updated transition_to_personal_email: directly update auth.users ──

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

  -- Directly update auth.users.email (no Supabase confirmation needed —
  -- we already verified the email via our own code flow).
  -- The bypass flag is already set above, so sync_profile_email trigger
  -- won't clobber the college domain.
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
    -- Profile status is still set even if auth update fails
    RETURN jsonb_build_object(
      'success', true, 'status', 'transitioned',
      'college_email', v_college_email, 'new_primary_email', v_personal_email,
      'auth_email_updated', false,
      'auth_error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_to_personal_email() TO authenticated;

-- ── 2. New RPC: finalize_auth_email_change ──
-- For users who already transitioned but auth.users.email was never updated.

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

  -- Set bypass before updating auth.users (triggers sync_profile_email)
  PERFORM set_config('app.bypass_email_guard', 'true', true);

  UPDATE auth.users
  SET email = lower(v_personal_email),
      email_confirmed_at = now(),
      updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true, 'already_current', false,
    'message', 'Login email updated to ' || v_personal_email || '. You can now sign in with Google using this email.'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to update auth email: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_auth_email_change() TO authenticated;
