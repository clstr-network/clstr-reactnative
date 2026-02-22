import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable, useColorScheme, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { Avatar } from '@/components/Avatar';
import { RoleBadge } from '@/components/RoleBadge';
import { getPostById, toggleLikePost, addComment, getPosts, type Post, type Comment } from '@/lib/storage';
import { useAuth } from '@/lib/auth-context';
import { formatRelativeTime } from '@/lib/time';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const { data: post } = useQuery({
    queryKey: ['post', id],
    queryFn: () => getPostById(id!),
    enabled: !!id,
  });

  const handleLike = useCallback(async () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await toggleLikePost(id);
    queryClient.setQueryData(['posts'], updated);
    queryClient.invalidateQueries({ queryKey: ['post', id] });
  }, [id, queryClient]);

  const handleComment = useCallback(async () => {
    if (!commentText.trim() || !id || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addComment(id, {
      authorId: user.id,
      authorName: user.name,
      authorAvatar: user.avatarUrl,
      authorRole: user.role,
      content: commentText.trim(),
    });
    setCommentText('');
    queryClient.invalidateQueries({ queryKey: ['post', id] });
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  }, [commentText, id, user, queryClient]);

  if (!post) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Post</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Post not found</Text>
        </View>
      </View>
    );
  }

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={[styles.commentRow, { borderTopColor: colors.border }]}>
      <Avatar uri={item.authorAvatar} name={item.authorName} size={32} />
      <View style={styles.commentInfo}>
        <View style={styles.commentHeader}>
          <Text style={[styles.commentName, { color: colors.text }]}>{item.authorName}</Text>
          <RoleBadge role={item.authorRole} />
          <Text style={[styles.commentTime, { color: colors.textTertiary }]}>{formatRelativeTime(item.createdAt)}</Text>
        </View>
        <Text style={[styles.commentContent, { color: colors.text }]}>{item.content}</Text>
      </View>
    </View>
  );

  const ListHeader = () => (
    <View style={styles.postSection}>
      <View style={styles.authorRow}>
        <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: post.authorId } })} style={styles.authorInfo}>
          <Avatar uri={post.authorAvatar} name={post.authorName} size={48} />
          <View>
            <View style={styles.nameRow}>
              <Text style={[styles.authorName, { color: colors.text }]}>{post.authorName}</Text>
              <RoleBadge role={post.authorRole} />
            </View>
            <Text style={[styles.authorMeta, { color: colors.textTertiary }]}>@{post.authorUsername} · {formatRelativeTime(post.createdAt)}</Text>
          </View>
        </Pressable>
      </View>

      <Text style={[styles.postContent, { color: colors.text }]}>{post.content}</Text>

      <View style={[styles.actionsRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
        <Pressable onPress={handleLike} style={styles.actionItem} hitSlop={8}>
          <Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={22} color={post.isLiked ? colors.danger : colors.textSecondary} />
          <Text style={[styles.actionLabel, { color: post.isLiked ? colors.danger : colors.textSecondary }]}>{post.likesCount}</Text>
        </Pressable>
        <View style={styles.actionItem}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>{post.commentsCount}</Text>
        </View>
      </View>

      {post.comments.length > 0 && (
        <Text style={[styles.commentsTitle, { color: colors.text }]}>Comments ({post.comments.length})</Text>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior="padding" keyboardVerticalOffset={0}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Post</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        ListHeaderComponent={ListHeader}
        data={post.comments}
        renderItem={renderComment}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      />

      <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 8) }]}>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          placeholder="Add a comment..."
          placeholderTextColor={colors.textTertiary}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={500}
        />
        <Pressable
          onPress={handleComment}
          disabled={!commentText.trim()}
          style={({ pressed }) => [
            styles.sendBtn,
            { backgroundColor: commentText.trim() ? colors.tint : colors.surfaceElevated },
            pressed && { opacity: 0.85 },
          ]}
          hitSlop={8}
        >
          <Ionicons name="send" size={16} color={commentText.trim() ? '#fff' : colors.textTertiary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  postSection: { padding: 16 },
  authorRow: { marginBottom: 14 },
  authorInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorName: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  authorMeta: { fontSize: 13, marginTop: 2, fontFamily: 'Inter_400Regular' },
  postContent: { fontSize: 17, lineHeight: 26, marginBottom: 16, fontFamily: 'Inter_400Regular' },
  actionsRow: {
    flexDirection: 'row', gap: 28, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1,
  },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionLabel: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  commentsTitle: { fontSize: 16, fontWeight: '700', marginTop: 16, fontFamily: 'Inter_700Bold' },
  commentRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  commentInfo: { flex: 1, gap: 4 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentName: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  commentTime: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  commentContent: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular' },
  listContent: { paddingBottom: 16 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 14,
    paddingTop: 8, borderTopWidth: 1,
  },
  input: {
    flex: 1, fontSize: 15, padding: 12, borderRadius: 20, borderWidth: 1,
    maxHeight: 100, fontFamily: 'Inter_400Regular',
  },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, fontFamily: 'Inter_400Regular' },
});
