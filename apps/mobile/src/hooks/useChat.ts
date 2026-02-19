/**
 * useChat — Chat thread data + send/markRead mutations.
 *
 * Wraps getMessages, sendMessage, markMessagesAsRead from @clstr/core.
 * Uses QUERY_KEYS.social.messages(partnerId) (S2 enforced).
 * S6: Error objects returned, never triggers toast/alert from hook.
 */
import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMessages,
  sendMessage as sendMessageApi,
  markMessagesAsRead,
} from '@clstr/core/api/messages-api';
import type { Message } from '@clstr/core/api/messages-api';
import { supabase } from '@clstr/shared/integrations/supabase/client';
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { useAuth } from '@clstr/shared/hooks/useAuth';

export function useChat(partnerId: string) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // ── Fetch messages ──
  const messagesQuery = useQuery({
    queryKey: QUERY_KEYS.social.messages(partnerId),
    queryFn: () => getMessages(supabase, partnerId),
    enabled: !!partnerId && !!userId,
  });

  const messages: Message[] = messagesQuery.data?.messages ?? [];
  const partner = messagesQuery.data?.partner ?? null;

  // ── Send message mutation ──
  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessageApi(supabase, partnerId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.messages(partnerId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.conversations(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.connectedUsers() });
      if (userId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.social.unreadMessageCount(userId),
        });
      }
    },
  });

  // ── Mark messages as read ──
  const markAsRead = useCallback(() => {
    if (!partnerId || !userId) return;
    markMessagesAsRead(supabase, partnerId).catch(() => {
      // Swallow — screen decides whether to surface
    });
    // Optimistically clear unread count locally
    if (userId) {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.social.unreadMessageCount(userId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.social.conversations(userId),
      });
    }
  }, [partnerId, userId, queryClient]);

  // Mark as read on mount
  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  return {
    messages,
    partner,
    isLoading: messagesQuery.isLoading,
    isError: messagesQuery.isError,
    error: messagesQuery.error,
    sendMessage: sendMutation.mutate,
    isSending: sendMutation.isPending,
    sendError: sendMutation.error,
    markAsRead,
    refetch: messagesQuery.refetch,
  };
}
