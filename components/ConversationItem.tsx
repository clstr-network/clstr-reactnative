import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useThemeColors } from '@/constants/colors';
import { formatRelativeTime } from '@/lib/time';
import Avatar from '@/components/Avatar';

interface Partner {
  full_name?: string;
  avatar_url?: string | null;
  role?: string;
}

interface LastMessage {
  content?: string;
  created_at?: string;
}

interface Conversation {
  partner_id?: number | string;
  partner?: Partner;
  last_message?: LastMessage | null;
  unread_count?: number;
}

interface ConversationItemProps {
  conversation: Conversation;
  onPress?: () => void;
}

export default function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  const colors = useThemeColors();
  const partner = conversation.partner;
  const lastMsg = conversation.last_message;
  const unread = conversation.unread_count ?? 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: pressed ? colors.surfaceSecondary : colors.surface },
      ]}
    >
      <Avatar uri={partner?.avatar_url} name={partner?.full_name} size={50} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            style={[styles.name, { color: colors.text }, unread > 0 && styles.nameBold]}
            numberOfLines={1}
          >
            {partner?.full_name ?? 'Unknown'}
          </Text>
          {lastMsg?.created_at ? (
            <Text style={[styles.time, { color: colors.textTertiary }]}>
              {formatRelativeTime(lastMsg.created_at)}
            </Text>
          ) : null}
        </View>

        <View style={styles.bottomRow}>
          <Text
            style={[
              styles.preview,
              { color: unread > 0 ? colors.text : colors.textSecondary },
              unread > 0 && styles.previewBold,
            ]}
            numberOfLines={1}
          >
            {lastMsg?.content ?? 'No messages yet'}
          </Text>
          {unread > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  nameBold: {
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preview: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  previewBold: {
    fontWeight: '600',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
