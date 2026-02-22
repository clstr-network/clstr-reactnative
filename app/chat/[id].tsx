import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useData } from '@/lib/data-context';
import { MessageBubble } from '@/components/MessageBubble';
import { Avatar } from '@/components/Avatar';
import { Message } from '@/lib/types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { conversations, getMessages, sendMessage } = useData();
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const conversation = conversations.find(c => c.id === id);
  const messages = getMessages(id || '');

  const handleSend = () => {
    if (text.trim() && id) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      sendMessage(id, text.trim());
      setText('');
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <MessageBubble message={item} />
  ), []);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  if (!conversation) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Ionicons name="chatbubble-outline" size={40} color={Colors.dark.textMeta} />
        <Text style={styles.emptyText}>Conversation not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={[styles.chatHeader, { paddingTop: (Platform.OS === 'web' ? webTopInset : insets.top) + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Avatar
          initials={conversation.participantAvatar}
          size={36}
          isOnline={conversation.isOnline}
        />
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderName}>{conversation.participantName}</Text>
          <Text style={[styles.chatHeaderStatus, !conversation.isOnline && styles.chatHeaderOffline]}>
            {conversation.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!messages.length}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
      />

      <View style={[styles.inputBar, { paddingBottom: Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 12) }]}>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={Colors.dark.textMeta}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              !text.trim() && styles.sendBtnDisabled,
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={8}
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={text.trim() ? Colors.dark.primaryForeground : Colors.dark.textMeta}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.divider,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderInfo: {
    marginLeft: 10,
    flex: 1,
  },
  chatHeaderName: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    color: Colors.dark.text,
  },
  chatHeaderStatus: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    color: Colors.dark.success,
    marginTop: 1,
  },
  chatHeaderOffline: {
    color: Colors.dark.textMeta,
  },
  messageList: {
    paddingVertical: 16,
  },
  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.divider,
    backgroundColor: Colors.dark.background,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.dark.inputBackground,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.dark.inputBorder,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 15,
    color: Colors.dark.text,
    maxHeight: 100,
    paddingVertical: 6,
  },
  sendBtn: {
    backgroundColor: Colors.dark.primary,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.dark.surface,
  },
  emptyText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    color: Colors.dark.textMeta,
  },
});
