import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/constants/colors';
import Avatar from './Avatar';
import { formatRelativeTime } from '@/lib/time';
import type { Notification } from '@/lib/api/notifications';

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
  const colors = useThemeColors();
  const icon = NOTIF_ICONS[notification.type] || NOTIF_ICONS.like;
  const actorName = (notification.data as any)?.actor_name ?? '';
  const actorAvatar = (notification.data as any)?.actor_avatar ?? undefined;

  return (
    <Pressable
      onPress={() => onPress(notification.id)}
      style={({ pressed }) => [
        styles.item,
        !notification.is_read && { backgroundColor: colors.tint + '08' },
        pressed && { backgroundColor: colors.surface },
      ]}
    >
      <View style={styles.avatarWrap}>
        <Avatar uri={actorAvatar} name={actorName || notification.title} size={44} />
        <View style={[styles.iconBadge, { backgroundColor: icon.color }]}>
          <Ionicons name={icon.name} size={10} color="#fff" />
        </View>
      </View>
      <View style={styles.info}>
        <Text style={[styles.message, { color: colors.text }]}>
          {actorName ? <Text style={styles.actorName}>{actorName} </Text> : null}
          {notification.body ?? notification.title}
        </Text>
        <Text style={[styles.time, { color: colors.textTertiary }]}>{formatRelativeTime(notification.created_at)}</Text>
      </View>
      {!notification.is_read && <View style={[styles.unreadDot, { backgroundColor: colors.tint }]} />}
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
