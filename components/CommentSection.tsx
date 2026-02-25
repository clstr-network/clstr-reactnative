/**
 * CommentSection — Phase 9.6
 * Two-level threaded inline comment section for post cards / post detail.
 * Features:
 * - Top-level comments with up to 2 visible replies per thread
 * - "View N more replies" expansion
 * - Like / Reply / Edit / Delete per comment
 * - Comment input with avatar
 * - Optimistic mutations via react-query
 * - Keyboard-aware layout
 */

import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeColors, radius } from '@/constants/colors';
import { fontSize } from '@/constants/typography';
import { Avatar } from '@/components/Avatar';
import RoleBadge from '@/components/RoleBadge';
import { QUERY_KEYS } from '@/lib/query-keys';
import {
  getComments,
  createComment,
  toggleCommentLike,
  editComment,
  deleteComment,
  type Comment,
} from '@/lib/api/social';
import { useAuth } from '@/lib/auth-context';
import { formatRelativeTime } from '@/lib/time';

/* ─── Props ─── */

interface CommentSectionProps {
  postId: string;
  /** Number of top-level comments to show initially */
  initialCount?: number;
  /** Number of replies per thread to show initially */
  initialRepliesCount?: number;
  /** Compact mode: fewer comments shown, smaller text */
  compact?: boolean;
}

/* ─── Main Component ─── */

function CommentSection({
  postId,
  initialCount = 3,
  initialRepliesCount = 2,
  compact = false,
}: CommentSectionProps) {
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const inputRef = useRef<TextInput>(null);

  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [editingComment, setEditingComment] = useState<{ id: string; content: string } | null>(null);
  const [showAllComments, setShowAllComments] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  /* ─── Data Fetching ─── */

  const { data: rawComments = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.comments(postId),
    queryFn: () => getComments(postId),
    enabled: !!postId,
    staleTime: 15_000,
    gcTime: 5 * 60 * 1000,
  });

  // Build tree: top-level + nested replies
  const commentTree = useMemo(() => {
    const parentMap: Record<string, Comment[]> = {};
    const topLevel: Comment[] = [];

    rawComments.forEach((c: Comment) => {
      if (c.parent_id) {
        if (!parentMap[c.parent_id]) parentMap[c.parent_id] = [];
        parentMap[c.parent_id].push(c);
      } else {
        topLevel.push(c);
      }
    });

    return topLevel.map((parent) => ({
      ...parent,
      replies: (parentMap[parent.id] || []).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    }));
  }, [rawComments]);

  const visibleComments = showAllComments
    ? commentTree
    : commentTree.slice(0, initialCount);

  const hiddenCount = commentTree.length - initialCount;

  /* ─── Mutations ─── */

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.comments(postId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
  }, [queryClient, postId]);

  const addMutation = useMutation({
    mutationFn: (data: { content: string; parentId?: string }) =>
      createComment({ post_id: postId, content: data.content, parent_id: data.parentId }),
    onSuccess: () => {
      setCommentText('');
      setReplyingTo(null);
      invalidate();
    },
  });

  const likeMutation = useMutation({
    mutationFn: (commentId: string) => toggleCommentLike(commentId),
    onSuccess: invalidate,
  });

  const editMutation = useMutation({
    mutationFn: (data: { commentId: string; content: string }) =>
      editComment(data.commentId, data.content),
    onSuccess: () => {
      setEditingComment(null);
      setCommentText('');
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: invalidate,
  });

  /* ─── Handlers ─── */

  const handleSubmit = useCallback(() => {
    const text = commentText.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (editingComment) {
      editMutation.mutate({ commentId: editingComment.id, content: text });
    } else {
      addMutation.mutate({ content: text, parentId: replyingTo?.id });
    }
  }, [commentText, editingComment, replyingTo, editMutation, addMutation]);

  const handleReply = useCallback(
    (comment: Comment) => {
      setEditingComment(null);
      setReplyingTo({ id: comment.id, name: comment.user?.full_name || 'User' });
      setCommentText('');
      inputRef.current?.focus();
    },
    [],
  );

  const handleEdit = useCallback((comment: Comment) => {
    setReplyingTo(null);
    setEditingComment({ id: comment.id, content: comment.content });
    setCommentText(comment.content);
    inputRef.current?.focus();
  }, []);

  const handleDelete = useCallback(
    (commentId: string) => {
      Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            deleteMutation.mutate(commentId);
          },
        },
      ]);
    },
    [deleteMutation],
  );

  const handleLike = useCallback(
    (commentId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      likeMutation.mutate(commentId);
    },
    [likeMutation],
  );

  const toggleReplies = useCallback((parentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  }, []);

  const cancelReplyOrEdit = useCallback(() => {
    setReplyingTo(null);
    setEditingComment(null);
    setCommentText('');
  }, []);

  /* ─── Render Helpers ─── */

  const renderComment = useCallback(
    (comment: Comment & { replies?: Comment[] }, isReply = false) => {
      const isOwn = user?.id === comment.user_id;
      const replies = (comment as any).replies as Comment[] | undefined;
      const repliesExpanded = expandedReplies.has(comment.id);
      const visibleReplies =
        replies && !isReply
          ? repliesExpanded
            ? replies
            : replies.slice(0, initialRepliesCount)
          : [];
      const hiddenRepliesCount =
        replies && !isReply ? replies.length - initialRepliesCount : 0;

      return (
        <View key={comment.id} style={[styles.commentItem, isReply && styles.replyItem]}>
          <View style={styles.commentRow}>
            <Avatar
              uri={comment.user?.avatar_url}
              name={comment.user?.full_name}
              size={isReply ? 26 : 30}
            />
            <View style={styles.commentBody}>
              <View
                style={[
                  styles.commentBubble,
                  { backgroundColor: colors.surfaceElevated ?? colors.surface },
                ]}
              >
                <View style={styles.commentMeta}>
                  <Text
                    style={[
                      styles.commentAuthor,
                      { color: colors.text },
                      compact && { fontSize: fontSize.sm },
                    ]}
                    numberOfLines={1}
                  >
                    {comment.user?.full_name ?? 'Unknown'}
                  </Text>
                  {comment.user?.role ? (
                    <RoleBadge role={comment.user.role} />
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.commentText,
                    { color: colors.text },
                    compact && { fontSize: fontSize.sm },
                  ]}
                >
                  {comment.content}
                </Text>
              </View>

              {/* Actions row */}
              <View style={styles.commentActions}>
                <Text style={[styles.commentTime, { color: colors.textTertiary }]}>
                  {formatRelativeTime(comment.created_at)}
                </Text>

                <Pressable onPress={() => handleLike(comment.id)} hitSlop={8}>
                  <Text
                    style={[
                      styles.actionText,
                      { color: comment.liked ? '#2563EB' : colors.textSecondary },
                    ]}
                  >
                    {comment.liked ? 'Liked' : 'Like'}
                    {comment.likes_count > 0 ? ` · ${comment.likes_count}` : ''}
                  </Text>
                </Pressable>

                {!isReply && (
                  <Pressable onPress={() => handleReply(comment)} hitSlop={8}>
                    <Text style={[styles.actionText, { color: colors.textSecondary }]}>Reply</Text>
                  </Pressable>
                )}

                {isOwn && (
                  <>
                    <Pressable onPress={() => handleEdit(comment)} hitSlop={8}>
                      <Text style={[styles.actionText, { color: colors.textSecondary }]}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDelete(comment.id)} hitSlop={8}>
                      <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* Replies */}
          {!isReply && visibleReplies && visibleReplies.length > 0 && (
            <View style={styles.repliesContainer}>
              {visibleReplies.map((reply) => renderComment(reply, true))}
              {hiddenRepliesCount > 0 && !repliesExpanded && (
                <Pressable
                  onPress={() => toggleReplies(comment.id)}
                  style={styles.showMoreReplies}
                >
                  <Ionicons name="return-down-forward" size={14} color={colors.textSecondary} />
                  <Text style={[styles.showMoreText, { color: colors.textSecondary }]}>
                    View {hiddenRepliesCount} more {hiddenRepliesCount === 1 ? 'reply' : 'replies'}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      );
    },
    [
      colors, compact, user, expandedReplies, initialRepliesCount,
      handleLike, handleReply, handleEdit, handleDelete, toggleReplies,
    ],
  );

  /* ─── Main Render ─── */

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.textSecondary} size="small" />
      </View>
    );
  }

  if (commentTree.length === 0 && !replyingTo && !editingComment) {
    return (
      <View style={styles.sectionContainer}>
        {/* Input only */}
        <CommentInput
          ref={inputRef}
          colors={colors}
          value={commentText}
          onChange={setCommentText}
          onSubmit={handleSubmit}
          isPending={addMutation.isPending}
          placeholder="Be the first to comment..."
          avatarUrl={user?.user_metadata?.avatar_url}
          userName={user?.user_metadata?.full_name}
        />
      </View>
    );
  }

  return (
    <View style={styles.sectionContainer}>
      {/* Comment list */}
      {visibleComments.map((comment) => renderComment(comment))}

      {/* Show more top-level comments */}
      {!showAllComments && hiddenCount > 0 && (
        <Pressable onPress={() => setShowAllComments(true)} style={styles.showAllBtn}>
          <Text style={[styles.showAllText, { color: colors.textSecondary }]}>
            View all {commentTree.length} comments
          </Text>
        </Pressable>
      )}

      {/* Reply/Edit indicator */}
      {(replyingTo || editingComment) && (
        <View style={[styles.replyIndicator, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.replyIndicatorText, { color: colors.textSecondary }]}>
            {editingComment ? 'Editing comment' : `Replying to ${replyingTo?.name}`}
          </Text>
          <Pressable onPress={cancelReplyOrEdit} hitSlop={8}>
            <Ionicons name="close" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}

      {/* Comment input */}
      <CommentInput
        ref={inputRef}
        colors={colors}
        value={commentText}
        onChange={setCommentText}
        onSubmit={handleSubmit}
        isPending={addMutation.isPending || editMutation.isPending}
        placeholder={replyingTo ? `Reply to ${replyingTo.name}...` : 'Add a comment...'}
        avatarUrl={user?.user_metadata?.avatar_url}
        userName={user?.user_metadata?.full_name}
      />
    </View>
  );
}

/* ─── Comment Input Sub-Component ─── */

interface CommentInputProps {
  colors: ReturnType<typeof useThemeColors>;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isPending: boolean;
  placeholder: string;
  avatarUrl?: string;
  userName?: string;
}

const CommentInput = React.forwardRef<TextInput, CommentInputProps>(
  ({ colors, value, onChange, onSubmit, isPending, placeholder, avatarUrl, userName }, ref) => {
    return (
      <View style={[styles.inputRow, { borderTopColor: colors.border }]}>
        <Avatar uri={avatarUrl} name={userName} size={28} />
        <TextInput
          ref={ref}
          style={[
            styles.textInput,
            {
              color: colors.text,
              backgroundColor: colors.surfaceElevated ?? colors.surface,
              borderColor: colors.border,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={onChange}
          multiline
          maxLength={500}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={onSubmit}
        />
        <Pressable
          onPress={onSubmit}
          disabled={!value.trim() || isPending}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: value.trim() ? '#2563EB' : colors.surfaceElevated ?? colors.surface,
            },
            pressed && { opacity: 0.8 },
          ]}
          hitSlop={8}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" size={14} />
          ) : (
            <Ionicons name="send" size={14} color={value.trim() ? '#fff' : colors.textTertiary} />
          )}
        </Pressable>
      </View>
    );
  },
);

CommentInput.displayName = 'CommentInput';

export default React.memo(CommentSection);

/* ─── Styles ─── */

const styles = StyleSheet.create({
  sectionContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  commentItem: {
    marginBottom: 12,
  },
  replyItem: {
    marginBottom: 8,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  commentBody: {
    flex: 1,
  },
  commentBubble: {
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  commentText: {
    fontSize: fontSize.base,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    paddingLeft: 4,
  },
  commentTime: {
    fontSize: fontSize.xs,
    fontFamily: 'Inter_400Regular',
  },
  actionText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  repliesContainer: {
    marginLeft: 38,
    marginTop: 8,
  },
  showMoreReplies: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  showMoreText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  showAllBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  showAllText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginBottom: 4,
  },
  replyIndicatorText: {
    fontSize: fontSize.xs,
    fontFamily: 'Inter_400Regular',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  textInput: {
    flex: 1,
    fontSize: fontSize.base,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    maxHeight: 80,
    fontFamily: 'Inter_400Regular',
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
