-- ============================================================
-- Migration 089: Risk mitigations for alumni invite system
--
-- Risk 1: Reduce sessionStorage trust → server-side RPC for invite context
-- Risk 2: Rate-limit resend → last_sent_at column + 24h cooldown
-- Risk 3: Profile creation race → (handled in app code)
-- ============================================================

-- ============================================================
-- 1. RISK 2: Add last_sent_at column for resend rate-limiting
-- ============================================================
ALTER TABLE public.alumni_invites
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz DEFAULT now();

-- Backfill: set last_sent_at = created_at for existing rows
UPDATE public.alumni_invites
  SET last_sent_at = created_at
  WHERE last_sent_at IS NULL;

-- ============================================================
-- 2. RISK 2: Update resend_alumni_invite to enforce 24h cooldown
-- ============================================================
CREATE OR REPLACE FUNCTION public.resend_alumni_invite(p_invite_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
  v_new_token text;
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

  -- RISK 2: Enforce 24-hour cooldown between resends
  IF v_invite.last_sent_at IS NOT NULL
     AND v_invite.last_sent_at > now() - interval '24 hours' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invite was already sent within the last 24 hours. Please wait before resending.',
      'last_sent_at', v_invite.last_sent_at,
      'retry_after', v_invite.last_sent_at + interval '24 hours'
    );
  END IF;

  UPDATE public.alumni_invites
  SET token = encode(gen_random_bytes(32), 'hex'),
      expires_at = now() + interval '7 days',
      status = 'invited',
      last_sent_at = now(),
      updated_at = now()
  WHERE id = p_invite_id
  RETURNING token INTO v_new_token;

  RETURN jsonb_build_object(
    'success', true,
    'token', v_new_token,
    'personal_email', v_invite.personal_email
  );
END;
$$;

-- ============================================================
-- 3. RISK 2: Update get_alumni_invites to return last_sent_at
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

  -- Get records (now includes last_sent_at)
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
      ai.last_sent_at,
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
-- 4. RISK 1: Server-side RPC to fetch accepted invite context
--    Onboarding calls this instead of trusting sessionStorage.
--    Returns invite data for the current auth.uid() if they have
--    an accepted invite with no completed profile yet.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_accepted_invite_context()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_invite record;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- Find the most recent accepted invite for this auth user
  -- that hasn't been turned into a completed profile yet
  SELECT ai.* INTO v_invite
  FROM public.alumni_invites ai
  WHERE ai.auth_user_id = v_user_id
    AND ai.status = 'accepted'
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = v_user_id AND p.onboarding_complete = true
    )
  ORDER BY ai.accepted_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'invite_id', v_invite.id,
    'college_email', v_invite.college_email,
    'college_domain', v_invite.college_domain,
    'full_name', v_invite.full_name,
    'grad_year', v_invite.grad_year,
    'degree', v_invite.degree,
    'major', v_invite.major,
    'personal_email', v_invite.personal_email
  );
END;
$$;

-- Only authenticated users can call this
GRANT EXECUTE ON FUNCTION public.get_accepted_invite_context() TO authenticated;
