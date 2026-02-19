/**
 * NotificationItem — Notification row component.
 *
 * React.memo wrapped. Shows icon, content, timestamp, unread indicator.
 * Pressable for navigation.
 */
import React from 'react';
import { StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { View } from '@clstr/shared/components/ui/primitives/View';
import { Text } from '@clstr/shared/components/ui/primitives/Text';
import { Pressable } from '@clstr/shared/components/ui/primitives/Pressable';
import { useTheme } from '@clstr/shared/design/useTheme';
import { tokens } from '@clstr/shared/design/tokens';
import { timeAgo } from '../../utils/timeAgo';
import type { Notification } from '../../hooks/useNotifications';

export interface NotificationItemProps {
  notification: Notification;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const ICON_MAP: Record<string, string> = {
  connection_request: '🤝',
  connection_accepted: '✅',
  message: '💬',
  post_like: '👍',
  post_comment: '💬',
  event_reminder: '📅',
  mention: '@',
};

export const NotificationItem = React.memo(function NotificationItem({
  notification,
  onPress,
  style,
}: NotificationItemProps) {
  const { colors } = useTheme();
  const icon = ICON_MAP[notification.type] ?? '🔔';

  return (
    <Pressable onPress={onPress} style={style as any}>
      <View
        style={[
          styles.row,
          !notification.is_read && { backgroundColor: `${colors.primary}10` },
        ]}
      >
        {/* ── Unread indicator ── */}
        {!notification.is_read && (
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        )}

        {/* ── Icon ── */}
        <Text size="lg" style={styles.icon}>
          {icon}
        </Text>

        {/* ── Content ── */}
        <View style={styles.content}>
          <Text weight={notification.is_read ? 'normal' : 'semibold'} size="sm" numberOfLines={2}>
            {notification.title}
          </Text>
          {notification.body && (
            <Text size="xs" muted numberOfLines={1}>
              {notification.body}
            </Text>
          )}
          <Text size="xs" muted>
            {timeAgo(notification.created_at)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    left: tokens.spacing.xs,
    top: '50%',
  },
  icon: {
    marginRight: tokens.spacing.sm,
    width: 32,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
});
