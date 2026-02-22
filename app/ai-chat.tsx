/**
 * AI Chat Screen — Phase 9.9
 *
 * Chat with the AI assistant. Session list + active chat.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import {
  getChatSessions,
  createChatSession,
  getChatMessages,
  sendAIChatMessage,
  saveChatMessage,
  deleteChatSession,
} from '@/lib/api/ai-chat';
import type { AIChatSession, AIChatMessage } from '@/lib/api/ai-chat';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { QUERY_KEYS } from '@/lib/query-keys';

// ─── Session List ────────────────────────────────────────────

const SessionItem = React.memo(function SessionItem({
  session,
  colors,
  onSelect,
  onDelete,
}: {
  session: AIChatSession;
  colors: ReturnType<typeof useThemeColors>;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onSelect(session.id)}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onDelete(session.id);
      }}
      style={({ pressed }) => [
        styles.sessionItem,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { backgroundColor: colors.surfaceHover },
      ]}
    >
      <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.sessionTitle, { color: colors.text }]} numberOfLines={1}>
          {session.title || 'New conversation'}
        </Text>
        <Text style={[styles.sessionDate, { color: colors.textTertiary }]}>
          {new Date(session.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
});

// ─── Chat Bubble ─────────────────────────────────────────────

const ChatBubble = React.memo(function ChatBubble({
  message,
  colors,
}: {
  message: AIChatMessage;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const isUser = message.role === 'user';
  return (
    <View
      style={[
        styles.bubble,
        isUser
          ? [styles.bubbleUser, { backgroundColor: colors.primary }]
          : [styles.bubbleAI, { backgroundColor: colors.surfaceSecondary }],
      ]}
    >
      <Text
        style={[
          styles.bubbleText,
          { color: isUser ? '#fff' : colors.text },
        ]}
      >
        {message.content}
      </Text>
    </View>
  );
});

// ─── Screen ──────────────────────────────────────────────────

export default function AIChatScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { identity } = useIdentityContext();
  const userId = identity?.user_id ?? '';
  const flatListRef = useRef<FlatList>(null);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');

  // Sessions
  const sessionsQ = useQuery({
    queryKey: QUERY_KEYS.aiChatSessions,
    queryFn: () => getChatSessions(),
    enabled: !!userId && !activeSessionId,
    staleTime: 30_000,
  });
  const sessions = (sessionsQ.data ?? []) as AIChatSession[];

  // Messages for active session
  const messagesQ = useQuery({
    queryKey: QUERY_KEYS.aiChatMessages(activeSessionId ?? ''),
    queryFn: () => getChatMessages(activeSessionId!),
    enabled: !!activeSessionId,
    staleTime: 5_000,
  });
  const messages = (messagesQ.data ?? []) as AIChatMessage[];

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const createSessionMut = useMutation({
    mutationFn: () => createChatSession(),
    onSuccess: (data: any) => {
      const id = data?.id ?? data;
      setActiveSessionId(String(id));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aiChatSessions });
    },
  });

  const deleteSessionMut = useMutation({
    mutationFn: (sessionId: string) => deleteChatSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aiChatSessions });
    },
  });

  const sendMut = useMutation({
    mutationFn: async (text: string) => {
      // Save user message
      await saveChatMessage(activeSessionId!, 'user', text);
      // Get AI reply
      const reply = await sendAIChatMessage([
        { role: 'user', content: text },
      ]);
      return reply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aiChatMessages(activeSessionId!) });
    },
  });

  const handleSend = () => {
    const text = input.trim();
    if (!text || sendMut.isPending) return;
    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMut.mutate(text);
  };

  const renderSessionItem = useCallback(
    ({ item }: { item: AIChatSession }) => (
      <SessionItem
        session={item}
        colors={colors}
        onSelect={(id) => setActiveSessionId(id)}
        onDelete={(id) => deleteSessionMut.mutate(id)}
      />
    ),
    [colors, deleteSessionMut],
  );

  const renderMessage = useCallback(
    ({ item }: { item: AIChatMessage }) => <ChatBubble message={item} colors={colors} />,
    [colors],
  );

  // ─── Chat View ─────────────────────────────────────────────
  if (activeSessionId) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 8), borderBottomColor: colors.border },
          ]}
        >
          <Pressable
            onPress={() => setActiveSessionId(null)}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>AI Assistant</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Messages */}
        {messagesQ.isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id ?? String(Math.random())}
            contentContainerStyle={styles.chatContent}
            maxToRenderPerBatch={20}
            windowSize={10}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Ionicons name="sparkles-outline" size={40} color={colors.textTertiary} />
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Start a conversation
                </Text>
              </View>
            }
          />
        )}

        {/* Input */}
        <View
          style={[
            styles.inputBar,
            { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 8) },
          ]}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message…"
            placeholderTextColor={colors.textTertiary}
            multiline
            style={[
              styles.chatInput,
              { color: colors.text, backgroundColor: colors.surfaceSecondary },
            ]}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={handleSend}
            disabled={!input.trim() || sendMut.isPending}
            style={[
              styles.sendBtn,
              { backgroundColor: input.trim() ? colors.primary : colors.surfaceSecondary },
            ]}
          >
            {sendMut.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color={input.trim() ? '#fff' : colors.textTertiary} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ─── Sessions List View ────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 8), borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>AI Chat</Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            createSessionMut.mutate();
          }}
          disabled={createSessionMut.isPending}
          hitSlop={8}
        >
          {createSessionMut.isPending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
          )}
        </Pressable>
      </View>

      {sessionsQ.isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="chatbubbles-outline" size={56} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No conversations yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Tap + to start a new chat
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSessionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
  },
  listContent: { padding: 16, gap: 8 },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  sessionTitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.medium,
  },
  sessionDate: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  chatContent: {
    padding: 16,
    gap: 8,
    flexGrow: 1,
  },
  bubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 14,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    lineHeight: fontSize.base * 1.45,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  chatInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 120,
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
  },
  emptySubtitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
  },
});
