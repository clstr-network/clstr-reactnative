/**
 * jobs-api - Web adapter.
 * Thin binding layer over @clstr/core.
 */

// Re-export types, interfaces, constants, and pure functions
export * from '@clstr/core/api/jobs-api';

// Bind client-taking functions (auto-inject web Supabase client)
import * as _core from '@clstr/core/api/jobs-api';
import { withClient } from '@/adapters/bind';

export const getJobs = withClient(_core.getJobs);
export const getRecommendedJobs = withClient(_core.getRecommendedJobs);
export const refreshJobMatches = withClient(_core.refreshJobMatches);
export const getAlumniJobs = withClient(_core.getAlumniJobs);
export const getSavedJobs = withClient(_core.getSavedJobs);
export const toggleSaveJob = withClient(_core.toggleSaveJob);
export const createJob = withClient(_core.createJob);
export const applyToJob = withClient(_core.applyToJob);
export const getMyApplications = withClient(_core.getMyApplications);
export const getJobById = withClient(_core.getJobById);

// Compat wrapper: shareJob injects web platform deps
const webShareDeps: _core.ShareJobDeps = {
  nativeShare: typeof navigator !== 'undefined' && navigator.share
    ? (data) => navigator.share(data)
    : undefined,
  copyToClipboard: (text: string) => navigator.clipboard.writeText(text),
  appUrl: typeof window !== 'undefined' ? window.location.origin : '',
};

export const shareJob = (job: _core.Job) => _core.shareJob(webShareDeps, job);
