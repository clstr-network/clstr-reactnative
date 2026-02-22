import React from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/constants/colors';
import { Avatar } from './Avatar';
import { formatRelativeTime } from '@/lib/time';
import type { Notification } from '@/lib/storage';

interface NotificationItemProps {
  notification: Notification;
  onPress: (id: string) => void;
}

const TYPE_ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  like: { name: 'heart', color: '#EF4444' },
  comment: { name: 'chatbubble', color: '#3B82F6' },
  connection: { name: 'person-add', color: '#10B981' },
  mention: { name: 'at', color: '#8B5CF6' },
  event: { name: 'calendar', color: '#F59E0B' },
};

export const NotificationItem = React.memo(function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const colors = useThemeColors(useColorScheme());
  const icon = TYPE_ICONS[notification.type] || TYPE_ICONS.like;

  return (
    <Pressable
      onPress={() => onPress(notification.id)}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: notification.read ? 'transparent' : colors.tint + '08' },
        pressed && { backgroundColor: colors.surfaceElevated },
      ]}
    >
      <View style={styles.avatarWrap}>
        <Avatar uri={notification.actorAvatar} name={notification.actorName} size={44} />
        <View style={[styles.iconBadge, { backgroundColor: icon.color }]}>
          <Ionicons name={icon.name} size={10} color="#fff" />
        </View>
      </View>
      <View style={styles.content}>
        <Text style={[styles.text, { color: colors.text }]}>
          <Text style={styles.bold}>{notification.actorName}</Text>
          {' '}{notification.message}
        </Text>
        <Text style={[styles.time, { color: colors.textTertiary }]}>{formatRelativeTime(notification.createdAt)}</Text>
      </View>
      {!notification.read && <View style={[styles.dot, { backgroundColor: colors.tint }]} />}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  avatarWrap: {
    position: 'relative',
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0A0E17',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
    marginTop: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
});
