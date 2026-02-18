-- Migration 091: Cancel Alumni Invite RPC
-- Replaces direct .from("alumni_invites").update() with a proper admin-gated RPC.
-- Ensures cancel action goes through SECURITY DEFINER with is_platform_admin() check.

BEGIN;

CREATE OR REPLACE FUNCTION public.cancel_alumni_invite(p_invite_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
BEGIN
  -- Admin-only
  IF NOT public.is_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_invite FROM public.alumni_invites WHERE id = p_invite_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite not found');
  END IF;

  IF v_invite.status = 'accepted' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel an already accepted invite');
  END IF;

  IF v_invite.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite is already cancelled');
  END IF;

  UPDATE public.alumni_invites
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = p_invite_id;

  RETURN jsonb_build_object(
    'success', true,
    'invite_id', p_invite_id,
    'previous_status', v_invite.status
  );
END;
$$;

-- Only authenticated (admin check is inside the function)
REVOKE ALL ON FUNCTION public.cancel_alumni_invite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_alumni_invite(uuid) TO authenticated;

COMMENT ON FUNCTION public.cancel_alumni_invite(uuid) IS
  'Admin-only: Cancel an alumni invite. Cannot cancel already-accepted invites.';

COMMIT;
