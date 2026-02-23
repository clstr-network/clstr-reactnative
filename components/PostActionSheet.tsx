/**
 * PostActionSheet — Phase 9.7
 * Bottom-sheet-style modal for post actions.
 * Own post: Edit, Delete (confirm), Copy Link, Share
 * Others: Save/Unsave, Hide (undo toast), Report (reason), Copy Link, Share
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Share,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemeColors, radius } from '@/constants/colors';
import { fontSize } from '@/constants/typography';
import { QUERY_KEYS } from '@/lib/query-keys';
import {
  deletePost,
  toggleSavePost,
  hidePost,
  reportPost,
} from '@/lib/api/social';
import { useAuth } from '@/lib/auth-context';

interface PostActionSheetProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  authorId: string;
  isSaved?: boolean;
  /** Called after a destructive action like delete or hide */
  onPostRemoved?: () => void;
  /** Called to open edit flow */
  onEdit?: () => void;
}

interface ActionItem {
  icon: string;
  label: string;
  color: string;
  destructive?: boolean;
  onPress: () => void;
}

function PostActionSheet({
  visible,
  onClose,
  postId,
  authorId,
  isSaved = false,
  onPostRemoved,
  onEdit,
}: PostActionSheetProps) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = user?.id === authorId;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.savedItems(user.id) });
    }
  }, [queryClient, user]);

  /* ─── Mutations ─── */

  const saveMutation = useMutation({
    mutationFn: () => toggleSavePost(postId),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: () => Alert.alert('Error', 'Could not update bookmark.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePost(postId),
    onSuccess: () => {
      invalidate();
      onClose();
      onPostRemoved?.();
    },
    onError: () => Alert.alert('Error', 'Could not delete post.'),
  });

  const hideMutation = useMutation({
    mutationFn: () => hidePost(postId),
    onSuccess: () => {
      invalidate();
      onClose();
      onPostRemoved?.();
    },
    onError: () => Alert.alert('Error', 'Could not hide post.'),
  });

  /* ─── Handlers ─── */

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Post', 'This action cannot be undone. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteMutation.mutate();
        },
      },
    ]);
  }, [deleteMutation]);

  const handleHide = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    hideMutation.mutate();
  }, [hideMutation]);

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Check out this post on Clstr: https://clstr.network/post/${postId}`,
      });
    } catch {
      /* user cancelled */
    }
    onClose();
  }, [postId, onClose]);

  const handleCopyLink = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(`https://clstr.network/post/${postId}`);
    Alert.alert('Copied', 'Link copied to clipboard.');
    onClose();
  }, [postId, onClose]);

  const handleReport = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const submitReport = async (reason: string) => {
      if (!reason?.trim()) return;
      try {
        await reportPost(postId, reason.trim());
        Alert.alert('Reported', 'Thank you for helping keep the community safe.');
      } catch {
        Alert.alert('Error', 'Could not submit report.');
      }
      onClose();
    };

    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Report Post',
        'Why are you reporting this post?',
        submitReport,
        'plain-text',
        '',
        'Reason',
      );
    } else {
      Alert.alert('Report Post', 'Do you want to report this post as inappropriate?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => submitReport('Inappropriate content'),
        },
      ]);
    }
  }, [postId, onClose]);

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    saveMutation.mutate();
  }, [saveMutation]);

  const handleEdit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    onEdit?.();
  }, [onClose, onEdit]);

  /* ─── Actions List ─── */

  const actions: ActionItem[] = useMemo(() => {
    if (isOwner) {
      return [
        { icon: 'create-outline', label: 'Edit Post', color: colors.textSecondary, onPress: handleEdit },
        { icon: 'trash-outline', label: 'Delete Post', color: colors.error, destructive: true, onPress: handleDelete },
        { icon: 'copy-outline', label: 'Copy Link', color: colors.textSecondary, onPress: handleCopyLink },
        { icon: 'share-outline', label: 'Share Post', color: colors.accent, onPress: handleShare },
      ];
    }
    return [
      {
        icon: isSaved ? 'bookmark' : 'bookmark-outline',
        label: isSaved ? 'Unsave Post' : 'Save Post',
        color: colors.warning,
        onPress: handleSave,
      },
      { icon: 'eye-off-outline', label: 'Hide Post', color: colors.textSecondary, onPress: handleHide },
      { icon: 'flag-outline', label: 'Report Post', color: colors.error, destructive: true, onPress: handleReport },
      { icon: 'copy-outline', label: 'Copy Link', color: colors.textSecondary, onPress: handleCopyLink },
      { icon: 'share-outline', label: 'Share Post', color: colors.accent, onPress: handleShare },
    ];
  }, [
    isOwner, isSaved, colors,
    handleEdit, handleDelete, handleCopyLink, handleShare,
    handleSave, handleHide, handleReport,
  ]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {/* Handle bar */}
          <View style={[styles.handleBar, { backgroundColor: colors.textTertiary }]} />

          {/* Action items */}
          {actions.map((action) => (
            <Pressable
              key={action.label}
              onPress={action.onPress}
              style={({ pressed }) => [
                styles.actionRow,
                pressed && { backgroundColor: colors.surfaceElevated ?? 'rgba(255,255,255,0.04)' },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: (action.color ?? colors.textSecondary) + '15' }]}>
                <Ionicons name={action.icon as any} size={20} color={action.color} />
              </View>
              <Text
                style={[
                  styles.actionLabel,
                  { color: action.destructive ? action.color : colors.text },
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}

          {/* Cancel */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancelButton,
              { borderTopColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default React.memo(PostActionSheet);

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
  actionLabel: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
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
    fontFamily: 'Inter_600SemiBold',
  },
});
