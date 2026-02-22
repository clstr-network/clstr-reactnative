import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable, useColorScheme, Platform
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useThemeColors, getRoleBadgeColor } from '@/constants/colors';
import { Avatar } from '@/components/Avatar';
import { RoleBadge } from '@/components/RoleBadge';
import { formatRelativeTime } from '@/lib/time';
import { getPostById, toggleLikePost, toggleSavePost, addComment, getPosts, type Comment } from '@/lib/storage';
import { useAuth } from '@/lib/auth-context';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const { data: post } = useQuery({
    queryKey: ['post', id],
    queryFn: () => getPostById(id!),
    enabled: !!id,
  });

  if (!post) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Post</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={{ color: colors.textSecondary }}>Post not found</Text>
        </View>
      </View>
    );
  }

  const handleLike = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await toggleLikePost(post.id);
    queryClient.setQueryData(['posts'], updated);
    queryClient.invalidateQueries({ queryKey: ['post', id] });
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await toggleSavePost(post.id);
    queryClient.setQueryData(['posts'], updated);
    queryClient.invalidateQueries({ queryKey: ['post', id] });
  };

  const handleAddComment = async () => {
    const text = commentText.trim();
    if (!text || !user) return;
    setCommentText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await addComment(post.id, {
      authorId: user.id,
      authorName: user.name,
      authorAvatar: user.avatarUrl,
      authorRole: user.role,
      content: text,
    });
    queryClient.setQueryData(['posts'], updated);
    queryClient.invalidateQueries({ queryKey: ['post', id] });
    inputRef.current?.focus();
  };

  const CATEGORY_COLORS: Record<string, string> = {
    academic: '#3B82F6', career: '#F59E0B', events: '#8B5CF6', social: '#10B981', general: '#6B7280',
  };
  const catColor = CATEGORY_COLORS[post.category] || '#6B7280';

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={[styles.commentCard, { borderBottomColor: colors.border }]}>
      <Avatar uri={item.authorAvatar} name={item.authorName} size={34} />
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={[styles.commentName, { color: colors.text }]}>{item.authorName}</Text>
          <RoleBadge role={item.authorRole} size="small" />
          <Text style={[styles.commentTime, { color: colors.textTertiary }]}>{formatRelativeTime(item.createdAt)}</Text>
        </View>
        <Text style={[styles.commentContent, { color: colors.text }]}>{item.content}</Text>
      </View>
    </View>
  );

  const ListHeader = () => (
    <View>
      <View style={styles.postSection}>
        <View style={styles.authorRow}>
          <Pressable
            style={styles.authorInfo}
            onPress={() => router.push({ pathname: '/user/[id]', params: { id: post.authorId } })}
          >
            <Avatar uri={post.authorAvatar} name={post.authorName} size={46} />
            <View>
              <View style={styles.nameRow}>
                <Text style={[styles.authorName, { color: colors.text }]}>{post.authorName}</Text>
                <RoleBadge role={post.authorRole} />
              </View>
              <Text style={[styles.authorMeta, { color: colors.textTertiary }]}>
                @{post.authorUsername} · {formatRelativeTime(post.createdAt)}
              </Text>
            </View>
          </Pressable>
        </View>

        <Text style={[styles.postContent, { color: colors.text }]}>{post.content}</Text>

        <View style={[styles.categoryRow, { backgroundColor: catColor + '12' }]}>
          <Ionicons name="pricetag" size={13} color={catColor} />
          <Text style={[styles.categoryLabel, { color: catColor }]}>{post.category}</Text>
        </View>

        <View style={[styles.postActions, { borderTopColor: colors.border }]}>
          <Pressable onPress={handleLike} style={styles.actionBtn} hitSlop={8}>
            <Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={22} color={post.isLiked ? colors.danger : colors.textTertiary} />
            <Text style={[styles.actionCount, { color: post.isLiked ? colors.danger : colors.textTertiary }]}>{post.likesCount}</Text>
          </Pressable>
          <View style={styles.actionBtn}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.textTertiary} />
            <Text style={[styles.actionCount, { color: colors.textTertiary }]}>{post.commentsCount}</Text>
          </View>
          <Pressable onPress={handleSave} style={styles.actionBtn} hitSlop={8}>
            <Ionicons name={post.isSaved ? 'bookmark' : 'bookmark-outline'} size={20} color={post.isSaved ? colors.warning : colors.textTertiary} />
          </Pressable>
          <Pressable style={styles.actionBtn} hitSlop={8}>
            <Ionicons name="share-outline" size={20} color={colors.textTertiary} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.commentsHeader, { borderTopColor: colors.border }]}>
        <Text style={[styles.commentsTitle, { color: colors.text }]}>
          {post.comments.length > 0 ? `Comments (${post.comments.length})` : 'Comments'}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior="padding" keyboardVerticalOffset={0}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Post</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={post.comments}
        renderItem={renderComment}
        keyExtractor={item => item.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.noComments}>
            <Text style={{ color: colors.textTertiary, fontSize: 14 }}>No comments yet. Be the first!</Text>
          </View>
        }
      />

      <View style={[styles.commentInput, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + webBottomInset + 8 }]}>
        <TextInput
          ref={inputRef}
          style={[styles.textInput, { backgroundColor: colors.surfaceElevated, color: colors.text, borderColor: colors.border }]}
          placeholder="Add a comment..."
          placeholderTextColor={colors.textTertiary}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={500}
        />
        <Pressable
          onPress={handleAddComment}
          disabled={!commentText.trim()}
          style={({ pressed }) => [
            styles.sendBtn,
            { backgroundColor: commentText.trim() ? colors.tint : colors.border },
            pressed && { opacity: 0.8 },
          ]}
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
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  postSection: { padding: 16 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  authorInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorName: { fontSize: 16, fontWeight: '700' },
  authorMeta: { fontSize: 13, marginTop: 2 },
  postContent: { fontSize: 16, lineHeight: 24, marginBottom: 14 },
  categoryRow: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 5, marginBottom: 14,
  },
  categoryLabel: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  postActions: { flexDirection: 'row', paddingTop: 12, borderTopWidth: 1, gap: 28 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { fontSize: 14, fontWeight: '500' },
  commentsHeader: { paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1 },
  commentsTitle: { fontSize: 16, fontWeight: '700' },
  commentCard: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  commentBody: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  commentName: { fontSize: 14, fontWeight: '600' },
  commentTime: { fontSize: 11 },
  commentContent: { fontSize: 14, lineHeight: 20 },
  noComments: { alignItems: 'center', paddingVertical: 32 },
  commentInput: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, gap: 8,
  },
  textInput: {
    flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 80, borderWidth: 1,
  },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
