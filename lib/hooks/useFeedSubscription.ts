/**
 * useFeedSubscription — Realtime subscription for feed updates.
 *
 * Phase 3.2 deliverable.
 *
 * Subscribes to CHANNELS.homeFeed() for posts changes.
 * When new posts arrive, sets a "new posts available" flag
 * instead of auto-refreshing (avoids jarring scroll jumps).
 *
 * Also subscribes to post_likes and comments tables to keep
 * engagement counts fresh.
 *
 * Usage:
 *   const { hasNewPosts, dismissNewPosts } = useFeedSubscription();
 *   // Show a "New posts" banner when hasNewPosts is true
 *   // Call dismissNewPosts() + refetch when user taps the banner
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/adapters/core-client';
import { subscriptionManager } from '@/lib/realtime/subscription-manager';
import { useAuth } from '@/lib/auth-context';
import { CHANNELS } from '@/lib/channels';
import { QUERY_KEYS } from '@/lib/query-keys';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useFeedSubscription() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [hasNewPosts, setHasNewPosts] = useState(false);

  const subscribe = useCallback(() => {
    if (!userId) return;

    const channelName = CHANNELS.homeFeed(userId);

    // Tear down existing
    if (channelRef.current) {
      subscriptionManager.unsubscribe(channelName);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          const newPost = payload.new as Record<string, unknown>;
          // Only flag new posts from other users (don't flag your own posts)
          if (newPost.user_id !== userId) {
            setHasNewPosts(true);
          } else {
            // Own post — just refresh the feed quietly
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_likes' },
        () => {
          // Silently refresh engagement counts
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        () => {
          // Silently refresh comment counts
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
        },
      )
      .subscribe();

    channelRef.current = channel;
    subscriptionManager.subscribe(channelName, channel, () => {
      subscribe();
      return channelRef.current!;
    });
  }, [userId, queryClient]);

  useEffect(() => {
    subscribe();

    return () => {
      if (userId) {
        subscriptionManager.unsubscribe(CHANNELS.homeFeed(userId));
        channelRef.current = null;
      }
    };
  }, [subscribe, userId]);

  /**
   * Dismiss the "new posts" banner and refresh the feed.
   * Call this when user taps "New posts available".
   */
  const dismissNewPosts = useCallback(() => {
    setHasNewPosts(false);
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
  }, [queryClient]);

  /**
   * Force reconnect — called on foreground resume.
   */
  const reconnect = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
    subscribe();
  }, [subscribe, queryClient]);

  return {
    /** True when new posts have arrived since last dismiss */
    hasNewPosts,
    /** Dismiss the banner and refresh feed */
    dismissNewPosts,
    /** Force reconnect (foreground resume) */
    reconnect,
  };
}
