-- ============================================================================
-- 107: Public Domain Account Enforcement + Cleanup RPCs
--
-- Enforces:
-- 1) Public domains cannot create standalone community profiles.
-- 2) college_domain is immutable once set.
-- 3) personal_email is recovery-only and must differ from primary email.
-- 4) Admin-safe audit + cleanup functions for existing invalid accounts.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- Public domain detector (DB source of truth)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_public_email_domain(p_domain text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain text := lower(btrim(COALESCE(p_domain, '')));
BEGIN
  IF v_domain = '' THEN
    RETURN false;
  END IF;

  IF v_domain = ANY(ARRAY[
    'gmail.com',
    'yahoo.com',
    'outlook.com',
    'hotmail.com',
    'icloud.com',
    'proton.me',
    'protonmail.com',
    'live.com',
    'msn.com',
    'aol.com',
    'mail.com',
    'yandex.com',
    'zoho.com',
    'rediffmail.com',
    'inbox.com'
  ]) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.college_domain_aliases cda
    WHERE cda.domain = v_domain
      AND COALESCE(cda.status, 'pending') = 'blocked'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_public_email_domain(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_public_email_domain(text) TO anon;

-- --------------------------------------------------------------------------
-- Quarantine table for invalid public-domain standalone accounts with content
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.public_domain_account_quarantine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text,
  college_domain text,
  quarantine_reason text NOT NULL,
  has_posts boolean NOT NULL DEFAULT false,
  has_connections boolean NOT NULL DEFAULT false,
  has_messages boolean NOT NULL DEFAULT false,
  profile_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.public_domain_account_quarantine ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view public domain quarantine" ON public.public_domain_account_quarantine;
CREATE POLICY "Platform admins can view public domain quarantine"
  ON public.public_domain_account_quarantine
  FOR SELECT
  USING (public.is_platform_admin());

-- --------------------------------------------------------------------------
-- Constraint: personal email must differ from primary email
-- --------------------------------------------------------------------------
SELECT set_config('app.bypass_email_guard', 'true', true);

UPDATE public.profiles
SET personal_email = NULL,
    personal_email_verified = false,
    personal_email_verified_at = NULL,
    updated_at = now()
WHERE personal_email IS NOT NULL
  AND email IS NOT NULL
  AND lower(personal_email) = lower(email);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_personal_email_differs_from_email_chk;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_personal_email_differs_from_email_chk
  CHECK (
    personal_email IS NULL
    OR email IS NULL
    OR lower(personal_email) <> lower(email)
  );

-- --------------------------------------------------------------------------
-- Trigger: college_domain immutability (once set)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_college_domain_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.bypass_college_domain_guard', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF OLD.college_domain IS NOT NULL
     AND NEW.college_domain IS DISTINCT FROM OLD.college_domain THEN
    RAISE EXCEPTION 'college_domain is immutable';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_college_domain_update ON public.profiles;
CREATE TRIGGER trg_prevent_college_domain_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_college_domain_update();

-- --------------------------------------------------------------------------
-- Trigger: block standalone public-domain profiles
-- --------------------------------------------------------------------------
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
BEGIN
  IF current_setting('app.bypass_public_domain_guard', true) = 'true' THEN
    RETURN NEW;
  END IF;

  v_email_domain := lower(split_part(COALESCE(NEW.email, ''), '@', 2));
  v_college_domain := lower(btrim(COALESCE(NEW.college_domain, '')));

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

DROP TRIGGER IF EXISTS trg_block_public_domain_profile ON public.profiles;
CREATE TRIGGER trg_block_public_domain_profile
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.block_public_domain_profile();

-- --------------------------------------------------------------------------
-- Updated auth signup hook: skip profile creation for blocked public domains
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role public.user_role;
  user_email text;
  email_domain text;
  canonical_college_domain text;
  v_existing_transitioned_id uuid;
  v_is_platform_admin boolean := false;
BEGIN
  user_email := NEW.email;

  IF user_email IS NOT NULL AND user_email LIKE '%@%' THEN
    email_domain := lower(substring(user_email FROM '@(.+)$'));
  ELSE
    email_domain := NULL;
  END IF;

  IF user_email IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.is_active = true
        AND lower(pa.email) = lower(user_email)
    ) INTO v_is_platform_admin;
  END IF;

  -- Platform admins are provisioned in AuthCallback with a dedicated admin profile.
  IF v_is_platform_admin THEN
    RETURN NEW;
  END IF;

  -- Never create standalone profile rows for public-domain auth signups.
  IF email_domain IS NOT NULL AND public.is_public_email_domain(email_domain) THEN
    -- If this is a transitioned personal-email login, skip profile creation and let merge path run.
    SELECT id INTO v_existing_transitioned_id
    FROM public.profiles
    WHERE lower(personal_email) = lower(user_email)
      AND email_transition_status = 'transitioned'
      AND personal_email_verified = true
      AND onboarding_complete = true
    LIMIT 1;

    RETURN NEW;
  END IF;

  canonical_college_domain := public.normalize_college_domain(email_domain);

  IF canonical_college_domain IS NULL OR public.is_public_email_domain(canonical_college_domain) THEN
    RETURN NEW;
  END IF;

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
      split_part(user_email, '@', 1)
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
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    domain = COALESCE(profiles.domain, EXCLUDED.domain),
    updated_at = now();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- Updated sync hook: never let auth email mutate community identity
-- --------------------------------------------------------------------------
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

  -- Bypass protected-column guards for managed trigger updates.
  PERFORM set_config('app.bypass_email_guard', 'true', true);
  PERFORM set_config('app.bypass_college_domain_guard', 'true', true);

  -- Transitioned users: auth email update maps to personal_email only.
  IF v_current_status = 'transitioned'
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

  UPDATE public.profiles
  SET email = v_new_email,
      domain = v_domain,
      college_domain = CASE
        WHEN college_domain IS NULL THEN v_college_domain
        ELSE college_domain
      END,
      updated_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- Audit RPC for invalid standalone public-domain profiles
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_domain_profile_audit()
RETURNS TABLE (
  id uuid,
  email text,
  college_domain text,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.college_domain,
    CASE
      WHEN p.college_domain IS NULL THEN 'missing_college_domain'
      WHEN public.is_public_email_domain(p.college_domain) THEN 'public_college_domain'
      WHEN public.is_public_email_domain(lower(split_part(COALESCE(p.email, ''), '@', 2))) THEN 'public_primary_email'
      ELSE 'unknown'
    END AS reason
  FROM public.profiles p
  WHERE (
      p.college_domain IS NULL
      OR public.is_public_email_domain(p.college_domain)
      OR public.is_public_email_domain(lower(split_part(COALESCE(p.email, ''), '@', 2)))
    )
    AND NOT (
      p.college_domain IS NOT NULL
      AND NOT public.is_public_email_domain(p.college_domain)
    )
  ORDER BY p.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_domain_profile_audit() TO authenticated;

-- --------------------------------------------------------------------------
-- Cleanup RPC: hard-delete invalid account or quarantine if it has content
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_public_domain_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_email_domain text;
  v_has_posts boolean := false;
  v_has_connections boolean := false;
  v_has_messages boolean := false;
  v_has_content boolean := false;
  v_auth_exists boolean := false;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied: platform admin required');
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  v_email_domain := lower(split_part(COALESCE(v_profile.email, ''), '@', 2));

  -- Only invalid standalone public-domain candidates are eligible.
  IF NOT (
    v_profile.college_domain IS NULL
    OR public.is_public_email_domain(v_profile.college_domain)
    OR public.is_public_email_domain(v_email_domain)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile has academic college_domain and is not eligible');
  END IF;

  -- Protect accounts that still have an academic identity anchor.
  IF v_profile.college_domain IS NOT NULL
     AND NOT public.is_public_email_domain(v_profile.college_domain) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Academic link exists; cleanup blocked');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.posts WHERE user_id = p_user_id)
  INTO v_has_posts;

  SELECT EXISTS(
    SELECT 1
    FROM public.connections
    WHERE requester_id = p_user_id OR receiver_id = p_user_id
  ) INTO v_has_connections;

  SELECT EXISTS(
    SELECT 1
    FROM public.messages
    WHERE sender_id = p_user_id OR receiver_id = p_user_id
  ) INTO v_has_messages;

  v_has_content := v_has_posts OR v_has_connections OR v_has_messages;

  IF v_has_content THEN
    INSERT INTO public.public_domain_account_quarantine (
      user_id,
      email,
      college_domain,
      quarantine_reason,
      has_posts,
      has_connections,
      has_messages,
      profile_snapshot
    )
    VALUES (
      v_profile.id,
      v_profile.email,
      v_profile.college_domain,
      'Invalid standalone public-domain account with existing social graph content',
      v_has_posts,
      v_has_connections,
      v_has_messages,
      to_jsonb(v_profile)
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      college_domain = EXCLUDED.college_domain,
      quarantine_reason = EXCLUDED.quarantine_reason,
      has_posts = EXCLUDED.has_posts,
      has_connections = EXCLUDED.has_connections,
      has_messages = EXCLUDED.has_messages,
      profile_snapshot = EXCLUDED.profile_snapshot,
      created_at = now();

    RETURN jsonb_build_object(
      'success', true,
      'action', 'quarantined',
      'user_id', p_user_id,
      'has_posts', v_has_posts,
      'has_connections', v_has_connections,
      'has_messages', v_has_messages
    );
  END IF;

  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO v_auth_exists;

  IF v_auth_exists THEN
    DELETE FROM auth.users WHERE id = p_user_id;
  ELSE
    DELETE FROM public.profiles WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action', 'hard_deleted',
    'user_id', p_user_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_public_domain_user(uuid) TO authenticated;

COMMIT;
