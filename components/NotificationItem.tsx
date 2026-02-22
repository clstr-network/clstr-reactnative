import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { Avatar } from './Avatar';
import { Notification } from '@/lib/types';

interface NotificationItemProps {
  notification: Notification;
  onPress: (id: string) => void;
}

const typeIcons: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  like: { name: 'heart', color: Colors.dark.danger },
  comment: { name: 'chatbubble', color: Colors.dark.textSecondary },
  connection: { name: 'person-add', color: Colors.dark.success },
  event: { name: 'calendar', color: Colors.dark.warning },
  message: { name: 'mail', color: Colors.dark.textSecondary },
};

export function NotificationItemComponent({ notification, onPress }: NotificationItemProps) {
  const icon = typeIcons[notification.type] || typeIcons.like;

  return (
    <Pressable
      onPress={() => onPress(notification.id)}
      style={({ pressed }) => [
        styles.container,
        !notification.isRead && styles.unread,
        pressed && { backgroundColor: Colors.dark.surfaceHover },
      ]}
    >
      <View style={styles.avatarWrap}>
        <Avatar initials={notification.actorAvatar} size={42} />
        <View style={[styles.typeIcon, { backgroundColor: Colors.dark.surface }]}>
          <Ionicons name={icon.name} size={12} color={icon.color} />
        </View>
      </View>
      <View style={styles.content}>
        <Text style={styles.text}>
          <Text style={styles.name}>{notification.actorName}</Text>
          {' '}{notification.content}
        </Text>
        <Text style={styles.time}>{notification.timestamp}</Text>
      </View>
      {!notification.isRead && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.divider,
  },
  unread: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  avatarWrap: {
    position: 'relative',
  },
  typeIcon: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.dark.background,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  text: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 19,
  },
  name: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: Colors.dark.text,
  },
  time: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 11,
    color: Colors.dark.textMeta,
    marginTop: 3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.text,
    marginLeft: 8,
  },
});
