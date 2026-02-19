/**
 * PostDetailScreen — Full post view with comments.
 *
 * Receives { id } from route params.
 * V1: Read-only comments list. No comment creation (Phase 7+).
 */
import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@clstr/shared/navigation/types';
import { useQuery } from '@tanstack/react-query';
import { getPostById, getComments } from '@clstr/core/api/social-api';
import type { Comment } from '@clstr/core/api/social-api';
import { supabase } from '@clstr/shared/integrations/supabase/client';
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { useTheme } from '@clstr/shared/design/useTheme';
import { tokens } from '@clstr/shared/design/tokens';
import { ErrorState } from '@clstr/shared/components/ui/ErrorState';
import { EmptyState } from '@clstr/shared/components/ui/EmptyState';
import { UserAvatar } from '@clstr/shared/components/ui/UserAvatar';
import { View } from '@clstr/shared/components/ui/primitives/View';
import { Text } from '@clstr/shared/components/ui/primitives/Text';
import { Pressable } from '@clstr/shared/components/ui/primitives/Pressable';
import { Skeleton } from '@clstr/shared/components/ui/Skeleton';
import { Card } from '@clstr/shared/components/ui/Card';

import { timeAgo } from '../../utils/timeAgo';

type PostDetailRoute = RouteProp<HomeStackParamList, 'PostDetail'>;
type PostDetailNav = NativeStackNavigationProp<HomeStackParamList, 'PostDetail'>;

export function PostDetailScreen() {
  const route = useRoute<PostDetailRoute>();
  const navigation = useNavigation<PostDetailNav>();
  const { colors } = useTheme();
  const { id: postId } = route.params;

  // ── Post query ──
  const postQuery = useQuery({
    queryKey: [...QUERY_KEYS.feed.postDetail(), postId],
    queryFn: () => getPostById(supabase, postId),
    enabled: !!postId,
  });

  // ── Comments query ──
  const commentsQuery = useQuery({
    queryKey: QUERY_KEYS.feed.postComments(postId),
    queryFn: () => getComments(supabase, postId),
    enabled: !!postId,
  });

  const post = postQuery.data;
  const comments: Comment[] = (commentsQuery.data as Comment[]) ?? [];

  // ── Loading state ──
  if (postQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        <Header onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <Skeleton width="80%" height={16} style={{ marginTop: 12 }} />
          <Skeleton width="100%" height={14} style={{ marginTop: 8 }} />
          <Skeleton width="60%" height={14} style={{ marginTop: 8 }} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ──
  if (postQuery.isError || !post) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        <Header onBack={() => navigation.goBack()} />
        <ErrorState
          message={postQuery.error?.message ?? 'Post not found'}
          onRetry={() => postQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentRow}>
      <UserAvatar
        src={item.user?.avatar_url}
        name={item.user?.full_name ?? ''}
        size={32}
      />
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text weight="semibold" size="xs">
            {item.user?.full_name ?? 'Anonymous'}
          </Text>
          <Text size="xs" muted>
            {timeAgo(item.created_at)}
          </Text>
        </View>
        <Text size="sm" style={styles.commentText}>
          {item.content}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      <Header onBack={() => navigation.goBack()} />

      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={renderComment}
        ListHeaderComponent={
          <View>
            {/* Full post content */}
            <Card style={styles.postCard}>
              <View style={styles.postHeader}>
                <UserAvatar
                  src={post.user?.avatar_url}
                  name={post.user?.full_name ?? ''}
                  size={44}
                />
                <View style={styles.postHeaderText}>
                  <Text weight="semibold" size="sm">
                    {post.user?.full_name ?? 'Anonymous'}
                  </Text>
                  <Text size="xs" muted>
                    {post.user?.role ?? 'Member'} · {timeAgo(post.created_at)}
                  </Text>
                </View>
              </View>

              <View style={styles.postContent}>
                <Text size="sm">{post.content}</Text>
              </View>

              <View style={[styles.postFooter, { borderTopColor: colors.border }]}>
                <Text size="xs" muted>
                  👍 {post.likes_count ?? 0}
                </Text>
                <Text size="xs" muted style={styles.footerSpacer}>
                  💬 {post.comments_count ?? 0}
                </Text>
              </View>
            </Card>

            {/* Comments header */}
            <View style={styles.commentsHeader}>
              <Text weight="semibold" size="sm">
                Comments
              </Text>
            </View>

            {commentsQuery.isLoading && (
              <View style={styles.commentsSkeleton}>
                <Skeleton width="100%" height={40} />
                <Skeleton width="100%" height={40} style={{ marginTop: 8 }} />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !commentsQuery.isLoading ? (
            <EmptyState
              title="No comments yet"
              description="Comments will appear here."
            />
          ) : null
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ── Back button header ──
function Header({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.headerBar}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Text size="lg" style={{ color: colors.primary }}>
          ← Back
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  backBtn: {
    paddingVertical: tokens.spacing.xs,
  },
  loadingContainer: {
    padding: tokens.spacing.lg,
  },
  postCard: {
    marginHorizontal: tokens.spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.spacing.md,
  },
  postHeaderText: {
    marginLeft: tokens.spacing.sm,
    flex: 1,
  },
  postContent: {
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.md,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerSpacer: {
    marginLeft: tokens.spacing.md,
  },
  commentsHeader: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
  },
  commentsSkeleton: {
    paddingHorizontal: tokens.spacing.lg,
  },
  commentRow: {
    flexDirection: 'row',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
  },
  commentBody: {
    flex: 1,
    marginLeft: tokens.spacing.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentText: {
    marginTop: 2,
  },
  listContent: {
    paddingBottom: tokens.spacing.xl,
  },
});
