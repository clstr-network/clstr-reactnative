-- ============================================================================
-- 024_messages_conversations_rpc.sql - Conversations list RPC
-- Returns conversation partners with last message + unread counts.
-- Designed to be RLS-safe (SECURITY INVOKER) and non-spoofable.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_conversations(p_user_id uuid)
RETURNS TABLE (
  partner_id uuid,
  partner_full_name text,
  partner_avatar_url text,
  partner_last_seen timestamptz,
  last_message_id uuid,
  last_message_sender_id uuid,
  last_message_receiver_id uuid,
  last_message_content text,
  last_message_read boolean,
  last_message_created_at timestamptz,
  last_message_updated_at timestamptz,
  unread_count integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH my_messages AS (
    SELECT
      m.*,
      CASE
        WHEN m.sender_id = auth.uid() THEN m.receiver_id
        ELSE m.sender_id
      END AS partner_id
    FROM public.messages m
    WHERE (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
  ),
  last_messages AS (
    SELECT DISTINCT ON (partner_id)
      partner_id,
      id,
      sender_id,
      receiver_id,
      content,
      read,
      created_at,
      updated_at
    FROM my_messages
    ORDER BY partner_id, created_at DESC
  ),
  unread AS (
    SELECT
      partner_id,
      COUNT(*)::integer AS unread_count
    FROM my_messages
    WHERE receiver_id = auth.uid()
      AND read = false
    GROUP BY partner_id
  )
  SELECT
    p.id AS partner_id,
    p.full_name AS partner_full_name,
    p.avatar_url AS partner_avatar_url,
    p.last_seen AS partner_last_seen,
    lm.id AS last_message_id,
    lm.sender_id AS last_message_sender_id,
    lm.receiver_id AS last_message_receiver_id,
    lm.content AS last_message_content,
    lm.read AS last_message_read,
    lm.created_at AS last_message_created_at,
    lm.updated_at AS last_message_updated_at,
    COALESCE(u.unread_count, 0) AS unread_count
  FROM last_messages lm
  JOIN public.profiles p ON p.id = lm.partner_id
  LEFT JOIN unread u ON u.partner_id = lm.partner_id
  WHERE p_user_id = auth.uid()
  ORDER BY lm.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_conversations(uuid) TO authenticated;

COMMIT;
