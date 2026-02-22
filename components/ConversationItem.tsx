import React from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme } from 'react-native';
import { useThemeColors } from '@/constants/colors';
import { Avatar } from './Avatar';
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
      style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.surfaceElevated }]}
    >
      <Avatar uri={conversation.participantAvatar} name={conversation.participantName} size={52} />
      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={[styles.name, { color: colors.text }, hasUnread && styles.nameBold]} numberOfLines={1}>
            {conversation.participantName}
          </Text>
          <Text style={[styles.time, { color: hasUnread ? colors.tint : colors.textTertiary }]}>
            {formatMessageTime(conversation.lastMessageAt)}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[styles.lastMsg, { color: hasUnread ? colors.text : colors.textSecondary }, hasUnread && styles.lastMsgBold]}
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
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 14 },
  info: { flex: 1, gap: 4 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '500', fontFamily: 'Inter_500Medium', flex: 1, marginRight: 8 },
  nameBold: { fontWeight: '700', fontFamily: 'Inter_700Bold' },
  time: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lastMsg: { fontSize: 14, flex: 1, fontFamily: 'Inter_400Regular' },
  lastMsgBold: { fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
