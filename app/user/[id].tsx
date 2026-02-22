import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, useColorScheme, Platform
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useThemeColors, getRoleBadgeColor } from '@/constants/colors';
import { Avatar } from '@/components/Avatar';
import { RoleBadge } from '@/components/RoleBadge';
import { PostCard } from '@/components/PostCard';
import { getConnectionById, updateConnectionStatus, getPosts, toggleLikePost, type Post } from '@/lib/storage';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const { data: profile } = useQuery({
    queryKey: ['user', id],
    queryFn: () => getConnectionById(id!),
    enabled: !!id,
  });

  const { data: allPosts = [] } = useQuery({
    queryKey: ['posts'],
    queryFn: getPosts,
  });

  const userPosts = allPosts.filter(p => p.authorId === id);

  const handleConnect = async () => {
    if (!profile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = await updateConnectionStatus(profile.id, 'connected');
    queryClient.setQueryData(['connections'], updated);
    queryClient.invalidateQueries({ queryKey: ['user', id] });
  };

  const handleLike = useCallback(async (postId: string) => {
    const updated = await toggleLikePost(postId);
    queryClient.setQueryData(['posts'], updated);
  }, [queryClient]);

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
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

  const badgeColor = getRoleBadgeColor(profile.role, colors);

  const renderPost = ({ item }: { item: Post }) => (
    <PostCard post={item} onLike={handleLike} onPress={(pid) => router.push({ pathname: '/post/[id]', params: { id: pid } })} />
  );

  const ProfileHeader = () => (
    <View>
      <View style={[styles.profileBg, { backgroundColor: badgeColor + '12' }]}>
        <View style={styles.profileInfo}>
          <Avatar uri={profile.avatarUrl} name={profile.name} size={80} showBorder />
          <Text style={[styles.name, { color: colors.text }]}>{profile.name}</Text>
          <Text style={[styles.username, { color: colors.textSecondary }]}>@{profile.username}</Text>
          <RoleBadge role={profile.role} size="medium" />
          {!!profile.bio && <Text style={[styles.bio, { color: colors.textSecondary }]}>{profile.bio}</Text>}
        </View>

        <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.text }]}>{profile.connectionsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Connections</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.text }]}>{profile.postsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.text }]}>{profile.department}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Department</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {profile.status === 'connected' ? (
            <View style={[styles.connectedBtn, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.connectedText, { color: colors.success }]}>Connected</Text>
            </View>
          ) : (
            <Pressable
              onPress={handleConnect}
              style={({ pressed }) => [
                styles.connectBtn, { backgroundColor: colors.tint },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="person-add" size={16} color="#fff" />
              <Text style={styles.connectBtnText}>{profile.status === 'pending' ? 'Accept' : 'Connect'}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => {}}
            style={[styles.msgBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {userPosts.length > 0 && (
        <View style={styles.postsHeader}>
          <Text style={[styles.postsTitle, { color: colors.text }]}>Posts ({userPosts.length})</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{profile.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={userPosts}
        renderItem={renderPost}
        keyExtractor={item => item.id}
        ListHeaderComponent={ProfileHeader}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.noPostsState}>
            <Ionicons name="newspaper-outline" size={36} color={colors.textTertiary} />
            <Text style={{ color: colors.textTertiary, fontSize: 14 }}>No posts yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileBg: { paddingBottom: 20 },
  profileInfo: { alignItems: 'center', paddingTop: 24, gap: 6 },
  name: { fontSize: 24, fontWeight: '800', marginTop: 8 },
  username: { fontSize: 15 },
  bio: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, marginTop: 4, lineHeight: 20 },
  statsRow: {
    flexDirection: 'row', marginTop: 20, marginHorizontal: 16, borderRadius: 14, overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, marginVertical: 10 },
  actionRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, gap: 10 },
  connectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 12, gap: 6,
  },
  connectBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  connectedBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 12, gap: 6, borderWidth: 1,
  },
  connectedText: { fontSize: 15, fontWeight: '700' },
  msgBtn: {
    width: 48, height: 48, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  postsHeader: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  postsTitle: { fontSize: 18, fontWeight: '700' },
  noPostsState: { alignItems: 'center', paddingTop: 40, gap: 8 },
});
