/**
 * Clubs API adapter — Phase 9.3
 * Binds @clstr/core clubs-api functions to the mobile Supabase client.
 */

import { withClient } from '../adapters/bind';
import {
  getMockClubsData,
  followMockClubData,
  unfollowMockClubData,
} from '@/lib/mock-social-data';
import {
  fetchClubsWithFollowStatus as _fetchClubsWithFollowStatus,
  followClubConnection as _followClubConnection,
  unfollowClubConnection as _unfollowClubConnection,
} from '@clstr/core/api/clubs-api';

// Re-export types
export type { ClubProfile } from '@clstr/core/api/clubs-api';

const AUTH_MODE = process.env.EXPO_PUBLIC_AUTH_MODE;

// Bound API functions
export async function fetchClubsWithFollowStatus(params: { profileId: string; collegeDomain: string }) {
  if (AUTH_MODE === 'mock') {
    return getMockClubsData();
  }
  return withClient(_fetchClubsWithFollowStatus)(params as any);
}

export async function followClubConnection(params: { requesterId: string; clubId: string; collegeDomain: string }) {
  if (AUTH_MODE === 'mock') {
    return followMockClubData(params.clubId);
  }
  return withClient(_followClubConnection)(params as any);
}

export async function unfollowClubConnection(params: { requesterId: string; clubId: string }) {
  if (AUTH_MODE === 'mock') {
    return unfollowMockClubData(params.clubId);
  }
  return withClient(_unfollowClubConnection)(params as any);
}
