/**
 * useSettings — User settings hook for mobile.
 *
 * Wraps @clstr/core user-settings with useQuery / useMutation.
 * Uses QUERY_KEYS.userSettings from @clstr/shared (S2 enforced).
 * Theme changes apply via React Native Appearance API (not DOM).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUserSettings,
  updateUserSettings,
} from '@clstr/core/api/user-settings';
import type { UserSettings, UserSettingsUpdate } from '@clstr/core/api/user-settings';
import { supabase } from '@clstr/shared/integrations/supabase/client';
import { QUERY_KEYS } from '@clstr/shared/query-keys';

/**
 * Fetch user settings. Auto-creates defaults if missing.
 */
export function useSettings(userId: string | undefined) {
  const query = useQuery({
    queryKey: QUERY_KEYS.userSettings(userId ?? ''),
    queryFn: () => getUserSettings(supabase, userId!),
    enabled: !!userId,
  });

  return {
    settings: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Update user settings. Invalidates the settings cache on success.
 */
export function useUpdateSettings(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: UserSettingsUpdate) =>
      updateUserSettings(supabase, userId!, updates),
    onSuccess: (data) => {
      queryClient.setQueryData(
        QUERY_KEYS.userSettings(userId ?? ''),
        data,
      );
    },
  });
}
