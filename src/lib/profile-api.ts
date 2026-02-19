/**
 * profile-api - Web adapter.
 * Thin binding layer over @clstr/core.
 */

// Re-export types, interfaces, constants, and pure functions
export * from '@clstr/core/api/profile-api';

// Bind client-taking functions (auto-inject web Supabase client)
import * as _core from '@clstr/core/api/profile-api';
import { withClient } from '@/adapters/bind';

export const addExperience = withClient(_core.addExperience);
export const updateExperience = withClient(_core.updateExperience);
export const deleteExperience = withClient(_core.deleteExperience);
export const getExperiences = withClient(_core.getExperiences);
export const addEducation = withClient(_core.addEducation);
export const updateEducation = withClient(_core.updateEducation);
export const deleteEducation = withClient(_core.deleteEducation);
export const getEducation = withClient(_core.getEducation);
export const updateSkills = withClient(_core.updateSkills);
export const getSkills = withClient(_core.getSkills);
export const addSkill = withClient(_core.addSkill);
export const updateSkill = withClient(_core.updateSkill);
export const deleteSkill = withClient(_core.deleteSkill);
export const addProject = withClient(_core.addProject);
export const updateProject = withClient(_core.updateProject);
export const deleteProject = withClient(_core.deleteProject);
export const uploadProjectImage = withClient(_core.uploadProjectImage);
export const deleteProjectImage = withClient(_core.deleteProjectImage);
export const getProjects = withClient(_core.getProjects);
export const getConnections = withClient(_core.getConnections);
export const getPendingConnectionRequests = withClient(_core.getPendingConnectionRequests);
export const getSentConnectionRequests = withClient(_core.getSentConnectionRequests);
export const addConnectionRequest = withClient(_core.addConnectionRequest);
export const acceptConnectionRequest = withClient(_core.acceptConnectionRequest);
export const rejectConnectionRequest = withClient(_core.rejectConnectionRequest);
export const removeConnection = withClient(_core.removeConnection);
export const blockConnection = withClient(_core.blockConnection);
export const getConnectionCount = withClient(_core.getConnectionCount);
export const getProfileViewsCount = withClient(_core.getProfileViewsCount);
export const trackProfileView = withClient(_core.trackProfileView);
