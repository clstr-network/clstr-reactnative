/**
 * Skill Analysis API adapter — Phase 9.8
 * Binds @clstr/core skill-analysis-api functions to the mobile Supabase client.
 */

import { withClient } from '../adapters/bind';
import {
  getSkillAnalysis as _getSkillAnalysis,
  computeSkillAnalysis as _computeSkillAnalysis,
  getOrComputeSkillAnalysis as _getOrComputeSkillAnalysis,
  deleteSkillAnalysis as _deleteSkillAnalysis,
} from '@clstr/core/api/skill-analysis-api';

// Pure functions (no client needed) — re-export directly
export {
  getSkillDistribution,
  getOverallScore,
  getScoreLabel,
  getScoreColor,
} from '@clstr/core/api/skill-analysis-api';

// Re-export types
export type {
  SkillItem,
  SkillAnalysisData,
} from '@clstr/core/api/skill-analysis-api';

// Bound API functions
export const getSkillAnalysis = withClient(_getSkillAnalysis);
export const computeSkillAnalysis = withClient(_computeSkillAnalysis);
export const getOrComputeSkillAnalysis = withClient(_getOrComputeSkillAnalysis);
export const deleteSkillAnalysis = withClient(_deleteSkillAnalysis);
