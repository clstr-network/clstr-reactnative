/**
 * Skill Analysis API Service
 * Provides skill gap analysis, market alignment, and peer comparison
 */

import { supabase } from "@/integrations/supabase/client";
import { assertValidUuid } from "@clstr/shared/utils/uuid";
import { handleApiError } from "@/lib/errorHandler";

// Type-safe RPC wrapper for functions not yet in generated types
type RpcError = { code?: string; message?: string } | null;
const rpcCall = <T>(fn: string, args: Record<string, unknown>): Promise<{ data: T | null; error: RpcError }> =>
  (supabase.rpc as any)(fn, args);

export interface SkillItem {
  name: string;
  level: "Beginner" | "Intermediate" | "Expert" | "Professional";
}

export interface SkillAnalysisData {
  id: string;
  user_id: string;
  college_domain: string | null;

  // Current skills
  current_skills: SkillItem[];
  skill_count: number;

  // Market analysis
  trending_skills: string[];
  recommended_skills: string[];
  skill_gaps: string[];

  // Scores
  market_alignment_score: number;
  completeness_score: number;
  diversity_score: number;

  // Skill categories
  technical_skills: string[];
  soft_skills: string[];
  domain_skills: string[];

  // Job insights
  matching_job_count: number;
  avg_job_match_score: number;
  top_job_categories: string[];

  // Peer comparison
  peer_percentile: number;
  common_peer_skills: string[];
  differentiating_skills: string[];

  // Metadata
  computed_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get existing skill analysis for a user
 */
export async function getSkillAnalysis(userId: string): Promise<SkillAnalysisData | null> {
  assertValidUuid(userId, "userId");

  try {
    const { data, error } = await rpcCall<SkillAnalysisData>('get_skill_analysis', {
      p_user_id: userId,
    });

    if (error) {
      // If no analysis exists, return null instead of throwing
      if (error.code === 'PGRST116' || error.message?.includes('no rows')) {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'getSkillAnalysis',
      userMessage: 'Failed to fetch skill analysis',
      details: { userId },
    });
  }
}

/**
 * Compute (or refresh) skill analysis for a user
 * This runs the full analysis algorithm and persists results
 */
export async function computeSkillAnalysis(userId: string): Promise<SkillAnalysisData> {
  assertValidUuid(userId, "userId");

  try {
    const { data, error } = await rpcCall<SkillAnalysisData>('compute_skill_analysis', {
      p_user_id: userId,
    });

    if (error) throw error;
    if (!data) throw new Error('Analysis computation returned no data');

    return data;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'computeSkillAnalysis',
      userMessage: 'Failed to compute skill analysis',
      details: { userId },
    });
  }
}

/**
 * Get or compute skill analysis
 * Returns existing if fresh (computed within last 24 hours), otherwise recomputes
 */
export async function getOrComputeSkillAnalysis(
  userId: string,
  forceRefresh: boolean = false
): Promise<SkillAnalysisData> {
  assertValidUuid(userId, "userId");

  try {
    // First try to get existing analysis
    if (!forceRefresh) {
      const existing = await getSkillAnalysis(userId);

      if (existing) {
        // Check if it's still fresh (less than 24 hours old)
        const computedAt = new Date(existing.computed_at);
        const hoursSinceComputed = (Date.now() - computedAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceComputed < 24) {
          return existing;
        }
      }
    }

    // Compute fresh analysis
    return await computeSkillAnalysis(userId);
  } catch (error) {
    throw handleApiError(error, {
      operation: 'getOrComputeSkillAnalysis',
      userMessage: 'Failed to get skill analysis',
      details: { userId, forceRefresh },
    });
  }
}

/**
 * Delete skill analysis (for GDPR compliance or account deletion)
 */
export async function deleteSkillAnalysis(userId: string): Promise<void> {
  assertValidUuid(userId, "userId");

  try {
    // Use direct table access since it's a simple delete
    const { error } = await (supabase as any)
      .from('skill_analysis')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'deleteSkillAnalysis',
      userMessage: 'Failed to delete skill analysis',
      details: { userId },
    });
  }
}

/**
 * Get skill distribution breakdown
 */
export function getSkillDistribution(analysis: SkillAnalysisData): {
  technical: number;
  soft: number;
  domain: number;
} {
  const total = analysis.skill_count || 1;
  return {
    technical: Math.round((analysis.technical_skills.length / total) * 100),
    soft: Math.round((analysis.soft_skills.length / total) * 100),
    domain: Math.round((analysis.domain_skills.length / total) * 100),
  };
}

/**
 * Get overall skill health score (weighted average)
 */
export function getOverallScore(analysis: SkillAnalysisData): number {
  const weights = {
    market: 0.4,
    completeness: 0.3,
    diversity: 0.3,
  };

  return Math.round(
    (analysis.market_alignment_score * weights.market) +
    (analysis.completeness_score * weights.completeness) +
    (analysis.diversity_score * weights.diversity)
  );
}

/**
 * Get skill level label
 */
export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Developing';
  return 'Needs Attention';
}

/**
 * Get score color class
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  if (score >= 20) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Get score background color class
 */
export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-100';
  if (score >= 60) return 'bg-blue-100';
  if (score >= 40) return 'bg-yellow-100';
  if (score >= 20) return 'bg-orange-100';
  return 'bg-red-100';
}
