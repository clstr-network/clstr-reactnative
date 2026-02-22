import React, { useState, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/Avatar';
import { colors } from '@/constants/colors';
import { Message, generateMockMessages } from '@/lib/mock-data';

function MessageBubble({ message, isMe }: { message: Message; isMe: boolean }) {
  const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
          {message.text}
        </Text>
        <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeOther]}>
          {time}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const [messages, setMessages] = useState<Message[]>(() => generateMockMessages(id || 'conv_0'));
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const reversedMessages = [...messages].reverse();

  function handleSend() {
    if (!inputText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMsg: Message = {
      id: `msg_new_${Date.now()}`,
      conversationId: id || 'conv_0',
      senderId: 'me',
      text: inputText.trim(),
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={[styles.headerBar, { paddingTop: insets.top + webTopInset }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Avatar name={name || 'User'} size={32} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{name || 'User'}</Text>
          <Text style={styles.headerStatus}>Online</Text>
        </View>
        <Pressable style={styles.headerAction}>
          <Ionicons name="call-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={reversedMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble message={item} isMe={item.senderId === 'me'} />
        )}
        inverted
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 8) }]}>
        <Pressable style={styles.attachButton}>
          <Ionicons name="add-circle-outline" size={24} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Message..."
            placeholderTextColor={colors.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
        </View>
        <Pressable
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={18} color={inputText.trim() ? '#FFF' : colors.textTertiary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  headerStatus: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.success,
  },
  headerAction: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginVertical: 3,
    justifyContent: 'flex-start',
  },
  bubbleRowMe: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.surfaceElevated,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: '#FFF',
  },
  bubbleTextOther: {
    color: colors.text,
  },
  bubbleTime: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  bubbleTimeMe: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'right',
  },
  bubbleTimeOther: {
    color: colors.textTertiary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  attachButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 14,
    maxHeight: 100,
  },
  textInput: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
    paddingVertical: 10,
    maxHeight: 80,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceElevated,
  },
});
