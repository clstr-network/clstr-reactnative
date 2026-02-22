import React from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme, Alert, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { toggleSavePost } from '@/lib/storage';

export default function PostActionsSheet() {
  const { id, isSaved: isSavedParam } = useLocalSearchParams<{ id: string; isSaved: string }>();
  const colors = useThemeColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const isSaved = isSavedParam === 'true';
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const handleSave = async () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await toggleSavePost(id);
    queryClient.setQueryData(['posts'], updated);
    router.back();
  };

  const handleReport = () => {
    Alert.alert('Report Post', 'Are you sure you want to report this post?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', style: 'destructive', onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); router.back(); } },
    ]);
  };

  const actions = [
    { icon: isSaved ? 'bookmark' : 'bookmark-outline' as const, label: isSaved ? 'Unsave Post' : 'Save Post', color: colors.warning, onPress: handleSave },
    { icon: 'share-outline' as const, label: 'Share Post', color: colors.accent, onPress: () => router.back() },
    { icon: 'copy-outline' as const, label: 'Copy Link', color: colors.tint, onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); router.back(); } },
    { icon: 'flag-outline' as const, label: 'Report Post', color: colors.danger, onPress: handleReport },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.handle, { backgroundColor: colors.border }]} />
      <View style={[styles.content, { paddingBottom: insets.bottom + webBottomInset + 12 }]}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            style={({ pressed }) => [styles.actionRow, pressed && { backgroundColor: colors.surfaceElevated }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
              <Ionicons name={action.icon} size={20} color={action.color} />
            </View>
            <Text style={[styles.actionLabel, { color: action.label.includes('Report') ? colors.danger : colors.text }]}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  content: { paddingHorizontal: 8, paddingTop: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, gap: 14 },
  actionIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 16, fontWeight: '600' },
});
