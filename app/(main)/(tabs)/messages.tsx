import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  Platform, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { colors } from '@/constants/colors';
import { Conversation, generateMockConversations, formatTimeAgo } from '@/lib/mock-data';

function ConversationItem({ conversation }: { conversation: Conversation }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.convItem, pressed && { backgroundColor: colors.surfaceElevated }]}
      onPress={() => router.push({
        pathname: '/(main)/chat',
        params: { id: conversation.id, name: conversation.participantName },
      })}
    >
      <View style={styles.avatarContainer}>
        <Avatar name={conversation.participantName} size={48} />
        {conversation.isOnline && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.convInfo}>
        <View style={styles.convTopRow}>
          <Text style={[styles.convName, conversation.unreadCount > 0 && styles.convNameUnread]} numberOfLines={1}>
            {conversation.participantName}
          </Text>
          <Text style={[styles.convTime, conversation.unreadCount > 0 && { color: colors.primary }]}>
            {formatTimeAgo(conversation.lastMessageTime)}
          </Text>
        </View>
        <View style={styles.convBottomRow}>
          <Text
            style={[styles.convMessage, conversation.unreadCount > 0 && styles.convMessageUnread]}
            numberOfLines={1}
          >
            {conversation.lastMessage}
          </Text>
          {conversation.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{conversation.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<Conversation[]>(() => generateMockConversations(8));
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setConversations(generateMockConversations(8));
      setRefreshing(false);
    }, 1000);
  }, []);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={styles.screen}>
      <View style={[styles.headerBar, { paddingTop: insets.top + webTopInset }]}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Pressable style={styles.newButton}>
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ConversationItem conversation={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Connect with people to start chatting</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  newButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  convInfo: {
    flex: 1,
  },
  convTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convName: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
    flex: 1,
  },
  convNameUnread: {
    fontFamily: 'Inter_600SemiBold',
  },
  convTime: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textTertiary,
    marginLeft: 8,
  },
  convBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  convMessage: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textTertiary,
    flex: 1,
  },
  convMessageUnread: {
    color: colors.textSecondary,
    fontFamily: 'Inter_500Medium',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textTertiary,
  },
});
