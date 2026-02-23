/**
 * AI Chat Screen — Phase 9.9 → Phase 12.14
 *
 * Chat with the AI assistant. Session list + active chat.
 * Enhanced: message history context, markdown rendering, suggested prompts, typing indicator.
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
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Markdown from 'react-native-markdown-display';

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

// ─── Suggested prompts ──────────────────────────────────────

const SUGGESTED_PROMPTS = [
  { label: 'Help me with my resume', icon: 'document-text-outline' as keyof typeof Ionicons.glyphMap },
  { label: 'Suggest project ideas', icon: 'bulb-outline' as keyof typeof Ionicons.glyphMap },
  { label: 'Prepare for an interview', icon: 'briefcase-outline' as keyof typeof Ionicons.glyphMap },
  { label: 'Explain a concept', icon: 'school-outline' as keyof typeof Ionicons.glyphMap },
  { label: 'Write a cover letter', icon: 'create-outline' as keyof typeof Ionicons.glyphMap },
  { label: 'Study plan for exams', icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap },
];

// ─── Typing indicator ────────────────────────────────────────

const TypingIndicator = React.memo(function TypingIndicator({ colors }: { colors: ReturnType<typeof useThemeColors> }) {
  return (
    <View style={[styles.bubble, styles.bubbleAI, { backgroundColor: colors.surfaceSecondary }]}>
      <View style={styles.typingRow}>
        <View style={[styles.typingDot, { backgroundColor: colors.textTertiary }]} />
        <View style={[styles.typingDot, styles.typingDotDelay1, { backgroundColor: colors.textTertiary }]} />
        <View style={[styles.typingDot, styles.typingDotDelay2, { backgroundColor: colors.textTertiary }]} />
      </View>
    </View>
  );
});

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

  const mdStyles = React.useMemo(
    () => ({
      body: {
        color: isUser ? '#fff' : colors.text,
        fontSize: fontSize.base,
        fontFamily: fontFamily.regular,
        lineHeight: fontSize.base * 1.45,
      },
      strong: { fontFamily: fontFamily.bold },
      em: { fontStyle: 'italic' as const },
      code_inline: {
        backgroundColor: isUser ? 'rgba(255,255,255,0.15)' : colors.surfaceSecondary,
        color: isUser ? '#fff' : colors.primary,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: fontSize.sm,
        paddingHorizontal: 4,
        borderRadius: 4,
      },
      fence: {
        backgroundColor: isUser ? 'rgba(255,255,255,0.1)' : colors.surfaceSecondary,
        borderRadius: 8,
        padding: 10,
        marginVertical: 4,
      },
      code_block: {
        color: isUser ? '#fff' : colors.text,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: fontSize.sm,
      },
      bullet_list: { marginVertical: 4 },
      ordered_list: { marginVertical: 4 },
      list_item: { marginVertical: 2 },
      heading1: { fontFamily: fontFamily.bold, fontSize: fontSize.lg, marginBottom: 4 },
      heading2: { fontFamily: fontFamily.bold, fontSize: fontSize.body, marginBottom: 4 },
      heading3: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, marginBottom: 2 },
      link: { color: isUser ? '#fff' : colors.primary, textDecorationLine: 'underline' as const },
      paragraph: { marginTop: 0, marginBottom: 4 },
    }),
    [isUser, colors],
  );

  return (
    <View
      style={[
        styles.bubble,
        isUser
          ? [styles.bubbleUser, { backgroundColor: colors.primary }]
          : [styles.bubbleAI, { backgroundColor: colors.surfaceSecondary }],
      ]}
    >
      {isUser ? (
        <Text style={[styles.bubbleText, { color: '#fff' }]}>{message.content}</Text>
      ) : (
        <Markdown style={mdStyles as any}>{message.content}</Markdown>
      )}
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
      // Build full message history for context
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: text });
      // Keep last 20 messages for context window
      const contextMessages = history.slice(-20);
      // Get AI reply
      const reply = await sendAIChatMessage(contextMessages);
      return reply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aiChatMessages(activeSessionId!) });
    },
  });

  const handleSend = useCallback((text?: string) => {
    const msg = (typeof text === 'string' ? text : input).trim();
    if (!msg || sendMut.isPending) return;
    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMut.mutate(msg);
  }, [input, sendMut]);

  const handleSuggestedPrompt = useCallback((prompt: string) => {
    handleSend(prompt);
  }, [handleSend]);

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
                {/* Suggested prompts */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.promptsRow}
                  style={{ marginTop: 16, flexGrow: 0 }}
                >
                  {SUGGESTED_PROMPTS.map((p) => (
                    <Pressable
                      key={p.label}
                      style={[styles.promptChip, { borderColor: colors.border, backgroundColor: colors.surface }]}
                      onPress={() => handleSuggestedPrompt(p.label)}
                    >
                      <Ionicons name={p.icon as any} size={16} color={colors.primary} />
                      <Text style={[styles.promptLabel, { color: colors.text }]}>{p.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            }
            ListFooterComponent={
              sendMut.isPending ? <TypingIndicator colors={colors} /> : null
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
            onSubmitEditing={() => handleSend()}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={() => handleSend()}
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
  // Suggested prompts
  promptsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  promptLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
  },
  // Typing indicator
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.5,
  },
  typingDotDelay1: {
    opacity: 0.35,
  },
  typingDotDelay2: {
    opacity: 0.2,
  },
});
