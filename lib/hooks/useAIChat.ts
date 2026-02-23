/**
 * useAIChat — React Query hooks for the persisted AI Career Assistant (mobile).
 *
 * Chat sessions and messages are stored in Supabase (ai_chat_sessions,
 * ai_chat_messages). Realtime subscription keeps the UI in sync.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/adapters/core-client';
import { CHANNELS } from '@/lib/channels';
import { QUERY_KEYS } from '@/lib/query-keys';
import {
  createChatSession,
  getChatSessions,
  getChatMessages,
  saveChatMessage,
  sendAIChatMessage,
  deleteChatSession,
  updateChatSessionTitle,
  type AIChatMessage,
  type AIChatSession,
} from '@/lib/api/ai-chat';

const SESSIONS_KEY = QUERY_KEYS.aiChatSessions;
const messagesKey = (id: string) => QUERY_KEYS.aiChatMessages(id);
const MESSAGES_NONE_KEY = ['ai-chat-messages', '__none__'] as const;

/**
 * Hook for managing AI chat sessions (list, create, delete).
 */
export function useAIChatSessions() {
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: getChatSessions,
    staleTime: 60_000,
  });

  const createSessionMutation = useMutation({
    mutationFn: createChatSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: deleteChatSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
  });

  return {
    sessions: (sessionsQuery.data ?? []) as AIChatSession[],
    isLoading: sessionsQuery.isLoading,
    createSession: createSessionMutation.mutateAsync,
    deleteSession: deleteSessionMutation.mutate,
    isCreating: createSessionMutation.isPending,
  };
}

/**
 * Hook for a single AI chat session with messages + realtime.
 */
export function useAIChatMessages(sessionId: string | null) {
  const queryClient = useQueryClient();
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  // Fetch messages for the session
  const messagesQuery = useQuery({
    queryKey: sessionId ? messagesKey(sessionId) : MESSAGES_NONE_KEY,
    queryFn: () => (sessionId ? getChatMessages(sessionId) : Promise.resolve([])),
    enabled: !!sessionId,
    staleTime: 30_000,
  });

  // Realtime subscription for new messages
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(CHANNELS.aiChatMessages(sessionId))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          // Optimistic append if not already in cache
          queryClient.setQueryData<AIChatMessage[]>(messagesKey(sessionId), (old) => {
            if (!old) return [payload.new as AIChatMessage];
            const exists = old.some((m) => m.id === (payload.new as AIChatMessage).id);
            if (exists) return old;
            return [...old, payload.new as AIChatMessage];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, queryClient]);

  // Send message mutation: save user message → call AI → save assistant response
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!sessionId) throw new Error('No active session');

      // 1. Save user message
      const userMsg = await saveChatMessage(sessionId, 'user', content.trim());

      // 2. Build context (last 10 messages)
      const currentMessages =
        queryClient.getQueryData<AIChatMessage[]>(messagesKey(sessionId)) ?? [];

      const apiMessages = [...currentMessages, userMsg]
        .slice(-10)
        .map(({ role, content: c }) => ({ role: role as 'user' | 'assistant', content: c }));

      // 3. Call AI edge function
      try {
        const response = await sendAIChatMessage(apiMessages);
        // 4. Save assistant response
        await saveChatMessage(sessionId, 'assistant', response);
      } catch {
        await saveChatMessage(
          sessionId,
          'assistant',
          "I'm having trouble connecting right now. Please try again in a moment.",
          true,
        );
      }

      // 5. Update session title from first user message if needed
      if (currentMessages.length === 0) {
        const title = content.trim().slice(0, 100);
        await updateChatSessionTitle(sessionId, title);
        queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
      }

      // 6. Invalidate messages cache
      queryClient.invalidateQueries({ queryKey: messagesKey(sessionId) });
    },
  });

  // Clear all messages (delete session + remove cache)
  const clearChat = useCallback(async () => {
    if (sessionId) {
      await deleteChatSession(sessionId);
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
      queryClient.removeQueries({ queryKey: messagesKey(sessionId) });
    }
  }, [sessionId, queryClient]);

  return {
    messages: (messagesQuery.data ?? []) as AIChatMessage[],
    isLoading: messagesQuery.isLoading,
    sendMessage: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
    clearChat,
  };
}
