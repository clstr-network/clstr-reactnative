import React, { useState, useRef } from 'react';
import {
  FlatList, StyleSheet, View, Text, TextInput, Pressable, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import Colors from '@/constants/colors';
import { Avatar } from '@/components/Avatar';
import { CONVERSATIONS, MESSAGES, type Message } from '@/lib/mock-data';

export default function ChatScreen() {
  const c = Colors.colors;
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const { id } = useLocalSearchParams<{ id: string }>();
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  const conversation = CONVERSATIONS.find(conv => conv.id === id);
  const [messages, setMessages] = useState<Message[]>(
    [...(MESSAGES[id || ''] || [])].reverse()
  );

  const handleSend = () => {
    if (!input.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMsg: Message = {
      id: Crypto.randomUUID(),
      senderId: 'me',
      text: input.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [newMsg, ...prev]);
    setInput('');
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.senderId === 'me';
    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        <View style={[styles.bubble, {
          backgroundColor: isMe ? c.primary : c.card,
          borderColor: isMe ? c.primary : c.border,
        }]}>
          <Text style={[styles.msgText, { color: isMe ? c.background : c.text }]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  if (!conversation) {
    return (
      <View style={[styles.root, { backgroundColor: c.background }]}>
        <View style={[styles.chatHeader, { paddingTop: (Platform.OS === 'web' ? webTopInset : insets.top) + 4 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={c.primary} />
          </Pressable>
          <Text style={[styles.chatName, { color: c.text }]}>Not found</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.chatHeader, { paddingTop: (Platform.OS === 'web' ? webTopInset : insets.top) + 4, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={c.primary} />
        </Pressable>
        <Avatar name={conversation.partner.name} size={34} />
        <View style={styles.chatHeaderText}>
          <Text style={[styles.chatName, { color: c.text }]}>{conversation.partner.name}</Text>
          <Text style={[styles.chatRole, { color: c.textTertiary }]}>{conversation.partner.role}</Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={styles.msgList}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.inputBar, {
        backgroundColor: c.backgroundSecondary,
        borderTopColor: c.border,
        paddingBottom: Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 8),
      }]}>
        <TextInput
          style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
          placeholder="Type a message..."
          placeholderTextColor={c.textTertiary}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={[styles.sendBtn, { backgroundColor: input.trim() ? c.primary : c.tier1 }]}
          onPress={handleSend}
          disabled={!input.trim()}
        >
          <Ionicons name="arrow-up" size={20} color={input.trim() ? c.background : c.textTertiary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderText: {
    flex: 1,
  },
  chatName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  chatRole: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  msgList: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 8,
    maxWidth: '80%',
  },
  msgRowMe: {
    alignSelf: 'flex-end',
  },
  bubble: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  msgText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
});
