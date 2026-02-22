import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  Platform, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { Avatar } from '@/components/Avatar';
import { Notification, generateMockNotifications, formatTimeAgo } from '@/lib/mock-data';

const notificationIcons: Record<Notification['type'], keyof typeof Ionicons.glyphMap> = {
  like: 'heart',
  comment: 'chatbubble',
  connection: 'person-add',
  event: 'calendar',
  mention: 'at',
  message: 'mail',
};

const notificationIconColors: Record<Notification['type'], string> = {
  like: '#EF4444',
  comment: '#3B82F6',
  connection: '#6366F1',
  event: '#22C55E',
  mention: '#8B5CF6',
  message: '#06B6D4',
};

interface NotificationItemProps {
  notification: Notification;
}

const NotificationItem = React.memo(({ notification }: NotificationItemProps) => {
  const iconName = notificationIcons[notification.type];
  const iconColor = notificationIconColors[notification.type];
  
  return (
    <View
      style={[
        styles.notificationCard,
        !notification.isRead && styles.notificationCardUnread,
      ]}
    >
      {!notification.isRead && <View style={styles.unreadIndicator} />}
      
      <View style={styles.notificationContent}>
        <View style={styles.notificationTop}>
          <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
            <Ionicons name={iconName} size={18} color={iconColor} />
          </View>
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {notification.message}
            </Text>
            <Text style={styles.notificationTime}>
              {formatTimeAgo(notification.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
});

NotificationItem.displayName = 'NotificationItem';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    generateMockNotifications(12)
  );
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.isRead).length,
    [notifications]
  );

  const markAllAsRead = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setNotifications(generateMockNotifications(12));
      setRefreshing(false);
    }, 1000);
  }, []);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={styles.screen}>
      <View style={[styles.headerBar, { paddingTop: insets.top + webTopInset }]}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable
            style={({ pressed }) => [
              styles.markReadButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={markAllAsRead}
          >
            <Text style={styles.markReadText}>Mark all as read</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationItem notification={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={notifications.length > 0}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: unreadCount > 0 ? 12 : 0,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  badgeContainer: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  markReadButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
  },
  markReadText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.primary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  notificationCardUnread: {
    backgroundColor: colors.surfaceElevated,
  },
  unreadIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 10,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTop: {
    flexDirection: 'row',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: colors.textTertiary,
  },
});
