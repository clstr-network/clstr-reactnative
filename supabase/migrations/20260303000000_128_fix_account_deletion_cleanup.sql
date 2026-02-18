-- ============================================================================
-- 128_fix_account_deletion_cleanup.sql
--
-- Fixes:
-- 1. Update handle_user_deletion trigger to gracefully deactivate mentorship
--    offers and cancel pending mentorship requests before the auth user row is
--    deleted. This prevents orphaned active mentorships with NULL user refs.
--
-- 2. The edge function change (shouldSoftDelete: false) ensures the auth user
--    is hard-deleted, freeing the email for re-registration.
-- ============================================================================

BEGIN;

-- ── Updated handle_user_deletion: deactivate mentorships before delete ──

CREATE OR REPLACE FUNCTION public.handle_user_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reason text;
BEGIN
  -- Detect merge context vs real account deletion
  IF current_setting('app.merge_in_progress', true) = 'true' THEN
    v_reason := 'Duplicate auth user removed during account merge';
  ELSE
    v_reason := 'User account deleted';
  END IF;

  -- ── Mentorship cleanup (runs BEFORE cascade deletes profile) ──
  -- Cancel pending/accepted mentorship requests involving this user.
  -- The FK is ON DELETE SET NULL, so the row survives but with NULL user ref.
  -- Setting status to 'cancelled' gives us a clean state instead of
  -- dangling active sessions with no mentor/mentee.
  UPDATE public.mentorship_requests
  SET status = 'cancelled', updated_at = NOW()
  WHERE (mentee_id = OLD.id OR mentor_id = OLD.id)
    AND status IN ('pending', 'accepted');

  -- Deactivate all mentorship offers by this user
  UPDATE public.mentorship_offers
  SET is_active = false, updated_at = NOW()
  WHERE mentor_id = OLD.id AND is_active = true;

  -- ── Audit log ──
  INSERT INTO public.account_deletion_audit (user_id, email, deletion_reason, deleted_at)
  VALUES (OLD.id, OLD.email, v_reason, NOW());

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_user_deletion: %', SQLERRM;
    RETURN OLD;
END;
$$;

COMMIT;
