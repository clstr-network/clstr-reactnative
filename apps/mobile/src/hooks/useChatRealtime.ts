/**
 * useChatRealtime — Realtime subscription for incoming messages.
 *
 * Subscribes to CHANNELS.social.messagesReceiver(userId) via
 * subscribeToMessages from @clstr/core.
 * On new message: optimistically update conversations cache,
 * invalidate messages for active partner, auto-mark as read.
 * Channel cleanup on unmount (S3 enforced).
 */
import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToMessages, markMessagesAsRead } from '@clstr/core/api/messages-api';
import type { Conversation, Message } from '@clstr/core/api/messages-api';
import { supabase } from '@clstr/shared/integrations/supabase/client';
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { useAuth } from '@clstr/shared/hooks/useAuth';

/**
 * @param activePartnerId — If the user is currently viewing a conversation
 *   with this partner, incoming messages for this partner are auto-marked
 *   as read and the messages query for the partner is invalidated.
 */
export function useChatRealtime(activePartnerId?: string) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const subscribe = useCallback(() => {
    if (!userId) return;

    // Guard against double subscribe
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = subscribeToMessages(supabase, userId, (payload) => {
      const newMessage = payload.new as Message;
      if (!newMessage) return;

      const partnerId =
        newMessage.sender_id === userId
          ? newMessage.receiver_id
          : newMessage.sender_id;

      // Optimistically update the conversations cache
      queryClient.setQueryData<Conversation[]>(
        QUERY_KEYS.social.conversations(userId),
        (old) => {
          if (!old) {
            // No cache yet — force a full fetch
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.social.conversations(userId),
            });
            return old;
          }

          const existing = old.find((c) => c.partner_id === partnerId);

          if (existing) {
            return old
              .map((c) => {
                if (c.partner_id !== partnerId) return c;
                const isIncoming = newMessage.receiver_id === userId;
                return {
                  ...c,
                  last_message: newMessage,
                  unread_count:
                    isIncoming && !newMessage.is_read
                      ? c.unread_count + 1
                      : c.unread_count,
                };
              })
              .sort(
                (a, b) =>
                  new Date(b.last_message.created_at).getTime() -
                  new Date(a.last_message.created_at).getTime(),
              );
          }

          // New conversation partner — need to refetch to get profile info
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.social.conversations(userId),
          });
          return old;
        },
      );

      // Invalidate unread count
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.social.unreadMessageCount(userId),
      });

      // If this message is for the active partner, refresh messages + mark read
      if (activePartnerId && partnerId === activePartnerId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.social.messages(activePartnerId),
        });
        markMessagesAsRead(supabase, activePartnerId).catch(() => {});
      }
    });

    channelRef.current = channel;
  }, [userId, activePartnerId, queryClient]);

  useEffect(() => {
    subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [subscribe]);

  /**
   * Force teardown + recreate — called by useRealtimeReconnect
   * when the app returns from background.
   *
   * CRITICAL: invalidate queries FIRST to recover messages missed
   * while backgrounded (Supabase realtime does NOT replay events).
   * Then resubscribe so future messages flow through.
   */
  const reconnect = useCallback(() => {
    // 1. Refetch missed data — order matters (refetch before subscribe)
    if (activePartnerId) {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.social.messages(activePartnerId),
      });
    }
    if (userId) {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.social.conversations(userId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.social.unreadMessageCount(userId),
      });
    }

    // 2. Resubscribe for future events
    subscribe();
  }, [subscribe, activePartnerId, userId, queryClient]);

  return { reconnect, channelRef };
}
