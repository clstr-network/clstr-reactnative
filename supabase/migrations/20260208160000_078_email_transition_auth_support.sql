-- ============================================================================
-- 078: Email Transition — Auth-Level Support
--
-- Addresses the critical gap: when a user transitions to a personal email,
-- the Supabase Auth email (auth.users.email) must also be updated.
--
-- The client calls supabase.auth.updateUser({ email }) which triggers
-- Supabase's built-in email change confirmation flow. This migration adds:
--
-- 1. An index on personal_email + email_transition_status for fast
--    lookups when AuthCallback checks if a non-edu email belongs to a
--    transitioned user.
--
-- 2. An RPC `check_transitioned_email(p_email)` so the check can be done
--    server-side if needed (e.g., from an Edge Function or webhook).
--
-- 3. Updates sync_profile_email trigger to handle the case where Supabase
--    Auth changes auth.users.email to the personal email after the user
--    confirms the change.
-- ============================================================================

-- 1. Composite index for transitioned personal email lookups
-- Used by AuthCallback query: WHERE personal_email = ? AND email_transition_status = 'transitioned'
CREATE INDEX IF NOT EXISTS idx_profiles_transitioned_personal_email
  ON public.profiles (personal_email, email_transition_status)
  WHERE personal_email IS NOT NULL AND email_transition_status = 'transitioned';

-- 2. RPC: Check if an email belongs to a transitioned user
-- Returns true/false. Public access (used during auth callback before session is established).
CREATE OR REPLACE FUNCTION public.check_transitioned_email(p_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_exists boolean;
BEGIN
  IF p_email IS NULL OR p_email = '' THEN
    RETURN jsonb_build_object('is_transitioned', false);
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE lower(personal_email) = lower(p_email)
      AND email_transition_status = 'transitioned'
      AND personal_email_verified = true
  ) INTO v_exists;

  RETURN jsonb_build_object('is_transitioned', COALESCE(v_exists, false));
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_transitioned_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_transitioned_email(text) TO anon;

-- 3. Update sync_profile_email to handle auth email changes gracefully
-- When Supabase Auth confirms the email change (user clicked confirmation link),
-- it fires this trigger. For transitioned users, the new auth email IS the personal
-- email, so we should NOT overwrite college_domain.
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

    -- Case 1: User has transitioned and the new auth email matches their personal email
    -- This happens when Supabase Auth confirms the email change after transition.
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
