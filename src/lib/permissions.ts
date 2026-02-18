/**
 * Role-based Permission System
 * 
 * This module provides comprehensive role-based access control (RBAC) for the application.
 * It defines permissions for different user roles and provides utility functions to check access.
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
    // Content Creation
    canCreatePost: true,
    canCreateEvent: false,
    canPostJob: false,
    canOfferMentorship: false,
    canCreateClub: false,
    
    // Content Management
    canEditOwnContent: true,
    canDeleteOwnContent: true,
    canReportContent: true,
    
    // Networking
    canSendConnectionRequest: true,
    canMessage: true,
    canViewProfiles: true,
    
    // Academic
    canAccessCourses: true,
    canCreateStudyGroup: true,
    canRequestTutoring: true,
    canOfferTutoring: true,
    
    // Professional
    canApplyToJobs: true,
    canViewSalaryInfo: false,
    canProvideReferrals: false,
    canViewAlumniDirectory: true,
    
    // Administrative
    canVerifyUsers: false,
    canManageEvents: false,
    canManageClubs: false,
    canViewAnalytics: false,
    
    // Collaboration
    canCreateProject: true,
    canApplyToProject: true,
    canManageProjectRoles: false,
    
    // Special Features
    canAccessMentorship: true, // Can request mentorship
    canAccessRecruiting: false,
    canHostWebinars: false,
    canSponsorEvents: false,
  },
  
  Alumni: {
    // Content Creation
    canCreatePost: true,
    canCreateEvent: true,
    canPostJob: true,
    canOfferMentorship: true,
    canCreateClub: true,
    
    // Content Management
    canEditOwnContent: true,
    canDeleteOwnContent: true,
    canReportContent: true,
    
    // Networking
    canSendConnectionRequest: true,
    canMessage: true,
    canViewProfiles: true,
    
    // Academic
    canAccessCourses: false,
    canCreateStudyGroup: false,
    canRequestTutoring: false,
    canOfferTutoring: true,
    
    // Professional
    canApplyToJobs: true,
    canViewSalaryInfo: true,
    canProvideReferrals: true,
    canViewAlumniDirectory: true,
    
    // Administrative
    canVerifyUsers: false,
    canManageEvents: false,
    canManageClubs: false,
    canViewAnalytics: false,
    
    // Collaboration
    canCreateProject: true,
    canApplyToProject: true,
    canManageProjectRoles: true,
    
    // Special Features
    canAccessMentorship: true, // Can offer mentorship
    canAccessRecruiting: true,
    canHostWebinars: true,
    canSponsorEvents: true,
  },
  
  Faculty: {
    // Content Creation
    canCreatePost: true,
    canCreateEvent: true,
    canPostJob: false, // 🚫 Faculty cannot post jobs per FINAL matrix
    canOfferMentorship: true,
    canCreateClub: true,
    
    // Content Management
    canEditOwnContent: true,
    canDeleteOwnContent: true,
    canReportContent: true,
    
    // Networking
    canSendConnectionRequest: true,
    canMessage: true,
    canViewProfiles: true,
    
    // Academic
    canAccessCourses: true,
    canCreateStudyGroup: false,
    canRequestTutoring: false,
    canOfferTutoring: true,
    
    // Professional
    canApplyToJobs: false, // 🚫 Faculty cannot apply/browse jobs
    canViewSalaryInfo: false,
    canProvideReferrals: false, // 🚫 Changed to align with matrix
    canViewAlumniDirectory: true,
    
    // Administrative
    canVerifyUsers: true, // Can verify students
    canManageEvents: true,
    canManageClubs: true,
    canViewAnalytics: true,
    
    // Collaboration
    canCreateProject: true,
    canApplyToProject: false,
    canManageProjectRoles: true,
    
    // Special Features
    canAccessMentorship: true,
    canAccessRecruiting: true,
    canHostWebinars: true,
    canSponsorEvents: true,
  },
  
  Club: {
    // Content Creation
    canCreatePost: true,
    canCreateEvent: true,
    canPostJob: false, // 🚫
    canOfferMentorship: false, // 🚫
    canCreateClub: false,
    
    // Content Management
    canEditOwnContent: true,
    canDeleteOwnContent: true,
    canReportContent: true,
    
    // Networking
    canSendConnectionRequest: true,
    canMessage: true,
    canViewProfiles: true,
    
    // Academic
    canAccessCourses: false,
    canCreateStudyGroup: false,
    canRequestTutoring: false,
    canOfferTutoring: false,
    
    // Professional (All 🚫 per FINAL matrix)
    canApplyToJobs: false,
    canViewSalaryInfo: false,
    canProvideReferrals: false,
    canViewAlumniDirectory: false,
    
    // Administrative
    canVerifyUsers: false,
    canManageEvents: true, // Club events only
    canManageClubs: true, // Own club only
    canViewAnalytics: true, // Own club analytics
    
    // Collaboration
    canCreateProject: true,
    canApplyToProject: false,
    canManageProjectRoles: true,
    
    // Special Features
    canAccessMentorship: false,
    canAccessRecruiting: false,
    canHostWebinars: true,
    canSponsorEvents: true,
  },
  
  Organization: {
    // Content Creation
    canCreatePost: true,
    canCreateEvent: true,
    canPostJob: true,
    canOfferMentorship: false,
    canCreateClub: false,
    
    // Content Management
    canEditOwnContent: true,
    canDeleteOwnContent: true,
    canReportContent: true,
    
    // Networking
    canSendConnectionRequest: true,
    canMessage: true,
    canViewProfiles: true,
    
    // Academic
    canAccessCourses: false,
    canCreateStudyGroup: false,
    canRequestTutoring: false,
    canOfferTutoring: false,
    
    // Professional
    canApplyToJobs: false,
    canViewSalaryInfo: false,
    canProvideReferrals: true,
    canViewAlumniDirectory: true,
    
    // Administrative
    canVerifyUsers: true, // Can verify based on type
    canManageEvents: true,
    canManageClubs: false,
    canViewAnalytics: true,
    
    // Collaboration
    canCreateProject: true,
    canApplyToProject: false,
    canManageProjectRoles: true,
    
    // Special Features
    canAccessMentorship: false,
    canAccessRecruiting: true,
    canHostWebinars: true,
    canSponsorEvents: true,
  },
};

/**
 * Get permissions for a specific role
 */
export const getPermissions = (role: UserRole): PermissionSet => {
  return ROLE_PERMISSIONS[role];
};

/**
 * Check if a user has a specific permission
 */
export const hasPermission = (
  role: UserRole | null | undefined,
  permission: keyof PermissionSet
): boolean => {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
};

/**
 * Check if a user can perform an action
 */
export const canPerformAction = (
  userRole: UserRole | null | undefined,
  action: keyof PermissionSet
): boolean => {
  return hasPermission(userRole, action);
};

/**
 * Get list of actions a role can perform
 */
export const getAllowedActions = (role: UserRole): (keyof PermissionSet)[] => {
  const permissions = getPermissions(role);
  return Object.entries(permissions)
    .filter(([_, allowed]) => allowed)
    .map(([action]) => action as keyof PermissionSet);
};

/**
 * Check if a role can create specific content types
 */
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

/**
 * Verify if user's role allows them to access a feature
 */
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

/**
 * Get user-friendly role display name
 */
export const getRoleDisplayName = (role: UserRole): string => {
  return role;
};

/**
 * Get role description
 */
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

/**
 * Validate if a role transition is allowed
 */
export const canTransitionToRole = (
  currentRole: UserRole,
  targetRole: UserRole
): boolean => {
  // Define allowed role transitions
  const allowedTransitions: Record<UserRole, UserRole[]> = {
    Student: ['Alumni', 'Faculty'], // Students can graduate or become faculty
    Alumni: ['Faculty'], // Alumni can become faculty
    Faculty: [], // Faculty role is usually permanent
    Club: [], // Club accounts don't transition
    Organization: [], // Organization accounts don't transition
  };
  
  return allowedTransitions[currentRole]?.includes(targetRole) ?? false;
};

/**
 * Check if role requires verification
 */
export const requiresVerification = (role: UserRole): boolean => {
  // Faculty and Organization roles require verification
  return ['Faculty', 'Organization'].includes(role);
};

/**
 * Get required documents for role verification
 */
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

export default {
  ROLE_PERMISSIONS,
  getPermissions,
  hasPermission,
  canPerformAction,
  getAllowedActions,
  canCreateContentType,
  canAccessFeature,
  getRoleDisplayName,
  getRoleDescription,
  canTransitionToRole,
  requiresVerification,
  getRequiredDocuments,
};
