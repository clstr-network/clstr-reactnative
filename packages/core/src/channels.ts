/**
 * Centralized realtime channel name generators.
 * Single source of truth — every .channel() call in hooks/pages
 * MUST reference a generator from this file.
 */
export const CHANNELS = {
  // User-scoped
  messages: (userId: string) => `messages:user:${userId}`,
  userSettings: (userId: string) => `user_settings:${userId}`,
  skillAnalysis: (userId: string) => `skill_analysis:${userId}`,
  pushSubscriptions: (userId: string) => `push_subscriptions:${userId}`,
  profileIdentity: () => 'identity-profile-realtime',

  // Content-scoped
  homeFeed: (userId: string) => `home-feed-${userId}`,
  homeFeedGlobal: () => 'home-feed',
  connectionsCount: (userId: string) => `connections-count-${userId}`,
  savedItems: (userId: string) => `saved-items-${userId}`,
  postDetail: (postId: string) => `post-detail-${postId}`,

  // Events
  eventsRealtime: () => 'events-realtime',
  eventDetail: (eventId: string) => `event-detail-${eventId}`,

  // Jobs
  jobsRealtime: () => 'jobs-realtime',
  jobDetail: (jobId: string) => `job-${jobId}`,

  // Projects
  projects: (domain: string, userId: string) => `projects-${domain}-${userId}`,
  projectDetail: (projectId: string) => `project-detail-${projectId}`,
  teamUps: (domain: string, userId: string) => `team-ups-${domain}-${userId}`,

  // Network
  networkConnections: (userId: string) => `network-connections-${userId}`,

  // Profile
  profileStats: (userId: string) => `profile-stats-${userId}`,
  profileView: (userId: string) => `profile-view-${userId}`,

  // Messaging
  messagingPartner: (partnerId: string) => `messaging-partner-${partnerId}`,

  // Clubs
  clubsRealtime: () => 'clubs-realtime',

  // Alumni
  alumniDirectoryConnections: (userId: string) => `alumni-directory-connections-${userId}`,
  alumniDirectoryProfiles: (domain: string) => `alumni-directory-profiles-${domain}`,
  alumniDirectoryAlumniProfiles: (domain: string) => `alumni-directory-alumni-profiles-${domain}`,

  // Trending
  trendingTopics: () => 'trending-topics-changes',

  // Mentorship
  mentorshipOffers: (domain: string) => `mentorship-offers-${domain}`,
  mentorshipProfiles: (domain: string) => `mentorship-profiles-${domain}`,
  mentorshipRequestsMentee: (userId: string) => `mentorship-requests-mentee-${userId}`,
  mentorshipRequestsMentor: (userId: string) => `mentorship-requests-mentor-${userId}`,
  mentorshipConnections: (userId: string) => `mentorship-connections-${userId}`,

  // Portfolio
  portfolioEditor: (table: string, userId: string) => `portfolio-editor-${table}-${userId}`,
  portfolioEditorProfiles: (userId: string) => `portfolio-editor-profiles-${userId}`,
  portfolioEditorPosts: (userId: string) => `portfolio-editor-posts-${userId}`,

  // AI Chat
  aiChatMessages: (sessionId: string) => `ai-chat-messages-${sessionId}`,

  // Admin
  admin: {
    platformAdmins: () => 'platform_admins_changes',
    systemAlerts: () => 'system_alerts_changes',
    recruiterAccounts: () => 'recruiter_accounts_changes',
    collabRealtime: () => 'admin_collab_realtime',
    kpisRealtime: () => 'admin_kpis_realtime',
    alertsRealtime: () => 'system_alerts_realtime',
    userGrowth: (days: number) => `admin_user_growth_${days}`,
    collegeDistribution: () => 'admin_college_distribution_realtime',
    recruitersRealtime: () => 'admin_recruiters_realtime',
    settingsRealtime: () => 'admin_settings_realtime',
    systemInfoRealtime: () => 'admin_system_info_realtime',
    maintenanceRealtime: () => 'admin_maintenance_mode_realtime',
    teamUpsRealtime: () => 'admin_team_ups_realtime',
    usersRealtime: () => 'admin_users_realtime',
    alumniInvitesRealtime: () => 'admin-alumni-invites-realtime',
  },
} as const;
