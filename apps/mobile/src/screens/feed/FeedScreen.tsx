/**
 * FeedScreen — Main feed screen.
 *
 * Uses FlatList with infinite scroll, pull-to-refresh,
 * and real-time subscription via useFeedRealtime().
 *
 * V1: Static display only. No reactions, no post creation.
 */
import React, { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@clstr/shared/navigation/types';
import { useTheme } from '@clstr/shared/design/useTheme';
import { tokens } from '@clstr/shared/design/tokens';
import { EmptyState } from '@clstr/shared/components/ui/EmptyState';
import { ErrorState } from '@clstr/shared/components/ui/ErrorState';
import { H3 } from '@clstr/shared/components/ui/Typography';
import { View } from '@clstr/shared/components/ui/primitives/View';

import { useFeed } from '../../hooks/useFeed';
import { useFeedRealtime } from '../../hooks/useFeedRealtime';
import { PostCard } from '../../components/feed/PostCard';
import { PostSkeleton } from '../../components/feed/PostSkeleton';
import type { Post } from '@clstr/core/api/social-api';

type FeedNav = NativeStackNavigationProp<HomeStackParamList, 'HomeScreen'>;

export function FeedScreen() {
  const navigation = useNavigation<FeedNav>();
  const { colors } = useTheme();

  const {
    posts,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useFeed();

  // Wire realtime invalidation
  useFeedRealtime();

  const handlePostPress = useCallback(
    (postId: string) => {
      navigation.navigate('PostDetail', { id: postId });
    },
    [navigation],
  );

  const handleAvatarPress = useCallback(
    (userId: string) => {
      navigation.navigate('Profile', { id: userId });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Post }) => (
      <PostCard
        post={item}
        onPress={() => handlePostPress(item.id)}
      />
    ),
    [handlePostPress],
  );

  const keyExtractor = useCallback((item: Post) => item.id, []);

  // ── Loading state ──
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.headerBar}>
          <H3>Feed</H3>
        </View>
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </SafeAreaView>
    );
  }

  // ── Error state ──
  if (isError) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.headerBar}>
          <H3>Feed</H3>
        </View>
        <ErrorState
          message={error?.message ?? 'Failed to load feed'}
          onRetry={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.headerBar}>
        <H3>Feed</H3>
      </View>

      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onEndReached={() => {
          if (hasNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No posts yet"
            description="Be the first to share something with your campus."
          />
        }
        ListFooterComponent={isFetchingNextPage ? <PostSkeleton /> : null}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
  },
  listContent: {
    paddingBottom: tokens.spacing.xl,
  },
});
