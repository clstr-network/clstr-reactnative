-- ============================================================================
-- 083: Merge Audit Guard + sync_profile_email Efficiency
--
-- Fixes:
-- 1. MEDIUM: Merge-driven auth.users deletion creates misleading
--    "User account deleted" audit records. Add a flag so the
--    handle_user_deletion trigger can differentiate merge cleanup
--    from genuine account deletions.
--
-- 2. LOW: sync_profile_email fires even when email is unchanged
--    (PostgreSQL UPDATE OF fires if column is in SET clause,
--    even if value is the same). Add an early-return guard.
--
-- 3. LOW: handle_user_deletion should record the correct reason
--    when running inside a merge transaction.
-- ============================================================================

-- ── 1. Updated handle_user_deletion: detect merge context ──

CREATE OR REPLACE FUNCTION public.handle_user_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reason text;
BEGIN
  -- Check if this deletion is happening as part of an account merge
  IF current_setting('app.merge_in_progress', true) = 'true' THEN
    v_reason := 'Duplicate auth user removed during account merge';
  ELSE
    v_reason := 'User account deleted';
  END IF;

  INSERT INTO public.account_deletion_audit (user_id, email, deletion_reason, deleted_at)
  VALUES (OLD.id, OLD.email, v_reason, NOW());

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_user_deletion: %', SQLERRM;
    RETURN OLD;
END;
$$;

-- ── 2. Updated merge_transitioned_account: set merge flag before delete ──

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
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT email INTO v_new_email FROM auth.users WHERE id = v_new_user_id;
  IF v_new_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Could not determine user email');
  END IF;

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
    RETURN jsonb_build_object('success', false, 'error', 'No matching transitioned profile found');
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
      'error', 'Cannot auto-merge: the new account has existing data. Please contact support.',
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
    -- Remove old user's same-provider identity if exists
    SELECT ai.id INTO v_old_identity_id
    FROM auth.identities ai
    WHERE ai.user_id = v_old_user_id AND ai.provider = v_provider LIMIT 1;
    IF v_old_identity_id IS NOT NULL THEN
      DELETE FROM auth.identities WHERE id = v_old_identity_id;
    END IF;

    -- Atomic UPDATE (preserves created_at)
    UPDATE auth.identities SET user_id = v_old_user_id, updated_at = now()
    WHERE id = v_identity_id;
  END IF;

  -- CRITICAL: Set bypass BEFORE auth.users UPDATE (triggers sync_profile_email)
  PERFORM set_config('app.bypass_email_guard', 'true', true);

  UPDATE auth.users SET email = lower(v_new_email), updated_at = now()
  WHERE id = v_old_user_id;

  -- Delete duplicate profile
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = v_new_user_id) INTO v_new_profile_exists;
  IF v_new_profile_exists THEN DELETE FROM profiles WHERE id = v_new_user_id; END IF;

  -- Set merge flag so handle_user_deletion records the correct reason
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
    RETURN jsonb_build_object('success', false, 'error', 'Merge failed: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_transitioned_account() TO authenticated;

-- ── 3. Updated sync_profile_email: early-return when email unchanged ──

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
  -- Early return: skip if email hasn't actually changed
  IF OLD.email IS NOT DISTINCT FROM NEW.email THEN
    RETURN NEW;
  END IF;

  v_new_email := NEW.email;
  IF v_new_email IS NOT NULL THEN
    SELECT email_transition_status, personal_email
    INTO v_current_status, v_current_personal_email
    FROM profiles WHERE id = NEW.id;

    -- CRITICAL: Set bypass BEFORE any profiles UPDATE
    PERFORM set_config('app.bypass_email_guard', 'true', true);

    -- Case 1: Transitioned user, auth email matches personal email
    IF v_current_status = 'transitioned'
       AND v_current_personal_email IS NOT NULL
       AND lower(v_new_email) = lower(v_current_personal_email) THEN
      UPDATE profiles SET personal_email = lower(v_new_email), updated_at = now()
      WHERE id = NEW.id;
      RETURN NEW;
    END IF;

    -- Case 2: Normal flow
    v_domain := split_part(v_new_email, '@', 2);
    v_college_domain := lower(v_domain);
    IF v_college_domain IN ('raghuinstech.com', 'raghuenggcollege.in') THEN
      v_college_domain := 'raghuenggcollege.in';
    END IF;

    UPDATE profiles SET email = v_new_email, domain = v_domain,
      college_domain = v_college_domain, updated_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
