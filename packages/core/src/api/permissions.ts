/**
 * Role-based Permission System
 * 
 * This module provides comprehensive role-based access control (RBAC) for the application.
 * It defines permissions for different user roles and provides utility functions to check access.
 * 
 * 100% pure — no external dependencies.
 */

export type UserRole = 'Student' | 'Alumni' | 'Faculty' | 'Club' | 'Organization';

export interface PermissionSet {
  // Content Creation
  canCreatePost: boolean;
  canCreateEvent: boolean;
  canPostJob: boolean;
  canOfferMentorship: boolean;
  canCreateClub: boolean;
  
  // Content Management
  canEditOwnContent: boolean;
  canDeleteOwnContent: boolean;
  canReportContent: boolean;
  
  // Networking
  canSendConnectionRequest: boolean;
  canMessage: boolean;
  canViewProfiles: boolean;
  
  // Academic
  canAccessCourses: boolean;
  canCreateStudyGroup: boolean;
  canRequestTutoring: boolean;
  canOfferTutoring: boolean;
  
  // Professional
  canApplyToJobs: boolean;
  canViewSalaryInfo: boolean;
  canProvideReferrals: boolean;
  canViewAlumniDirectory: boolean;
  
  // Administrative
  canVerifyUsers: boolean;
  canManageEvents: boolean;
  canManageClubs: boolean;
  canViewAnalytics: boolean;
  
  // Collaboration
  canCreateProject: boolean;
  canApplyToProject: boolean;
  canManageProjectRoles: boolean;
  
  // Special Features
  canAccessMentorship: boolean;
  canAccessRecruiting: boolean;
  canHostWebinars: boolean;
  canSponsorEvents: boolean;
}

/**
 * Permission matrix defining what each role can do
 */
export const ROLE_PERMISSIONS: Record<UserRole, PermissionSet> = {
  Student: {
    canCreatePost: true,
    canCreateEvent: false,
    canPostJob: false,
    canOfferMentorship: false,
    canCreateClub: false,
    canEditOwnContent: true,
    canDeleteOwnContent: true,
    canReportContent: true,
    canSendConnectionRequest: true,
    canMessage: true,
    canViewProfiles: true,
    canAccessCourses: true,
    canCreateStudyGroup: true,
    canRequestTutoring: true,
    canOfferTutoring: true,
    canApplyToJobs: true,
    canViewSalaryInfo: false,
    canProvideReferrals: false,
    canViewAlumniDirectory: true,
    canVerifyUsers: false,
    canManageEvents: false,
    canManageClubs: false,
    canViewAnalytics: false,
    canCreateProject: true,
    canApplyToProject: true,
    canManageProjectRoles: false,
    canAccessMentorship: true,
    canAccessRecruiting: false,
    canHostWebinars: false,
    canSponsorEvents: false,
  },
  Alumni: {
    canCreatePost: true,
    canCreateEvent: true,
    canPostJob: true,
    canOfferMentorship: true,
    canCreateClub: true,
    canEditOwnContent: true,
    canDeleteOwnContent: true,
    canReportContent: true,
    canSendConnectionRequest: true,
    canMessage: true,
    canViewProfiles: true,
    canAccessCourses: false,
    canCreateStudyGroup: false,
    canRequestTutoring: false,
    canOfferTutoring: true,
    canApplyToJobs: true,
    canViewSalaryInfo: true,
    canProvideReferrals: true,
    canViewAlumniDirectory: true,
    canVerifyUsers: false,
    canManageEvents: false,
    canManageClubs: false,
    canViewAnalytics: false,
    canCreateProject: true,
    canApplyToProject: true,
    canManageProjectRoles: true,
    canAccessMentorship: true,
    canAccessRecruiting: true,
    canHostWebinars: true,
    canSponsorEvents: true,
  },
  Faculty: {
    canCreatePost: true,
    canCreateEvent: true,
    canPostJob: false,
    canOfferMentorship: true,
    canCreateClub: true,
    canEditOwnContent: true,
    canDeleteOwnContent: true,
    canReportContent: true,
    canSendConnectionRequest: true,
    canMessage: true,
    canViewProfiles: true,
    canAccessCourses: true,
    canCreateStudyGroup: false,
    canRequestTutoring: false,
    canOfferTutoring: true,
    canApplyToJobs: false,
    canViewSalaryInfo: false,
    canProvideReferrals: false,
    canViewAlumniDirectory: true,
    canVerifyUsers: true,
    canManageEvents: true,
    canManageClubs: true,
    canViewAnalytics: true,
    canCreateProject: true,
    canApplyToProject: false,
    canManageProjectRoles: true,
    canAccessMentorship: true,
    canAccessRecruiting: true,
    canHostWebinars: true,
    canSponsorEvents: true,
  },
  Club: {
    canCreatePost: true,
    canCreateEvent: true,
    canPostJob: false,
    canOfferMentorship: false,
    canCreateClub: false,
    canEditOwnContent: true,
    canDeleteOwnContent: true,
    canReportContent: true,
    canSendConnectionRequest: true,
    canMessage: true,
    canViewProfiles: true,
    canAccessCourses: false,
    canCreateStudyGroup: false,
    canRequestTutoring: false,
    canOfferTutoring: false,
    canApplyToJobs: false,
    canViewSalaryInfo: false,
    canProvideReferrals: false,
    canViewAlumniDirectory: false,
    canVerifyUsers: false,
    canManageEvents: true,
    canManageClubs: true,
    canViewAnalytics: true,
    canCreateProject: true,
    canApplyToProject: false,
    canManageProjectRoles: true,
    canAccessMentorship: false,
    canAccessRecruiting: false,
    canHostWebinars: true,
    canSponsorEvents: true,
  },
  Organization: {
    canCreatePost: true,
    canCreateEvent: true,
    canPostJob: true,
    canOfferMentorship: false,
    canCreateClub: false,
    canEditOwnContent: true,
    canDeleteOwnContent: true,
    canReportContent: true,
    canSendConnectionRequest: true,
    canMessage: true,
    canViewProfiles: true,
    canAccessCourses: false,
    canCreateStudyGroup: false,
    canRequestTutoring: false,
    canOfferTutoring: false,
    canApplyToJobs: false,
    canViewSalaryInfo: false,
    canProvideReferrals: true,
    canViewAlumniDirectory: true,
    canVerifyUsers: true,
    canManageEvents: true,
    canManageClubs: false,
    canViewAnalytics: true,
    canCreateProject: true,
    canApplyToProject: false,
    canManageProjectRoles: true,
    canAccessMentorship: false,
    canAccessRecruiting: true,
    canHostWebinars: true,
    canSponsorEvents: true,
  },
};

/** Get permissions for a specific role */
export const getPermissions = (role: UserRole): PermissionSet => {
  return ROLE_PERMISSIONS[role];
};

/** Check if a user has a specific permission */
export const hasPermission = (
  role: UserRole | null | undefined,
  permission: keyof PermissionSet
): boolean => {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
};

/** Check if a user can perform an action */
export const canPerformAction = (
  userRole: UserRole | null | undefined,
  action: keyof PermissionSet
): boolean => {
  return hasPermission(userRole, action);
};

/** Get list of actions a role can perform */
export const getAllowedActions = (role: UserRole): (keyof PermissionSet)[] => {
  const permissions = getPermissions(role);
  return Object.entries(permissions)
    .filter(([_, allowed]) => allowed)
    .map(([action]) => action as keyof PermissionSet);
};

/** Check if a role can create specific content types */
export const canCreateContentType = (
  role: UserRole | null | undefined,
  contentType: 'post' | 'event' | 'job' | 'mentorship' | 'club'
): boolean => {
  if (!role) return false;
  const permissionMap = {
    post: 'canCreatePost',
    event: 'canCreateEvent',
    job: 'canPostJob',
    mentorship: 'canOfferMentorship',
    club: 'canCreateClub',
  } as const;
  return hasPermission(role, permissionMap[contentType]);
};

/** Verify if user's role allows them to access a feature */
export const canAccessFeature = (
  role: UserRole | null | undefined,
  feature: 'mentorship' | 'recruiting' | 'webinars' | 'analytics' | 'courses'
): boolean => {
  if (!role) return false;
  const featureMap = {
    mentorship: 'canAccessMentorship',
    recruiting: 'canAccessRecruiting',
    webinars: 'canHostWebinars',
    analytics: 'canViewAnalytics',
    courses: 'canAccessCourses',
  } as const;
  return hasPermission(role, featureMap[feature]);
};

/** Get user-friendly role display name */
export const getRoleDisplayName = (role: UserRole): string => {
  return role;
};

/** Get role description */
export const getRoleDescription = (role: UserRole): string => {
  const descriptions: Record<UserRole, string> = {
    Student: 'Currently enrolled student with access to academic resources and networking',
    Alumni: 'Graduate with full access to professional networking, mentorship, and job opportunities',
    Faculty: 'Teaching staff with administrative capabilities and student verification',
    Club: 'Student organization with event management and member recruitment features',
    Organization: 'Institutional or external organization with recruitment and partnership capabilities',
  };
  return descriptions[role];
};

/** Validate if a role transition is allowed */
export const canTransitionToRole = (
  currentRole: UserRole,
  targetRole: UserRole
): boolean => {
  const allowedTransitions: Record<UserRole, UserRole[]> = {
    Student: ['Alumni', 'Faculty'],
    Alumni: ['Faculty'],
    Faculty: [],
    Club: [],
    Organization: [],
  };
  return allowedTransitions[currentRole]?.includes(targetRole) ?? false;
};

/** Check if role requires verification */
export const requiresVerification = (role: UserRole): boolean => {
  return ['Faculty', 'Organization'].includes(role);
};

/** Get required documents for role verification */
export const getRequiredDocuments = (role: UserRole): string[] => {
  const requirements: Record<UserRole, string[]> = {
    Student: [],
    Alumni: [],
    Faculty: ['Employee ID', 'Institution Email', 'Appointment Letter'],
    Club: ['Club Registration', 'Faculty Advisor Approval'],
    Organization: ['Registration Certificate', 'Official Email', 'Authorization Letter'],
  };
  return requirements[role];
};
