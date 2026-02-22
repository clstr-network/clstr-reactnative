/**
 * useMessageSubscription — Realtime subscription for incoming messages.
 *
 * Phase 3.1 deliverable.
 *
 * Subscribes to the messages table filtered by receiver_id = current user.
 * On incoming message:
 *   - Invalidates conversations list cache
 *   - Invalidates chat cache for the relevant partner
 *   - If the active chat partner matches, auto-marks messages as read
 *
 * Uses subscribeToMessages from @clstr/core (pre-bound) and registers
 * with SubscriptionManager for reconnect support.
 *
 * Usage:
 *   // In MessagesScreen (conversation list):
 *   const { reconnect } = useMessageSubscription();
 *
 *   // In ChatScreen (active conversation):
 *   const { reconnect } = useMessageSubscription({ activePartnerId: partnerId });
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/adapters/core-client';
import { subscriptionManager } from '@/lib/realtime/subscription-manager';
import { useAuth } from '@/lib/auth-context';
import { CHANNELS } from '@/lib/channels';
import { QUERY_KEYS } from '@/lib/query-keys';
import { markMessagesAsRead } from '@/lib/api/messages';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseMessageSubscriptionOptions {
  /**
   * If the user is currently viewing a conversation with this partner,
   * incoming messages for this partner are auto-marked as read and the
   * messages query is invalidated immediately.
   */
  activePartnerId?: string;
}

export function useMessageSubscription(
  options: UseMessageSubscriptionOptions = {},
) {
  const { activePartnerId } = options;
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const subscribe = useCallback(() => {
    if (!userId) return;

    // Tear down existing channel (guard against double subscribe)
    const channelName = CHANNELS.messages(userId);
    if (channelRef.current) {
      subscriptionManager.unsubscribe(channelName);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          const newMessage = payload.new as Record<string, unknown>;
          if (!newMessage) return;

          const senderId = newMessage.sender_id as string;
          const receiverId = newMessage.receiver_id as string;
          const partnerId = senderId === userId ? receiverId : senderId;

          // Always invalidate conversations list
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });

          // Invalidate unread count
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadMessages });

          // If this is for the currently active chat, refresh messages + mark read
          if (activePartnerId && partnerId === activePartnerId) {
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.chat(activePartnerId),
            });
            markMessagesAsRead(activePartnerId).catch(() => {});
          }
        },
      )
      .subscribe();

    channelRef.current = channel;
    subscriptionManager.subscribe(channelName, channel, () => {
      // Factory for reconnect
      subscribe();
      return channelRef.current!;
    });
  }, [userId, activePartnerId, queryClient]);

  useEffect(() => {
    subscribe();

    return () => {
      if (userId) {
        const channelName = CHANNELS.messages(userId);
        subscriptionManager.unsubscribe(channelName);
        channelRef.current = null;
      }
    };
  }, [subscribe, userId]);

  /**
   * Force teardown + recreate — called on foreground resume.
   * Invalidates queries FIRST to recover messages missed while backgrounded
   * (Supabase realtime does NOT replay events), then resubscribes.
   */
  const reconnect = useCallback(() => {
    // 1. Refetch missed data
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadMessages });

    if (activePartnerId) {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.chat(activePartnerId),
      });
    }

    // 2. Resubscribe
    subscribe();
  }, [subscribe, activePartnerId, queryClient]);

  return { reconnect };
}
