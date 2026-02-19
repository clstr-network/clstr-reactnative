/**
 * clubs-api - Web adapter.
 * Thin binding layer over @clstr/core.
 */

// Re-export types, interfaces, constants, and pure functions
export * from '@clstr/core/api/clubs-api';

// Bind client-taking functions (auto-inject web Supabase client)
import * as _core from '@clstr/core/api/clubs-api';
import { withClient } from '@/adapters/bind';

export const fetchClubsWithFollowStatus = withClient(_core.fetchClubsWithFollowStatus);
export const followClubConnection = withClient(_core.followClubConnection);
export const unfollowClubConnection = withClient(_core.unfollowClubConnection);
