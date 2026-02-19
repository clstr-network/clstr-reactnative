/**
 * Centralized query key factory — single source of truth for ALL
 * React Query cache keys used across web and mobile apps.
 *
 * Rules:
 * - Every query key used in a hook MUST reference this file.
 * - Keys are `as const` tuples for type safety.
 * - Parameterized keys are factory functions returning tuples.
 */
export const QUERY_KEYS = {
  // Core
  identity: ['identity-context'] as const,
  feed: ['feed'] as const,
  profile: (id: string) => ['profile', id] as const,
  profilePosts: (id: string) => ['profile-posts', id] as const,
  profileStats: (id: string) => ['profile-stats', id] as const,

  // Messaging
  conversations: ['conversations'] as const,
  chat: (id: string) => ['chat', id] as const,
  connectedUsers: ['connectedUsers'] as const,
  notifications: ['notifications'] as const,
  unreadMessages: ['unread-messages'] as const,

  // Events & Jobs
  events: ['events'] as const,
  jobs: ['jobs'] as const,
  savedJobs: ['saved-jobs'] as const,

  // Projects & TeamUps
  projects: ['projects'] as const,
  teamUps: ['team-ups'] as const,

  // Network
  network: ['network'] as const,
  connections: (id: string) => ['connections', id] as const,

  // Settings & User
  userSettings: (id: string) => ['userSettings', id] as const,
  skillAnalysis: (id: string) => ['skillAnalysis', id] as const,
  pushSubscription: (id: string) => ['push-subscription', id] as const,

  // Portfolio
  portfolioSettings: (id: string) => ['portfolio-settings', id] as const,
  portfolioEditorProfile: (id: string) => ['portfolio-editor-profile', id] as const,
  portfolioResolve: ['portfolio-resolve'] as const,
  portfolioProfile: ['portfolio-profile'] as const,

  // Mentorship
  mentorship: {
    mentors: (domain: string) => ['mentorship', 'mentors', domain] as const,
    myRequests: (id: string) => ['mentorship', 'myRequests', id] as const,
    incomingRequests: (id: string) => ['mentorship', 'incomingRequests', id] as const,
    activeRelationships: (id: string) => ['mentorship', 'active', id] as const,
    completedRelationships: (id: string) => ['mentorship', 'completed', id] as const,
    myOffer: (id: string) => ['mentorship', 'myOffer', id] as const,
  },

  // Clubs
  clubs: ['clubs'] as const,

  // Alumni
  alumniInvites: ['alumni-invites'] as const,

  // AI Chat
  aiChatSessions: ['ai-chat-sessions'] as const,
  aiChatMessages: (sessionId: string) => ['ai-chat-messages', sessionId] as const,

  // Saved items
  savedItems: (id: string) => ['saved-items', id] as const,
  savedProjectIds: (id: string) => ['saved-project-ids', id] as const,

  // Typeahead
  typeahead: (query: string, domain: string) => ['typeahead', query, domain] as const,

  // Admin (keep prefixed)
  admin: {
    users: ['admin', 'users'] as const,
    colleges: ['admin', 'colleges'] as const,
    domains: ['admin', 'domains'] as const,
    dashboard: ['admin', 'dashboard'] as const,
    kpis: ['admin', 'kpis'] as const,
    alerts: ['admin', 'alerts'] as const,
    userGrowth: (days: number) => ['admin', 'user-growth', days] as const,
    collegeDistribution: ['admin', 'college-distribution'] as const,
    recruiters: ['admin', 'recruiters'] as const,
    settings: ['admin', 'settings'] as const,
    systemInfo: ['admin', 'system-info'] as const,
    maintenance: ['admin', 'maintenance'] as const,
    reports: ['admin', 'reports'] as const,
    collabHub: ['admin', 'collab-hub'] as const,
    teamUps: ['admin', 'team-ups'] as const,
    talentGraph: ['admin', 'talent-graph'] as const,
    analytics: ['admin', 'analytics'] as const,
    alumniInvites: ['admin', 'alumni-invites'] as const,
  },
} as const;
