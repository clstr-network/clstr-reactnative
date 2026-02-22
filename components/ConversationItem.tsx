import React from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme } from 'react-native';
import { useThemeColors } from '@/constants/colors';
import { Avatar } from './Avatar';
import { RoleBadge } from './RoleBadge';
import { formatMessageTime } from '@/lib/time';
import type { Conversation } from '@/lib/storage';

interface ConversationItemProps {
  conversation: Conversation;
  onPress: (id: string) => void;
}

export const ConversationItem = React.memo(function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  const colors = useThemeColors(useColorScheme());
  const hasUnread = conversation.unreadCount > 0;

  return (
    <Pressable
      onPress={() => onPress(conversation.id)}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: pressed ? colors.surfaceElevated : 'transparent' },
      ]}
    >
      <Avatar uri={conversation.participantAvatar} name={conversation.participantName} size={52} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }, hasUnread && styles.nameBold]} numberOfLines={1}>
              {conversation.participantName}
            </Text>
            <RoleBadge role={conversation.participantRole} />
          </View>
          <Text style={[styles.time, { color: hasUnread ? colors.tint : colors.textTertiary }]}>
            {formatMessageTime(conversation.lastMessageAt)}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[styles.lastMsg, { color: hasUnread ? colors.text : colors.textSecondary }]}
            numberOfLines={1}
          >
            {conversation.lastMessage}
          </Text>
          {hasUnread && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.tint }]}>
              <Text style={styles.unreadText}>{conversation.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
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
  content: {
    flex: 1,
    marginLeft: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    flexShrink: 1,
  },
  nameBold: {
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  lastMsg: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
