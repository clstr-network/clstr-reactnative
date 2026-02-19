/**
 * ConversationDetailScreen — Chat thread screen.
 *
 * Receives conversationId (= partnerId) from route params.
 * Uses useChat, useChatRealtime, useRealtimeReconnect.
 * Inverted FlatList for chat messages (newest at bottom, scrolls naturally).
 * KeyboardAvoidingView wraps the entire screen.
 * Channel cleanup on unmount (prevents zombie subscriptions).
 */
import React, { useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MessagingStackParamList } from '@clstr/shared/navigation/types';
import { tokens } from '@clstr/shared/design/tokens';
import { useAuth } from '@clstr/shared/hooks/useAuth';
import { isUserOnline } from '@clstr/core/api/messages-api';
import type { Message } from '@clstr/core/api/messages-api';

import { useChat } from '../../hooks/useChat';
import { useChatRealtime } from '../../hooks/useChatRealtime';
import { useRealtimeReconnect } from '../../hooks/useRealtimeReconnect';
import { MessageBubble } from '../../components/messaging/MessageBubble';
import { ChatInput } from '../../components/messaging/ChatInput';

type RouteType = RouteProp<MessagingStackParamList, 'ConversationDetail'>;
type Nav = NativeStackNavigationProp<MessagingStackParamList, 'ConversationDetail'>;

export function ConversationDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteType>();
  const { conversationId: partnerId } = route.params;
  const { user } = useAuth();
  const userId = user?.id;

  // ── Data hooks ──
  const {
    messages,
    partner,
    isLoading,
    sendMessage,
    isSending,
    markAsRead,
  } = useChat(partnerId);

  // Realtime subscription scoped to active partner
  const { reconnect } = useChatRealtime(partnerId);

  // R5: Background/foreground reconnection
  useRealtimeReconnect(userId, reconnect);

  // Auto-mark messages as read on screen focus
  useFocusEffect(
    useCallback(() => {
      markAsRead();
    }, [markAsRead]),
  );

  // ── Inverted data (FlatList inverted=true expects reversed order) ──
  const invertedMessages = useMemo(
    () => [...messages].reverse(),
    [messages],
  );

  // ── Send handler ──
  const handleSend = useCallback(
    (content: string) => {
      sendMessage(content);
    },
    [sendMessage],
  );

  // ── Render item ──
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble
        content={item.content}
        createdAt={item.created_at}
        isSent={item.sender_id === userId}
      />
    ),
    [userId],
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const online = partner ? isUserOnline(partner.avatar_url ? null : null) : false;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + tokens.spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backButton}>{'‹'}</Text>
        </Pressable>

        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {partner?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View>
            <Text style={styles.headerName} numberOfLines={1}>
              {partner?.full_name ?? 'Loading...'}
            </Text>
            <Text style={styles.headerStatus}>
              {partner?.role ?? ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.colors.dark.primary} />
        </View>
      ) : (
        <FlatList
          data={invertedMessages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          inverted
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
          contentContainerStyle={
            invertedMessages.length === 0
              ? styles.emptyList
              : styles.messageList
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Say hello! 👋</Text>
              <Text style={styles.emptySubtitle}>
                Send your first message to start the conversation
              </Text>
            </View>
          }
          getItemLayout={undefined}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Input */}
      <View style={{ paddingBottom: insets.bottom }}>
        <ChatInput onSend={handleSend} isSending={isSending} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: tokens.colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border.default,
    backgroundColor: tokens.colors.dark.background,
  },
  backButton: {
    fontSize: 32,
    color: tokens.colors.dark.primary,
    paddingRight: tokens.spacing.sm,
    lineHeight: 36,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.dark.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: tokens.spacing.sm,
  },
  headerAvatarText: {
    fontSize: tokens.typography.fontSize.base,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.dark.foreground,
  },
  headerName: {
    fontSize: tokens.typography.fontSize.base,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.dark.foreground,
  },
  headerStatus: {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.text.tertiary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    paddingVertical: tokens.spacing.sm,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    // When in inverted FlatList, "empty" shows at the center
    // but visually appears right-side-up because we invert the container
    transform: [{ scaleY: -1 }],
  },
  emptyTitle: {
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.dark.foreground,
    marginBottom: tokens.spacing.sm,
  },
  emptySubtitle: {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.text.tertiary,
    textAlign: 'center',
  },
});
