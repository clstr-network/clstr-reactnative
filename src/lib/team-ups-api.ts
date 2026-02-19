/**
 * team-ups-api - Web adapter.
 * Thin binding layer over @clstr/core.
 */

// Re-export types, interfaces, constants, and pure functions
export * from '@clstr/core/api/team-ups-api';

// Bind client-taking functions (auto-inject web Supabase client)
import * as _core from '@clstr/core/api/team-ups-api';
import { withClient } from '@/adapters/bind';

export const getTeamUpRoleDefinitions = withClient(_core.getTeamUpRoleDefinitions);
export const getTeamUps = withClient(_core.getTeamUps);
export const getMyTeamUps = withClient(_core.getMyTeamUps);
export const createTeamUp = withClient(_core.createTeamUp);
export const deleteTeamUp = withClient(_core.deleteTeamUp);
export const closeTeamUp = withClient(_core.closeTeamUp);
export const cancelTeamUpRequest = withClient(_core.cancelTeamUpRequest);
export const getTeamUpRequests = withClient(_core.getTeamUpRequests);
export const getMyTeamUpRequests = withClient(_core.getMyTeamUpRequests);
export const getIncomingTeamUpRequests = withClient(_core.getIncomingTeamUpRequests);
export const createTeamUpRequest = withClient(_core.createTeamUpRequest);
export const respondToTeamUpRequest = withClient(_core.respondToTeamUpRequest);
export const getTeamUpMembers = withClient(_core.getTeamUpMembers);
export const hasUserRequestedTeamUp = withClient(_core.hasUserRequestedTeamUp);
