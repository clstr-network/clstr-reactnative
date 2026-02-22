import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Avatar } from './Avatar';
import { Conversation } from '@/lib/types';

interface ConversationItemProps {
  conversation: Conversation;
  onPress: () => void;
}

export function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.container, pressed && { backgroundColor: Colors.dark.surfaceHover }]}
    >
      <Avatar
        initials={conversation.participantAvatar}
        size={48}
        isOnline={conversation.isOnline}
      />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {conversation.participantName}
          </Text>
          <Text style={styles.time}>{conversation.timestamp}</Text>
        </View>
        <Text style={[styles.message, conversation.unread > 0 && styles.unreadMessage]} numberOfLines={1}>
          {conversation.lastMessage}
        </Text>
      </View>
      {conversation.unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{conversation.unread}</Text>
        </View>
      )}
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
  content: {
    flex: 1,
    marginLeft: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  name: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15,
    color: Colors.dark.text,
    flex: 1,
  },
  time: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    color: Colors.dark.textMeta,
    marginLeft: 8,
  },
  message: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  unreadMessage: {
    color: Colors.dark.text,
  },
  badge: {
    backgroundColor: Colors.dark.text,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  badgeText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    color: Colors.dark.background,
  },
});
