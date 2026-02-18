-- ============================================================================
-- 022_messages_unread_rpc.sql - Unread message count RPC
-- Ensures client can fetch unread counts efficiently and safely under RLS
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_unread_message_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COUNT(*)::integer
  FROM public.messages
  WHERE receiver_id = auth.uid()
    AND receiver_id = p_user_id
    AND read = false;
$$;

GRANT EXECUTE ON FUNCTION public.get_unread_message_count(uuid) TO authenticated;

COMMIT;
