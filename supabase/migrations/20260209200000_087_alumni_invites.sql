-- Migration 087: Alumni Invite System
-- College email = identity anchor, personal email = login + delivery
-- Enables bulk alumni onboarding via admin-uploaded Excel/CSV

BEGIN;

-- ============================================================
-- 1. Alumni Invites Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alumni_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identity
  college_email text NOT NULL,
  personal_email text NOT NULL,
  college_domain text NOT NULL,
  -- Profile data from Excel
  full_name text,
  grad_year integer,
  degree text,
  major text,
  college_id uuid REFERENCES public.colleges(id) ON DELETE SET NULL,
  -- Token
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  -- Status
  status text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'accepted', 'expired', 'disputed', 'cancelled')),
  -- Linking
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  -- Audit
  invited_by text, -- admin email
  batch_id uuid, -- groups rows from same upload
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Constraints
  CONSTRAINT alumni_invites_college_email_unique UNIQUE (college_email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alumni_invites_token ON public.alumni_invites(token);
CREATE INDEX IF NOT EXISTS idx_alumni_invites_status ON public.alumni_invites(status);
CREATE INDEX IF NOT EXISTS idx_alumni_invites_college_domain ON public.alumni_invites(college_domain);
CREATE INDEX IF NOT EXISTS idx_alumni_invites_personal_email ON public.alumni_invites(personal_email);
CREATE INDEX IF NOT EXISTS idx_alumni_invites_batch_id ON public.alumni_invites(batch_id);
CREATE INDEX IF NOT EXISTS idx_alumni_invites_expires_at ON public.alumni_invites(expires_at) WHERE status = 'invited';

-- RLS
ALTER TABLE public.alumni_invites ENABLE ROW LEVEL SECURITY;

-- Admin-only read/write
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'alumni_invites' AND policyname = 'alumni_invites_admin_all'
  ) THEN
    CREATE POLICY alumni_invites_admin_all ON public.alumni_invites
      FOR ALL
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

-- Public can read own invite by token (for claim flow)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'alumni_invites' AND policyname = 'alumni_invites_public_read_by_token'
  ) THEN
    CREATE POLICY alumni_invites_public_read_by_token ON public.alumni_invites
      FOR SELECT
      USING (true); -- token lookup is done in RPC with service-role, but this allows anon reads filtered by token
  END IF;
END $$;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.alumni_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_alumni_invites_updated_at ON public.alumni_invites;
CREATE TRIGGER trigger_alumni_invites_updated_at
  BEFORE UPDATE ON public.alumni_invites
  FOR EACH ROW EXECUTE FUNCTION public.alumni_invites_updated_at();

-- ============================================================
-- 2. RPC: Validate and claim an alumni invite token
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_alumni_invite_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
BEGIN
  SELECT * INTO v_invite
  FROM public.alumni_invites
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid invite token');
  END IF;

  IF v_invite.status = 'accepted' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This invite has already been used');
  END IF;

  IF v_invite.status = 'cancelled' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This invite has been cancelled');
  END IF;

  IF v_invite.status = 'disputed' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This invite is under review');
  END IF;

  IF v_invite.expires_at < now() THEN
    -- Auto-mark as expired
    UPDATE public.alumni_invites SET status = 'expired' WHERE id = v_invite.id;
    RETURN jsonb_build_object('valid', false, 'error', 'This invite has expired. Please contact your college admin for a new invite.');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'invite_id', v_invite.id,
    'college_email', v_invite.college_email,
    'personal_email', v_invite.personal_email,
    'college_domain', v_invite.college_domain,
    'full_name', v_invite.full_name,
    'grad_year', v_invite.grad_year,
    'degree', v_invite.degree,
    'major', v_invite.major
  );
END;
$$;

-- ============================================================
-- 3. RPC: Accept alumni invite (called after auth user created)
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_alumni_invite(p_token text, p_auth_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
BEGIN
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

  -- Check if personal email already has an active account
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE email = v_invite.college_email AND onboarding_complete = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'An account already exists for this college email');
  END IF;

  -- Mark invite as accepted
  UPDATE public.alumni_invites
  SET status = 'accepted',
      accepted_at = now(),
      auth_user_id = p_auth_user_id
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

-- ============================================================
-- 4. RPC: Dispute an alumni invite
-- ============================================================
CREATE OR REPLACE FUNCTION public.dispute_alumni_invite(p_token text, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.alumni_invites
  SET status = 'disputed',
      updated_at = now()
  WHERE token = p_token AND status = 'invited';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite not found or already processed');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 5. RPC: Bulk upsert invites (admin only)
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

      -- Derive college_domain
      v_college_domain := split_part(v_college_email, '@', 2);

      -- Try to normalize via alias table
      SELECT COALESCE(
        (SELECT canonical_domain FROM public.college_domain_aliases WHERE domain = v_college_domain AND status = 'approved'),
        v_college_domain
      ) INTO v_college_domain;

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
        token = encode(gen_random_bytes(32), 'hex'),
        expires_at = now() + interval '7 days',
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
        'college_email', v_college_email,
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
-- 6. RPC: Get alumni invites (admin dashboard)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_alumni_invites(
  p_status text DEFAULT NULL,
  p_college_domain text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_invites jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Count total
  SELECT count(*) INTO v_total
  FROM public.alumni_invites ai
  WHERE (p_status IS NULL OR ai.status = p_status)
    AND (p_college_domain IS NULL OR ai.college_domain = p_college_domain)
    AND (p_search IS NULL OR
      ai.college_email ILIKE '%' || p_search || '%' OR
      ai.personal_email ILIKE '%' || p_search || '%' OR
      ai.full_name ILIKE '%' || p_search || '%');

  -- Get records
  SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.created_at DESC), '[]'::jsonb)
  INTO v_invites
  FROM (
    SELECT
      ai.id,
      ai.college_email,
      ai.personal_email,
      ai.college_domain,
      ai.full_name,
      ai.grad_year,
      ai.degree,
      ai.major,
      ai.status,
      ai.token,
      ai.expires_at,
      ai.accepted_at,
      ai.invited_by,
      ai.batch_id,
      ai.created_at,
      ai.updated_at,
      c.name as college_name
    FROM public.alumni_invites ai
    LEFT JOIN public.colleges c ON c.canonical_domain = ai.college_domain
    WHERE (p_status IS NULL OR ai.status = p_status)
      AND (p_college_domain IS NULL OR ai.college_domain = p_college_domain)
      AND (p_search IS NULL OR
        ai.college_email ILIKE '%' || p_search || '%' OR
        ai.personal_email ILIKE '%' || p_search || '%' OR
        ai.full_name ILIKE '%' || p_search || '%')
    ORDER BY ai.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) r;

  RETURN jsonb_build_object(
    'success', true,
    'total', v_total,
    'invites', v_invites
  );
END;
$$;

-- ============================================================
-- 7. RPC: Resend invite (re-issue token + new expiry)
-- ============================================================
CREATE OR REPLACE FUNCTION public.resend_alumni_invite(p_invite_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_invite FROM public.alumni_invites WHERE id = p_invite_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite not found');
  END IF;

  IF v_invite.status = 'accepted' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite already accepted');
  END IF;

  UPDATE public.alumni_invites
  SET token = encode(gen_random_bytes(32), 'hex'),
      expires_at = now() + interval '7 days',
      status = 'invited',
      updated_at = now()
  WHERE id = p_invite_id
  RETURNING token INTO v_invite;

  RETURN jsonb_build_object(
    'success', true,
    'token', v_invite.token,
    'personal_email', (SELECT personal_email FROM public.alumni_invites WHERE id = p_invite_id)
  );
END;
$$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.alumni_invites;

COMMIT;
