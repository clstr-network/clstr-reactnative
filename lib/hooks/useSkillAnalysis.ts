/**
 * useSkillAnalysis — React Query hook for skill analysis with realtime sync.
 *
 * Reads from Supabase via lib/api/skill-analysis.ts (already bound).
 * Subscribes to postgres_changes on skill_analysis table for live updates.
 */

import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/adapters/core-client';
import { subscriptionManager } from '@/lib/realtime/subscription-manager';
import { CHANNELS } from '@/lib/channels';
import {
  getOrComputeSkillAnalysis,
  computeSkillAnalysis,
  getOverallScore,
  getScoreLabel,
  getScoreColor,
  type SkillAnalysisData,
} from '@/lib/api/skill-analysis';
import { QUERY_KEYS } from '@/lib/query-keys';

export const skillAnalysisQueryKey = QUERY_KEYS.skillAnalysis;

export interface UseSkillAnalysisReturn {
  analysis: SkillAnalysisData | null;
  isLoading: boolean;
  isComputing: boolean;
  error: Error | null;
  overallScore: number;
  scoreLabel: string;
  scoreColor: string;
  refresh: () => Promise<SkillAnalysisData>;
  refetch: () => void;
}

export function useSkillAnalysis(userId?: string): UseSkillAnalysisReturn {
  const queryClient = useQueryClient();

  // Query for existing analysis
  const {
    data: analysis,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: skillAnalysisQueryKey(userId ?? ''),
    queryFn: async () => {
      if (!userId) return null;
      return getOrComputeSkillAnalysis(userId, false);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });

  // Mutation to refresh/recompute analysis
  const computeMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('User not authenticated');
      return computeSkillAnalysis(userId);
    },
    onSuccess: (data) => {
      if (userId) {
        queryClient.setQueryData(skillAnalysisQueryKey(userId), data);
      }
    },
  });

  // Refresh handler
  const refresh = useCallback(async () => {
    return computeMutation.mutateAsync();
  }, [computeMutation]);

  // Set up realtime subscription (registered with SubscriptionManager)
  useEffect(() => {
    if (!userId) return;

    const channelName = CHANNELS.skillAnalysis(userId);

    const createChannel = () =>
      supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'skill_analysis',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: skillAnalysisQueryKey(userId) });
          },
        )
        .subscribe();

    const channel = createChannel();
    subscriptionManager.subscribe(channelName, channel, createChannel);

    return () => {
      subscriptionManager.unsubscribe(channelName);
    };
  }, [queryClient, userId]);

  // Computed values
  const overallScore = analysis ? getOverallScore(analysis) : 0;
  const scoreLabel = getScoreLabel(overallScore);
  const scoreColor = getScoreColor(overallScore);

  return {
    analysis: analysis ?? null,
    isLoading,
    isComputing: computeMutation.isPending,
    error: error as Error | null,
    overallScore,
    scoreLabel,
    scoreColor,
    refresh,
    refetch,
  };
}
