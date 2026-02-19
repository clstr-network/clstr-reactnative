/**
 * projects-api - Web adapter.
 * Thin binding layer over @clstr/core.
 */

// Re-export types, interfaces, constants, and pure functions
export * from '@clstr/core/api/projects-api';

// Bind client-taking functions (auto-inject web Supabase client)
import * as _core from '@clstr/core/api/projects-api';
import { withClient } from '@/adapters/bind';

export const getProjects = withClient(_core.getProjects);
export const getProject = withClient(_core.getProject);
export const getProjectRoles = withClient(_core.getProjectRoles);
export const createProject = withClient(_core.createProject);
export const deleteProject = withClient(_core.deleteProject);
export const applyForRole = withClient(_core.applyForRole);
export const getApplicationsForProject = withClient(_core.getApplicationsForProject);
export const getMyProjects = withClient(_core.getMyProjects);
export const getMyApplications = withClient(_core.getMyApplications);
export const getOwnerApplications = withClient(_core.getOwnerApplications);
export const updateProjectApplicationStatus = withClient(_core.updateProjectApplicationStatus);
