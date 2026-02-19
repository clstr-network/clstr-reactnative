/**
 * Feature-based Permission System
 * 
 * This module implements the FINAL Feature × Profile Matrix
 * for the 4 supported profile types: Student, Alumni, Faculty, Club
 * 
 * Rules:
 * - If a feature is 🚫 for a role: hide from nav, block route access, remove from UI
 * - Organization role is deprecated and maps to Alumni
 * 
 * FINAL Feature × Profile Matrix (February 2026):
 * 
 * 5. Projects / CollabHub
 * | Feature                    | Student | Alumni | Faculty | Club |
 * |----------------------------|---------|--------|---------|------|
 * | View Projects              | ✅      | ✅     | ✅      | ✅   |
 * | Create Projects            | ✅      | ✅     | ✅      | ✅   |
 * | Apply to Projects          | ✅      | ✅     | 🚫      | 🚫   |
 * | Manage Team / Applications | ✅      | ✅     | ✅      | ✅   |
 * 
 * 6. Clubs
 * | Feature       | Student | Alumni | Faculty | Club |
 * |---------------|---------|--------|---------|------|
 * | View Clubs    | ✅      | ✅     | ✅      | ✅   |
 * | Join Club     | ✅      | 🚫     | 🚫      | 🚫   |
 * | Follow Club   | 🚫      | ✅     | 🚫      | 🚫   |
 * | Manage Club   | 🚫      | 🚫     | 🚫      | ✅   |
 * 
 * 7. Events
 * | Feature       | Student | Alumni | Faculty | Club |
 * |---------------|---------|--------|---------|------|
 * | View Events   | ✅      | ✅     | ✅      | ✅   |
 * | Attend / RSVP | ✅      | ✅     | ✅      | ✅   |
 * | Create Events | 🚫      | 🚫     | ✅      | ✅   |
 * | Manage Events | 🚫      | 🚫     | ✅      | ✅   |
 * 
 * 8. Alumni Directory
 * | Feature                | Student | Alumni | Faculty | Club |
 * |------------------------|---------|--------|---------|------|
 * | View Alumni Directory  | ✅      | ✅     | ✅      | 🚫   |
 * | Connect with Alumni    | ✅      | ✅     | ✅      | 🚫   |
 * 
 * 9. EcoCampus (Marketplace)
 * | Feature         | Student | Alumni | Faculty | Club |
 * |-----------------|---------|--------|---------|------|
 * | Browse Listings | ✅      | 🚫     | ✅      | 🚫   |
 * | Create Listing  | ✅      | 🚫     | ✅      | 🚫   |
 * | Manage Listings | ✅      | 🚫     | ✅      | 🚫   |
 * 
 * 10. System & Settings
 * | Feature       | Student | Alumni | Faculty | Club |
 * |---------------|---------|--------|---------|------|
 * | Notifications | ✅      | ✅     | ✅      | ✅   |
 * | Settings      | ✅      | ✅     | ✅      | ✅   |
 * | Onboarding    | ✅      | ✅     | ✅      | ✅   |
 */

export type ProfileType = 'Student' | 'Alumni' | 'Faculty' | 'Club';

// Maps any role string to one of the 4 canonical types
export function normalizeProfileType(role: string | null | undefined): ProfileType | null {
  if (!role) return null;
  
  switch (role) {
    case 'Student':
      return 'Student';
    case 'Alumni':
    case 'Organization': // Map deprecated Organization to Alumni
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

/**
 * Complete Feature Permissions Matrix
 * Based on the FINAL Feature × Profile Matrix (Sections 5-10)
 */
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

/**
 * Get all feature permissions for a profile type
 */
export function getFeaturePermissions(role: string | null | undefined): FeaturePermissions {
  const profileType = normalizeProfileType(role);
  
  // Default: deny all for unknown/null roles
  if (!profileType) {
    return getDefaultPermissions();
  }

  // Build permissions based on the FINAL matrix
  switch (profileType) {
    case 'Student':
      return {
        // 5. Projects / CollabHub
        canViewProjects: true,
        canCreateProjects: true,
        canApplyToProjects: true, // ✅
        canManageProjectTeam: true,

        // 6. Clubs
        canViewClubs: true,
        canJoinClub: true, // ✅ Students can join
        canFollowClub: false, // 🚫 Only Alumni can follow
        canManageClub: false,

        // 7. Events
        canViewEvents: true,
        canAttendEvents: true,
        canCreateEvents: false, // 🚫 Only Faculty/Club
        canManageEvents: false, // 🚫 Only Faculty/Club

        // 8. Alumni Directory
        canViewAlumniDirectory: true,
        canConnectWithAlumni: true,

        // 9. EcoCampus
        canBrowseEcoCampus: true,
        canCreateListing: true,
        canManageListings: true,

        // 10. System & Settings
        canAccessNotifications: true,
        canAccessSettings: true,
        canAccessOnboarding: true,

        // Legacy - Core Platform & Social
        canViewHomeFeed: true,
        canCreatePost: true,
        canLikeCommentShare: true,
        canSaveBookmarks: true,
        canMessage: true,
        canSearch: true,

        // Legacy - Jobs & Careers
        canBrowseJobs: true,
        canApplyToJobs: true,
        canPostJobs: false, // 🚫
        canSaveJobs: true,
        canUseAIJobMatching: true,
        canViewAlumniJobsTab: true,

        // Legacy - Skill Analysis
        canAccessSkillAnalysis: true,
        canViewSkillGapAnalysis: true,
        canViewJobFitScoring: true,
        canViewPeerComparison: true, // Only Students
        canViewTrendingSkills: true,

        // Legacy - Mentorship
        canBrowseMentors: true,
        canRequestMentorship: true,
        canOfferMentorship: false, // 🚫
        canManageMentorshipRequests: false, // 🚫
      };

    case 'Alumni':
      return {
        // 5. Projects / CollabHub
        canViewProjects: true,
        canCreateProjects: true,
        canApplyToProjects: true, // ✅
        canManageProjectTeam: true,

        // 6. Clubs
        canViewClubs: true,
        canJoinClub: false, // 🚫 Alumni cannot join
        canFollowClub: true, // ✅ Only Alumni can follow
        canManageClub: false,

        // 7. Events
        canViewEvents: true,
        canAttendEvents: true,
        canCreateEvents: false, // 🚫 Only Faculty/Club
        canManageEvents: false, // 🚫 Only Faculty/Club

        // 8. Alumni Directory
        canViewAlumniDirectory: true,
        canConnectWithAlumni: true,

        // 9. EcoCampus
        canBrowseEcoCampus: false, // 🚫
        canCreateListing: false, // 🚫
        canManageListings: false, // 🚫

        // 10. System & Settings
        canAccessNotifications: true,
        canAccessSettings: true,
        canAccessOnboarding: true,

        // Legacy - Core Platform & Social
        canViewHomeFeed: true,
        canCreatePost: true,
        canLikeCommentShare: true,
        canSaveBookmarks: true,
        canMessage: true,
        canSearch: true,

        // Legacy - Jobs & Careers
        canBrowseJobs: true,
        canApplyToJobs: true,
        canPostJobs: true, // ✅ Alumni can post jobs
        canSaveJobs: true,
        canUseAIJobMatching: true,
        canViewAlumniJobsTab: true,

        // Legacy - Skill Analysis
        canAccessSkillAnalysis: true,
        canViewSkillGapAnalysis: true,
        canViewJobFitScoring: true,
        canViewPeerComparison: false, // 🚫
        canViewTrendingSkills: true,

        // Legacy - Mentorship
        canBrowseMentors: true,
        canRequestMentorship: false, // 🚫
        canOfferMentorship: true,
        canManageMentorshipRequests: true,
      };

    case 'Faculty':
      return {
        // 5. Projects / CollabHub
        canViewProjects: true,
        canCreateProjects: true,
        canApplyToProjects: false, // 🚫
        canManageProjectTeam: true,

        // 6. Clubs
        canViewClubs: true,
        canJoinClub: false, // 🚫
        canFollowClub: false, // 🚫
        canManageClub: false,

        // 7. Events
        canViewEvents: true,
        canAttendEvents: true,
        canCreateEvents: true, // ✅
        canManageEvents: true, // ✅

        // 8. Alumni Directory
        canViewAlumniDirectory: true,
        canConnectWithAlumni: true,

        // 9. EcoCampus
        canBrowseEcoCampus: true, // ✅
        canCreateListing: true, // ✅
        canManageListings: true, // ✅

        // 10. System & Settings
        canAccessNotifications: true,
        canAccessSettings: true,
        canAccessOnboarding: true,

        // Legacy - Core Platform & Social
        canViewHomeFeed: true,
        canCreatePost: true,
        canLikeCommentShare: true,
        canSaveBookmarks: true,
        canMessage: true,
        canSearch: true,

        // Legacy - Jobs & Careers (All 🚫)
        canBrowseJobs: false,
        canApplyToJobs: false,
        canPostJobs: false,
        canSaveJobs: false,
        canUseAIJobMatching: false,
        canViewAlumniJobsTab: false,

        // Legacy - Skill Analysis (All 🚫)
        canAccessSkillAnalysis: false,
        canViewSkillGapAnalysis: false,
        canViewJobFitScoring: false,
        canViewPeerComparison: false,
        canViewTrendingSkills: false,

        // Legacy - Mentorship
        canBrowseMentors: true,
        canRequestMentorship: false, // 🚫
        canOfferMentorship: true,
        canManageMentorshipRequests: true,
      };

    case 'Club':
      return {
        // 5. Projects / CollabHub
        canViewProjects: true,
        canCreateProjects: true,
        canApplyToProjects: false, // 🚫
        canManageProjectTeam: true,

        // 6. Clubs
        canViewClubs: true,
        canJoinClub: false, // 🚫
        canFollowClub: false, // 🚫
        canManageClub: true, // ✅ Club can manage itself

        // 7. Events
        canViewEvents: true,
        canAttendEvents: true,
        canCreateEvents: true, // ✅
        canManageEvents: true, // ✅

        // 8. Alumni Directory
        canViewAlumniDirectory: false, // 🚫
        canConnectWithAlumni: false, // 🚫

        // 9. EcoCampus
        canBrowseEcoCampus: false, // 🚫
        canCreateListing: false, // 🚫
        canManageListings: false, // 🚫

        // 10. System & Settings
        canAccessNotifications: true,
        canAccessSettings: true,
        canAccessOnboarding: true,

        // Legacy - Core Platform & Social
        canViewHomeFeed: true,
        canCreatePost: true,
        canLikeCommentShare: true,
        canSaveBookmarks: false, // 🚫
        canMessage: true,
        canSearch: true,

        // Legacy - Jobs & Careers (All 🚫)
        canBrowseJobs: false,
        canApplyToJobs: false,
        canPostJobs: false,
        canSaveJobs: false,
        canUseAIJobMatching: false,
        canViewAlumniJobsTab: false,

        // Legacy - Skill Analysis (All 🚫)
        canAccessSkillAnalysis: false,
        canViewSkillGapAnalysis: false,
        canViewJobFitScoring: false,
        canViewPeerComparison: false,
        canViewTrendingSkills: false,

        // Legacy - Mentorship (All 🚫)
        canBrowseMentors: false,
        canRequestMentorship: false,
        canOfferMentorship: false,
        canManageMentorshipRequests: false,
      };

    default:
      return getDefaultPermissions();
  }
}

/**
 * Default permissions (all denied)
 */
function getDefaultPermissions(): FeaturePermissions {
  return {
    // New permissions
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
    // Legacy permissions
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

/**
 * Check if a specific feature is allowed for a role
 */
export function canAccessFeature(
  role: string | null | undefined,
  feature: keyof FeaturePermissions
): boolean {
  return getFeaturePermissions(role)[feature];
}

/**
 * Route permission mapping
 * Returns true if the route should be accessible for the given role
 */
export function canAccessRoute(
  role: string | null | undefined,
  routePath: string
): boolean {
  const permissions = getFeaturePermissions(role);
  const profileType = normalizeProfileType(role);
  
  // No role = only public routes allowed
  if (!profileType) {
    return false;
  }

  // Normalize route path (remove trailing slashes and parameters)
  const normalizedPath = routePath.split('?')[0].replace(/\/+$/, '');

  // Route permission mapping based on FINAL matrix
  switch (normalizedPath) {
    // Projects / CollabHub - all can view
    case '/projects':
      return permissions.canViewProjects;

    // Clubs - all can view
    case '/clubs':
      return permissions.canViewClubs;

    // Events - all can view
    case '/events':
    case '/event':
      return permissions.canViewEvents;

    // Alumni Directory - Club cannot access
    case '/alumni-directory':
      return permissions.canViewAlumniDirectory;

    // EcoCampus - Alumni and Club cannot access
    case '/ecocampus':
      return permissions.canBrowseEcoCampus;

    // Jobs routes - blocked for Faculty and Club
    case '/jobs':
      return permissions.canBrowseJobs;

    // Saved items - blocked for Club
    case '/saved':
      return permissions.canSaveBookmarks;

    // Skill analysis - blocked for Faculty and Club
    case '/skill-analysis':
      return permissions.canAccessSkillAnalysis;

    // Mentorship - blocked for Club
    case '/mentorship':
      return permissions.canBrowseMentors;

    // Settings - all can access
    case '/settings':
      return permissions.canAccessSettings;

    // Core routes - available to all authenticated users
    case '/home':
    case '/network':
    case '/messaging':
    case '/search':
    case '/profile':
    case '/help':
      return true;

    default:
      // For dynamic routes like /jobs/:id, /event/:id, /profile/:id
      if (normalizedPath.startsWith('/jobs/')) {
        return permissions.canBrowseJobs;
      }
      if (normalizedPath.startsWith('/event/')) {
        return permissions.canViewEvents;
      }
      if (normalizedPath.startsWith('/events/')) {
        return permissions.canViewEvents;
      }
      if (normalizedPath.startsWith('/post/')) {
        return true; // Posts are public
      }
      if (normalizedPath.startsWith('/profile/')) {
        return true; // Profiles are viewable by all authenticated users
      }
      
      // For any other routes, allow access if authenticated
      return true;
  }
}

/**
 * Get list of nav items that should be hidden for a role
 * Based on the FINAL Feature × Profile Matrix
 */
export function getHiddenNavItems(role: string | null | undefined): string[] {
  const permissions = getFeaturePermissions(role);
  const hidden: string[] = [];

  // Jobs - Student 🚫 (now allowed per legacy matrix)
  if (!permissions.canBrowseJobs) {
    hidden.push('jobs');
  }

  // Saved/Bookmarks
  if (!permissions.canSaveBookmarks) {
    hidden.push('saved');
  }

  // Skill Analysis - Alumni 🚫, Club 🚫
  if (!permissions.canAccessSkillAnalysis) {
    hidden.push('skill-analysis');
  }

  // Mentorship - Club 🚫
  if (!permissions.canBrowseMentors) {
    hidden.push('mentorship');
  }

  // Alumni Directory - Club 🚫
  if (!permissions.canViewAlumniDirectory) {
    hidden.push('alumni-directory');
  }

  // EcoCampus - Alumni 🚫, Club 🚫
  if (!permissions.canBrowseEcoCampus) {
    hidden.push('ecocampus');
  }
  
  // Projects - always visible for all roles per FINAL matrix
  if (!permissions.canViewProjects) {
    hidden.push('projects');
  }
  
  // Clubs - always visible for all roles per FINAL matrix
  if (!permissions.canViewClubs) {
    hidden.push('clubs');
  }
  
  // Events - always visible for all roles per FINAL matrix  
  if (!permissions.canViewEvents) {
    hidden.push('events');
  }

  return hidden;
}

/**
 * Check if a user can perform a project-related action
 */
export function canPerformProjectAction(
  role: string | null | undefined,
  action: 'view' | 'create' | 'apply' | 'manage'
): boolean {
  const permissions = getFeaturePermissions(role);
  
  switch (action) {
    case 'view':
      return permissions.canViewProjects;
    case 'create':
      return permissions.canCreateProjects;
    case 'apply':
      return permissions.canApplyToProjects;
    case 'manage':
      return permissions.canManageProjectTeam;
    default:
      return false;
  }
}

/**
 * Check if a user can perform a club-related action
 */
export function canPerformClubAction(
  role: string | null | undefined,
  action: 'view' | 'join' | 'follow' | 'manage'
): boolean {
  const permissions = getFeaturePermissions(role);
  
  switch (action) {
    case 'view':
      return permissions.canViewClubs;
    case 'join':
      return permissions.canJoinClub;
    case 'follow':
      return permissions.canFollowClub;
    case 'manage':
      return permissions.canManageClub;
    default:
      return false;
  }
}

/**
 * Check if a user can perform an event-related action
 */
export function canPerformEventAction(
  role: string | null | undefined,
  action: 'view' | 'attend' | 'create' | 'manage'
): boolean {
  const permissions = getFeaturePermissions(role);
  
  switch (action) {
    case 'view':
      return permissions.canViewEvents;
    case 'attend':
      return permissions.canAttendEvents;
    case 'create':
      return permissions.canCreateEvents;
    case 'manage':
      return permissions.canManageEvents;
    default:
      return false;
  }
}

/**
 * Check if a user can perform an EcoCampus-related action
 */
export function canPerformEcoCampusAction(
  role: string | null | undefined,
  action: 'browse' | 'create' | 'manage'
): boolean {
  const permissions = getFeaturePermissions(role);
  
  switch (action) {
    case 'browse':
      return permissions.canBrowseEcoCampus;
    case 'create':
      return permissions.canCreateListing;
    case 'manage':
      return permissions.canManageListings;
    default:
      return false;
  }
}

/**
 * Check if a user can perform a job-related action
 */
export function canPerformJobAction(
  role: string | null | undefined,
  action: 'browse' | 'apply' | 'post' | 'save'
): boolean {
  const permissions = getFeaturePermissions(role);
  
  switch (action) {
    case 'browse':
      return permissions.canBrowseJobs;
    case 'apply':
      return permissions.canApplyToJobs;
    case 'post':
      return permissions.canPostJobs;
    case 'save':
      return permissions.canSaveJobs;
    default:
      return false;
  }
}

/**
 * Check if a user can perform a mentorship-related action
 */
export function canPerformMentorshipAction(
  role: string | null | undefined,
  action: 'browse' | 'request' | 'offer' | 'manage'
): boolean {
  const permissions = getFeaturePermissions(role);
  
  switch (action) {
    case 'browse':
      return permissions.canBrowseMentors;
    case 'request':
      return permissions.canRequestMentorship;
    case 'offer':
      return permissions.canOfferMentorship;
    case 'manage':
      return permissions.canManageMentorshipRequests;
    default:
      return false;
  }
}

export default {
  normalizeProfileType,
  getFeaturePermissions,
  canAccessFeature,
  canAccessRoute,
  getHiddenNavItems,
  canPerformProjectAction,
  canPerformClubAction,
  canPerformEventAction,
  canPerformEcoCampusAction,
  canPerformJobAction,
  canPerformMentorshipAction,
};
