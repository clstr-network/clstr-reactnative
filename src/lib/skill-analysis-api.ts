/**
 * skill-analysis-api - Web adapter.
 * Thin binding layer over @clstr/core.
 */

// Re-export types, interfaces, constants, and pure functions
export * from '@clstr/core/api/skill-analysis-api';

// Bind client-taking functions (auto-inject web Supabase client)
import * as _core from '@clstr/core/api/skill-analysis-api';
import { withClient } from '@/adapters/bind';

export const getSkillAnalysis = withClient(_core.getSkillAnalysis);
export const computeSkillAnalysis = withClient(_core.computeSkillAnalysis);
export const getOrComputeSkillAnalysis = withClient(_core.getOrComputeSkillAnalysis);
export const deleteSkillAnalysis = withClient(_core.deleteSkillAnalysis);
