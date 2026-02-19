import type { SupabaseClient } from '@supabase/supabase-js';
import { assertValidUuid } from '../utils/uuid';

export type ClubProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  headline: string | null;
  email: string | null;
  college_domain: string | null;
  is_verified: boolean | null;
  created_at: string | null;
  is_following: boolean;
  followers_count: number;
};

type FetchClubsParams = {
  profileId: string;
  collegeDomain: string;
};

type FollowClubParams = {
  requesterId: string;
  clubId: string;
  collegeDomain: string;
};

type UnfollowClubParams = {
  requesterId: string;
  clubId: string;
};

export async function fetchClubsWithFollowStatus(
  client: SupabaseClient,
  { profileId, collegeDomain }: FetchClubsParams,
): Promise<ClubProfile[]> {
  assertValidUuid(profileId, "profile id");
  if (!collegeDomain) {
    throw new Error("Missing college domain");
  }

  const { data: clubProfiles, error: clubsError } = await client
    .from("profiles")
    .select("id, full_name, avatar_url, bio, headline, email, college_domain, is_verified, created_at")
    .eq("college_domain", collegeDomain)
    .eq("role", "Club")
    .order("created_at", { ascending: false });

  if (clubsError) throw clubsError;

  const { data: following, error: followingError } = await client
    .from("connections")
    .select("receiver_id")
    .eq("requester_id", profileId)
    .eq("status", "accepted");

  if (followingError) throw followingError;

  const followingIds = new Set((following ?? []).map((f) => f.receiver_id));

  const clubIds = (clubProfiles ?? []).map((c) => c.id);
  const followerCountMap = new Map<string, number>();

  if (clubIds.length > 0) {
    const { data: followerCounts, error: countsError } = await client
      .from("connections")
      .select("receiver_id")
      .in("receiver_id", clubIds)
      .eq("status", "accepted");

    if (countsError) throw countsError;

    (followerCounts ?? []).forEach((fc) => {
      const current = followerCountMap.get(fc.receiver_id) || 0;
      followerCountMap.set(fc.receiver_id, current + 1);
    });
  }

  return (clubProfiles ?? []).map((club) => ({
    ...club,
    is_following: followingIds.has(club.id),
    followers_count: followerCountMap.get(club.id) || 0,
  }));
}

export async function followClubConnection(
  client: SupabaseClient,
  { requesterId, clubId, collegeDomain }: FollowClubParams,
): Promise<void> {
  assertValidUuid(requesterId, "profile id");
  assertValidUuid(clubId, "club id");
  if (!collegeDomain) {
    throw new Error("Missing college domain");
  }

  const { error } = await client
    .from("connections")
    .upsert(
      {
        requester_id: requesterId,
        receiver_id: clubId,
        status: "accepted",
        college_domain: collegeDomain,
      },
      { onConflict: "requester_id,receiver_id" }
    );

  if (error) throw error;
}

export async function unfollowClubConnection(
  client: SupabaseClient,
  { requesterId, clubId }: UnfollowClubParams,
): Promise<void> {
  assertValidUuid(requesterId, "profile id");
  assertValidUuid(clubId, "club id");

  const { error } = await client
    .from("connections")
    .delete()
    .eq("requester_id", requesterId)
    .eq("receiver_id", clubId);

  if (error) throw error;
}
