/**
 * useNotificationSubscription — Realtime subscription for notifications.
 *
 * Phase 3.3 deliverable.
 *
 * Subscribes to the notifications table filtered by user_id = current user.
 * On new notification:
 *   - Invalidates notifications query cache
 *   - Increments an unread badge count
 *
 * Usage:
 *   const { unreadCount } = useNotificationSubscription();
 *   // Display unreadCount as a badge on the notifications tab icon
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/adapters/core-client';
import { subscriptionManager } from '@/lib/realtime/subscription-manager';
import { useAuth } from '@/lib/auth-context';
import { CHANNELS } from '@/lib/channels';
import { QUERY_KEYS } from '@/lib/query-keys';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useNotificationSubscription() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [realtimeUnreadCount, setRealtimeUnreadCount] = useState(0);

  const subscribe = useCallback(() => {
    if (!userId) return;

    const channelName = CHANNELS.notifications(userId);

    // Tear down existing
    if (channelRef.current) {
      subscriptionManager.unsubscribe(channelName);
      channelRef.current = null;
    }

    const createChannel = () =>
      supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            // Increment badge count
            setRealtimeUnreadCount((prev) => prev + 1);
            // Invalidate notifications cache so the list refreshes when viewed
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
          },
        )
        .subscribe();

    const channel = createChannel();
    channelRef.current = channel;
    subscriptionManager.subscribe(channelName, channel, createChannel);
  }, [userId, queryClient]);

  useEffect(() => {
    subscribe();

    return () => {
      if (userId) {
        subscriptionManager.unsubscribe(
          CHANNELS.notifications(userId),
        );
        channelRef.current = null;
      }
    };
  }, [subscribe, userId]);

  /**
   * Reset the unread badge count (call when user views notifications).
   */
  const resetUnreadCount = useCallback(() => {
    setRealtimeUnreadCount(0);
  }, []);

  /**
   * Force reconnect — called on foreground resume.
   */
  const reconnect = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
    subscribe();
  }, [subscribe, queryClient]);

  return {
    /** Number of notifications received via realtime since last reset */
    unreadCount: realtimeUnreadCount,
    /** Reset the badge counter */
    resetUnreadCount,
    /** Force reconnect */
    reconnect,
  };
}
