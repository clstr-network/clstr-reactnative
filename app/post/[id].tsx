import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable, useColorScheme, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import Avatar from '@/components/Avatar';
import RoleBadge from '@/components/RoleBadge';
import { QUERY_KEYS } from '@/lib/query-keys';
import {
  getPostById,
  getComments,
  addComment,
  toggleReaction,
  type Post,
  type Comment,
  type ReactionType,
  REACTION_EMOJI_MAP,
} from '@/lib/api';
import { formatRelativeTime } from '@/lib/time';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const { data: post } = useQuery({
    queryKey: QUERY_KEYS.post ? QUERY_KEYS.post(id!) : ['post', id],
    queryFn: () => getPostById(id!),
    enabled: !!id,
    staleTime: 30_000,       // 30s
    gcTime: 5 * 60 * 1000,   // 5min
  });

  const { data: comments = [] } = useQuery({
    queryKey: QUERY_KEYS.comments ? QUERY_KEYS.comments(id!) : ['comments', id],
    queryFn: () => getComments(id!),
    enabled: !!id,
    staleTime: 15_000,       // 15s — comments update moderately
    gcTime: 5 * 60 * 1000,
  });

  const reactionMutation = useMutation({
    mutationFn: ({ postId, type }: { postId: string; type: ReactionType }) =>
      toggleReaction(postId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.post ? QUERY_KEYS.post(id!) : ['post', id] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => addComment(id!, content),
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.comments ? QUERY_KEYS.comments(id!) : ['comments', id] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.post ? QUERY_KEYS.post(id!) : ['post', id] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
    },
  });

  const handleReaction = useCallback(() => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    reactionMutation.mutate({ postId: id, type: 'like' });
  }, [id, reactionMutation]);

  const handleComment = useCallback(() => {
    if (!commentText.trim() || !id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    commentMutation.mutate(commentText.trim());
  }, [commentText, id, commentMutation]);

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

  const profile = post.profile;
  const userReaction = post.user_reaction;
  const hasReacted = !!userReaction;

  const renderComment = useCallback(({ item }: { item: Comment }) => (
    <View style={[styles.commentRow, { borderTopColor: colors.border }]}>
      <Avatar uri={item.profile?.avatar_url} name={item.profile?.full_name} size={32} />
      <View style={styles.commentInfo}>
        <View style={styles.commentHeader}>
          <Text style={[styles.commentName, { color: colors.text }]}>{item.profile?.full_name ?? 'Unknown'}</Text>
          {item.profile?.role ? <RoleBadge role={item.profile.role} /> : null}
          <Text style={[styles.commentTime, { color: colors.textTertiary }]}>{formatRelativeTime(item.created_at)}</Text>
        </View>
        <Text style={[styles.commentContent, { color: colors.text }]}>{item.content}</Text>
      </View>
    </View>
  ), [colors]);

  const keyExtractor = useCallback((item: Comment) => item.id, []);

  const reactionsSummary = post.reactions_summary ?? {};
  const totalReactions = Object.values(reactionsSummary).reduce((s, c) => s + c, 0);

  const listHeader = useMemo(() => (
    <View style={styles.postSection}>
      <View style={styles.authorRow}>
        <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: post.user_id } })} style={styles.authorInfo}>
          <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={48} />
          <View>
            <View style={styles.nameRow}>
              <Text style={[styles.authorName, { color: colors.text }]}>{profile?.full_name ?? 'Unknown'}</Text>
              {profile?.role ? <RoleBadge role={profile.role} /> : null}
            </View>
            <Text style={[styles.authorMeta, { color: colors.textTertiary }]}>{formatRelativeTime(post.created_at)}</Text>
          </View>
        </Pressable>
      </View>

      <Text style={[styles.postContent, { color: colors.text }]}>{post.content}</Text>

      {totalReactions > 0 && (
        <View style={[styles.reactionsRow, { borderTopColor: colors.borderLight ?? colors.border }]}>
          {Object.entries(reactionsSummary)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([type]) => (
              <Text key={type} style={styles.reactionEmoji}>
                {REACTION_EMOJI_MAP[type as ReactionType] ?? '👍'}
              </Text>
            ))}
          <Text style={[styles.reactionTotal, { color: colors.textSecondary }]}>{totalReactions}</Text>
        </View>
      )}

      <View style={[styles.actionsRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
        <Pressable onPress={handleReaction} style={styles.actionItem} hitSlop={8}>
          <Ionicons
            name={hasReacted ? 'thumbs-up' : 'thumbs-up-outline'}
            size={22}
            color={hasReacted ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.actionLabel, { color: hasReacted ? colors.primary : colors.textSecondary }]}>
            {userReaction ? REACTION_EMOJI_MAP[userReaction] + ' ' : ''}Like
          </Text>
        </Pressable>
        <View style={styles.actionItem}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>{post.comments_count}</Text>
        </View>
      </View>

      {comments.length > 0 && (
        <Text style={[styles.commentsTitle, { color: colors.text }]}>Comments ({comments.length})</Text>
      )}
    </View>
  ), [post, profile, colors, comments.length, totalReactions, reactionsSummary, hasReacted, userReaction, handleReaction]);

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
        ListHeaderComponent={listHeader}
        data={comments}
        renderItem={renderComment}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
        removeClippedSubviews={Platform.OS === 'android'}
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
          disabled={!commentText.trim() || commentMutation.isPending}
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
  reactionsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, marginBottom: 4,
  },
  reactionEmoji: { fontSize: 16 },
  reactionTotal: { fontSize: 13, marginLeft: 4, fontFamily: 'Inter_600SemiBold' },
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
