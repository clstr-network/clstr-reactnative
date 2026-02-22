/**
 * Clubs API adapter — Phase 9.3
 * Binds @clstr/core clubs-api functions to the mobile Supabase client.
 */

import { withClient } from '../adapters/bind';
import {
  fetchClubsWithFollowStatus as _fetchClubsWithFollowStatus,
  followClubConnection as _followClubConnection,
  unfollowClubConnection as _unfollowClubConnection,
} from '@clstr/core/api/clubs-api';

// Re-export types
export type { ClubProfile } from '@clstr/core/api/clubs-api';

// Bound API functions
export const fetchClubsWithFollowStatus = withClient(_fetchClubsWithFollowStatus);
export const followClubConnection = withClient(_followClubConnection);
export const unfollowClubConnection = withClient(_unfollowClubConnection);
