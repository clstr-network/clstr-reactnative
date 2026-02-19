/**
 * Skill Analysis API Service
 * Provides skill gap analysis, market alignment, and peer comparison
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { assertValidUuid } from '../utils/uuid';
import { createAppError } from '../errors';

// Type-safe RPC wrapper for functions not yet in generated types
type RpcError = { code?: string; message?: string } | null;
const rpcCall = <T>(
  client: SupabaseClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<{ data: T | null; error: RpcError }> =>
  (client.rpc as any)(fn, args);

export interface SkillItem {
  name: string;
  level: "Beginner" | "Intermediate" | "Expert" | "Professional";
}

export interface SkillAnalysisData {
  id: string;
  user_id: string;
  college_domain: string | null;

  current_skills: SkillItem[];
  skill_count: number;

  trending_skills: string[];
  recommended_skills: string[];
  skill_gaps: string[];

  market_alignment_score: number;
  completeness_score: number;
  diversity_score: number;

  technical_skills: string[];
  soft_skills: string[];
  domain_skills: string[];

  matching_job_count: number;
  avg_job_match_score: number;
  top_job_categories: string[];

  peer_percentile: number;
  common_peer_skills: string[];
  differentiating_skills: string[];

  computed_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get existing skill analysis for a user
 */
export async function getSkillAnalysis(
  client: SupabaseClient,
  userId: string,
): Promise<SkillAnalysisData | null> {
  assertValidUuid(userId, "userId");

  try {
    const { data, error } = await rpcCall<SkillAnalysisData>(client, 'get_skill_analysis', {
      p_user_id: userId,
    });

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('no rows')) {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    throw createAppError(
      'Failed to fetch skill analysis',
      'getSkillAnalysis',
      error,
    );
  }
}

/**
 * Compute (or refresh) skill analysis for a user
 */
export async function computeSkillAnalysis(
  client: SupabaseClient,
  userId: string,
): Promise<SkillAnalysisData> {
  assertValidUuid(userId, "userId");

  try {
    const { data, error } = await rpcCall<SkillAnalysisData>(client, 'compute_skill_analysis', {
      p_user_id: userId,
    });

    if (error) throw error;
    if (!data) throw new Error('Analysis computation returned no data');

    return data;
  } catch (error) {
    throw createAppError(
      'Failed to compute skill analysis',
      'computeSkillAnalysis',
      error,
    );
  }
}

/**
 * Get or compute skill analysis.
 * Returns existing if fresh (computed within last 24 hours), otherwise recomputes.
 */
export async function getOrComputeSkillAnalysis(
  client: SupabaseClient,
  userId: string,
  forceRefresh: boolean = false,
): Promise<SkillAnalysisData> {
  assertValidUuid(userId, "userId");

  try {
    if (!forceRefresh) {
      const existing = await getSkillAnalysis(client, userId);

      if (existing) {
        const computedAt = new Date(existing.computed_at);
        const hoursSinceComputed = (Date.now() - computedAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceComputed < 24) {
          return existing;
        }
      }
    }

    return await computeSkillAnalysis(client, userId);
  } catch (error) {
    throw createAppError(
      'Failed to get skill analysis',
      'getOrComputeSkillAnalysis',
      error,
    );
  }
}

/**
 * Delete skill analysis (for GDPR compliance or account deletion)
 */
export async function deleteSkillAnalysis(
  client: SupabaseClient,
  userId: string,
): Promise<void> {
  assertValidUuid(userId, "userId");

  try {
    const { error } = await (client as any)
      .from('skill_analysis')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    throw createAppError(
      'Failed to delete skill analysis',
      'deleteSkillAnalysis',
      error,
    );
  }
}

/**
 * Get skill distribution breakdown (pure function)
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
 * Get overall skill health score (weighted average) (pure function)
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
 * Get skill level label (pure function)
 */
export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Developing';
  return 'Needs Attention';
}

/**
 * Get score color class (pure function)
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  if (score >= 20) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Get score background color class (pure function)
 */
export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-100';
  if (score >= 60) return 'bg-blue-100';
  if (score >= 40) return 'bg-yellow-100';
  if (score >= 20) return 'bg-orange-100';
  return 'bg-red-100';
}
