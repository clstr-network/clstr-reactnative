import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { formatRelativeTime } from '@/lib/time';
import Avatar from '@/components/Avatar';

interface Partner {
  full_name?: string;
  avatar_url?: string | null;
  role?: string | null;
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

function ConversationItem({ conversation, onPress }: ConversationItemProps) {
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
      <Avatar uri={partner?.avatar_url} name={partner?.full_name} size="lg" />

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

export default React.memo(ConversationItem);

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
    fontSize: fontSize.body,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
    flex: 1,
    marginRight: 8,
  },
  nameBold: {
    fontWeight: '700',
    fontFamily: fontFamily.bold,
  },
  time: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preview: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    flex: 1,
    marginRight: 8,
  },
  previewBold: {
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
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
    fontSize: fontSize.xs,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
  },
});
