/**
 * Clubs Screen — Phase 9.3
 *
 * Browse clubs in the user's college, follow/unfollow.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import {
  fetchClubsWithFollowStatus,
  followClubConnection,
  unfollowClubConnection,
} from '@/lib/api/clubs';
import type { ClubProfile } from '@/lib/api/clubs';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { QUERY_KEYS } from '@/lib/query-keys';
import { Avatar } from '@/components/Avatar';
import { useRealtimeMultiSubscription } from '@/lib/hooks/useRealtimeSubscription';
import { CHANNELS } from '@/lib/channels';

// ─── Club Card ───────────────────────────────────────────────

const ClubCard = React.memo(function ClubCard({
  club,
  colors,
  onFollow,
  onUnfollow,
}: {
  club: ClubProfile;
  colors: ReturnType<typeof useThemeColors>;
  onFollow: (clubId: string) => void;
  onUnfollow: (clubId: string) => void;
}) {
  const isFollowing = club.is_following;

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/club/${club.id}` as any);
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { backgroundColor: colors.surfaceHover },
      ]}
    >
      <View style={styles.cardHeader}>
        <Avatar uri={club.avatar_url} name={club.full_name ?? '?'} size="md" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {club.full_name}
          </Text>
          {club.headline && (
            <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>{club.headline}</Text>
          )}
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (isFollowing) { onUnfollow(club.id); } else { onFollow(club.id); }
          }}
          style={[
            styles.followBtn,
            isFollowing
              ? { borderColor: colors.border, borderWidth: 1 }
              : { backgroundColor: colors.primary },
          ]}
        >
          <Text
            style={[
              styles.followBtnText,
              { color: isFollowing ? colors.text : '#fff' },
            ]}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </Pressable>
      </View>

      {club.bio && (
        <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {club.bio}
        </Text>
      )}

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="people-outline" size={14} color={colors.textTertiary} />
          <Text style={[styles.statText, { color: colors.textTertiary }]}>
            {club.followers_count ?? 0} members
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

// ─── Screen ──────────────────────────────────────────────────

export default function ClubsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { identity, collegeDomain: identityDomain } = useIdentityContext();
  const userId = identity?.user_id ?? '';
  const collegeDomain = identityDomain ?? '';
  const { canViewClubs } = useFeatureAccess();

  // Phase 13.5 — Realtime clubs subscription
  useRealtimeMultiSubscription({
    channelName: CHANNELS.clubsRealtime(),
    subscriptions: [
      {
        table: 'profiles',
        event: '*',
        onPayload: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clubs }),
      },
      {
        table: 'connections',
        event: '*',
        onPayload: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clubs }),
      },
    ],
    enabled: !!userId && !!collegeDomain,
  });

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: [...QUERY_KEYS.clubs, collegeDomain],
    queryFn: () => fetchClubsWithFollowStatus({ profileId: userId, collegeDomain }),
    enabled: !!userId && !!collegeDomain && canViewClubs,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const clubs = (data ?? []) as ClubProfile[];

  const followMut = useMutation({
    mutationFn: (clubId: string) =>
      followClubConnection({ requesterId: userId, clubId, collegeDomain }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clubs }),
  });

  const unfollowMut = useMutation({
    mutationFn: (clubId: string) =>
      unfollowClubConnection({ requesterId: userId, clubId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clubs }),
  });

  const renderItem = useCallback(
    ({ item }: { item: ClubProfile }) => (
      <ClubCard
        club={item}
        colors={colors}
        onFollow={(id) => followMut.mutate(id)}
        onUnfollow={(id) => unfollowMut.mutate(id)}
      />
    ),
    [colors, followMut, unfollowMut],
  );

  const keyExtractor = useCallback((item: ClubProfile) => item.id, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 8), borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Clubs</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : clubs.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="people-outline" size={56} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No clubs found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Clubs in your college will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={clubs}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        />
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
  },
  listContent: { padding: 16, gap: 12 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
  },
  cardMeta: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
  },
  cardDescription: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    lineHeight: fontSize.base * 1.4,
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  followBtnText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
  },
  emptySubtitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
  },
});
