/**
 * profile - Web adapter.
 * Thin binding layer over @clstr/core.
 */

// Re-export types, interfaces, constants, and pure functions
export * from '@clstr/core/api/profile';

// Bind client-taking functions (auto-inject web Supabase client)
import * as _core from '@clstr/core/api/profile';
import { withClient } from '@/adapters/bind';

export const uploadProfileAvatar = withClient(_core.uploadProfileAvatar);
export const removeProfileAvatar = withClient(_core.removeProfileAvatar);
export const deleteProfileAvatar = withClient(_core.deleteProfileAvatar);
export const updateProfileAvatar = withClient(_core.updateProfileAvatar);
export const createProfileRecord = withClient(_core.createProfileRecord);
export const updateProfileRecord = withClient(_core.updateProfileRecord);
export const profileExists = withClient(_core.profileExists);
export const getProfileById = withClient(_core.getProfileById);
export const deleteProfile = withClient(_core.deleteProfile);
