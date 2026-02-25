/**
 * useUserSettings — React Query hook for user settings with realtime sync.
 *
 * Reads/writes user_settings via lib/api/settings.ts (already bound).
 * Subscribes to postgres_changes on user_settings table for live updates.
 */

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/adapters/core-client';
import { subscriptionManager } from '@/lib/realtime/subscription-manager';
import { CHANNELS } from '@/lib/channels';
import {
  getUserSettings,
  updateUserSettings,
  type UserSettings,
  type UserSettingsUpdate,
} from '@/lib/api/settings';
import { QUERY_KEYS } from '@/lib/query-keys';

export const userSettingsQueryKey = QUERY_KEYS.userSettings;

export function useUserSettings(userId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: userSettingsQueryKey(userId ?? ''),
    queryFn: async () => {
      if (!userId) throw new Error('Missing userId');
      return getUserSettings(userId);
    },
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: async (updates: UserSettingsUpdate) => {
      if (!userId) throw new Error('Missing userId');
      return updateUserSettings(userId, updates);
    },
    onSuccess: (data) => {
      if (!userId) return;
      queryClient.setQueryData(userSettingsQueryKey(userId), data);
      queryClient.invalidateQueries({ queryKey: userSettingsQueryKey(userId) });
    },
  });

  // Realtime subscription for live updates (registered with SubscriptionManager)
  useEffect(() => {
    if (!userId) return;

    const channelName = CHANNELS.userSettings(userId);

    const createChannel = () =>
      supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_settings',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: userSettingsQueryKey(userId) });
          },
        )
        .subscribe();

    const channel = createChannel();
    subscriptionManager.subscribe(channelName, channel, createChannel);

    return () => {
      subscriptionManager.unsubscribe(channelName);
    };
  }, [queryClient, userId]);

  return {
    ...query,
    settings: query.data as UserSettings | undefined,
    updateSettings: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
