-- ============================================================================
-- 124_fix_messages_connections_select_rls.sql
--
-- Fixes "Failed to load messages" caused by domain-scoped RLS policies
-- that reject rows when get_user_college_domain() returns NULL.
--
-- Root cause: Migration 110 added domain checks to the SELECT policies on
-- both `messages` and `connections`. When a user's college_domain is NULL
-- (e.g., after migration 121 cleaned up public email domains), the
-- comparison `college_domain = NULL` is always false in SQL, effectively
-- hiding all connections and messages for that user.
--
-- Fixes:
--   1. MESSAGES SELECT: Participants should always see their own messages.
--      Domain validation is enforced at INSERT time; retroactively hiding
--      existing messages when a domain drifts is hostile.
--   2. CONNECTIONS SELECT: Same principle — users should always see their
--      own connections. Domain enforcement is on INSERT (via trigger).
--   3. GET_CONVERSATIONS RPC: Uses SECURITY INVOKER, so it inherits
--      the RLS. Fixing the policies above automatically fixes the RPC.
-- ============================================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. FIX: messages SELECT — remove domain join, keep participant check
--    Domain is enforced at INSERT; participants can always read their history.
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
CREATE POLICY "Users can view their messages" ON public.messages
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- 2. FIX: connections SELECT — handle NULL domains gracefully
--    Users should always be able to see connections they are part of.
--    Domain enforcement is on INSERT (trigger: enforce_same_domain_connection).
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Connections are viewable by involved users" ON public.connections;
CREATE POLICY "Connections are viewable by involved users" ON public.connections
  FOR SELECT USING (
    auth.uid() = requester_id OR auth.uid() = receiver_id
  );

COMMIT;
