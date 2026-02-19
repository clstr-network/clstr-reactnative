/**
 * Feature-based Permission System
 * 
 * Implements the FINAL Feature × Profile Matrix for the 4 supported profile types:
 * Student, Alumni, Faculty, Club.
 * 
 * Rules:
 * - If a feature is 🚫 for a role: hide from nav, block route access, remove from UI
 * - Organization role is deprecated and maps to Alumni
 * 
 * 100% pure — no external dependencies.
 */

export type ProfileType = 'Student' | 'Alumni' | 'Faculty' | 'Club';

/** Maps any role string to one of the 4 canonical types */
export function normalizeProfileType(role: string | null | undefined): ProfileType | null {
  if (!role) return null;
  switch (role) {
    case 'Student':
      return 'Student';
    case 'Alumni':
    case 'Organization':
      return 'Alumni';
    case 'Faculty':
    case 'Principal':
    case 'Dean':
      return 'Faculty';
    case 'Club':
      return 'Club';
    default:
      return null;
  }
}

export interface FeaturePermissions {
  // 5. Projects / CollabHub
  canViewProjects: boolean;
  canCreateProjects: boolean;
  canApplyToProjects: boolean;
  canManageProjectTeam: boolean;

  // 6. Clubs
  canViewClubs: boolean;
  canJoinClub: boolean;
  canFollowClub: boolean;
  canManageClub: boolean;

  // 7. Events
  canViewEvents: boolean;
  canAttendEvents: boolean;
  canCreateEvents: boolean;
  canManageEvents: boolean;

  // 8. Alumni Directory
  canViewAlumniDirectory: boolean;
  canConnectWithAlumni: boolean;

  // 9. EcoCampus (Marketplace)
  canBrowseEcoCampus: boolean;
  canCreateListing: boolean;
  canManageListings: boolean;

  // 10. System & Settings
  canAccessNotifications: boolean;
  canAccessSettings: boolean;
  canAccessOnboarding: boolean;

  // 1. Core Platform & Social (Legacy)
  canViewHomeFeed: boolean;
  canCreatePost: boolean;
  canLikeCommentShare: boolean;
  canSaveBookmarks: boolean;
  canMessage: boolean;
  canSearch: boolean;

  // 2. Jobs & Careers (Legacy)
  canBrowseJobs: boolean;
  canApplyToJobs: boolean;
  canPostJobs: boolean;
  canSaveJobs: boolean;
  canUseAIJobMatching: boolean;
  canViewAlumniJobsTab: boolean;

  // 3. Skill Analysis / Career Intelligence (Legacy)
  canAccessSkillAnalysis: boolean;
  canViewSkillGapAnalysis: boolean;
  canViewJobFitScoring: boolean;
  canViewPeerComparison: boolean;
  canViewTrendingSkills: boolean;

  // 4. Mentorship (Legacy)
  canBrowseMentors: boolean;
  canRequestMentorship: boolean;
  canOfferMentorship: boolean;
  canManageMentorshipRequests: boolean;
}

function getDefaultPermissions(): FeaturePermissions {
  return {
    canViewProjects: false,
    canCreateProjects: false,
    canApplyToProjects: false,
    canManageProjectTeam: false,
    canViewClubs: false,
    canJoinClub: false,
    canFollowClub: false,
    canManageClub: false,
    canViewEvents: false,
    canAttendEvents: false,
    canCreateEvents: false,
    canManageEvents: false,
    canViewAlumniDirectory: false,
    canConnectWithAlumni: false,
    canBrowseEcoCampus: false,
    canCreateListing: false,
    canManageListings: false,
    canAccessNotifications: false,
    canAccessSettings: false,
    canAccessOnboarding: false,
    canViewHomeFeed: false,
    canCreatePost: false,
    canLikeCommentShare: false,
    canSaveBookmarks: false,
    canMessage: false,
    canSearch: false,
    canBrowseJobs: false,
    canApplyToJobs: false,
    canPostJobs: false,
    canSaveJobs: false,
    canUseAIJobMatching: false,
    canViewAlumniJobsTab: false,
    canAccessSkillAnalysis: false,
    canViewSkillGapAnalysis: false,
    canViewJobFitScoring: false,
    canViewPeerComparison: false,
    canViewTrendingSkills: false,
    canBrowseMentors: false,
    canRequestMentorship: false,
    canOfferMentorship: false,
    canManageMentorshipRequests: false,
  };
}

/** Get all feature permissions for a profile type */
export function getFeaturePermissions(role: string | null | undefined): FeaturePermissions {
  const profileType = normalizeProfileType(role);
  if (!profileType) return getDefaultPermissions();

  switch (profileType) {
    case 'Student':
      return {
        canViewProjects: true,
        canCreateProjects: true,
        canApplyToProjects: true,
        canManageProjectTeam: true,
        canViewClubs: true,
        canJoinClub: true,
        canFollowClub: false,
        canManageClub: false,
        canViewEvents: true,
        canAttendEvents: true,
        canCreateEvents: false,
        canManageEvents: false,
        canViewAlumniDirectory: true,
        canConnectWithAlumni: true,
        canBrowseEcoCampus: true,
        canCreateListing: true,
        canManageListings: true,
        canAccessNotifications: true,
        canAccessSettings: true,
        canAccessOnboarding: true,
        canViewHomeFeed: true,
        canCreatePost: true,
        canLikeCommentShare: true,
        canSaveBookmarks: true,
        canMessage: true,
        canSearch: true,
        canBrowseJobs: true,
        canApplyToJobs: true,
        canPostJobs: false,
        canSaveJobs: true,
        canUseAIJobMatching: true,
        canViewAlumniJobsTab: true,
        canAccessSkillAnalysis: true,
        canViewSkillGapAnalysis: true,
        canViewJobFitScoring: true,
        canViewPeerComparison: true,
        canViewTrendingSkills: true,
        canBrowseMentors: true,
        canRequestMentorship: true,
        canOfferMentorship: false,
        canManageMentorshipRequests: false,
      };

    case 'Alumni':
      return {
        canViewProjects: true,
        canCreateProjects: true,
        canApplyToProjects: true,
        canManageProjectTeam: true,
        canViewClubs: true,
        canJoinClub: false,
        canFollowClub: true,
        canManageClub: false,
        canViewEvents: true,
        canAttendEvents: true,
        canCreateEvents: false,
        canManageEvents: false,
        canViewAlumniDirectory: true,
        canConnectWithAlumni: true,
        canBrowseEcoCampus: false,
        canCreateListing: false,
        canManageListings: false,
        canAccessNotifications: true,
        canAccessSettings: true,
        canAccessOnboarding: true,
        canViewHomeFeed: true,
        canCreatePost: true,
        canLikeCommentShare: true,
        canSaveBookmarks: true,
        canMessage: true,
        canSearch: true,
        canBrowseJobs: true,
        canApplyToJobs: true,
        canPostJobs: true,
        canSaveJobs: true,
        canUseAIJobMatching: true,
        canViewAlumniJobsTab: true,
        canAccessSkillAnalysis: true,
        canViewSkillGapAnalysis: true,
        canViewJobFitScoring: true,
        canViewPeerComparison: false,
        canViewTrendingSkills: true,
        canBrowseMentors: true,
        canRequestMentorship: false,
        canOfferMentorship: true,
        canManageMentorshipRequests: true,
      };

    case 'Faculty':
      return {
        canViewProjects: true,
        canCreateProjects: true,
        canApplyToProjects: false,
        canManageProjectTeam: true,
        canViewClubs: true,
        canJoinClub: false,
        canFollowClub: false,
        canManageClub: false,
        canViewEvents: true,
        canAttendEvents: true,
        canCreateEvents: true,
        canManageEvents: true,
        canViewAlumniDirectory: true,
        canConnectWithAlumni: true,
        canBrowseEcoCampus: true,
        canCreateListing: true,
        canManageListings: true,
        canAccessNotifications: true,
        canAccessSettings: true,
        canAccessOnboarding: true,
        canViewHomeFeed: true,
        canCreatePost: true,
        canLikeCommentShare: true,
        canSaveBookmarks: true,
        canMessage: true,
        canSearch: true,
        canBrowseJobs: false,
        canApplyToJobs: false,
        canPostJobs: false,
        canSaveJobs: false,
        canUseAIJobMatching: false,
        canViewAlumniJobsTab: false,
        canAccessSkillAnalysis: false,
        canViewSkillGapAnalysis: false,
        canViewJobFitScoring: false,
        canViewPeerComparison: false,
        canViewTrendingSkills: false,
        canBrowseMentors: true,
        canRequestMentorship: false,
        canOfferMentorship: true,
        canManageMentorshipRequests: true,
      };

    case 'Club':
      return {
        canViewProjects: true,
        canCreateProjects: true,
        canApplyToProjects: false,
        canManageProjectTeam: true,
        canViewClubs: true,
        canJoinClub: false,
        canFollowClub: false,
        canManageClub: true,
        canViewEvents: true,
        canAttendEvents: true,
        canCreateEvents: true,
        canManageEvents: true,
        canViewAlumniDirectory: false,
        canConnectWithAlumni: false,
        canBrowseEcoCampus: false,
        canCreateListing: false,
        canManageListings: false,
        canAccessNotifications: true,
        canAccessSettings: true,
        canAccessOnboarding: true,
        canViewHomeFeed: true,
        canCreatePost: true,
        canLikeCommentShare: true,
        canSaveBookmarks: false,
        canMessage: true,
        canSearch: true,
        canBrowseJobs: false,
        canApplyToJobs: false,
        canPostJobs: false,
        canSaveJobs: false,
        canUseAIJobMatching: false,
        canViewAlumniJobsTab: false,
        canAccessSkillAnalysis: false,
        canViewSkillGapAnalysis: false,
        canViewJobFitScoring: false,
        canViewPeerComparison: false,
        canViewTrendingSkills: false,
        canBrowseMentors: false,
        canRequestMentorship: false,
        canOfferMentorship: false,
        canManageMentorshipRequests: false,
      };

    default:
      return getDefaultPermissions();
  }
}

/** Check if a specific feature is allowed for a role */
export function canAccessFeature(
  role: string | null | undefined,
  feature: keyof FeaturePermissions
): boolean {
  return getFeaturePermissions(role)[feature];
}

/** Route permission mapping — returns true if the route is accessible for the role */
export function canAccessRoute(
  role: string | null | undefined,
  routePath: string
): boolean {
  const permissions = getFeaturePermissions(role);
  const profileType = normalizeProfileType(role);
  if (!profileType) return false;

  const normalizedPath = routePath.split('?')[0].replace(/\/+$/, '');

  switch (normalizedPath) {
    case '/projects':
      return permissions.canViewProjects;
    case '/clubs':
      return permissions.canViewClubs;
    case '/events':
    case '/event':
      return permissions.canViewEvents;
    case '/alumni-directory':
      return permissions.canViewAlumniDirectory;
    case '/ecocampus':
      return permissions.canBrowseEcoCampus;
    case '/jobs':
      return permissions.canBrowseJobs;
    case '/saved':
      return permissions.canSaveBookmarks;
    case '/skill-analysis':
      return permissions.canAccessSkillAnalysis;
    case '/mentorship':
      return permissions.canBrowseMentors;
    case '/settings':
      return permissions.canAccessSettings;
    case '/home':
    case '/network':
    case '/messaging':
    case '/search':
    case '/profile':
    case '/help':
      return true;
    default:
      if (normalizedPath.startsWith('/jobs/')) return permissions.canBrowseJobs;
      if (normalizedPath.startsWith('/event/')) return permissions.canViewEvents;
      if (normalizedPath.startsWith('/events/')) return permissions.canViewEvents;
      if (normalizedPath.startsWith('/post/')) return true;
      if (normalizedPath.startsWith('/profile/')) return true;
      return true;
  }
}

/** Get list of nav items that should be hidden for a role */
export function getHiddenNavItems(role: string | null | undefined): string[] {
  const permissions = getFeaturePermissions(role);
  const hidden: string[] = [];

  if (!permissions.canBrowseJobs) hidden.push('jobs');
  if (!permissions.canSaveBookmarks) hidden.push('saved');
  if (!permissions.canAccessSkillAnalysis) hidden.push('skill-analysis');
  if (!permissions.canBrowseMentors) hidden.push('mentorship');
  if (!permissions.canViewAlumniDirectory) hidden.push('alumni-directory');
  if (!permissions.canBrowseEcoCampus) hidden.push('ecocampus');
  if (!permissions.canViewProjects) hidden.push('projects');
  if (!permissions.canViewClubs) hidden.push('clubs');
  if (!permissions.canViewEvents) hidden.push('events');

  return hidden;
}

/** Check if a user can perform a project-related action */
export function canPerformProjectAction(
  role: string | null | undefined,
  action: 'view' | 'create' | 'apply' | 'manage'
): boolean {
  const permissions = getFeaturePermissions(role);
  switch (action) {
    case 'view': return permissions.canViewProjects;
    case 'create': return permissions.canCreateProjects;
    case 'apply': return permissions.canApplyToProjects;
    case 'manage': return permissions.canManageProjectTeam;
    default: return false;
  }
}

/** Check if a user can perform a club-related action */
export function canPerformClubAction(
  role: string | null | undefined,
  action: 'view' | 'join' | 'follow' | 'manage'
): boolean {
  const permissions = getFeaturePermissions(role);
  switch (action) {
    case 'view': return permissions.canViewClubs;
    case 'join': return permissions.canJoinClub;
    case 'follow': return permissions.canFollowClub;
    case 'manage': return permissions.canManageClub;
    default: return false;
  }
}

/** Check if a user can perform an event-related action */
export function canPerformEventAction(
  role: string | null | undefined,
  action: 'view' | 'attend' | 'create' | 'manage'
): boolean {
  const permissions = getFeaturePermissions(role);
  switch (action) {
    case 'view': return permissions.canViewEvents;
    case 'attend': return permissions.canAttendEvents;
    case 'create': return permissions.canCreateEvents;
    case 'manage': return permissions.canManageEvents;
    default: return false;
  }
}

/** Check if a user can perform an EcoCampus-related action */
export function canPerformEcoCampusAction(
  role: string | null | undefined,
  action: 'browse' | 'create' | 'manage'
): boolean {
  const permissions = getFeaturePermissions(role);
  switch (action) {
    case 'browse': return permissions.canBrowseEcoCampus;
    case 'create': return permissions.canCreateListing;
    case 'manage': return permissions.canManageListings;
    default: return false;
  }
}

/** Check if a user can perform a job-related action */
export function canPerformJobAction(
  role: string | null | undefined,
  action: 'browse' | 'apply' | 'post' | 'save'
): boolean {
  const permissions = getFeaturePermissions(role);
  switch (action) {
    case 'browse': return permissions.canBrowseJobs;
    case 'apply': return permissions.canApplyToJobs;
    case 'post': return permissions.canPostJobs;
    case 'save': return permissions.canSaveJobs;
    default: return false;
  }
}

/** Check if a user can perform a mentorship-related action */
export function canPerformMentorshipAction(
  role: string | null | undefined,
  action: 'browse' | 'request' | 'offer' | 'manage'
): boolean {
  const permissions = getFeaturePermissions(role);
  switch (action) {
    case 'browse': return permissions.canBrowseMentors;
    case 'request': return permissions.canRequestMentorship;
    case 'offer': return permissions.canOfferMentorship;
    case 'manage': return permissions.canManageMentorshipRequests;
    default: return false;
  }
}
