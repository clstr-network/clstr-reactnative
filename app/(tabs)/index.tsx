import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  useColorScheme,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { QUERY_KEYS } from '@/lib/query-keys';
import PostCard from '@/components/PostCard';
import { useFeedSubscription } from '@/lib/hooks/useFeedSubscription';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import {
  getPosts,
  toggleReaction,
  type Post,
  type ReactionType,
} from '@/lib/api';

export default function FeedScreen() {
  const colors = useThemeColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  // Phase 3.2 — Realtime feed subscription
  const { hasNewPosts, dismissNewPosts } = useFeedSubscription();

  // Phase 4 — Role-based permissions
  const { canCreatePost } = useFeatureAccess();

  const { data: posts = [], isLoading, isFetching } = useQuery({
    queryKey: QUERY_KEYS.feed,
    queryFn: () => getPosts({ page: 0, limit: 20 }),
  });

  const reactionMutation = useMutation({
    mutationFn: ({ postId, type }: { postId: string; type: ReactionType }) =>
      toggleReaction(postId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
    },
  });

  const handleRefresh = useCallback(async () => {
    setPage(0);
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
  }, [queryClient]);

  const handleReact = useCallback(
    (postId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      reactionMutation.mutate({ postId, type: 'like' });
    },
    [reactionMutation],
  );

  const handlePress = useCallback((postId: string) => {
    router.push({ pathname: '/post/[id]', params: { id: postId } });
  }, []);

  const handleComment = useCallback((postId: string) => {
    router.push({ pathname: '/post/[id]', params: { id: postId } });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Post }) => (
      <PostCard
        post={{
          id: item.id,
          content: item.content,
          user: item.profile
            ? {
                full_name: item.profile.full_name,
                avatar_url: item.profile.avatar_url,
                role: item.profile.role ?? undefined,
              }
            : undefined,
          likes_count: item.likes_count,
          comments_count: item.comments_count,
          created_at: item.created_at,
          userReaction: item.user_reaction,
          topReactions: item.reactions_summary
            ? Object.entries(item.reactions_summary)
                .map(([type, count]) => ({ type, count }))
                .sort((a, b) => b.count - a.count)
            : undefined,
        }}
        onPress={() => handlePress(item.id)}
        onReact={() => handleReact(item.id)}
        onComment={() => handleComment(item.id)}
      />
    ),
    [handlePress, handleReact, handleComment],
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
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
            />
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
});
