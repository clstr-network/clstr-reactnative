/**
 * Centralised Supabase Realtime channel-name catalogue
 * ─────────────────────────────────────────────────────
 * Every `.channel(name)` call MUST reference a factory from here
 * so web ↔ mobile stay in sync and name-drift is impossible.
 */

// ── Admin ────────────────────────────────────────────────────────────────────
export const ADMIN_CHANNELS = {
  alumniInvites: () => 'admin-alumni-invites-realtime',
  platformAdmins: () => 'platform_admins_changes',
  systemAlerts: () => 'system_alerts_changes',
  recruiterAccounts: () => 'recruiter_accounts_changes',
  analytics: () => 'admin_analytics_realtime',
  analyticsSnapshot: () => 'admin_analytics_snapshot_realtime',
  collab: () => 'admin_collab_realtime',
  colleges: () => 'admin_colleges_realtime',
  kpis: () => 'admin_kpis_realtime',
  systemAlertsRealtime: () => 'system_alerts_realtime',
  userGrowth: (days: number) => `admin_user_growth_${days}`,
  collegeDistribution: () => 'admin_college_distribution_realtime',
  domains: () => 'admin_domains_realtime',
  recruiters: () => 'admin_recruiters_realtime',
  reports: () => 'admin_reports_realtime',
  settings: () => 'admin_settings_realtime',
  systemInfo: () => 'admin_system_info_realtime',
  maintenanceMode: () => 'admin_maintenance_mode_realtime',
  talentGraph: () => 'admin_talent_graph_realtime',
  teamUps: () => 'admin_team_ups_realtime',
  users: () => 'admin_users_realtime',
} as const;

// ── Feed / Posts ─────────────────────────────────────────────────────────────
export const FEED_CHANNELS = {
  homeFeed: () => 'home-feed',
  homeFeedUser: (userId: string) => `home-feed-${userId}`,
  inlineComments: (postId: string) => `inline-comments-${postId}`,
  postDetail: (postId: string) => `post-detail-${postId}`,
} as const;

// ── Social / Messaging ──────────────────────────────────────────────────────
export const SOCIAL_CHANNELS = {
  alumniDirectoryConnections: (userId: string) => `alumni-directory-connections-${userId}`,
  alumniDirectoryProfiles: (domain: string) => `alumni-directory-profiles-${domain}`,
  alumniDirectoryAlumniProfiles: (domain: string) => `alumni-directory-alumni-profiles-${domain}`,
  connectionsCount: (userId: string) => `connections-count-${userId}`,
  messagesUser: (userId: string) => `messages:user:${userId}`,
  messagingPartner: (partnerId: string) => `messaging-partner-${partnerId}`,
  networkConnections: (userId: string) => `network-connections-${userId}`,
  notificationsRealtime: (userId: string) => `notifications-realtime-${userId}`,
  trendingConnections: (userId: string) => `trending-connections-${userId}`,
  trendingTopics: () => 'trending-topics-changes',
  messagesReceiver: (userId: string) => `messages:receiver_id=eq.${userId}`,
  profileConnections: (profileId: string) => `profile-connections-${profileId}`,
  profileConnectionsUpdates: (profileId: string) => `profile-connections-updates-${profileId}`,
} as const;

// ── Profile ──────────────────────────────────────────────────────────────────
export const PROFILE_CHANNELS = {
  stats: (userId: string) => `profile-stats-${userId}`,
  view: (userId: string) => `profile-view-${userId}`,
  profiles: (userId: string) => `profiles-${userId}`,
  profilesDomain: (domain: string) => `profiles-domain-${domain}`,
  education: (profileId: string) => `profile-education-${profileId}`,
  experience: (profileId: string) => `profile-experience-${profileId}`,
  posts: (profileId: string) => `profile-posts-${profileId}`,
  skills: (profileId: string) => `profile-skills-${profileId}`,
  roleProfile: (table: string, userId: string) => `role-profile-${table}-${userId}`,
} as const;

// ── Events / Clubs ──────────────────────────────────────────────────────────
export const EVENT_CHANNELS = {
  clubsRealtime: () => 'clubs-realtime',
  eventsRealtime: () => 'events-realtime',
  eventDetail: (eventId: string) => `event-detail-${eventId}`,
  upcoming: (userId: string) => `upcoming-events-${userId}`,
} as const;

// ── Projects / Team-Ups ─────────────────────────────────────────────────────
export const PROJECT_CHANNELS = {
  teamUps: (domain: string, userId: string) => `team-ups-${domain}-${userId}`,
  projects: (domain: string, userId: string) => `projects-${domain}-${userId}`,
} as const;

// ── Jobs ─────────────────────────────────────────────────────────────────────
export const JOB_CHANNELS = {
  realtime: () => 'jobs-realtime',
  detail: (id: string) => `job-${id}`,
} as const;

// ── Marketplace (EcoCampus) ─────────────────────────────────────────────────
export const MARKETPLACE_CHANNELS = {
  userListings: (userId: string) => `ecocampus-${userId}`,
  requestsPublic: () => 'item-requests-public',
  requestsProfiles: () => 'ecocampus-profiles-requests',
  requestResponses: (userId: string) => `item-request-responses-${userId}`,
  sharedItemsProfiles: () => 'ecocampus-profiles-shared-items',
  sharedItemIntents: (userId: string) => `shared-item-intents-${userId}`,
  sharedItemsPublic: () => 'shared-items-public',
  savedItems: (userId: string) => `saved-items-${userId}`,
} as const;

// ── Identity / Settings ─────────────────────────────────────────────────────
export const IDENTITY_CHANNELS = {
  profileRealtime: () => 'identity-profile-realtime',
  pushSubscriptions: (userId: string) => `push_subscriptions:${userId}`,
  skillAnalysis: (userId: string) => `skill_analysis:${userId}`,
  userSettings: (userId: string) => `user_settings:${userId}`,
  aiChatMessages: (sessionId: string) => `ai-chat-messages-${sessionId}`,
} as const;

// ── Mentorship ──────────────────────────────────────────────────────────────
export const MENTORSHIP_CHANNELS = {
  offers: (domain: string) => `mentorship-offers-${domain}`,
  profiles: (domain: string) => `mentorship-profiles-${domain}`,
  requestsMentee: (userId: string) => `mentorship-requests-mentee-${userId}`,
  requestsMentor: (userId: string) => `mentorship-requests-mentor-${userId}`,
  connections: (userId: string) => `mentorship-connections-${userId}`,
} as const;

// ── Portfolio Editor ────────────────────────────────────────────────────────
export const PORTFOLIO_CHANNELS = {
  editor: (table: string, userId: string) => `portfolio-editor-${table}-${userId}`,
  editorProfiles: (userId: string) => `portfolio-editor-profiles-${userId}`,
  editorPosts: (userId: string) => `portfolio-editor-posts-${userId}`,
} as const;

// ── Aggregate export ────────────────────────────────────────────────────────
export const CHANNELS = {
  admin: ADMIN_CHANNELS,
  feed: FEED_CHANNELS,
  social: SOCIAL_CHANNELS,
  profile: PROFILE_CHANNELS,
  events: EVENT_CHANNELS,
  projects: PROJECT_CHANNELS,
  jobs: JOB_CHANNELS,
  marketplace: MARKETPLACE_CHANNELS,
  identity: IDENTITY_CHANNELS,
  mentorship: MENTORSHIP_CHANNELS,
  portfolio: PORTFOLIO_CHANNELS,
} as const;
