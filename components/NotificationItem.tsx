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

const NOTIF_ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  like: { name: 'heart', color: '#EF4444' },
  comment: { name: 'chatbubble', color: '#3B82F6' },
  connection: { name: 'person-add', color: '#10B981' },
  mention: { name: 'at', color: '#8B5CF6' },
  event: { name: 'calendar', color: '#F59E0B' },
};

export const NotificationItem = React.memo(function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const colors = useThemeColors(useColorScheme());
  const icon = NOTIF_ICONS[notification.type] || NOTIF_ICONS.like;

  return (
    <Pressable
      onPress={() => onPress(notification.id)}
      style={({ pressed }) => [
        styles.item,
        !notification.read && { backgroundColor: colors.tint + '08' },
        pressed && { backgroundColor: colors.surfaceElevated },
      ]}
    >
      <View style={styles.avatarWrap}>
        <Avatar uri={notification.actorAvatar} name={notification.actorName} size={44} />
        <View style={[styles.iconBadge, { backgroundColor: icon.color }]}>
          <Ionicons name={icon.name} size={10} color="#fff" />
        </View>
      </View>
      <View style={styles.info}>
        <Text style={[styles.message, { color: colors.text }]}>
          <Text style={styles.actorName}>{notification.actorName}</Text>{' '}
          {notification.message}
        </Text>
        <Text style={[styles.time, { color: colors.textTertiary }]}>{formatRelativeTime(notification.createdAt)}</Text>
      </View>
      {!notification.read && <View style={[styles.unreadDot, { backgroundColor: colors.tint }]} />}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  avatarWrap: { position: 'relative' },
  iconBadge: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  info: { flex: 1, gap: 4 },
  message: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular' },
  actorName: { fontWeight: '700', fontFamily: 'Inter_700Bold' },
  time: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
});
