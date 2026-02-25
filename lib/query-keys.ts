/**
 * Re-export QUERY_KEYS from @clstr/core for use across mobile screens.
 *
 * Usage:
 *   import { QUERY_KEYS } from '@/lib/query-keys';
 *   import { MOBILE_QUERY_KEYS } from '@/lib/query-keys';
 */

export { QUERY_KEYS } from '@clstr/core/query-keys';

/**
 * Mobile-specific query keys for data not covered by @clstr/core.
 * Used in profile stats, connection status, user-specific counts,
 * search, EcoCampus, club detail, and profile tab sections.
 *
 * Phase 2 parity: ALL mobile query keys MUST reference this file
 * or QUERY_KEYS above. Zero inline ['literal'] arrays allowed.
 */
export const MOBILE_QUERY_KEYS = {
  // Connection & profile counts
  connectionStatus: (userId: string) => ['connectionStatus', userId] as const,
  mutualConnections: (userId: string) => ['mutualConnections', userId] as const,
  userPostsCount: (userId: string) => ['userPostsCount', userId] as const,
  connectionCount: (userId: string) => ['connectionCount', userId] as const,

  // Search (mobile-specific inline queries)
  search: {
    posts: (query: string, domain: string) => ['search', 'posts', query, domain] as const,
    jobs: (query: string, domain: string) => ['search', 'jobs', query, domain] as const,
    clubs: (query: string, domain: string) => ['search', 'clubs', query, domain] as const,
    projects: (query: string, domain: string) => ['search', 'projects', query, domain] as const,
  },

  // EcoCampus
  eco: {
    all: ['eco'] as const,
    items: (domain: string) => ['eco', 'items', domain] as const,
    requests: (domain: string) => ['eco', 'requests', domain] as const,
    mine: (userId: string) => ['eco', 'mine', userId] as const,
  },

  // Club detail sections
  clubDetail: (id: string) => ['club-detail', id] as const,
  clubEvents: (id: string) => ['club-events', id] as const,
  clubPosts: (id: string) => ['club-posts', id] as const,
  clubMembers: (id: string) => ['club-members', id] as const,

  // Self-profile tab data
  profileViewsCount: (userId: string) => ['profileViewsCount', userId] as const,
  myPosts: (userId: string) => ['myPosts', userId] as const,
  myEducation: (userId: string) => ['myEducation', userId] as const,
  myExperience: (userId: string) => ['myExperience', userId] as const,
  mySkills: (userId: string) => ['mySkills', userId] as const,
  myProjects: (userId: string) => ['myProjects', userId] as const,

  // Other-user posts (infinite query)
  userPosts: (userId: string) => ['userPosts', userId] as const,

  // Share sheet
  connectionShareList: ['connections', 'share-list'] as const,
};
