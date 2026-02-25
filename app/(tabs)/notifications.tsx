import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { NotificationsSkeleton } from '@/components/Skeletons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/query-keys';
import { useNotificationSubscription } from '@/lib/hooks/useNotificationSubscription';
import { getNotifications, markNotificationRead, markAllNotificationsRead, type Notification } from '@/lib/api/notifications';
import { NotificationItem } from '@/components/NotificationItem';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const queryClient = useQueryClient();

  // Phase 3.3 — Realtime notification subscription
  const { resetUnreadCount } = useNotificationSubscription();

  // Reset badge when user views notifications screen
  useEffect(() => {
    resetUnreadCount();
  }, [resetUnreadCount]);

  const { data: notifications = [], isLoading, refetch, isRefetching } = useQuery<Notification[]>({
    queryKey: QUERY_KEYS.notifications,
    queryFn: getNotifications,
    staleTime: 30_000,       // 30s — realtime handles live badge updates
    gcTime: 5 * 60 * 1000,   // 5min
  });

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  );

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications }),
  });

  const handleMarkAll = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    markAllMutation.mutate();
  };

  const handlePress = useCallback((id: string) => {
    markReadMutation.mutate(id);
  }, [markReadMutation]);

  const renderNotification = useCallback(({ item }: { item: Notification }) => (
    <NotificationItem notification={item} onPress={handlePress} />
  ), [handlePress]);

  const keyExtractor = useCallback((item: Notification) => item.id, []);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: (Platform.OS === 'web' ? webTopInset : insets.top) + 8 }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={[styles.unreadLabel, { color: colors.textSecondary }]}>{unreadCount} new</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable
            onPress={handleMarkAll}
            disabled={markAllMutation.isPending}
            style={({ pressed }) => [
              styles.markAllBtn,
              { backgroundColor: colors.surfaceElevated },
              pressed && { opacity: 0.7 },
              markAllMutation.isPending && { opacity: 0.5 },
            ]}
            hitSlop={8}
          >
            <Ionicons name="checkmark-done" size={18} color={colors.tint} />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <NotificationsSkeleton />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!notifications.length}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={15}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.tint} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-outline" size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No notifications</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
  },
  unreadLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    marginTop: 2,
  },
  markAllBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: 12,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
  },
});
