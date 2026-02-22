import React from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { toggleSavePost } from '@/lib/storage';

export default function PostActionsSheet() {
  const { id, isSaved } = useLocalSearchParams<{ id: string; isSaved: string }>();
  const colors = useThemeColors(useColorScheme());
  const queryClient = useQueryClient();
  const saved = isSaved === 'true';

  const handleSave = async () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await toggleSavePost(id);
    queryClient.setQueryData(['posts'], updated);
    router.back();
  };

  const handleReport = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Report', 'Post has been reported. Thank you for helping keep the community safe.');
    router.back();
  };

  const actions = [
    { icon: saved ? 'bookmark' : 'bookmark-outline', label: saved ? 'Unsave Post' : 'Save Post', color: colors.warning, onPress: handleSave },
    { icon: 'share-outline', label: 'Share Post', color: colors.accent, onPress: () => router.back() },
    { icon: 'copy-outline', label: 'Copy Link', color: colors.textSecondary, onPress: () => router.back() },
    { icon: 'flag-outline', label: 'Report Post', color: colors.danger, onPress: handleReport },
  ] as const;

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
  actionLabel: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
