/**
 * Profile API adapter — Profile CRUD, avatar, experience, education, skills, projects.
 * Binds @clstr/core profile + profile-api functions to the mobile Supabase client.
 */

import { withClient } from '../adapters/bind';
import {
  getMockProfileByIdData,
  getMockConnectionCountData,
  getMockProfileViewsCountData,
} from '@/lib/mock-social-data';

// --- profile.ts (core profile operations) ---
import {
  getProfileById as _getProfileById,
  createProfileRecord as _createProfileRecord,
  updateProfileRecord as _updateProfileRecord,
  uploadProfileAvatar as _uploadProfileAvatar,
  removeProfileAvatar as _removeProfileAvatar,
  deleteProfileAvatar as _deleteProfileAvatar,
  updateProfileAvatar as _updateProfileAvatar,
  profileExists as _profileExists,
  deleteProfile as _deleteProfile,
  normalizeProfileRecord,
  normalizeInterests,
  mapUserTypeToRole,
  sanitizeSocialLinks,
  validateAvatarFile,
  calculateProfileCompletion,
  isProfileComplete,
  getMissingProfileFields,
  validateProfileData,
  AVATAR_BUCKET,
  MAX_AVATAR_SIZE,
  ALLOWED_AVATAR_TYPES,
} from '@clstr/core/api/profile';

// --- profile-api.ts (experience, education, skills, projects, connections) ---
import {
  addExperience as _addExperience,
  updateExperience as _updateExperience,
  deleteExperience as _deleteExperience,
  getExperiences as _getExperiences,
  addEducation as _addEducation,
  updateEducation as _updateEducation,
  deleteEducation as _deleteEducation,
  getEducation as _getEducation,
  updateSkills as _updateSkills,
  getSkills as _getSkills,
  addSkill as _addSkill,
  updateSkill as _updateSkill,
  deleteSkill as _deleteSkill,
  addProject as _addProject,
  updateProject as _updateProject,
  uploadProjectImage as _uploadProjectImage,
  deleteProjectImage as _deleteProjectImage,
  getPendingConnectionRequests as _getPendingConnectionRequests,
  getSentConnectionRequests as _getSentConnectionRequests,
  addConnectionRequest as _addConnectionRequest,
  blockConnection as _blockConnection,
  getConnectionCount as _getConnectionCount,
  getProfileViewsCount as _getProfileViewsCount,
  trackProfileView as _trackProfileView,
} from '@clstr/core/api/profile-api';

// Re-export types
export type { ProfileSignupPayload } from '@clstr/core/api/profile';

export type {
  UserProfile,
  ExperienceData,
  EducationData,
  SkillData,
  ProjectData,
  SkillLevel,
} from '@clstr/core/types';

const AUTH_MODE = process.env.EXPO_PUBLIC_AUTH_MODE;

// Re-export pure helpers & constants
export {
  normalizeProfileRecord,
  normalizeInterests,
  mapUserTypeToRole,
  sanitizeSocialLinks,
  validateAvatarFile,
  calculateProfileCompletion,
  isProfileComplete,
  getMissingProfileFields,
  validateProfileData,
  AVATAR_BUCKET,
  MAX_AVATAR_SIZE,
  ALLOWED_AVATAR_TYPES,
};

// Bound profile core functions
export async function getProfileById(profileId: string) {
  if (AUTH_MODE === 'mock') {
    return getMockProfileByIdData(profileId) as any;
  }
  return withClient(_getProfileById)(profileId as any);
}
export const createProfileRecord = withClient(_createProfileRecord);
export const updateProfileRecord = withClient(_updateProfileRecord);
export const uploadProfileAvatar = withClient(_uploadProfileAvatar);
export const removeProfileAvatar = withClient(_removeProfileAvatar);
export const deleteProfileAvatar = withClient(_deleteProfileAvatar);
export const updateProfileAvatar = withClient(_updateProfileAvatar);
export const profileExists = withClient(_profileExists);
export const deleteProfile = withClient(_deleteProfile);

// Bound profile-api functions (experience, education, skills, projects)
export const addExperience = withClient(_addExperience);
export const updateExperience = withClient(_updateExperience);
export const deleteExperience = withClient(_deleteExperience);
export const getExperiences = withClient(_getExperiences);
export const addEducation = withClient(_addEducation);
export const updateEducation = withClient(_updateEducation);
export const deleteEducation = withClient(_deleteEducation);
export const getEducation = withClient(_getEducation);
export const updateSkills = withClient(_updateSkills);
export const getSkills = withClient(_getSkills);
export const addSkill = withClient(_addSkill);
export const updateSkill = withClient(_updateSkill);
export const deleteSkill = withClient(_deleteSkill);
export const addProject = withClient(_addProject);
export const updateProject = withClient(_updateProject);
export const uploadProjectImage = withClient(_uploadProjectImage);
export const deleteProjectImage = withClient(_deleteProjectImage);

// Bound connection management from profile-api
export const getPendingConnectionRequests = withClient(_getPendingConnectionRequests);
export const getSentConnectionRequests = withClient(_getSentConnectionRequests);
export const addConnectionRequest = withClient(_addConnectionRequest);
export const blockConnection = withClient(_blockConnection);
export async function getConnectionCount(profileId: string) {
  if (AUTH_MODE === 'mock') {
    return getMockConnectionCountData();
  }
  return withClient(_getConnectionCount)(profileId as any);
}

export async function getProfileViewsCount(profileId: string) {
  if (AUTH_MODE === 'mock') {
    return getMockProfileViewsCountData();
  }
  return withClient(_getProfileViewsCount)(profileId as any);
}
export const trackProfileView = withClient(_trackProfileView);
