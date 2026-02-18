-- 116_notifications_insert_hardening.sql
-- Close notification spoofing vector by restricting direct INSERT scope
-- and removing client-callable access to SECURITY DEFINER notification writer.

BEGIN;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Users can create their own notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, uuid) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, uuid) TO service_role;

COMMIT;
