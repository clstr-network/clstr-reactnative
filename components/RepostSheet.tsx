/**
 * RepostSheet — Phase 11.2
 * Bottom-sheet modal for reposting a post.
 *
 * Two options:
 * 1. Quick Repost — one-tap instant repost
 * 2. Repost with Thoughts — TextInput for commentary + original post preview
 *
 * API: createRepost(postId, commentary?) / deleteRepost(postId)
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemeColors, radius } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { createRepost, deleteRepost } from '@/lib/api/social';
import { QUERY_KEYS } from '@/lib/query-keys';

/* ─── Types ─── */

export interface RepostSheetProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  /** Whether the user has already reposted */
  isReposted: boolean;
  /** Post preview info */
  postPreview?: {
    authorName?: string;
    content?: string;
  };
}

function RepostSheet({
  visible,
  onClose,
  postId,
  isReposted,
  postPreview,
}: RepostSheetProps) {
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'options' | 'commentary'>('options');
  const [commentary, setCommentary] = useState('');

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.post(postId) });
  }, [queryClient, postId]);

  /* ─── Reset on close ─── */
  const handleClose = useCallback(() => {
    setMode('options');
    setCommentary('');
    onClose();
  }, [onClose]);

  /* ─── Quick repost mutation ─── */
  const quickRepostMutation = useMutation({
    mutationFn: () => createRepost(postId),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      invalidate();
      Alert.alert('Reposted!', 'Post shared to your feed.');
      handleClose();
    },
    onError: (error: Error) => {
      if (error.message?.includes('already reposted')) {
        Alert.alert('Already Reposted', 'You have already reposted this post.');
      } else {
        Alert.alert('Error', 'Could not repost. Please try again.');
      }
    },
  });

  /* ─── Repost with commentary mutation ─── */
  const commentaryRepostMutation = useMutation({
    mutationFn: () => createRepost(postId, commentary.trim()),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      invalidate();
      Alert.alert('Reposted!', 'Post shared with your thoughts.');
      handleClose();
    },
    onError: (error: Error) => {
      if (error.message?.includes('already reposted')) {
        Alert.alert('Already Reposted', 'You have already reposted this post.');
      } else {
        Alert.alert('Error', 'Could not repost. Please try again.');
      }
    },
  });

  /* ─── Undo repost mutation ─── */
  const undoRepostMutation = useMutation({
    mutationFn: () => deleteRepost(postId),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      invalidate();
      handleClose();
    },
    onError: () => {
      Alert.alert('Error', 'Could not undo repost. Please try again.');
    },
  });

  /* ─── Handlers ─── */

  const handleQuickRepost = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    quickRepostMutation.mutate();
  }, [quickRepostMutation]);

  const handleUndoRepost = useCallback(() => {
    Alert.alert('Undo Repost', 'Remove your repost of this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Undo',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          undoRepostMutation.mutate();
        },
      },
    ]);
  }, [undoRepostMutation]);

  const handleSubmitCommentary = useCallback(() => {
    if (!commentary.trim()) {
      Alert.alert('Add Thoughts', 'Please write something before sharing.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    commentaryRepostMutation.mutate();
  }, [commentary, commentaryRepostMutation]);

  const isPending =
    quickRepostMutation.isPending ||
    commentaryRepostMutation.isPending ||
    undoRepostMutation.isPending;

  /* ─── Options mode ─── */
  const renderOptionsMode = () => (
    <>
      {/* Undo repost (if already reposted) */}
      {isReposted && (
        <Pressable
          onPress={handleUndoRepost}
          disabled={isPending}
          style={({ pressed }) => [
            styles.actionRow,
            pressed && { backgroundColor: colors.surfaceElevated ?? 'rgba(255,255,255,0.04)' },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.error + '20' }]}>
            {undoRepostMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Ionicons name="close-circle-outline" size={20} color={colors.error} />
            )}
          </View>
          <Text style={[styles.actionLabel, { color: colors.error }]}>
            Undo Repost
          </Text>
        </Pressable>
      )}

      {/* Quick Repost */}
      {!isReposted && (
        <Pressable
          onPress={handleQuickRepost}
          disabled={isPending}
          style={({ pressed }) => [
            styles.actionRow,
            pressed && { backgroundColor: colors.surfaceElevated ?? 'rgba(255,255,255,0.04)' },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.success + '20' }]}>
            {quickRepostMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.success} />
            ) : (
              <Ionicons name="repeat" size={20} color={colors.success} />
            )}
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Quick Repost</Text>
            <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
              Instantly share to your feed
            </Text>
          </View>
        </Pressable>
      )}

      {/* Repost with Thoughts */}
      {!isReposted && (
        <Pressable
          onPress={() => setMode('commentary')}
          disabled={isPending}
          style={({ pressed }) => [
            styles.actionRow,
            pressed && { backgroundColor: colors.surfaceElevated ?? 'rgba(255,255,255,0.04)' },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={[styles.actionLabel, { color: colors.text }]}>
              Repost with your thoughts
            </Text>
            <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
              Add commentary before sharing
            </Text>
          </View>
        </Pressable>
      )}
    </>
  );

  /* ─── Commentary mode ─── */
  const renderCommentaryMode = () => (
    <View style={styles.commentaryContainer}>
      {/* Back button */}
      <View style={styles.commentaryHeader}>
        <Pressable onPress={() => setMode('options')} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.commentaryTitle, { color: colors.text }]}>
          Repost with Thoughts
        </Text>
      </View>

      {/* Commentary input */}
      <TextInput
        style={[
          styles.commentaryInput,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.surfaceSecondary,
          },
        ]}
        placeholder="What are your thoughts?"
        placeholderTextColor={colors.textTertiary}
        value={commentary}
        onChangeText={setCommentary}
        multiline
        maxLength={1000}
        autoFocus
      />

      {/* Original post preview */}
      {postPreview && (
        <View style={[styles.originalPostPreview, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <Ionicons name="repeat" size={14} color={colors.textTertiary} />
          <View style={styles.previewTextContainer}>
            {postPreview.authorName ? (
              <Text style={[styles.previewAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
                {postPreview.authorName}
              </Text>
            ) : null}
            {postPreview.content ? (
              <Text style={[styles.previewContent, { color: colors.textTertiary }]} numberOfLines={2}>
                {postPreview.content}
              </Text>
            ) : null}
          </View>
        </View>
      )}

      {/* Character count + submit */}
      <View style={styles.commentaryFooter}>
        <Text style={[styles.charCount, { color: colors.textTertiary }]}>
          {commentary.length}/1000
        </Text>
        <Pressable
          onPress={handleSubmitCommentary}
          disabled={isPending || !commentary.trim()}
          style={({ pressed }) => [
            styles.submitButton,
            { backgroundColor: commentary.trim() ? colors.primary : colors.surfaceSecondary },
            pressed && { opacity: 0.85 },
            isPending && { opacity: 0.6 },
          ]}
        >
          {commentaryRepostMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text
              style={[
                styles.submitButtonText,
                { color: commentary.trim() ? '#fff' : colors.textTertiary },
              ]}
            >
              Repost
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={() => {}}
        >
          {/* Handle bar */}
          <View style={[styles.handleBar, { backgroundColor: colors.textTertiary }]} />

          {mode === 'options' ? renderOptionsMode() : renderCommentaryMode()}

          {/* Cancel button (options mode only) */}
          {mode === 'options' && (
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.cancelButton,
                { borderTopColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default React.memo(RepostSheet);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextContainer: {
    flex: 1,
    gap: 2,
  },
  actionLabel: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
  },
  actionDescription: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
    borderTopWidth: 1,
  },
  cancelText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
  },
  /* ─── Commentary mode ─── */
  commentaryContainer: {
    gap: 12,
    paddingHorizontal: 8,
  },
  commentaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 4,
  },
  commentaryTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
  },
  commentaryInput: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  originalPostPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  previewTextContainer: {
    flex: 1,
    gap: 2,
  },
  previewAuthor: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
  },
  previewContent: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
  },
  commentaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  charCount: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
  },
  submitButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.bold,
  },
});
