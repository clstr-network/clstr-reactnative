/**
 * Saved Items Screen — Phase 8.2
 *
 * Displays user's bookmarked posts, projects, and clubs.
 * Uses `getSavedItems()` from @clstr/core via `lib/api/saved.ts`.
 * Segmented tabs: Posts · Projects · Clubs.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { getSavedItems, toggleSaveItem } from '@/lib/api/saved';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { QUERY_KEYS } from '@/lib/query-keys';
import { Avatar } from '@/components/Avatar';
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription';
import { CHANNELS } from '@/lib/channels';

// ─── Tab types ───────────────────────────────────────────────

type TabKey = 'posts' | 'projects' | 'clubs' | 'jobs';

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'posts', label: 'Posts', icon: 'document-text-outline' },
  { key: 'projects', label: 'Projects', icon: 'code-slash-outline' },
  { key: 'clubs', label: 'Clubs', icon: 'people-outline' },
  { key: 'jobs', label: 'Jobs', icon: 'briefcase-outline' },
];

// ─── Saved Post Item ─────────────────────────────────────────

const SavedPostItem = React.memo(function SavedPostItem({
  post,
  colors,
  onUnsave,
}: {
  post: { id: string; content: string; created_at: string; user?: { full_name: string; avatar_url: string; role: string } | null };
  colors: ReturnType<typeof useThemeColors>;
  onUnsave: (itemId: string, type: 'post' | 'project' | 'club' | 'job') => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/post/${post.id}`);
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { backgroundColor: colors.surfaceHover },
      ]}
    >
      <View style={styles.cardHeader}>
        <Avatar
          uri={post.user?.avatar_url}
          name={post.user?.full_name ?? '?'}
          size="sm"
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardAuthor, { color: colors.text }]} numberOfLines={1}>
            {post.user?.full_name ?? 'Unknown'}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>
            {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onUnsave(post.id, 'post');
          }}
          hitSlop={8}
        >
          <Ionicons name="bookmark" size={18} color={colors.primary} />
        </Pressable>
      </View>
      <Text style={[styles.cardContent, { color: colors.text }]} numberOfLines={3}>
        {post.content}
      </Text>
    </Pressable>
  );
});

// ─── Saved Project Item ──────────────────────────────────────

const SavedProjectItem = React.memo(function SavedProjectItem({
  project,
  colors,
  onUnsave,
}: {
  project: { id: string; title: string; description: string; status: string; category?: string; skills?: string[] };
  colors: ReturnType<typeof useThemeColors>;
  onUnsave: (itemId: string, type: 'post' | 'project' | 'club' | 'job') => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { backgroundColor: colors.surfaceHover },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.projectIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="code-slash" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardAuthor, { color: colors.text }]} numberOfLines={1}>
            {project.title}
          </Text>
          {project.category && (
            <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>
              {project.category} · {project.status}
            </Text>
          )}
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onUnsave(project.id, 'project');
          }}
          hitSlop={8}
        >
          <Ionicons name="bookmark" size={18} color={colors.primary} />
        </Pressable>
      </View>
      <Text style={[styles.cardContent, { color: colors.textSecondary }]} numberOfLines={2}>
        {project.description}
      </Text>
      {project.skills && project.skills.length > 0 && (
        <View style={styles.tagRow}>
          {project.skills.slice(0, 3).map((skill) => (
            <View key={skill} style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>{skill}</Text>
            </View>
          ))}
          {project.skills.length > 3 && (
            <Text style={[styles.tagMore, { color: colors.textTertiary }]}>
              +{project.skills.length - 3}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
});

// ─── Saved Club Item ─────────────────────────────────────────

const SavedClubItem = React.memo(function SavedClubItem({
  club,
  colors,
  onUnsave,
}: {
  club: { id: string; name: string; description: string; club_type: string; member_count: number };
  colors: ReturnType<typeof useThemeColors>;
  onUnsave: (itemId: string, type: 'post' | 'project' | 'club' | 'job') => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { backgroundColor: colors.surfaceHover },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.projectIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="people" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardAuthor, { color: colors.text }]} numberOfLines={1}>
            {club.name}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>
            {club.club_type} · {club.member_count} members
          </Text>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onUnsave(club.id, 'club');
          }}
          hitSlop={8}
        >
          <Ionicons name="bookmark" size={18} color={colors.primary} />
        </Pressable>
      </View>
      <Text style={[styles.cardContent, { color: colors.textSecondary }]} numberOfLines={2}>
        {club.description}
      </Text>
    </Pressable>
  );
});

// ─── Saved Job Item ──────────────────────────────────────────

const SavedJobItem = React.memo(function SavedJobItem({
  job,
  colors,
  onUnsave,
}: {
  job: { id: string; title?: string; company?: string; location?: string };
  colors: ReturnType<typeof useThemeColors>;
  onUnsave: (itemId: string, type: 'post' | 'project' | 'club' | 'job') => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/job/${job.id}`);
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { backgroundColor: colors.surfaceHover },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.projectIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="briefcase" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardAuthor, { color: colors.text }]} numberOfLines={1}>
            {job.title ?? 'Untitled Job'}
          </Text>
          {(job.company || job.location) && (
            <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>
              {[job.company, job.location].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onUnsave(job.id, 'job');
          }}
          hitSlop={8}
        >
          <Ionicons name="bookmark" size={18} color={colors.primary} />
        </Pressable>
      </View>
    </Pressable>
  );
});

// ─── Screen ──────────────────────────────────────────────────

export default function SavedItemsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { identity } = useIdentityContext();
  const userId = identity?.user_id ?? '';
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('posts');

  // Phase 13.7 — Realtime saved items subscription
  useRealtimeSubscription({
    channelName: CHANNELS.savedItems(userId),
    table: 'saved_items',
    event: '*',
    filter: `user_id=eq.${userId}`,
    onPayload: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.savedItems(userId) }),
    enabled: !!userId,
  });

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: QUERY_KEYS.savedItems(userId),
    queryFn: () => getSavedItems(userId),
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  // ─── Unsave mutation ─────────────────────────────────────
  const unsaveMut = useMutation({
    mutationFn: ({ itemId, type }: { itemId: string; type: 'post' | 'project' | 'club' | 'job' }) =>
      toggleSaveItem(userId, type, itemId),
    onSuccess: (_res, vars) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.savedItems(userId) });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to unsave item. Please try again.');
    },
  });

  const handleUnsave = useCallback(
    (itemId: string, type: 'post' | 'project' | 'club' | 'job') => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      unsaveMut.mutate({ itemId, type });
    },
    [unsaveMut],
  );

  const activeData = useMemo(() => {
    if (!data) return [];
    switch (activeTab) {
      case 'posts':
        return data.posts ?? [];
      case 'projects':
        return data.projects ?? [];
      case 'clubs':
        return data.clubs ?? [];
      case 'jobs':
        return []; // Jobs saved items not yet returned by API — placeholder
      default:
        return [];
    }
  }, [data, activeTab]);

  const renderPost = useCallback(
    ({ item }: { item: any }) => <SavedPostItem post={item} colors={colors} onUnsave={handleUnsave} />,
    [colors, handleUnsave],
  );

  const renderProject = useCallback(
    ({ item }: { item: any }) => <SavedProjectItem project={item} colors={colors} onUnsave={handleUnsave} />,
    [colors, handleUnsave],
  );

  const renderClub = useCallback(
    ({ item }: { item: any }) => <SavedClubItem club={item} colors={colors} onUnsave={handleUnsave} />,
    [colors, handleUnsave],
  );

  const renderJob = useCallback(
    ({ item }: { item: any }) => <SavedJobItem job={item} colors={colors} onUnsave={handleUnsave} />,
    [colors, handleUnsave],
  );

  const renderItem =
    activeTab === 'posts'
      ? renderPost
      : activeTab === 'projects'
        ? renderProject
        : activeTab === 'jobs'
          ? renderJob
          : renderClub;

  const keyExtractor = useCallback((item: any) => item.id, []);

  const counts = useMemo(
    () => ({
      posts: data?.posts?.length ?? 0,
      projects: data?.projects?.length ?? 0,
      clubs: data?.clubs?.length ?? 0,
      jobs: 0, // Not yet returned by API
    }),
    [data],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 8),
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Saved Items</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab(tab.key);
              }}
              style={[
                styles.tab,
                isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={isActive ? colors.primary : colors.textTertiary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? colors.primary : colors.textTertiary },
                ]}
              >
                {tab.label}{counts[tab.key] > 0 ? ` (${counts[tab.key]})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeData.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="bookmark-outline" size={56} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No {activeTab} saved yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Items you save will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
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
  listContent: { padding: 16, gap: 12 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardAuthor: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
  },
  cardMeta: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
  },
  cardContent: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    lineHeight: fontSize.base * 1.4,
  },
  projectIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
  },
  tagMore: {
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
