import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Share, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { useAuth } from '@/lib/auth-context';
import { toggleSavePost, reportPost, deletePost } from '@/lib/api/social';
import { useRolePermissions } from '@/lib/hooks/useRolePermissions';
import { QUERY_KEYS } from '@/lib/query-keys';

export default function PostActionsSheet() {
  const { id, isSaved, authorId } = useLocalSearchParams<{ id: string; isSaved: string; authorId: string }>();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const saved = isSaved === 'true';
  const isOwnPost = !!user?.id && !!authorId && user.id === authorId;
  const { canEditOwnContent, canDeleteOwnContent } = useRolePermissions();

  const handleSave = async () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await toggleSavePost(id);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
      if (user?.id) {
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.savedItems(user.id) });
      }
    } catch {
      Alert.alert('Error', 'Could not update save status.');
    }
    router.back();
  };

  const handleShare = async () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({ message: `Check out this post on Clstr: https://clstr.network/post/${id}` });
    } catch { /* user cancelled */ }
    router.back();
  };

  const handleCopyLink = async () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(`https://clstr.network/post/${id}`);
    Alert.alert('Copied', 'Link copied to clipboard.');
    router.back();
  };

  const handleReport = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const submitReport = async (reason: string) => {
      if (!reason?.trim() || !id) return;
      try {
        await reportPost(id, reason.trim());
        Alert.alert('Reported', 'Thank you for helping keep the community safe.');
      } catch {
        Alert.alert('Error', 'Could not submit report.');
      }
      router.back();
    };

    if (Platform.OS === 'ios') {
      Alert.prompt('Report Post', 'Why are you reporting this post?', submitReport, 'plain-text', '', 'Reason');
    } else {
      // Android: Alert.prompt not supported — use preset reason for now
      Alert.alert('Report Post', 'Do you want to report this post as inappropriate?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report', style: 'destructive', onPress: () => submitReport('Inappropriate content') },
      ]);
    }
  };

  // Phase 12.15 — Edit own post
  const handleEdit = () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
    // Navigate to create-post with edit params
    setTimeout(() => {
      router.push({ pathname: '/create-post', params: { editPostId: id } });
    }, 300);
  };

  // Phase 12.15 — Delete own post
  const handleDelete = () => {
    if (!id) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost(id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
              if (user?.id) {
                await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.savedItems(user.id) });
              }
              router.back();
            } catch {
              Alert.alert('Error', 'Could not delete this post.');
            }
          },
        },
      ],
    );
  };

  const actions = [
    // Phase 12.15 — Own post actions (edit/delete) shown first
    ...(isOwnPost && canEditOwnContent ? [{ icon: 'create-outline' as const, label: 'Edit Post', color: colors.tint, onPress: handleEdit }] : []),
    ...(isOwnPost && canDeleteOwnContent ? [{ icon: 'trash-outline' as const, label: 'Delete Post', color: colors.danger, onPress: handleDelete }] : []),
    { icon: (saved ? 'bookmark' : 'bookmark-outline') as any, label: saved ? 'Unsave Post' : 'Save Post', color: colors.warning, onPress: handleSave },
    { icon: 'share-outline' as const, label: 'Share Post', color: colors.accent, onPress: handleShare },
    { icon: 'copy-outline' as const, label: 'Copy Link', color: colors.textSecondary, onPress: handleCopyLink },
    ...(!isOwnPost ? [{ icon: 'flag-outline' as const, label: 'Report Post', color: colors.danger, onPress: handleReport }] : []),
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {actions.map((action) => (
        <Pressable
          key={action.label}
          onPress={action.onPress}
          style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: colors.surfaceElevated }]}
        >
          <View style={[styles.iconCircle, { backgroundColor: action.color + '15' }]}>
            <Ionicons name={action.icon as any} size={20} color={action.color} />
          </View>
          <Text style={[styles.actionLabel, { color: colors.text }]}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 12, paddingHorizontal: 8 },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 12, paddingVertical: 14, borderRadius: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: fontSize.lg, fontWeight: '600', fontFamily: fontFamily.semiBold },
});
