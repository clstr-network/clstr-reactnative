import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { QUERY_KEYS, MOBILE_QUERY_KEYS } from '@/lib/query-keys';
import PostCard from '@/components/PostCard';
import ShareSheet from '@/components/ShareSheet';
import RepostSheet from '@/components/RepostSheet';
import { useFeedSubscription } from '@/lib/hooks/useFeedSubscription';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { useNotificationSubscription } from '@/lib/hooks/useNotificationSubscription';
import { useAuth } from '@/lib/auth-context';
import { getConnectionCount, getProfileViewsCount } from '@/lib/api/profile';
import {
  getPosts,
  toggleReaction,
  createRepost,
  deleteRepost,
  type Post,
  type ReactionType,
} from '@/lib/api';
import { toggleSavePost, voteOnPoll } from '@/lib/api/social';

type SortOrder = 'recent' | 'top';

export default function FeedScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const [sortOrder, setSortOrder] = useState<SortOrder>('recent');

  // Phase 11 — Share & Repost sheet state
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [repostTarget, setRepostTarget] = useState<{ postId: string; isReposted: boolean; authorName?: string; content?: string } | null>(null);

  const PAGE_SIZE = 20;

  // Phase 3.2 — Realtime feed subscription
  const { hasNewPosts, dismissNewPosts } = useFeedSubscription();

  // Phase 4 — Role-based permissions
  const { canCreatePost, isAlumni, isFaculty, isClub, profileType } = useFeatureAccess();

  // F12 — Notification badge
  const { unreadCount } = useNotificationSubscription();

  // Phase 12.1 — Network stats
  const { data: connectionCount = 0 } = useQuery({
    queryKey: MOBILE_QUERY_KEYS.connectionCount(user?.id ?? ''),
    queryFn: () => getConnectionCount(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const { data: profileViewsCount = 0 } = useQuery({
    queryKey: ['profileViewsCount', user?.id ?? ''],
    queryFn: () => getProfileViewsCount(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const roleBadge = isAlumni ? 'Mentor' : isClub ? 'Club Lead' : isFaculty ? 'Faculty' : null;

  // F7 — Infinite query pagination
  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: [...QUERY_KEYS.feed, sortOrder],
    queryFn: ({ pageParam = 0 }) => getPosts({ page: pageParam, limit: PAGE_SIZE, sort: sortOrder }),
    getNextPageParam: (lastPage, allPages) => {
      // If the last page returned fewer than PAGE_SIZE items, there are no more
      if (!lastPage || lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length; // next page index
    },
    initialPageParam: 0,
    staleTime: 30_000,       // 30s — feed refreshes frequently via realtime
    gcTime: 5 * 60 * 1000,   // 5min
  });

  const posts = data?.pages.flat() ?? [];

  const reactionMutation = useMutation({
    mutationFn: ({ postId, type }: { postId: string; type: ReactionType }) =>
      toggleReaction(postId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (postId: string) => toggleSavePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
    },
  });

  const pollVoteMutation = useMutation({
    mutationFn: ({ postId, optionIndex }: { postId: string; optionIndex: number }) =>
      voteOnPoll(postId, optionIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
    },
  });

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
  }, [queryClient]);

  const handleReact = useCallback(
    (postId: string, type: ReactionType) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      reactionMutation.mutate({ postId, type });
    },
    [reactionMutation],
  );

  const handleSave = useCallback(
    (postId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      saveMutation.mutate(postId);
    },
    [saveMutation],
  );

  const handleVotePoll = useCallback(
    (postId: string, optionIndex: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      pollVoteMutation.mutate({ postId, optionIndex });
    },
    [pollVoteMutation],
  );

  const handlePress = useCallback((postId: string) => {
    router.push({ pathname: '/post/[id]', params: { id: postId } });
  }, []);

  const handleComment = useCallback((postId: string) => {
    router.push({ pathname: '/post/[id]', params: { id: postId } });
  }, []);

  // Phase 11 — Open ShareSheet with post context
  const handleShare = useCallback((post: Post) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSharePost(post);
  }, []);

  // Phase 11 — Open RepostSheet with post context
  const handleRepost = useCallback(
    (postId: string, isReposted: boolean, authorName?: string, content?: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setRepostTarget({ postId, isReposted, authorName, content });
    },
    [],
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: Post }) => (
      <PostCard
        post={{
          id: item.id,
          user_id: item.user_id,
          content: item.content,
          images: item.images ?? null,
          video: (item as any).video ?? null,
          documents: (item as any).documents ?? null,
          poll: (item as any).poll ?? null,
          user: item.profile
            ? {
                id: item.profile.id ?? item.user_id,
                full_name: item.profile.full_name,
                avatar_url: item.profile.avatar_url,
                role: item.profile.role ?? undefined,
              }
            : undefined,
          likes_count: item.likes_count,
          comments_count: item.comments_count,
          shares_count: item.shares_count,
          reposts_count: item.reposts_count,
          created_at: item.created_at,
          saved: !!item.is_saved,
          reposted: !!item.reposted,
          userReaction: item.user_reaction ?? null,
          topReactions: item.reactions_summary
            ? Object.entries(item.reactions_summary)
                .map(([type, count]) => ({ type, count, emoji: '' }))
                .sort((a, b) => b.count - a.count)
            : undefined,
          isRepost: !!(item as any).is_repost,
          originalPost: (item as any).original_post ?? null,
          repostCommentary: (item as any).repost_commentary ?? null,
        }}
        onPress={() => handlePress(item.id)}
        onReact={(type) => handleReact(item.id, type)}
        onComment={() => handleComment(item.id)}
        onShare={() => handleShare(item)}
        onRepost={() => handleRepost(item.id, !!item.reposted, item.profile?.full_name, item.content)}
        onSave={() => handleSave(item.id)}
        onVotePoll={(index) => handleVotePoll(item.id, index)}
        onPostRemoved={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed })}
      />
    ),
    [handlePress, handleReact, handleComment, handleShare, handleRepost, handleSave, handleVotePoll, queryClient],
  );

  const keyExtractor = useCallback((item: Post) => item.id, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + webTopInset + 12,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>Feed</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/(tabs)/events')}
            style={styles.headerIconBtn}
            hitSlop={8}
          >
            <Ionicons name="calendar-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/notifications')}
            style={styles.headerIconBtn}
            hitSlop={8}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadCount > 99 ? '99+' : String(unreadCount)}
                </Text>
              </View>
            )}
          </Pressable>
          {canCreatePost && (
            <Pressable
              onPress={() => router.push('/create-post')}
              style={[styles.composeBtn, { backgroundColor: colors.primary }]}
              hitSlop={8}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Phase 6 — Quick compose prompt */}
      {canCreatePost && (
        <Pressable
          onPress={() => router.push('/create-post')}
          style={[styles.quickCompose, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.quickComposeAvatar, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="person" size={16} color={colors.textTertiary} />
          </View>
          <Text style={[styles.quickComposePlaceholder, { color: colors.textTertiary }]}>
            What's on your mind?
          </Text>
        </Pressable>
      )}

      {/* Phase 12.1 — Network Stats Row */}
      {user && (
        <View style={[styles.statsRow, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/connections'); }}
            style={[styles.statCard, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="people-outline" size={18} color={colors.tint} />
            <Text style={[styles.statNum, { color: colors.text }]}>{connectionCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Connections</Text>
          </Pressable>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/profile'); }}
            style={[styles.statCard, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="eye-outline" size={18} color={colors.tint} />
            <Text style={[styles.statNum, { color: colors.text }]}>{profileViewsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Profile Views</Text>
          </Pressable>
          {roleBadge && (
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Ionicons
                name={isAlumni ? 'school-outline' : isClub ? 'shield-outline' : 'ribbon-outline'}
                size={18}
                color={colors.accent}
              />
              <Text style={[styles.roleBadgeText, { color: colors.accent }]}>{roleBadge}</Text>
            </View>
          )}
        </View>
      )}

      {/* Phase 6 — Sort toggle */}
      <View style={[styles.sortRow, { borderBottomColor: colors.border }]}>
        {(['recent', 'top'] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => {
              if (sortOrder !== s) {
                Haptics.selectionAsync();
                setSortOrder(s);
              }
            }}
            style={[
              styles.sortChip,
              sortOrder === s
                ? { backgroundColor: colors.tint }
                : { borderColor: colors.border, borderWidth: 1 },
            ]}
          >
            <Ionicons
              name={s === 'recent' ? 'time-outline' : 'trending-up-outline'}
              size={14}
              color={sortOrder === s ? '#fff' : colors.textSecondary}
            />
            <Text style={[styles.sortChipText, { color: sortOrder === s ? '#fff' : colors.textSecondary }]}>
              {s === 'recent' ? 'Recent' : 'Top'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Phase 3.2 — "New posts" banner */}
      {hasNewPosts && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            dismissNewPosts();
          }}
          style={[styles.newPostsBanner, { backgroundColor: colors.tint }]}
        >
          <Ionicons name="arrow-up" size={16} color="#fff" />
          <Text style={styles.newPostsText}>New posts available</Text>
        </Pressable>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          removeClippedSubviews={Platform.OS === 'android'}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading && !isFetchingNextPage}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={{ paddingVertical: 20 }} color={colors.tint} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="newspaper-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No posts yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                Be the first to post in your campus feed
              </Text>
            </View>
          }
        />
      )}

      {/* Phase 11 — ShareSheet */}
      <ShareSheet
        visible={!!sharePost}
        onClose={() => setSharePost(null)}
        shareData={{
          type: 'post',
          id: sharePost?.id ?? '',
          previewText: sharePost?.content ?? undefined,
          authorName: sharePost?.profile?.full_name ?? undefined,
        }}
      />

      {/* Phase 11 — RepostSheet */}
      <RepostSheet
        visible={!!repostTarget}
        onClose={() => setRepostTarget(null)}
        postId={repostTarget?.postId ?? ''}
        isReposted={repostTarget?.isReposted ?? false}
        postPreview={{
          authorName: repostTarget?.authorName,
          content: repostTarget?.content,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
  },
  composeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newPostsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20,
  },
  newPostsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  listContent: { paddingTop: 8, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  emptySubtext: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  quickCompose: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 24, borderWidth: 1, gap: 10 },
  quickComposeAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  quickComposePlaceholder: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  sortRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8, borderBottomWidth: 1 },
  sortChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  sortChipText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  // Phase 12.1 — Stats row styles
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: 1 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, gap: 2 },
  statNum: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  roleBadgeText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', marginTop: 2 },
});
