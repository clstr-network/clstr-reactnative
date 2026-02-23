/**
 * Club Detail Page — Phase 12.8
 *
 * Full club profile with avatar, bio, followers, events, posts,
 * follow/unfollow, and member list.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { followClubConnection, unfollowClubConnection } from '@/lib/api/clubs';
import type { ClubProfile } from '@/lib/api/clubs';
import { supabase } from '@/lib/adapters/core-client';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { QUERY_KEYS } from '@/lib/query-keys';
import { Avatar } from '@/components/Avatar';
import PostCard from '@/components/PostCard';
import type { Post } from '@/components/PostCard';
import type { Event } from '@clstr/core/api/events-api';

// ─── Tab types ───────────────────────────────────────────────

type DetailTab = 'about' | 'events' | 'posts' | 'members';

const TABS: { key: DetailTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'about', label: 'About', icon: 'information-circle-outline' },
  { key: 'events', label: 'Events', icon: 'calendar-outline' },
  { key: 'posts', label: 'Posts', icon: 'chatbubble-outline' },
  { key: 'members', label: 'Members', icon: 'people-outline' },
];

// ─── Event Card ──────────────────────────────────────────────

const EventCard = React.memo(function EventCard({
  event,
  colors,
}: {
  event: Event;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); router.push(`/event/${event.id}`); }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { backgroundColor: colors.surfaceHover },
      ]}
    >
      <View style={styles.cardRow}>
        <View style={[styles.eventIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="calendar" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{event.title}</Text>
          <Text style={[styles.cardMeta, { color: colors.textTertiary }]} numberOfLines={1}>
            {event.event_date ? new Date(event.event_date).toLocaleDateString() : ''} {event.location ? `· ${event.location}` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
      {event.description && (
        <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>{event.description}</Text>
      )}
    </Pressable>
  );
});

// ─── Member Card ─────────────────────────────────────────────

type MemberProfile = { id: string; full_name: string | null; avatar_url: string | null; headline: string | null };

const MemberCard = React.memo(function MemberCard({
  member,
  colors,
}: {
  member: MemberProfile;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); router.push(`/user/${member.id}`); }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { backgroundColor: colors.surfaceHover },
      ]}
    >
      <View style={styles.cardRow}>
        <Avatar uri={member.avatar_url} name={member.full_name ?? '?'} size="sm" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {member.full_name ?? 'Unknown'}
          </Text>
          {member.headline && (
            <Text style={[styles.cardMeta, { color: colors.textTertiary }]} numberOfLines={1}>{member.headline}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
    </Pressable>
  );
});

// ─── Screen ──────────────────────────────────────────────────

export default function ClubDetailScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { identity } = useIdentityContext();
  const userId = identity?.user_id ?? '';
  const collegeDomain = identity?.college_domain ?? '';

  const [activeTab, setActiveTab] = useState<DetailTab>('about');

  // ── Club profile ──────────────────────────────────────────
  const clubQuery = useQuery({
    queryKey: ['club-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, headline, email, college_domain, is_verified, created_at')
        .eq('id', id!)
        .single();
      if (error) throw error;

      // Followers count
      const { count } = await supabase
        .from('connections')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', id!)
        .eq('status', 'accepted');

      // Is current user following?
      const { data: follow } = await supabase
        .from('connections')
        .select('id')
        .eq('requester_id', userId)
        .eq('receiver_id', id!)
        .eq('status', 'accepted')
        .maybeSingle();

      return {
        ...(data as Record<string, unknown>),
        followers_count: count ?? 0,
        is_following: !!follow,
      } as ClubProfile;
    },
    enabled: !!id,
    staleTime: 30_000,
  });

  // ── Club events ───────────────────────────────────────────
  const eventsQuery = useQuery({
    queryKey: ['club-events', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('creator_id', id!)
        .order('event_date', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Event[];
    },
    enabled: !!id && activeTab === 'events',
    staleTime: 60_000,
  });

  // ── Club posts ────────────────────────────────────────────
  const postsQuery = useQuery({
    queryKey: ['club-posts', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', id!)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Post[];
    },
    enabled: !!id && activeTab === 'posts',
    staleTime: 60_000,
  });

  // ── Members (followers) ───────────────────────────────────
  const membersQuery = useQuery({
    queryKey: ['club-members', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('connections')
        .select('requester_id')
        .eq('receiver_id', id!)
        .eq('status', 'accepted')
        .limit(50);
      if (error) throw error;
      if (!data || data.length === 0) return [] as MemberProfile[];

      const memberIds = data.map((c: any) => c.requester_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, headline')
        .in('id', memberIds);
      if (profilesError) throw profilesError;
      return (profiles ?? []) as MemberProfile[];
    },
    enabled: !!id && activeTab === 'members',
    staleTime: 60_000,
  });

  // ── Follow / Unfollow ─────────────────────────────────────
  const followMut = useMutation({
    mutationFn: () => followClubConnection({ requesterId: userId, clubId: id!, collegeDomain }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['club-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['club-members', id] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clubs });
    },
  });

  const unfollowMut = useMutation({
    mutationFn: () => unfollowClubConnection({ requesterId: userId, clubId: id! }),
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      queryClient.invalidateQueries({ queryKey: ['club-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['club-members', id] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clubs });
    },
  });

  const club = clubQuery.data;
  const isFollowing = club?.is_following ?? false;

  const handlePostPress = useCallback((postId: string) => {
    router.push(`/post/${postId}`);
  }, []);

  // ── Loading state ─────────────────────────────────────────
  if (clubQuery.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 8), borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Club</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!club) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 8), borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Club</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={56} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Club not found</Text>
        </View>
      </View>
    );
  }

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
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {club.full_name ?? 'Club'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        refreshControl={
          <RefreshControl
            refreshing={clubQuery.isRefetching}
            onRefresh={() => clubQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {/* Profile Hero */}
        <View style={[styles.hero, { borderBottomColor: colors.border }]}>
          <Avatar uri={club.avatar_url} name={club.full_name ?? '?'} size="lg" />
          <View style={styles.heroInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.clubName, { color: colors.text }]} numberOfLines={1}>
                {club.full_name}
              </Text>
              {club.is_verified && (
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: 4 }} />
              )}
            </View>
            {club.headline && (
              <Text style={[styles.headline, { color: colors.textSecondary }]} numberOfLines={2}>
                {club.headline}
              </Text>
            )}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="people-outline" size={14} color={colors.textTertiary} />
                <Text style={[styles.statText, { color: colors.textTertiary }]}>
                  {club.followers_count} {club.followers_count === 1 ? 'member' : 'members'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Follow / Unfollow Button */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => {
              if (isFollowing) unfollowMut.mutate();
              else followMut.mutate();
            }}
            disabled={followMut.isPending || unfollowMut.isPending}
            style={[
              styles.actionBtn,
              isFollowing
                ? { borderColor: colors.border, borderWidth: 1 }
                : { backgroundColor: colors.primary },
            ]}
          >
            <Ionicons
              name={isFollowing ? 'checkmark' : 'add'}
              size={16}
              color={isFollowing ? colors.text : '#fff'}
            />
            <Text style={[styles.actionBtnText, { color: isFollowing ? colors.text : '#fff' }]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => { Haptics.selectionAsync(); setActiveTab(tab.key); }}
                style={[styles.tab, isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              >
                <Ionicons name={tab.icon} size={16} color={isActive ? colors.primary : colors.textTertiary} />
                <Text style={[styles.tabLabel, { color: isActive ? colors.primary : colors.textTertiary }]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Tab Content */}
        {activeTab === 'about' && (
          <View style={styles.section}>
            {club.bio ? (
              <Text style={[styles.bioText, { color: colors.textSecondary }]}>{club.bio}</Text>
            ) : (
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No description available.</Text>
            )}
            {club.email && (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={16} color={colors.textTertiary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>{club.email}</Text>
              </View>
            )}
            {club.college_domain && (
              <View style={styles.infoRow}>
                <Ionicons name="school-outline" size={16} color={colors.textTertiary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>{club.college_domain}</Text>
              </View>
            )}
            {club.created_at && (
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={16} color={colors.textTertiary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Joined {new Date(club.created_at).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'events' && (
          <View style={styles.section}>
            {eventsQuery.isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 20 }} />
            ) : (eventsQuery.data ?? []).length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="calendar-outline" size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No events yet</Text>
              </View>
            ) : (
              (eventsQuery.data ?? []).map((event) => (
                <EventCard key={event.id} event={event} colors={colors} />
              ))
            )}
          </View>
        )}

        {activeTab === 'posts' && (
          <View style={styles.section}>
            {postsQuery.isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 20 }} />
            ) : (postsQuery.data ?? []).length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="chatbubble-outline" size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No posts yet</Text>
              </View>
            ) : (
              (postsQuery.data ?? []).map((post) => (
                <PostCard key={post.id} post={post} onPress={() => handlePostPress(String(post.id))} />
              ))
            )}
          </View>
        )}

        {activeTab === 'members' && (
          <View style={styles.section}>
            {membersQuery.isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 20 }} />
            ) : (membersQuery.data ?? []).length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="people-outline" size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No members yet</Text>
              </View>
            ) : (
              (membersQuery.data ?? []).map((member) => (
                <MemberCard key={member.id} member={member} colors={colors} />
              ))
            )}
          </View>
        )}
      </ScrollView>
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
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.lg,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  // ── Profile Hero ──────────────────────────────────────────
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    borderBottomWidth: 1,
  },
  heroInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clubName: {
    fontSize: fontSize.xl ?? 20,
    fontFamily: fontFamily.bold,
    flexShrink: 1,
  },
  headline: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
  },
  // ── Actions ───────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
  },
  // ── Tabs ──────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  tabLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
  },
  // ── Section / Content ─────────────────────────────────────
  section: {
    padding: 16,
    gap: 12,
  },
  bioText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    lineHeight: fontSize.body * 1.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
  },
  emptySection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
  },
  // ── Cards ─────────────────────────────────────────────────
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: fontSize.base ?? fontSize.body,
    fontFamily: fontFamily.regular,
    lineHeight: (fontSize.base ?? fontSize.body) * 1.4,
  },
});
