-- ============================================================================
-- 103: Full Audit Report Fixes
--
-- Addresses all outstanding issues from the Alumni Identity & Onboarding
-- Systems Audit (Feb 2026).
--
-- P0 fixes:
--   CB-2: Remove raw OTP code from generate_email_verification_code response
--   CB-3: transition_to_personal_email returns success:false on exception
--   CB-4: Align bulk_upsert_alumni_invites p_invited_by to text (matches frontend)
--
-- P1 fixes:
--   NC-3: Replace hardcoded domain aliases in sync_profile_email with
--         college_domain_aliases table lookup
--
-- P2 fixes:
--   LG-9: Add app.bypass_alumni_guard flag for admin corrections to
--         guard_alumni_profile_email_immutability trigger
-- ============================================================================

BEGIN;

-- ============================================================================
-- CB-2: Remove raw OTP code from generate_email_verification_code response
-- The code should ONLY be delivered via the send-verification-email edge
-- function, never returned in the RPC response body.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_email_verification_code(
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code text;
  v_current_status text;
  v_current_personal text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate email format
  IF p_email IS NULL OR p_email !~* '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid email format');
  END IF;

  -- Check that user has this email in pending state
  SELECT email_transition_status, personal_email
  INTO v_current_status, v_current_personal
  FROM profiles
  WHERE id = v_user_id;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  IF v_current_status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending email to verify');
  END IF;

  IF lower(v_current_personal) <> lower(p_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email does not match pending personal email');
  END IF;

  -- Invalidate any existing unused codes for this user
  UPDATE email_verification_codes
  SET used = true
  WHERE user_id = v_user_id AND NOT used;

  -- Generate 6-digit code
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');

  -- Store with 10-minute expiry
  INSERT INTO email_verification_codes (user_id, email, code, expires_at)
  VALUES (v_user_id, lower(p_email), v_code, now() + interval '10 minutes');

  -- SECURITY FIX (CB-2): Do NOT return the code in the response.
  -- The code must be delivered exclusively via the send-verification-email
  -- edge function. Returning it here would allow any authenticated caller
  -- to read the OTP without inbox access, defeating email verification.
  RETURN jsonb_build_object(
    'success', true,
    'expires_in_seconds', 600,
    'message', 'Verification code generated. Check your email.'
  );
END;
$$;


-- ============================================================================
-- CB-3: transition_to_personal_email — return success:false on exception
--
-- Previously the EXCEPTION handler returned success:true with
-- auth_email_updated:false, which misled the frontend into showing a
-- success toast even when the auth.users email update failed.
-- Also reorder: update profiles status AFTER auth.users succeeds.
-- ============================================================================
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
    -- The profile's email_transition_status is NOT yet updated because we
    -- moved the profiles UPDATE after the auth.users UPDATE.
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to complete email transition: ' || SQLERRM,
      'auth_email_updated', false
    );
END;
$$;


-- ============================================================================
-- CB-4: Align bulk_upsert_alumni_invites p_invited_by type to TEXT
--
-- Migration 102 changed p_invited_by from text to uuid. But the frontend
-- (useAlumniInvites.ts) passes the admin's email address (string), not
-- a UUID. This causes a runtime cast error. Fix: keep as text.
--
-- We re-create the function with p_invited_by text to match the frontend.
-- First drop the uuid overload from migration 102.
-- ============================================================================
DROP FUNCTION IF EXISTS public.bulk_upsert_alumni_invites(jsonb, uuid, uuid);

CREATE OR REPLACE FUNCTION public.bulk_upsert_alumni_invites(
  p_invites jsonb,
  p_invited_by text,
  p_batch_id uuid DEFAULT gen_random_uuid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_college_email text;
  v_personal_email text;
  v_college_domain text;
  v_domain_exists boolean;
  v_existing_status text;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_skipped integer := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  -- Admin check
  IF NOT public.is_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_invites)
  LOOP
    BEGIN
      v_college_email := lower(trim(v_item->>'college_email'));
      v_personal_email := lower(trim(v_item->>'personal_email'));

      -- Basic validation
      IF v_college_email IS NULL OR v_college_email = '' OR
         v_personal_email IS NULL OR v_personal_email = '' THEN
        v_errors := v_errors || jsonb_build_object(
          'college_email', COALESCE(v_college_email, ''),
          'error', 'Missing required email field'
        );
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      -- Emails must be different
      IF v_college_email = v_personal_email THEN
        v_errors := v_errors || jsonb_build_object(
          'college_email', v_college_email,
          'error', 'College email and personal email cannot be the same'
        );
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      -- Derive college_domain
      v_college_domain := split_part(v_college_email, '@', 2);

      -- Try to normalize via alias table
      SELECT COALESCE(
        (SELECT canonical_domain FROM public.college_domain_aliases WHERE domain = v_college_domain AND status = 'approved'),
        v_college_domain
      ) INTO v_college_domain;

      -- Check if domain is known (warn but don't block)
      SELECT EXISTS (
        SELECT 1 FROM public.colleges WHERE canonical_domain = v_college_domain
      ) INTO v_domain_exists;

      -- Pre-check the existing row status BEFORE upsert
      SELECT status INTO v_existing_status
      FROM public.alumni_invites
      WHERE college_email = v_college_email;

      -- Skip accepted, cancelled, and disputed invites
      IF v_existing_status IN ('accepted', 'cancelled', 'disputed') THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      -- Upsert: if college_email exists (invited/expired), re-issue token
      INSERT INTO public.alumni_invites (
        college_email, personal_email, college_domain, full_name,
        grad_year, degree, major, college_id,
        invited_by, batch_id, status, token, expires_at
      ) VALUES (
        v_college_email,
        v_personal_email,
        v_college_domain,
        trim(v_item->>'full_name'),
        (v_item->>'grad_year')::integer,
        trim(v_item->>'degree'),
        trim(v_item->>'major'),
        CASE WHEN v_item->>'college_id' IS NOT NULL AND v_item->>'college_id' != ''
          THEN (v_item->>'college_id')::uuid ELSE NULL END,
        p_invited_by,
        p_batch_id,
        'invited',
        encode(gen_random_bytes(32), 'hex'),
        now() + interval '7 days'
      )
      ON CONFLICT (college_email) DO UPDATE SET
        personal_email = EXCLUDED.personal_email,
        full_name = COALESCE(EXCLUDED.full_name, public.alumni_invites.full_name),
        grad_year = COALESCE(EXCLUDED.grad_year, public.alumni_invites.grad_year),
        degree = COALESCE(EXCLUDED.degree, public.alumni_invites.degree),
        major = COALESCE(EXCLUDED.major, public.alumni_invites.major),
        token = encode(gen_random_bytes(32), 'hex'),
        expires_at = now() + interval '7 days',
        status = 'invited',
        invited_by = p_invited_by,
        batch_id = p_batch_id,
        updated_at = now();

      -- Use the pre-check to determine insert vs update
      IF v_existing_status IS NOT NULL THEN
        v_updated := v_updated + 1;
      ELSE
        v_inserted := v_inserted + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object(
        'college_email', COALESCE(v_college_email, ''),
        'error', SQLERRM
      );
      v_skipped := v_skipped + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'inserted', v_inserted,
    'updated', v_updated,
    'skipped', v_skipped,
    'errors', v_errors
  );
END;
$$;


-- ============================================================================
-- NC-3: Replace hardcoded domain aliases in sync_profile_email with
--       college_domain_aliases table lookup.
--
-- The old code had:
--   IF v_college_domain IN ('raghuinstech.com', 'raghuenggcollege.in') THEN
--     v_college_domain := 'raghuenggcollege.in';
--   END IF;
--
-- This rots as new aliases are added. Use the existing
-- college_domain_aliases table instead.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain text;
  v_college_domain text;
  v_canonical_domain text;
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

    -- Case 2: Normal flow — derive domain from email
    v_domain := split_part(v_new_email, '@', 2);
    v_college_domain := lower(v_domain);

    -- NC-3 FIX: Use college_domain_aliases table instead of hardcoded aliases.
    -- Look up whether this domain has a canonical (approved) alias.
    SELECT canonical_domain INTO v_canonical_domain
    FROM public.college_domain_aliases
    WHERE domain = v_college_domain
      AND status = 'approved'
    LIMIT 1;

    IF v_canonical_domain IS NOT NULL THEN
      v_college_domain := v_canonical_domain;
    END IF;

    UPDATE profiles SET email = v_new_email, domain = v_domain,
      college_domain = v_college_domain, updated_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


-- ============================================================================
-- LG-9: Add app.bypass_alumni_guard flag support to the alumni email
--       immutability trigger.
--
-- Without this, admin RPCs that need to correct an alumni's college_email
-- (data fix) are blocked with no escape hatch. This follows the same
-- pattern as app.bypass_email_guard used elsewhere.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.guard_alumni_profile_email_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow bypass for admin correction RPCs (SECURITY DEFINER only)
  IF current_setting('app.bypass_alumni_guard', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Only enforce on Alumni profiles where email was set from invite
  IF OLD.role = 'Alumni' AND OLD.email IS NOT NULL THEN
    -- Block changes to the identity fields
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Cannot change college email for alumni profiles. College email is the identity anchor.';
    END IF;
    IF NEW.college_domain IS DISTINCT FROM OLD.college_domain THEN
      RAISE EXCEPTION 'Cannot change college domain for alumni profiles. Domain is derived from college email.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
