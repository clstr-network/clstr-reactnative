/**
 * resume-api - Web adapter.
 * Thin binding layer over @clstr/core.
 */

// Re-export types, interfaces, constants, and pure functions
export * from '@clstr/core/api/resume-api';

// Bind client-taking functions (auto-inject web Supabase client)
import * as _core from '@clstr/core/api/resume-api';
import { withClient } from '@/adapters/bind';

export const getSignedResumeUrl = withClient(_core.getSignedResumeUrl);
export const resolveResumeDownloadUrl = withClient(_core.resolveResumeDownloadUrl);
export const uploadResumeForProfile = withClient(_core.uploadResumeForProfile);
