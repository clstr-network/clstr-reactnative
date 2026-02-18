/**
 * useSkillAnalysis Hook
 * Manages skill analysis state with React Query and Supabase Realtime
 */

import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getSkillAnalysis,
  computeSkillAnalysis,
  getOrComputeSkillAnalysis,
  getOverallScore,
  getScoreLabel,
  getScoreColor,
  type SkillAnalysisData,
} from "@/lib/skill-analysis-api";

export const skillAnalysisQueryKey = (userId: string) => 
  ["skillAnalysis", userId] as const;

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
    queryKey: skillAnalysisQueryKey(userId ?? ""),
    queryFn: async () => {
      if (!userId) return null;
      return getOrComputeSkillAnalysis(userId, false);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
    retry: 1,
  });

  // Mutation to refresh/recompute analysis
  const computeMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User not authenticated");
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

  // Set up realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`skill_analysis:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "skill_analysis",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Invalidate query to refetch
          queryClient.invalidateQueries({ queryKey: skillAnalysisQueryKey(userId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
