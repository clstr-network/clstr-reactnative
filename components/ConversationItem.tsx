import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Colors from '@/constants/colors';
import { Avatar } from './Avatar';
import type { Conversation } from '@/lib/mock-data';

interface ConversationItemProps {
  conversation: Conversation;
  onPress?: () => void;
}

export function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  const c = Colors.colors;
  const hasUnread = conversation.unread > 0;

  const getDaysAgo = () => {
    const diff = Date.now() - conversation.timestamp.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return '1 day';
    return `${days} days`;
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.container, { opacity: pressed ? 0.7 : 1, borderBottomColor: c.borderSubtle }]}
      onPress={onPress}
    >
      <Avatar name={conversation.partner.name} size={46} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
            {conversation.partner.name}
          </Text>
          <Text style={[styles.time, { color: c.textTertiary }]}>
            {getDaysAgo()}
          </Text>
        </View>
        <Text
          style={[styles.message, {
            color: hasUnread ? c.text : c.textSecondary,
            fontFamily: hasUnread ? 'Inter_500Medium' : 'Inter_400Regular',
          }]}
          numberOfLines={1}
        >
          {conversation.lastMessage}
        </Text>
      </View>
      {hasUnread && (
        <View style={[styles.unreadDot, { backgroundColor: c.primary }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
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
  name: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  message: {
    fontSize: 13,
    marginTop: 3,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
});
