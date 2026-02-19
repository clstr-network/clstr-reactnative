/**
 * trending-api - Web adapter.
 * Thin binding layer over @clstr/core.
 */

// Re-export types, interfaces, constants, and pure functions
export * from '@clstr/core/api/trending-api';

// Bind client-taking functions (auto-inject web Supabase client)
import * as _core from '@clstr/core/api/trending-api';
import { withClient } from '@/adapters/bind';

export const getTrendingTopics = withClient(_core.getTrendingTopics);
export const getPostsByHashtag = withClient(_core.getPostsByHashtag);
export const subscribeTrendingTopics = withClient(_core.subscribeTrendingTopics);
