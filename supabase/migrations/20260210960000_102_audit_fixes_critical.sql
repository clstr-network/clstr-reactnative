-- ============================================================================
-- 102: Critical Audit Fixes — Platform Admin Identity & Concurrency
--
-- Fixes from the Alumni Identity & Onboarding Systems Audit:
--
-- CB-1: is_platform_admin() / is_founder() read auth.users.email — breaks
--       for transitioned admins whose auth.users.email is now personal.
--       Fix: check profiles.email + profiles.personal_email + auth.users.email.
--
-- CB-2: ai_review_results RLS duplicates the same auth.users.email bug.
--       Fix: replace inline subquery with public.is_platform_admin().
--
-- CB-3: accept_alumni_invite has no FOR UPDATE row lock — race condition
--       allows double-acceptance.
--       Fix: add FOR UPDATE to the SELECT.
--
-- CB-4: bulk_upsert_alumni_invites v_updated counter is never incremented.
--       Fix: use xmax system column to distinguish insert vs update.
--
-- UX-2: bulk_upsert_alumni_invites re-invites cancelled/disputed invites
--       without warning.
--       Fix: preserve cancelled/disputed status in ON CONFLICT clause.
-- ============================================================================

BEGIN;

-- ============================================================================
-- CB-1a: Rewrite is_platform_admin() to check all email surfaces
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_auth_email text;
  v_profile_email text;
  v_personal_email text;
  is_admin boolean := false;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- Gather all possible email surfaces for this user
  SELECT email INTO v_auth_email FROM auth.users WHERE id = v_uid;

  SELECT p.email, p.personal_email
  INTO v_profile_email, v_personal_email
  FROM public.profiles p WHERE p.id = v_uid;

  -- Check if ANY of the user's known emails is an active platform admin
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins pa
    WHERE pa.is_active = true
      AND (
        lower(pa.email) = lower(v_auth_email)
        OR lower(pa.email) = lower(v_profile_email)
        OR lower(pa.email) = lower(v_personal_email)
      )
  ) INTO is_admin;

  RETURN COALESCE(is_admin, false);
END;
$$;

-- ============================================================================
-- CB-1b: Rewrite is_founder() to check all email surfaces
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_founder()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_auth_email text;
  v_profile_email text;
  v_personal_email text;
  is_founder_user boolean := false;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- Gather all possible email surfaces for this user
  SELECT email INTO v_auth_email FROM auth.users WHERE id = v_uid;

  SELECT p.email, p.personal_email
  INTO v_profile_email, v_personal_email
  FROM public.profiles p WHERE p.id = v_uid;

  -- Check if ANY of the user's known emails is the active founder
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins pa
    WHERE pa.is_active = true
      AND pa.role = 'founder'
      AND (
        lower(pa.email) = lower(v_auth_email)
        OR lower(pa.email) = lower(v_profile_email)
        OR lower(pa.email) = lower(v_personal_email)
      )
  ) INTO is_founder_user;

  RETURN COALESCE(is_founder_user, false);
END;
$$;


-- ============================================================================
-- CB-2: Replace inline admin checks in ai_review_results RLS with
--       is_platform_admin() (now fixed via CB-1)
-- ============================================================================
DROP POLICY IF EXISTS ai_review_results_select ON public.ai_review_results;
CREATE POLICY ai_review_results_select ON public.ai_review_results
  FOR SELECT USING (public.is_platform_admin());

DROP POLICY IF EXISTS ai_review_results_insert ON public.ai_review_results;
CREATE POLICY ai_review_results_insert ON public.ai_review_results
  FOR INSERT WITH CHECK (public.is_platform_admin());


-- ============================================================================
-- CB-3: Add FOR UPDATE to accept_alumni_invite SELECT to prevent
--       race-condition double-acceptance
-- ============================================================================
CREATE OR REPLACE FUNCTION public.accept_alumni_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
  v_auth_user_id uuid;
BEGIN
  -- SECURITY: Derive user ID from the authenticated session, not a parameter
  v_auth_user_id := auth.uid();

  IF v_auth_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- FOR UPDATE prevents concurrent callers from reading the same row
  -- until this transaction completes (prevents double-acceptance race)
  SELECT * INTO v_invite
  FROM public.alumni_invites
  WHERE token = p_token AND status = 'invited'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or already claimed invite');
  END IF;

  IF v_invite.expires_at < now() THEN
    UPDATE public.alumni_invites SET status = 'expired' WHERE id = v_invite.id;
    RETURN jsonb_build_object('success', false, 'error', 'Invite has expired');
  END IF;

  -- Check if college email is already associated with a completed profile
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE email = v_invite.college_email AND onboarding_complete = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'An account already exists for this college email');
  END IF;

  -- Verify the auth user's email matches the invite's personal_email
  -- This prevents someone from using a stolen token with a different auth account
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = v_auth_user_id
    AND lower(email) = lower(v_invite.personal_email)
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Your login email does not match the personal email on this invite'
    );
  END IF;

  -- Mark invite as accepted
  UPDATE public.alumni_invites
  SET status = 'accepted',
      accepted_at = now(),
      auth_user_id = v_auth_user_id
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', true,
    'invite_id', v_invite.id,
    'college_email', v_invite.college_email,
    'college_domain', v_invite.college_domain,
    'full_name', v_invite.full_name,
    'grad_year', v_invite.grad_year,
    'degree', v_invite.degree,
    'major', v_invite.major
  );
END;
$$;


-- ============================================================================
-- CB-4 + UX-2: Fix bulk_upsert_alumni_invites
--   - CB-4: v_updated counter never incremented → pre-check existence
--   - UX-2: cancelled/disputed invites silently re-activated → skip them
-- ============================================================================

CREATE OR REPLACE FUNCTION public.bulk_upsert_alumni_invites(
  p_invites jsonb,
  p_invited_by uuid,
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

      -- CB-4 FIX: Pre-check the existing row status BEFORE upsert
      -- so we can correctly count inserts vs updates.
      -- UX-2 FIX: Skip accepted, cancelled, and disputed invites.
      SELECT status INTO v_existing_status
      FROM public.alumni_invites
      WHERE college_email = v_college_email;

      IF v_existing_status IN ('accepted', 'cancelled', 'disputed') THEN
        -- Don't re-invite terminal/protected invites
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

      -- CB-4 FIX: Use the pre-check to determine insert vs update
      IF v_existing_status IS NOT NULL THEN
        -- Row existed before (invited or expired) → this was an update
        v_updated := v_updated + 1;
      ELSE
        -- Row didn't exist → this was a fresh insert
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

COMMIT;
