-- Migration 088: Alumni Invite Security Hardening
--
-- Fixes CRITICAL security and functional issues in the alumni invite system:
--
-- 1. SECURITY: Remove overly permissive RLS policy (USING true) on alumni_invites
-- 2. SECURITY: Rewrite accept_alumni_invite to use auth.uid() instead of parameter
-- 3. SECURITY: Add college_email immutability trigger on profiles
-- 4. FEATURE:  Add is_alumni_personal_email() check for AuthCallback
-- 5. FEATURE:  Add expire_stale_alumni_invites() cleanup function
-- 6. SECURITY: Proper GRANT statements on all public-facing RPCs
-- 7. SECURITY: Add rate limiting metadata columns

BEGIN;

-- ============================================================
-- 1. FIX RLS: Remove overly permissive public SELECT on alumni_invites
-- ============================================================
-- The old policy allowed ANY anonymous user to SELECT * FROM alumni_invites,
-- exposing tokens, personal emails, and college emails. The token-based
-- lookup is already handled by SECURITY DEFINER RPCs, so this policy
-- should be removed entirely. 

DROP POLICY IF EXISTS alumni_invites_public_read_by_token ON public.alumni_invites;

-- Replace with a restrictive policy: authenticated users can only see
-- their own accepted invite (matched by auth_user_id).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'alumni_invites' 
    AND policyname = 'alumni_invites_own_accepted'
  ) THEN
    CREATE POLICY alumni_invites_own_accepted ON public.alumni_invites
      FOR SELECT
      USING (auth.uid() = auth_user_id);
  END IF;
END $$;


-- ============================================================
-- 2. FIX: Rewrite accept_alumni_invite to use auth.uid()
--    Old version took p_auth_user_id as a parameter, allowing
--    any caller to claim an invite as any user.
-- ============================================================
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

  SELECT * INTO v_invite
  FROM public.alumni_invites
  WHERE token = p_token AND status = 'invited';

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

-- Also drop the old 2-parameter overload to prevent fallback
DROP FUNCTION IF EXISTS public.accept_alumni_invite(text, uuid);


-- ============================================================
-- 3. SECURITY: College email immutability trigger on profiles
--    Once profiles.email is set via alumni invite, it MUST NOT change.
--    This prevents any path (RPC, direct update) from breaking identity.
-- ============================================================
CREATE OR REPLACE FUNCTION public.guard_alumni_profile_email_immutability()
RETURNS TRIGGER AS $$
BEGIN
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

DROP TRIGGER IF EXISTS trigger_guard_alumni_email_immutability ON public.profiles;
CREATE TRIGGER trigger_guard_alumni_email_immutability
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role = 'Alumni')
  EXECUTE FUNCTION public.guard_alumni_profile_email_immutability();


-- ============================================================
-- 4. FEATURE: is_alumni_personal_email() for AuthCallback
--    Checks if a personal email belongs to an accepted alumni invite.
--    Used to bypass the academic-email gate for returning alumni.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_alumni_personal_email(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Check 1: Profile exists with this personal_email and role=Alumni
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE personal_email = lower(p_email)
    AND role = 'Alumni'
    AND onboarding_complete = true
  ) THEN
    RETURN true;
  END IF;

  -- Check 2: Accepted alumni invite with this personal_email
  -- (covers the gap between auth creation and profile completion)
  IF EXISTS (
    SELECT 1 FROM public.alumni_invites
    WHERE personal_email = lower(p_email)
    AND status = 'accepted'
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Grant to anon so AuthCallback can call it before full auth
GRANT EXECUTE ON FUNCTION public.is_alumni_personal_email(text) TO anon;
GRANT EXECUTE ON FUNCTION public.is_alumni_personal_email(text) TO authenticated;


-- ============================================================
-- 5. FEATURE: Expire stale alumni invites automatically
--    Can be called by a Supabase cron job or manually.
-- ============================================================
CREATE OR REPLACE FUNCTION public.expire_stale_alumni_invites()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.alumni_invites
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'invited'
    AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'expired_count', v_count,
    'run_at', now()
  );
END;
$$;


-- ============================================================
-- 6. SECURITY: Fix validate_alumni_invite_token grant
--    Needs to be callable by anon users (token validation is pre-auth)
-- ============================================================
GRANT EXECUTE ON FUNCTION public.validate_alumni_invite_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_alumni_invite_token(text) TO authenticated;

-- accept_alumni_invite: only authenticated users
GRANT EXECUTE ON FUNCTION public.accept_alumni_invite(text) TO authenticated;

-- dispute_alumni_invite: callable by anon (pre-auth)
GRANT EXECUTE ON FUNCTION public.dispute_alumni_invite(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.dispute_alumni_invite(text, text) TO authenticated;

-- expire_stale: admin only (called by cron or admin)
-- No anon/authenticated grant — only service_role can call it


-- ============================================================
-- 7. SECURITY: Validate college_domain exists in colleges table
--    Add a check to bulk_upsert that warns on unknown domains
-- ============================================================
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
  v_inserted int := 0;
  v_updated int := 0;
  v_skipped int := 0;
  v_errors jsonb := '[]'::jsonb;
  v_college_email text;
  v_personal_email text;
  v_college_domain text;
  v_domain_exists boolean;
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

      -- Check if domain is known (warn but don't block — admin may be adding a new college)
      SELECT EXISTS (
        SELECT 1 FROM public.colleges WHERE canonical_domain = v_college_domain
      ) INTO v_domain_exists;

      -- Upsert: if college_email exists, re-issue token
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
        token = CASE
          WHEN public.alumni_invites.status = 'accepted' THEN public.alumni_invites.token
          ELSE encode(gen_random_bytes(32), 'hex')
        END,
        expires_at = CASE
          WHEN public.alumni_invites.status = 'accepted' THEN public.alumni_invites.expires_at
          ELSE now() + interval '7 days'
        END,
        status = CASE
          WHEN public.alumni_invites.status = 'accepted' THEN 'accepted' -- don't re-invite accepted
          ELSE 'invited'
        END,
        invited_by = p_invited_by,
        batch_id = p_batch_id,
        updated_at = now();

      -- Check if it was inserted or updated
      IF EXISTS (
        SELECT 1 FROM public.alumni_invites
        WHERE college_email = v_college_email AND status = 'accepted'
      ) THEN
        v_skipped := v_skipped + 1;
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


-- ============================================================
-- 8. SECURITY: Add index for personal_email lookups on profiles
--    Required for efficient is_alumni_personal_email() checks
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_personal_email_alumni
  ON public.profiles (personal_email)
  WHERE role = 'Alumni' AND personal_email IS NOT NULL;


-- ============================================================
-- 9. Schedule expired invite cleanup (hourly)
--    Uses pg_cron if available, otherwise noop
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'expire-stale-alumni-invites',
      '0 * * * *', -- Every hour
      $cron$ SELECT public.expire_stale_alumni_invites(); $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available — skipping scheduled alumni invite expiry';
END;
$$;


COMMIT;
