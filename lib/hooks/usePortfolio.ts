/**
 * usePortfolio — React Query hooks for portfolio data (mobile port).
 *
 * Re-uses lib/api/portfolio.ts (already bound via withClient).
 * Mutations invalidate cache. Used by profile page + portfolio screens.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import {
  getPortfolioSettings,
  updatePortfolioSettings,
  activatePortfolio,
  type PortfolioSettings,
} from '@/lib/api/portfolio';
import { userProfileToProfileData } from '@clstr/core/api/portfolio-adapter';
import type { UserProfile } from '@clstr/core/types/profile';
import { QUERY_KEYS } from '@/lib/query-keys';

const PORTFOLIO_SETTINGS_KEY = QUERY_KEYS.portfolioSettings;

/**
 * Fetch portfolio settings for a profile.
 */
export function usePortfolioSettings(profileId: string | undefined) {
  return useQuery({
    queryKey: PORTFOLIO_SETTINGS_KEY(profileId!),
    queryFn: () => getPortfolioSettings(profileId!),
    enabled: Boolean(profileId),
    staleTime: 30_000,
  });
}

/**
 * Derive portfolio data from a UserProfile + its settings.
 */
export function usePortfolioData(profile: UserProfile | null) {
  const { data: settings } = usePortfolioSettings(profile?.id);
  if (!profile) return null;
  return userProfileToProfileData(profile, settings);
}

/**
 * Mutation to update portfolio settings.
 */
export function useUpdatePortfolioSettings(profileId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<PortfolioSettings>) => {
      if (!profileId) throw new Error('Profile ID is required');
      return updatePortfolioSettings(profileId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_SETTINGS_KEY(profileId!) });
    },
    onError: (error) => {
      Alert.alert(
        'Failed to update portfolio settings',
        error instanceof Error ? error.message : 'Please try again',
      );
    },
  });
}

/**
 * Mutation to activate the portfolio (generates slug, enables public page).
 */
export function useActivatePortfolio(
  profileId: string | undefined,
  profile: Pick<UserProfile, 'full_name' | 'role'> | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!profileId || !profile) throw new Error('Profile is required');
      return activatePortfolio(profileId, profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_SETTINGS_KEY(profileId!) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profileStats(profileId!) });
    },
    onError: (error) => {
      Alert.alert(
        'Failed to activate portfolio',
        error instanceof Error ? error.message : 'Please try again',
      );
    },
  });
}
