-- ============================================================================
-- 081: Merge Transitioned Accounts — Prevent Duplicate Profiles
--
-- PROBLEM:
-- When a transitioned alumnus logs in with Google using their personal email,
-- Supabase Auth creates a brand-new auth.users row because that email has
-- never been used for direct auth signup. This triggers handle_new_user(),
-- which creates a new, empty profiles row. AuthCallback sees
-- onboarding_complete = false and sends them to /onboarding.
--
-- The old profile still exists with all their data, but it's now orphaned
-- because the new auth.users row has a different ID.
--
-- SOLUTION (3 parts):
--
-- 1. handle_new_user() — BEFORE inserting a new profile, check if the
--    incoming email matches an existing transitioned user's personal_email.
--    If so, skip profile creation entirely. The AuthCallback will handle
--    merging via the RPC.
--
-- 2. merge_transitioned_account() RPC — Callable by the new (duplicate)
--    auth user. Moves Google identity from new user to old user, transfers
--    the auth email, deletes the new profile and auth user, and returns
--    the old user's ID so the client can sign out and re-authenticate.
--
-- 3. Index for fast email->transitioned-profile lookups (already exists
--    from migration 078, but we add one for the profiles.email column).
-- ============================================================================

-- ── 1. Updated handle_new_user: Skip profile creation for transitioned emails ──

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role public.user_role;
  user_email TEXT;
  email_domain TEXT;
  canonical_college_domain TEXT;
  v_existing_transitioned_id uuid;
BEGIN
  user_email := NEW.email;

  -- ── NEW: Check if this email belongs to a transitioned user's personal_email.
  -- If so, do NOT create a new profile. The duplicate auth user will be merged
  -- by the client calling merge_transitioned_account() RPC.
  IF user_email IS NOT NULL THEN
    SELECT id INTO v_existing_transitioned_id
    FROM profiles
    WHERE lower(personal_email) = lower(user_email)
      AND email_transition_status = 'transitioned'
      AND personal_email_verified = true
      AND onboarding_complete = true
    LIMIT 1;

    IF v_existing_transitioned_id IS NOT NULL THEN
      -- Skip profile creation. The merge RPC will handle linking.
      RAISE NOTICE 'handle_new_user: Skipping profile creation for transitioned email %. Original profile: %',
        user_email, v_existing_transitioned_id;
      RETURN NEW;
    END IF;
  END IF;

  -- ── Normal flow: Create profile for genuinely new users ──
  IF user_email IS NOT NULL AND user_email LIKE '%@%' THEN
    email_domain := LOWER(SUBSTRING(user_email FROM '@(.+)$'));
  ELSE
    email_domain := NULL;
  END IF;

  canonical_college_domain := public.normalize_college_domain(email_domain);

  default_role := 'Student';

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    role,
    domain,
    college_domain,
    is_verified,
    onboarding_complete,
    profile_completion,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    user_email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(user_email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    default_role,
    email_domain,
    canonical_college_domain,
    false,
    false,
    10,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    domain = COALESCE(profiles.domain, EXCLUDED.domain),
    college_domain = COALESCE(public.normalize_college_domain(profiles.college_domain), EXCLUDED.college_domain),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;


-- ── 2. merge_transitioned_account() RPC ──
-- Called by the NEW (duplicate) auth user from AuthCallback.
-- Moves Google identity to old user, cleans up duplicate, returns old user ID.

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

  -- ── Find the ORIGINAL profile that transitioned to this personal email ──
  SELECT id, email, college_domain
  INTO v_old_user_id, v_old_college_email, v_old_college_domain
  FROM profiles
  WHERE lower(personal_email) = lower(v_new_email)
    AND email_transition_status = 'transitioned'
    AND personal_email_verified = true
    AND onboarding_complete = true
    AND id <> v_new_user_id  -- Must be a DIFFERENT user
  LIMIT 1;

  IF v_old_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No matching transitioned profile found');
  END IF;

  -- ── Get the Google identity from the NEW user ──
  SELECT ai.id, ai.provider, ai.provider_id, ai.identity_data
  INTO v_identity_id, v_provider, v_provider_id, v_identity_data
  FROM auth.identities ai
  WHERE ai.user_id = v_new_user_id
    AND ai.provider = 'google'
  LIMIT 1;

  IF v_identity_id IS NULL THEN
    -- Try any provider identity
    SELECT ai.id, ai.provider, ai.provider_id, ai.identity_data
    INTO v_identity_id, v_provider, v_provider_id, v_identity_data
    FROM auth.identities ai
    WHERE ai.user_id = v_new_user_id
    LIMIT 1;
  END IF;

  -- ── Transfer identity from new user to old user ──
  IF v_identity_id IS NOT NULL THEN
    -- Delete the identity from new user first (FK constraint)
    DELETE FROM auth.identities WHERE id = v_identity_id;

    -- Re-insert under the old user's ID
    INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at)
    VALUES (
      v_identity_id,
      v_old_user_id,
      v_provider,
      v_provider_id,
      v_identity_data,
      now(),
      now(),
      now()
    )
    ON CONFLICT (provider, provider_id) DO UPDATE SET
      user_id = v_old_user_id,
      identity_data = v_identity_data,
      last_sign_in_at = now(),
      updated_at = now();
  END IF;

  -- ── Update old user's auth email to personal email ──
  -- This ensures their auth record matches their personal email for future logins.
  UPDATE auth.users
  SET
    email = lower(v_new_email),
    updated_at = now()
  WHERE id = v_old_user_id;

  -- ── Update old profile: keep college identity, just note the auth email changed ──
  -- Bypass column guard for safe transition fields update
  PERFORM set_config('app.bypass_email_guard', 'true', true);

  UPDATE profiles
  SET
    personal_email = lower(v_new_email),
    updated_at = now()
  WHERE id = v_old_user_id;

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

-- Grant to authenticated users (the new duplicate user calls this)
GRANT EXECUTE ON FUNCTION public.merge_transitioned_account() TO authenticated;

-- ── 3. Index for fast profiles.email lookups during merge detection ──
-- (personal_email index already exists from 078; this covers the email column)
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower
  ON public.profiles (lower(email));

