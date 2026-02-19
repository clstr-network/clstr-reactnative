/**
 * useFeedRealtime — Realtime subscription for feed updates.
 *
 * Subscribes to CHANNELS.feed.homeFeed() for posts/likes/comments changes.
 * Invalidates QUERY_KEYS.feed.posts() on change.
 * Cleans up channel on unmount.
 * S3: channel names from CHANNELS only.
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@clstr/shared/integrations/supabase/client';
import { CHANNELS } from '@clstr/shared/realtime/channels';
import { QUERY_KEYS } from '@clstr/shared/query-keys';

export function useFeedRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channelName = CHANNELS.feed.homeFeed();

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed.posts() });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_likes' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed.posts() });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed.posts() });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
