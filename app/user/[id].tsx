import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  ActivityIndicator, Alert, Share, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useThemeColors, getRoleBadgeColor } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import Avatar from '@/components/Avatar';
import RoleBadge from '@/components/RoleBadge';
import PostCard from '@/components/PostCard';
import { getProfileById, getConnectionCount, blockConnection } from '@/lib/api/profile';
import type { UserProfile } from '@/lib/api/profile';
import {
  checkConnectionStatus,
  sendConnectionRequest,
  removeConnection,
  countMutualConnections,
  getUserPostsCount,
  getPostsByUser,
} from '@/lib/api/social';
import type { GetPostsResponse } from '@/lib/api/social';
import { QUERY_KEYS, MOBILE_QUERY_KEYS } from '@/lib/query-keys';

import { useAuth } from '@/lib/auth-context';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const { data: profile, isLoading } = useQuery<UserProfile | null>({
    queryKey: QUERY_KEYS.profile(id ?? ''),
    queryFn: () => getProfileById(id!),
    enabled: !!id,
  });

  // F9 — Centralized query keys (no more hardcoded array literals)
  const { data: connectionStatus } = useQuery<string | null>({
    queryKey: MOBILE_QUERY_KEYS.connectionStatus(id ?? ''),
    queryFn: () => checkConnectionStatus(id!),
    enabled: !!id,
  });

  const { data: mutualCount } = useQuery<number>({
    queryKey: MOBILE_QUERY_KEYS.mutualConnections(id ?? ''),
    queryFn: () => countMutualConnections(authUser!.id, id!),
    enabled: !!id && !!authUser,
  });

  const { data: postsCount } = useQuery<number>({
    queryKey: MOBILE_QUERY_KEYS.userPostsCount(id ?? ''),
    queryFn: () => getUserPostsCount(id!),
    enabled: !!id,
  });

  // F9 — Use dedicated DB count instead of profile.connections?.length
  const { data: connectionsCount = 0 } = useQuery<number>({
    queryKey: MOBILE_QUERY_KEYS.connectionCount(id ?? ''),
    queryFn: () => getConnectionCount(id!),
    enabled: !!id,
  });

  // 12.4 — Fetch user's posts (paginated)
  const postsQ = useInfiniteQuery<GetPostsResponse>({
    queryKey: MOBILE_QUERY_KEYS.userPosts(id ?? ''),
    queryFn: ({ pageParam }) =>
      getPostsByUser(id!, { cursor: pageParam as string | null, pageSize: 10 }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    enabled: !!id,
  });

  const userPosts = postsQ.data?.pages.flatMap((p) => p.posts) ?? [];

  const handlePostPress = useCallback(
    (postId: string | number) => {
      router.push({ pathname: '/post/[id]', params: { id: String(postId) } });
    },
    [],
  );

  const connectMutation = useMutation({
    mutationFn: () => sendConnectionRequest(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOBILE_QUERY_KEYS.connectionStatus(id ?? '') });
      queryClient.invalidateQueries({ queryKey: MOBILE_QUERY_KEYS.connectionCount(id ?? '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.network });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => removeConnection(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOBILE_QUERY_KEYS.connectionStatus(id ?? '') });
      queryClient.invalidateQueries({ queryKey: MOBILE_QUERY_KEYS.connectionCount(id ?? '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.network });
    },
  });

  const handleConnect = useCallback(async () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    connectMutation.mutate();
  }, [id, connectMutation]);

  const handleDisconnect = useCallback(async () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    disconnectMutation.mutate();
  }, [id, disconnectMutation]);

  // F12 — Block Connection mutation
  const blockMutation = useMutation({
    mutationFn: () => blockConnection(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOBILE_QUERY_KEYS.connectionStatus(id ?? '') });
      queryClient.invalidateQueries({ queryKey: MOBILE_QUERY_KEYS.connectionCount(id ?? '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.network });
      Alert.alert('Blocked', 'This user has been blocked.');
      router.back();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to block user. Please try again.');
    },
  });

  const handleBlock = useCallback(() => {
    if (!id) return;
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${profile?.full_name ?? 'this user'}? They won't be able to see your profile or message you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            blockMutation.mutate();
          },
        },
      ],
    );
  }, [id, profile?.full_name, blockMutation]);

  const handleShareProfile = useCallback(async () => {
    if (!id || !profile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const profileUrl = `https://clstr.network/user/${id}`;
    try {
      await Share.share({
        message: `Check out ${profile.full_name ?? 'this profile'} on Clstr: ${profileUrl}`,
        url: profileUrl,
      });
    } catch (_e) {
      // User cancelled
    }
  }, [id, profile]);

  const handleMoreOptions = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Options',
      undefined,
      [
        { text: 'Share Profile', onPress: handleShareProfile },
        { text: 'Block User', style: 'destructive', onPress: handleBlock },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, [handleShareProfile, handleBlock]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={{ color: colors.textSecondary }}>User not found</Text>
        </View>
      </View>
    );
  }

  const badgeColor = getRoleBadgeColor(profile.role ?? '');
  const isConnected = connectionStatus === 'connected';
  const isPending = connectionStatus === 'pending';
  const isBusy = connectMutation.isPending || disconnectMutation.isPending;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <Pressable onPress={handleMoreOptions} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileBg, { backgroundColor: badgeColor.bg + '20' }]}>
          <Avatar uri={profile.avatar_url ?? undefined} name={profile.full_name ?? 'User'} size={88} />
          <Text style={[styles.name, { color: colors.text }]}>{profile.full_name ?? 'Unknown'}</Text>
          {!!profile.headline && (
            <Text style={[styles.username, { color: colors.textSecondary }]}>{profile.headline}</Text>
          )}
          <RoleBadge role={profile.role ?? ''} />
          <Text style={[styles.dept, { color: colors.textSecondary }]}>
            {profile.major ?? profile.university ?? ''}
          </Text>
          {!!profile.bio && <Text style={[styles.bio, { color: colors.textSecondary }]}>{profile.bio}</Text>}
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>{connectionsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Connections</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>{postsCount ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>{mutualCount ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mutual</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {isConnected ? (
            <Pressable
              onPress={handleDisconnect}
              disabled={isBusy}
              style={[styles.connectedBtn, { borderColor: colors.success + '40' }, isBusy && { opacity: 0.6 }]}
            >
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.connectedText, { color: colors.success }]}>Connected</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleConnect}
              disabled={isBusy || isPending}
              style={({ pressed }) => [
                styles.connectBtn,
                { backgroundColor: isPending ? colors.surfaceSecondary : colors.tint },
                pressed && { opacity: 0.85 },
                (isBusy || isPending) && { opacity: 0.6 },
              ]}
            >
              <Ionicons name="person-add" size={18} color={isPending ? colors.textSecondary : '#fff'} />
              <Text style={[styles.connectBtnText, isPending && { color: colors.textSecondary }]}>
                {isPending ? 'Pending' : 'Connect'}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              if (isConnected) {
                router.push({ pathname: '/chat/[id]', params: { id: id! } });
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                Alert.alert('Not Connected', 'You need to connect with this user before sending a message.');
              }
            }}
            disabled={!isConnected}
            style={({ pressed }) => [
              styles.msgBtn,
              { borderColor: isConnected ? colors.border : colors.border + '40' },
              !isConnected && { opacity: 0.5 },
              pressed && isConnected && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="chatbubble-outline" size={18} color={isConnected ? colors.text : colors.textTertiary} />
            <Text style={[styles.msgBtnText, { color: isConnected ? colors.text : colors.textTertiary }]}>Message</Text>
          </Pressable>
        </View>

        {/* ─── Skills Section (12.4) ─────────────────────── */}
        {(profile.skills?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Skills</Text>
            </View>
            <View style={styles.chipRow}>
              {profile.skills!.map((skill, i) => (
                <View key={skill.id ?? i} style={[styles.skillChip, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                  <Text style={[styles.skillName, { color: colors.text }]}>{skill.name ?? skill.skill_name}</Text>
                  {!!skill.level && (
                    <Text style={[styles.skillLevel, { color: colors.textTertiary }]}>{skill.level}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ─── Education Section (12.4) ──────────────────── */}
        {(profile.education?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="school-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Education</Text>
            </View>
            {profile.education!.map((edu, i) => (
              <View key={edu.id ?? i} style={[styles.eduItem, { borderColor: colors.border }]}>
                <Text style={[styles.eduDegree, { color: colors.text }]}>{edu.degree}</Text>
                <Text style={[styles.eduSchool, { color: colors.textSecondary }]}>{edu.school ?? edu.institution}</Text>
                {(edu.start_date || edu.end_date) && (
                  <Text style={[styles.eduDates, { color: colors.textTertiary }]}>
                    {edu.start_date ? new Date(edu.start_date).getFullYear() : ''}
                    {edu.end_date ? ` – ${new Date(edu.end_date).getFullYear()}` : ' – Present'}
                  </Text>
                )}
                {!!edu.description && (
                  <Text style={[styles.eduDesc, { color: colors.textSecondary }]} numberOfLines={3}>{edu.description}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ─── Experience Section (12.4) ─────────────────── */}
        {(profile.experience?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Experience</Text>
            </View>
            {profile.experience!.map((exp, i) => (
              <View key={exp.id ?? i} style={[styles.eduItem, { borderColor: colors.border }]}>
                <Text style={[styles.eduDegree, { color: colors.text }]}>{exp.title}</Text>
                <Text style={[styles.eduSchool, { color: colors.textSecondary }]}>{exp.company}</Text>
                {(exp.start_date || exp.end_date) && (
                  <Text style={[styles.eduDates, { color: colors.textTertiary }]}>
                    {exp.start_date ? new Date(exp.start_date).getFullYear() : ''}
                    {exp.end_date ? ` – ${new Date(exp.end_date).getFullYear()}` : ' – Present'}
                  </Text>
                )}
                {!!exp.description && (
                  <Text style={[styles.eduDesc, { color: colors.textSecondary }]} numberOfLines={3}>{exp.description}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ─── Posts Feed (12.4) ─────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="newspaper-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Activity</Text>
          </View>
          {postsQ.isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 20 }} />
          ) : userPosts.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No posts yet</Text>
          ) : (
            <>
              {userPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post as any}
                  onPress={() => handlePostPress(post.id)}
                />
              ))}
              {postsQ.hasNextPage && (
                <Pressable
                  onPress={() => postsQ.fetchNextPage()}
                  disabled={postsQ.isFetchingNextPage}
                  style={[styles.loadMoreBtn, { borderColor: colors.border }]}
                >
                  {postsQ.isFetchingNextPage ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load more posts</Text>
                  )}
                </Pressable>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: '700', fontFamily: fontFamily.bold },
  scrollContent: { paddingBottom: 40 },
  profileBg: { alignItems: 'center', paddingTop: 32, paddingBottom: 24, gap: 6 },
  name: { fontSize: fontSize['4xl'], fontWeight: '800', marginTop: 12, fontFamily: fontFamily.extraBold },
  username: { fontSize: fontSize.body, fontFamily: fontFamily.regular },
  dept: { fontSize: fontSize.base, marginTop: 2, fontFamily: fontFamily.regular },
  bio: { fontSize: fontSize.base, textAlign: 'center', paddingHorizontal: 40, marginTop: 4, lineHeight: 20, fontFamily: fontFamily.regular },
  statsRow: { flexDirection: 'row', padding: 16, gap: 8 },
  statBox: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  statNum: { fontSize: fontSize['2xl'], fontWeight: '800', fontFamily: fontFamily.extraBold },
  statLabel: { fontSize: fontSize.sm, marginTop: 2, fontFamily: fontFamily.regular },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  connectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, gap: 6 },
  connectBtnText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '700', fontFamily: fontFamily.bold },
  connectedBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1, gap: 6 },
  connectedText: { fontSize: fontSize.lg, fontWeight: '700', fontFamily: fontFamily.bold },
  msgBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1, gap: 6 },
  msgBtnText: { fontSize: fontSize.lg, fontWeight: '700', fontFamily: fontFamily.bold },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // 12.4 — Skills, Education, Posts
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: fontSize.body, fontWeight: '700', fontFamily: fontFamily.bold },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  skillName: { fontSize: fontSize.sm, fontFamily: fontFamily.medium },
  skillLevel: { fontSize: fontSize.xs, fontFamily: fontFamily.regular },
  eduItem: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
  eduDegree: { fontSize: fontSize.body, fontFamily: fontFamily.semiBold },
  eduSchool: { fontSize: fontSize.sm, fontFamily: fontFamily.regular },
  eduDates: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, marginTop: 2 },
  eduDesc: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, marginTop: 4, lineHeight: 18 },
  emptyText: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, textAlign: 'center', paddingVertical: 20 },
  loadMoreBtn: { alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginTop: 12 },
  loadMoreText: { fontSize: fontSize.sm, fontFamily: fontFamily.semiBold },
});
