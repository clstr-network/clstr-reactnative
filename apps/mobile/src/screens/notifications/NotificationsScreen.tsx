/**
 * NotificationsScreen — paginated notification list with mark-read actions.
 */
import React, { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '@clstr/shared/navigation/types';
import { useTheme } from '@clstr/shared/design/useTheme';
import { tokens } from '@clstr/shared/design/tokens';
import { EmptyState } from '@clstr/shared/components/ui/EmptyState';
import { ErrorState } from '@clstr/shared/components/ui/ErrorState';
import { H3 } from '@clstr/shared/components/ui/Typography';
import { View } from '@clstr/shared/components/ui/primitives/View';
import { Text } from '@clstr/shared/components/ui/primitives/Text';
import { Pressable } from '@clstr/shared/components/ui/primitives/Pressable';

import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type Notification,
} from '../../hooks/useNotifications';
import { NotificationItem } from '../../components/notifications/NotificationItem';

type NotificationsNav = NativeStackNavigationProp<ProfileStackParamList, 'Notifications'>;

export function NotificationsScreen() {
  const navigation = useNavigation<NotificationsNav>();
  const { colors } = useTheme();

  const {
    notifications,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useNotifications();

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handlePress = useCallback(
    (item: Notification) => {
      // Mark as read
      if (!item.is_read) {
        markRead.mutate(item.id);
      }
      // Navigate based on type
      const data = item.data as Record<string, any> | null;
      switch (item.type) {
        case 'connection_request':
        case 'connection_accepted':
          if (data?.user_id) {
            // Navigate to profile — the screen name exists in ProfileStack
            (navigation as any).push?.('ProfileView', { id: data.user_id });
          }
          break;
        case 'event_reminder':
          // Can't navigate to events stack from profile stack easily;
          // deep-link or tab-switch would be addressed in a future phase.
          break;
        default:
          break;
      }
    },
    [markRead, navigation],
  );

  const keyExtractor = useCallback((item: Notification) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationItem notification={item} onPress={() => handlePress(item)} />
    ),
    [handlePress],
  );

  // ── Loading ──
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text size="lg">←</Text>
          </Pressable>
          <H3>Notifications</H3>
        </View>
        <View style={styles.centered}>
          <Text muted>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──
  if (isError) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text size="lg">←</Text>
          </Pressable>
          <H3>Notifications</H3>
        </View>
        <ErrorState
          message={error?.message ?? 'Failed to load notifications'}
          onRetry={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.headerBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text size="lg">←</Text>
        </Pressable>
        <View style={styles.headerTitleRow}>
          <H3>Notifications</H3>
          {unreadCount > 0 && (
            <Pressable onPress={() => markAllRead.mutate()} style={styles.markAllBtn}>
              <Text size="xs" weight="medium" style={{ color: colors.primary }}>
                Mark all read
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="All caught up!"
            description="You have no notifications at the moment."
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  backBtn: {
    padding: tokens.spacing.xs,
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  markAllBtn: {
    padding: tokens.spacing.xs,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: tokens.spacing.xl,
  },
});
