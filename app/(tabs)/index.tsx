import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, useColorScheme, Platform, RefreshControl, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { PostCard } from '@/components/PostCard';
import { getPosts, toggleLikePost, type Post } from '@/lib/storage';
import { useAuth } from '@/lib/auth-context';
import { useAppStateLifecycle } from '@/lib/app-state';

const CATEGORIES = ['All', 'Academic', 'Career', 'Events', 'Social', 'General'];

export default function FeedScreen() {
  const colors = useThemeColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('All');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: getPosts,
  });

  useAppStateLifecycle({
    onForeground: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const filteredPosts = activeCategory === 'All'
    ? posts
    : posts.filter(p => p.category === activeCategory.toLowerCase());

  const handleLike = useCallback(async (id: string) => {
    const updated = await toggleLikePost(id);
    queryClient.setQueryData(['posts'], updated);
  }, [queryClient]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['posts'] });
  }, [queryClient]);

  const handlePostPress = useCallback((id: string) => {
    router.push({ pathname: '/post/[id]', params: { id } });
  }, []);

  const handlePostLongPress = useCallback((id: string) => {
    const post = posts.find(p => p.id === id);
    router.push({ pathname: '/post-actions', params: { id, isSaved: String(post?.isSaved ?? false) } });
  }, [posts]);

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard post={item} onLike={handleLike} onPress={handlePostPress} onLongPress={handlePostLongPress} />
  ), [handleLike, handlePostPress, handlePostLongPress]);

  const keyExtractor = useCallback((item: Post) => item.id, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.logo, { color: colors.tint }]}>clstr</Text>
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push('/notifications')} hitSlop={8}>
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
            </Pressable>
          </View>
        </View>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryList}
          contentContainerStyle={styles.categoryContent}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { setActiveCategory(item); Haptics.selectionAsync(); }}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: activeCategory === item ? colors.tint : colors.surfaceElevated,
                  borderColor: activeCategory === item ? colors.tint : colors.border,
                },
              ]}
            >
              <Text style={[styles.categoryText, { color: activeCategory === item ? '#fff' : colors.textSecondary }]}>
                {item}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          renderItem={renderPost}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.tint} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="newspaper-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No posts in this category</Text>
            </View>
          }
        />
      )}

      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/create-post'); }}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.tint, bottom: 100 + (Platform.OS === 'web' ? 34 : 0) },
          pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] },
        ]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1 },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8,
  },
  logo: { fontSize: 28, fontWeight: '900', letterSpacing: -1, fontFamily: 'Inter_800ExtraBold' },
  headerActions: { flexDirection: 'row', gap: 16 },
  categoryList: { flexGrow: 0 },
  categoryContent: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  categoryText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  listContent: { paddingTop: 12, paddingBottom: 120 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  fab: {
    position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', elevation: 8,
  },
});
