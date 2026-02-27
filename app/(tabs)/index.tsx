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
import { FeedSkeleton } from '@/components/Skeletons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
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
    queryKey: MOBILE_QUERY_KEYS.profileViewsCount(user?.id ?? ''),
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
    staleTime: 60_000,       // 60s — realtime subscription handles live updates
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
      {/* Header: hamburger + search + avatar */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + webTopInset + 8,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.push('/(tabs)/more')}
          style={styles.headerIconBtn}
          hitSlop={8}
        >
          <Ionicons name="menu" size={24} color={colors.text} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/search')}
          style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.searchPlaceholder, { color: colors.textTertiary }]}>Search...</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          hitSlop={8}
        >
          {user ? (
            <View style={styles.avatarRing}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.tint }]}>
                <Text style={styles.avatarInitial}>
                  {(user.user_metadata?.full_name ?? user.email ?? 'U')[0].toUpperCase()}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.avatarCircle, { backgroundColor: colors.surface }]}>
              <Ionicons name="person" size={18} color={colors.textTertiary} />
            </View>
          )}
        </Pressable>
      </View>

      {/* Quick compose — matches UI design */}
      <View style={[styles.quickComposeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.quickComposeRow}>
          <View style={[styles.quickComposeAvatar, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="person" size={16} color={colors.textTertiary} />
          </View>
          <Pressable
            onPress={() => canCreatePost && router.push('/create-post')}
            style={[styles.quickComposeInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          >
            <Text style={[styles.quickComposePlaceholder, { color: colors.textTertiary }]} numberOfLines={1}>
              Share something with your network...
            </Text>
          </Pressable>
        </View>
        <View style={[styles.quickComposeActions, { borderTopColor: colors.border }]}>
          <Pressable
            onPress={() => canCreatePost && router.push('/create-post')}
            style={styles.quickComposeActionBtn}
          >
            <Ionicons name="image-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.quickComposeActionText, { color: colors.textSecondary }]}>Photo</Text>
          </Pressable>
          <View style={[styles.quickComposeDivider, { backgroundColor: colors.border }]} />
          <Pressable
            onPress={() => canCreatePost && router.push('/create-post')}
            style={styles.quickComposeActionBtn}
          >
            <Ionicons name="videocam-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.quickComposeActionText, { color: colors.textSecondary }]}>Video</Text>
          </Pressable>
          <View style={[styles.quickComposeDivider, { backgroundColor: colors.border }]} />
          <Pressable
            onPress={() => canCreatePost && router.push('/create-post')}
            style={styles.quickComposeActionBtn}
          >
            <Ionicons name="document-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.quickComposeActionText, { color: colors.textSecondary }]}>Document</Text>
          </Pressable>
        </View>
      </View>



      {/* Sort by row — right-aligned dropdown style */}
      <View style={[styles.sortRow, { borderBottomColor: colors.border }]}>
        <View style={styles.sortRowSpacer} />
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setSortOrder(sortOrder === 'recent' ? 'top' : 'recent');
          }}
          style={styles.sortDropdown}
        >
          <Text style={[styles.sortDropdownLabel, { color: colors.textSecondary }]}>Sort by: </Text>
          <Text style={[styles.sortDropdownValue, { color: colors.text }]}>
            {sortOrder === 'recent' ? 'Recent' : 'Top'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.text} />
        </Pressable>
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
        <FeedSkeleton />
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
  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    borderRadius: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  searchPlaceholder: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    flex: 1,
  },
  avatarRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#a855f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
  },
  // ── Quick Compose ──
  quickComposeCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  quickComposeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quickComposeAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  quickComposeInput: {
    flex: 1,
    height: 38,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  quickComposePlaceholder: { fontSize: fontSize.md, fontFamily: fontFamily.regular },
  quickComposeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  quickComposeActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  quickComposeActionText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
  },
  quickComposeDivider: {
    width: 1,
    height: 20,
  },
  // ── Sort row ──
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginTop: 4,
  },
  sortRowSpacer: { flex: 1 },
  sortDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sortDropdownLabel: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
  },
  sortDropdownValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
  },
  // ── Misc ──
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
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
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
    fontSize: fontSize.base,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
  },
  listContent: { paddingTop: 8, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: fontSize.lg, fontWeight: '600', fontFamily: fontFamily.semiBold },
  emptySubtext: { fontSize: fontSize.base, fontFamily: fontFamily.regular },
});
