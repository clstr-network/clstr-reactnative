import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable, useColorScheme, Platform,
  KeyboardAvoidingView
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { Avatar } from '@/components/Avatar';
import { getMessages, sendMessage, getConversations, type Message } from '@/lib/storage';
import { formatMessageTime } from '@/lib/time';

function MessageBubble({ message, colors }: { message: Message; colors: any }) {
  const isSelf = message.senderId === 'self';
  return (
    <View style={[styles.bubbleRow, isSelf && styles.bubbleRowSelf]}>
      <View style={[
        styles.bubble,
        isSelf ? { backgroundColor: colors.tint } : { backgroundColor: colors.surfaceElevated },
      ]}>
        <Text style={[styles.bubbleText, { color: isSelf ? '#fff' : colors.text }]}>
          {message.content}
        </Text>
        <Text style={[styles.bubbleTime, { color: isSelf ? 'rgba(255,255,255,0.7)' : colors.textTertiary }]}>
          {formatMessageTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState('');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => getMessages(id!),
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
  });

  const conversation = conversations.find(c => c.id === id);
  const reversedMessages = [...messages].reverse();

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !id) return;
    setInputText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await sendMessage(id, text);
    queryClient.invalidateQueries({ queryKey: ['messages', id] });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <MessageBubble message={item} colors={colors} />
  ), [colors]);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        {conversation && (
          <View style={styles.headerInfo}>
            <Avatar uri={conversation.participantAvatar} name={conversation.participantName} size={36} />
            <View>
              <Text style={[styles.headerName, { color: colors.text }]}>{conversation.participantName}</Text>
              <Text style={[styles.headerRole, { color: colors.textTertiary }]}>{conversation.participantRole}</Text>
            </View>
          </View>
        )}
        <Pressable hitSlop={12}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      <FlatList
        data={reversedMessages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        inverted
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + webBottomInset + 8 }]}>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.surfaceElevated, color: colors.text, borderColor: colors.border }]}
          placeholder="Message..."
          placeholderTextColor={colors.textTertiary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
        />
        <Pressable
          onPress={handleSend}
          disabled={!inputText.trim()}
          style={({ pressed }) => [
            styles.sendBtn,
            { backgroundColor: inputText.trim() ? colors.tint : colors.border },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons name="send" size={18} color={inputText.trim() ? '#fff' : colors.textTertiary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12,
  },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerName: { fontSize: 16, fontWeight: '700' },
  headerRole: { fontSize: 12, textTransform: 'capitalize' },
  messageList: { padding: 16, gap: 4 },
  bubbleRow: { flexDirection: 'row', marginBottom: 4 },
  bubbleRowSelf: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontSize: 11, marginTop: 4, textAlign: 'right' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, gap: 8,
  },
  textInput: {
    flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15,
    maxHeight: 100, borderWidth: 1,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
