/**
 * usePortfolio.ts
 *
 * React Query hook for portfolio data.
 * - Reads from Supabase (no local-only state)
 * - Mutations invalidate cache
 * - Used by both the profile page (preview) and the public portfolio route
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPortfolioSettings, updatePortfolioSettings, activatePortfolio } from "@/lib/portfolio-api";
import type { PortfolioSettings } from "@clstr/shared/types/portfolio";
import type { UserProfile } from "@clstr/shared/types/profile";
import { userProfileToProfileData } from "@/lib/portfolio-adapter";
import { toast } from "@/hooks/use-toast";
import { QUERY_KEYS } from '@clstr/shared/query-keys';

const PORTFOLIO_SETTINGS_KEY = QUERY_KEYS.portfolio.settings;

export function usePortfolioSettings(profileId: string | undefined) {
  return useQuery({
    queryKey: PORTFOLIO_SETTINGS_KEY(profileId!),
    queryFn: () => getPortfolioSettings(profileId!),
    enabled: Boolean(profileId),
    staleTime: 30_000,
  });
}

export function usePortfolioData(profile: UserProfile | null) {
  const { data: settings } = usePortfolioSettings(profile?.id);

  if (!profile) return null;

  return userProfileToProfileData(profile, settings);
}

export function useUpdatePortfolioSettings(profileId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<PortfolioSettings>) => {
      if (!profileId) throw new Error("Profile ID is required");
      return updatePortfolioSettings(profileId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_SETTINGS_KEY(profileId!) });
    },
    onError: (error) => {
      toast({
        title: "Failed to update portfolio settings",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });
}

export function useActivatePortfolio(
  profileId: string | undefined,
  profile: Pick<UserProfile, "full_name" | "role"> | null
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!profileId || !profile) throw new Error("Profile is required");
      return activatePortfolio(profileId, profile);
    },
    onSuccess: (slug) => {
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_SETTINGS_KEY(profileId!) });
      // Also refresh the profile to pick up updated social_links
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats(profileId!) });
      return slug;
    },
    onError: (error) => {
      toast({
        title: "Failed to activate portfolio",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });
}
