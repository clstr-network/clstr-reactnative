-- ============================================================================
-- 120_connections_notifications_rls_lockdown.sql
-- Enforce strict connection privacy + remove direct client notification inserts
-- ============================================================================

BEGIN;

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Connections privacy: only requester/receiver can read a connection row.
DROP POLICY IF EXISTS "Connections are viewable by involved users" ON public.connections;
DROP POLICY IF EXISTS "connections_select_participants_only" ON public.connections;
CREATE POLICY "connections_select_participants_only" ON public.connections
  FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- Notifications hardening: remove all client-side INSERT policies.
-- Notification creation should happen through controlled server-side paths
-- (service role / triggers / security definer functions).
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_self" ON public.notifications;

COMMIT;
