/**
 * useRolePermissions — Mobile port of the web's useRolePermissions hook.
 *
 * Provides comprehensive role-based permissions for CRUD operations, mentorship,
 * projects, events, clubs, networking, and FAB (floating action button) menu options.
 *
 * Reads identity from the mobile IdentityProvider, delegates permission checks to
 * @clstr/core/api/permissions (100% pure RBAC matrix).
 *
 * Usage:
 * ```tsx
 * const { canCreateEvents, canPostInFeed, addButtonOptions, role } = useRolePermissions();
 * ```
 *
 * Phase 4.2 — Role System & Permissions
 */

import { useMemo } from 'react';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import {
  hasPermission,
  type UserRole as RbacUserRole,
} from '@clstr/core/api/permissions';

export type UserRole = RbacUserRole;

export interface AddButtonOption {
  label: string;
  action: string;
  icon?: string;
}

export interface RolePermissions {
  // Feed
  canPostInFeed: boolean;
  canLikePosts: boolean;
  canCommentOnPosts: boolean;
  canSharePosts: boolean;
  canEditOwnContent: boolean;
  canDeleteOwnContent: boolean;
  canReportContent: boolean;

  // Clubs
  canViewClubs: boolean;
  canJoinClubs: boolean;
  canPostInClubs: boolean;
  canManageClubMembers: boolean;
  canApproveClubJoinRequests: boolean;
  canCreateClubEvents: boolean;
  canCreateClubRoles: boolean;

  // Network
  canSendConnectionRequests: boolean;
  canMessage: boolean;
  canViewProfiles: boolean;

  // Mentorship
  canRequestMentorship: boolean;
  canOfferMentorship: boolean;
  canScheduleMentorSessions: boolean;
  canAcceptMentorRequests: boolean;
  hasAlumniMentorBadge: boolean;

  // Projects/Team Building
  canViewProjects: boolean;
  canApplyToProjects: boolean;
  canCreateProjects: boolean;
  canRecruitForProjects: boolean;
  canManageProjectTeam: boolean;
  canPostInternshipOpportunities: boolean;

  // Events
  canViewEvents: boolean;
  canAttendEvents: boolean;
  canCreateEvents: boolean;
  canManageEventAttendees: boolean;

  // Profile
  canUpdateProfile: boolean;
  canDoSkillAnalysis: boolean;
  canToggleMentorStatus: boolean;
  hasClubLeadBadge: boolean;

  // Add Button Options (FAB menu)
  addButtonOptions: AddButtonOption[];

  // Domain
  collegeDomain: string | null;
  isVerified: boolean;
}

/**
 * Get role-specific FAB menu options
 */
function getAddButtonOptions(
  role: UserRole,
  isClubLead: boolean,
  isAlumni: boolean,
): AddButtonOption[] {
  const options: AddButtonOption[] = [
    { label: 'Create Post', action: 'create-post', icon: 'plus' },
  ];

  if (isAlumni) {
    options.push(
      { label: 'Create Project', action: 'create-project', icon: 'briefcase' },
      { label: 'Offer Mentorship', action: 'offer-mentorship', icon: 'users' },
    );
  }

  if (isClubLead) {
    options.push(
      { label: 'Create Club Post', action: 'create-club-post', icon: 'users' },
      { label: 'Create Club Event', action: 'create-club-event', icon: 'calendar' },
      { label: 'Post Club Role', action: 'post-club-role', icon: 'user-plus' },
      { label: 'Create Club Project', action: 'create-club-project', icon: 'folder' },
    );
  }

  return options;
}

/**
 * Return default (all-false) permissions for unauthenticated users
 */
function getDefaultPermissions(): RolePermissions {
  return {
    canPostInFeed: false,
    canLikePosts: false,
    canCommentOnPosts: false,
    canSharePosts: false,
    canEditOwnContent: false,
    canDeleteOwnContent: false,
    canReportContent: false,
    canViewClubs: false,
    canJoinClubs: false,
    canPostInClubs: false,
    canManageClubMembers: false,
    canApproveClubJoinRequests: false,
    canCreateClubEvents: false,
    canCreateClubRoles: false,
    canSendConnectionRequests: false,
    canMessage: false,
    canViewProfiles: false,
    canRequestMentorship: false,
    canOfferMentorship: false,
    canScheduleMentorSessions: false,
    canAcceptMentorRequests: false,
    hasAlumniMentorBadge: false,
    canViewProjects: false,
    canApplyToProjects: false,
    canCreateProjects: false,
    canRecruitForProjects: false,
    canManageProjectTeam: false,
    canPostInternshipOpportunities: false,
    canViewEvents: false,
    canAttendEvents: false,
    canCreateEvents: false,
    canManageEventAttendees: false,
    canUpdateProfile: false,
    canDoSkillAnalysis: false,
    canToggleMentorStatus: false,
    hasClubLeadBadge: false,
    addButtonOptions: [],
    collegeDomain: null,
    isVerified: false,
  };
}

/**
 * Hook that provides comprehensive role-based permissions.
 * All users see the same UI, but capabilities differ by role.
 */
export function useRolePermissions(): RolePermissions & {
  role: UserRole | null;
  isLoading: boolean;
  isStudent: boolean;
  isFaculty: boolean;
  isAlumni: boolean;
  isClubLead: boolean;
} {
  const { identity, isLoading, collegeDomain: identityDomain } = useIdentityContext();

  const resolvedRole = useMemo((): UserRole | null => {
    if (!identity?.role) return null;
    const allowed: UserRole[] = ['Student', 'Alumni', 'Faculty', 'Club', 'Organization'];
    return (allowed as string[]).includes(identity.role)
      ? (identity.role as UserRole)
      : 'Student';
  }, [identity?.role]);

  const permissions = useMemo((): RolePermissions => {
    if (!identity) {
      return getDefaultPermissions();
    }

    const role = resolvedRole ?? 'Student';
    const isClubLead = role === 'Club';
    const isAlumni = role === 'Alumni';
    const isFaculty = role === 'Faculty';
    const isStudent = role === 'Student';

    const can = (permission: Parameters<typeof hasPermission>[1]) =>
      hasPermission(role, permission);

    return {
      // Feed — All roles can interact with feed
      canPostInFeed: can('canCreatePost'),
      canLikePosts: true,
      canCommentOnPosts: true,
      canSharePosts: true,
      canEditOwnContent: can('canEditOwnContent'),
      canDeleteOwnContent: can('canDeleteOwnContent'),
      canReportContent: can('canReportContent'),

      // Clubs — View and join for everyone, post only for Club Leads
      canViewClubs: true,
      canJoinClubs: true,
      canPostInClubs: isClubLead,
      canManageClubMembers: can('canManageClubs'),
      canApproveClubJoinRequests: can('canManageClubs'),
      canCreateClubEvents: can('canManageEvents'),
      canCreateClubRoles: can('canManageClubs'),

      // Network — All roles have full access
      canSendConnectionRequests: can('canSendConnectionRequest'),
      canMessage: can('canMessage'),
      canViewProfiles: can('canViewProfiles'),

      // Mentorship — Students only request, Alumni/Faculty offer
      canRequestMentorship: isStudent,
      canOfferMentorship: can('canOfferMentorship'),
      canScheduleMentorSessions: isStudent,
      canAcceptMentorRequests: isAlumni || isFaculty,
      hasAlumniMentorBadge: isAlumni,

      // Projects/Team Building — All users can create and join projects
      canViewProjects: true,
      canApplyToProjects: can('canApplyToProject'),
      canCreateProjects: can('canCreateProject'),
      canRecruitForProjects: can('canCreateProject'),
      canManageProjectTeam: can('canManageProjectRoles'),
      canPostInternshipOpportunities: can('canPostJob'),

      // Events — All view/attend, Faculty/Club create
      canViewEvents: true,
      canAttendEvents: true,
      canCreateEvents: can('canCreateEvent'),
      canManageEventAttendees: can('canManageEvents'),

      // Profile — All can update and analyze
      canUpdateProfile: true,
      canDoSkillAnalysis: true,
      canToggleMentorStatus: isAlumni,
      hasClubLeadBadge: isClubLead,

      // Add Button Options — Varies by role
      addButtonOptions: getAddButtonOptions(role, isClubLead, isAlumni),

      // Domain — from identity context
      collegeDomain: identityDomain ?? null,
      isVerified: identity.is_verified || false,
    };
  }, [identity, identityDomain, resolvedRole]);

  const role = resolvedRole;
  const isClubLead = role === 'Club';
  const isAlumni = role === 'Alumni';
  const isFaculty = role === 'Faculty';
  const isStudent = role === 'Student';

  return {
    ...permissions,
    role,
    isLoading,
    isStudent,
    isFaculty,
    isAlumni,
    isClubLead,
  };
}

export default useRolePermissions;
