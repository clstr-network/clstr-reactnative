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
 * Used in profile stats, connection status, and user-specific counts.
 */
export const MOBILE_QUERY_KEYS = {
  connectionStatus: (userId: string) => ['connectionStatus', userId] as const,
  mutualConnections: (userId: string) => ['mutualConnections', userId] as const,
  userPostsCount: (userId: string) => ['userPostsCount', userId] as const,
  connectionCount: (userId: string) => ['connectionCount', userId] as const,
};
