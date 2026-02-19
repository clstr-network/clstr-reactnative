/**
 * useConversations — Conversation list + connected users hook.
 *
 * Wraps getConversations + getConnectedUsers from @clstr/core.
 * Uses QUERY_KEYS.social.conversations(userId) (S2 enforced).
 * Uses QUERY_KEYS.social.connectedUsers() (S2 enforced).
 * Errors returned as structured objects (S6 — no toast/alert).
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getConversations, getConnectedUsers } from '@clstr/core/api/messages-api';
import type { Conversation, MessageUser } from '@clstr/core/api/messages-api';
import { supabase } from '@clstr/shared/integrations/supabase/client';
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { useAuth } from '@clstr/shared/hooks/useAuth';

export function useConversations() {
  const { user } = useAuth();
  const userId = user?.id;

  const conversationsQuery = useQuery({
    queryKey: QUERY_KEYS.social.conversations(userId),
    queryFn: () => getConversations(supabase),
    enabled: !!userId,
    refetchInterval: 30_000,
  });

  const connectedUsersQuery = useQuery({
    queryKey: QUERY_KEYS.social.connectedUsers(),
    queryFn: () => getConnectedUsers(supabase),
    enabled: !!userId,
    refetchInterval: 30_000,
  });

  const conversations = conversationsQuery.data ?? [];
  const connectedUsers = connectedUsersQuery.data ?? [];

  // Connections that don't have an active conversation yet
  const connectionsWithoutConversations = useMemo(() => {
    const conversationPartnerIds = new Set(
      conversations.map((c: Conversation) => c.partner_id),
    );
    return connectedUsers.filter(
      (u: MessageUser) => !conversationPartnerIds.has(u.id),
    );
  }, [conversations, connectedUsers]);

  return {
    conversations,
    connectedUsers,
    connectionsWithoutConversations,
    isLoading: conversationsQuery.isLoading || connectedUsersQuery.isLoading,
    isError: conversationsQuery.isError || connectedUsersQuery.isError,
    error: conversationsQuery.error || connectedUsersQuery.error,
    refetch: () => {
      conversationsQuery.refetch();
      connectedUsersQuery.refetch();
    },
  };
}
