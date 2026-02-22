/**
 * Jobs API adapter — Phase 9.1
 * Binds @clstr/core jobs-api functions to the mobile Supabase client.
 */

import { withClient } from '../adapters/bind';
import {
  getJobs as _getJobs,
  getJobById as _getJobById,
  getRecommendedJobs as _getRecommendedJobs,
  getAlumniJobs as _getAlumniJobs,
  getSavedJobs as _getSavedJobs,
  toggleSaveJob as _toggleSaveJob,
  createJob as _createJob,
  applyToJob as _applyToJob,
  getMyApplications as _getMyApplications,
  refreshJobMatches as _refreshJobMatches,
  shareJob as _shareJob,
  getJobShareUrl,
} from '@clstr/core/api/jobs-api';

// Re-export types
export type {
  Job,
  JobApplication,
  JobFilters,
  CreateJobInput,
  ApplyToJobInput,
  JobWithMatchScore,
  ShareJobDeps,
} from '@clstr/core/api/jobs-api';

export { getJobShareUrl, isRecommendedJobsRpcUnavailable } from '@clstr/core/api/jobs-api';

// Bound API functions
export const getJobs = withClient(_getJobs);
export const getJobById = withClient(_getJobById);
export const getRecommendedJobs = withClient(_getRecommendedJobs);
export const getAlumniJobs = withClient(_getAlumniJobs);
export const getSavedJobs = withClient(_getSavedJobs);
export const toggleSaveJob = withClient(_toggleSaveJob);
export const createJob = withClient(_createJob);
export const applyToJob = withClient(_applyToJob);
export const getMyApplications = withClient(_getMyApplications);
export const refreshJobMatches = withClient(_refreshJobMatches);
