/**
 * Centralised query-key catalogue for @clstr/shared
 * ──────────────────────────────────────────────────
 * Every useQuery / useInfiniteQuery / invalidateQueries / setQueryData call
 * MUST import its key from here so web ↔ mobile stay in sync and typo-drift
 * is impossible.
 *
 * Convention:
 *   • Static keys  → readonly tuple  (e.g. `['admin-kpis'] as const`)
 *   • Factory keys → function → tuple (e.g. `(id: string) => ['profile', id] as const`)
 */

import { MENTORSHIP_QUERY_KEYS } from './types/mentorship';

// ── Identity ──────────────────────────────────────────────────────────────────
const identity = {
  context: () => ['identity-context'] as const,
  inviteOpsStats: () => ['invite-ops-stats'] as const,
} as const;

// ── Profile ───────────────────────────────────────────────────────────────────
const profile = {
  all: () => ['profile'] as const,
  detail: (userId: string) => ['profile', userId] as const,
  posts: (userId: string) => ['profile-posts', userId] as const,
  stats: (userId?: string) => userId ? ['profile-stats', userId] as const : ['profile-stats'] as const,
} as const;

// ── Portfolio ─────────────────────────────────────────────────────────────────
const portfolio = {
  settings: (profileId: string) => ['portfolio-settings', profileId] as const,
  editorProfile: (userId?: string) => userId ? ['portfolio-editor-profile', userId] as const : ['portfolio-editor-profile'] as const,
  resolve: (slug?: string) => slug ? ['portfolio-resolve', slug] as const : ['portfolio-resolve'] as const,
  profile: (profileId?: string) => profileId ? ['portfolio-profile', profileId] as const : ['portfolio-profile'] as const,
} as const;

// ── Feed ──────────────────────────────────────────────────────────────────────
const feed = {
  home: () => ['home-feed'] as const,
  posts: () => ['feed-posts'] as const,
  postDetail: () => ['post-detail'] as const,
  postComments: (postId?: string) => postId ? ['post-comments', postId] as const : ['post-comments'] as const,
  topComments: () => ['top-comments'] as const,
} as const;

// ── Network ──────────────────────────────────────────────────────────────────
const networkKeys = {
  connectionStatuses: (...userIds: string[]) => ['network', 'connection-statuses', ...userIds] as const,
} as const;

// ── Jobs ──────────────────────────────────────────────────────────────────────
const jobs = () => ['jobs'] as const;

// ── Social / Messaging ───────────────────────────────────────────────────────
const social = {
  conversations: (userId?: string) => userId ? ['conversations', userId] as const : ['conversations'] as const,
  messages: (partnerId?: string) => partnerId ? ['messages', partnerId] as const : ['messages'] as const,
  connectedUsers: () => ['connectedUsers'] as const,
  network: () => ['network'] as const,
  notifications: () => ['notifications'] as const,
  savedItems: (userId?: string) => userId ? ['saved-items', userId] as const : ['saved-items'] as const,
  trendingTopics: () => ['trending-topics'] as const,
  alumniDirectory: () => ['alumni-directory'] as const,
  alumniDirectoryStatuses: (...userIds: string[]) => ['alumni-directory', 'connection-statuses', ...userIds] as const,
  unreadMessageCount: (userId: string) => ['unreadMessageCount', userId] as const,
} as const;

// ── Projects ──────────────────────────────────────────────────────────────────
const projects = {
  list: (...filters: unknown[]) => ['projects', ...filters] as const,
  all: () => ['projects'] as const,
  my: (userId?: string) => userId ? ['myProjects', userId] as const : ['myProjects'] as const,
  myApplications: (userId?: string) => userId ? ['myApplications', userId] as const : ['myApplications'] as const,
  ownerApplications: (userId?: string) => userId ? ['ownerApplications', userId] as const : ['ownerApplications'] as const,
  savedIds: (userId?: string) => userId ? ['saved-project-ids', userId] as const : ['saved-project-ids'] as const,
  roles: (projectId?: string) => projectId ? ['projectRoles', projectId] as const : ['projectRoles'] as const,
} as const;

// ── Team-Ups ──────────────────────────────────────────────────────────────────
const teamUps = {
  all: () => ['team-ups'] as const,
  list: (...filters: unknown[]) => ['team-ups', ...filters] as const,
  my: (userId?: string) => userId ? ['my-team-ups', userId] as const : ['my-team-ups'] as const,
  myRequests: (userId?: string) => userId ? ['my-team-up-requests', userId] as const : ['my-team-up-requests'] as const,
  requests: (userId?: string) => userId ? ['team-up-requests', userId] as const : ['team-up-requests'] as const,
  roleDefinitions: () => ['team-up-role-definitions'] as const,
} as const;

// ── Events / Clubs ───────────────────────────────────────────────────────────
const events = {
  all: () => ['events'] as const,
  detail: () => ['event-detail'] as const,
};
const clubs = () => ['clubs'] as const;

// ── Alumni Invites ───────────────────────────────────────────────────────────
const alumniInvites = {
  list: (filters?: unknown) => ['alumni-invites', filters] as const,
  all: () => ['alumni-invites'] as const,
} as const;

// ── Email Transition ─────────────────────────────────────────────────────────
const emailTransition = {
  status: (userId: string) => ['email-transition-status', userId] as const,
  all: () => ['email-transition-status'] as const,
} as const;

// ── User Settings ────────────────────────────────────────────────────────────
const userSettings = (userId: string) => ['userSettings', userId] as const;

// ── Skill Analysis ───────────────────────────────────────────────────────────
const skillAnalysis = (userId: string) => ['skillAnalysis', userId] as const;

// ── Push Subscription ────────────────────────────────────────────────────────
const pushSubscription = (userId: string) => ['pushSubscription', userId] as const;

// ── AI Chat ──────────────────────────────────────────────────────────────────
const aiChat = {
  sessions: () => ['ai-chat-sessions'] as const,
  messages: (sessionId: string) => ['ai-chat-messages', sessionId] as const,
  messagesNone: () => ['ai-chat-messages-none'] as const,
} as const;

// ── Platform Admins ──────────────────────────────────────────────────────────
const platformAdmins = () => ['platform-admins'] as const;

// ── Admin ─────────────────────────────────────────────────────────────────────
const admin = {
  kpis: () => ['admin-kpis'] as const,
  users: () => ['admin-users'] as const,
  colleges: () => ['admin-colleges'] as const,
  domains: () => ['admin-domains'] as const,
  domainColleges: () => ['admin-domain-colleges'] as const,
  recruiters: () => ['admin-recruiters'] as const,
  settings: () => ['admin-settings'] as const,
  systemInfo: () => ['admin-system-info'] as const,
  maintenanceMode: () => ['admin-maintenance-mode'] as const,
  apiKeys: () => ['admin-api-keys'] as const,
  reports: () => ['admin-reports'] as const,
  skillTrends: () => ['admin-skill-trends'] as const,
  leadershipMetrics: () => ['admin-leadership-metrics'] as const,
  alumniEngagement: () => ['admin-alumni-engagement'] as const,
  teamUps: () => ['admin-team-ups'] as const,
  teamUpsStale: () => ['admin-team-ups-stale'] as const,
  teamUpsHighRejection: () => ['admin-team-ups-high-rejection'] as const,
  talentGraph: () => ['admin-talent-graph'] as const,
  talentColleges: () => ['admin-talent-colleges'] as const,
  collabProjects: () => ['admin-collab-projects'] as const,
  collabStats: () => ['admin-collab-stats'] as const,
  analyticsOverview: () => ['admin-analytics-overview'] as const,
  dailyMetrics: (days?: number) => ['admin-daily-metrics', days] as const,
  engagementMetrics: () => ['admin-engagement-metrics'] as const,
  collegeActivity: () => ['admin-college-activity'] as const,
  analytics: (timeRange?: string | number) => ['admin-analytics', timeRange] as const,
  userGrowth: (days: number) => ['admin-user-growth', days] as const,
  collegeDistribution: () => ['admin-college-distribution'] as const,
  systemAlerts: () => ['system-alerts'] as const,
} as const;

// ── Aggregate export ─────────────────────────────────────────────────────────
export const QUERY_KEYS = {
  identity,
  profile,
  portfolio,
  feed,
  social,
  networkKeys,
  jobs,
  projects,
  teamUps,
  events,
  clubs,
  alumniInvites,
  mentorship: MENTORSHIP_QUERY_KEYS,
  emailTransition,
  userSettings,
  skillAnalysis,
  pushSubscription,
  aiChat,
  platformAdmins,
  admin,
} as const;
