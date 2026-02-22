/**
 * Projects (CollabHub) API adapter — Phase 9.5
 * Binds @clstr/core projects-api functions to the mobile Supabase client.
 */

import { withClient } from '../adapters/bind';
import {
  getProjects as _getProjects,
  getProject as _getProject,
  getProjectRoles as _getProjectRoles,
  createProject as _createProject,
  deleteProject as _deleteProject,
  applyForRole as _applyForRole,
  getApplicationsForProject as _getApplicationsForProject,
  getMyProjects as _getMyProjects,
  getOwnerApplications as _getOwnerApplications,
  updateProjectApplicationStatus as _updateProjectApplicationStatus,
} from '@clstr/core/api/projects-api';

// Re-export types
export type {
  Project,
  ProjectOwner,
  ProjectRole,
  ProjectApplication,
  ProjectApplicationWithProject,
  GetProjectsParams,
  CreateProjectParams,
  ApplyForRoleParams,
  UpdateApplicationStatusParams,
} from '@clstr/core/api/projects-api';

// Bound API functions
export const getProjects = withClient(_getProjects);
export const getProject = withClient(_getProject);
export const getProjectRoles = withClient(_getProjectRoles);
export const createProject = withClient(_createProject);
export const deleteProject = withClient(_deleteProject);
export const applyForRole = withClient(_applyForRole);
export const getApplicationsForProject = withClient(_getApplicationsForProject);
export const getMyProjects = withClient(_getMyProjects);
export const getOwnerApplications = withClient(_getOwnerApplications);
export const updateProjectApplicationStatus = withClient(_updateProjectApplicationStatus);
