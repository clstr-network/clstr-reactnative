import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable, useColorScheme, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/lib/auth-context';
import { QUERY_KEYS } from '@/lib/query-keys';
import { useMessageSubscription } from '@/lib/hooks/useMessageSubscription';
import {
  getMessages,
  sendMessage,
  markMessagesAsRead,
  type Message,
} from '@/lib/api';

export default function ChatScreen() {
  const { id: partnerId } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  // Phase 3.1 — Realtime message subscription (active partner level)
  useMessageSubscription({ activePartnerId: partnerId });

  const { data } = useQuery({
    queryKey: QUERY_KEYS.chat(partnerId!),
    queryFn: () => getMessages(partnerId!),
    enabled: !!partnerId,
    staleTime: 10_000,       // 10s — realtime handles live message delivery
    gcTime: 5 * 60 * 1000,   // 5min
  });

  const messages = data?.messages ?? [];
  const partner = data?.partner;
  const reversedMessages = [...messages].reverse();

  // Mark messages as read on mount
  useEffect(() => {
    if (partnerId) {
      markMessagesAsRead(partnerId).catch(() => {});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
    }
  }, [partnerId, queryClient]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessage(partnerId!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chat(partnerId!) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
    },
  });

  const handleSend = useCallback(() => {
    if (!text.trim() || !partnerId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const content = text.trim();
    setText('');
    sendMutation.mutate(content);
    inputRef.current?.focus();
  }, [text, partnerId, sendMutation]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isSelf = item.sender_id === user?.id;
    return (
      <View style={[styles.msgRow, isSelf && styles.msgRowSelf]}>
        {!isSelf && <Avatar uri={partner?.avatar_url} name={partner?.full_name} size={30} />}
        <View style={[
          styles.msgBubble,
          isSelf
            ? { backgroundColor: colors.tint, borderBottomRightRadius: 4 }
            : { backgroundColor: colors.surfaceElevated, borderBottomLeftRadius: 4 },
        ]}>
          <Text style={[styles.msgText, { color: isSelf ? '#fff' : colors.text }]}>{item.content}</Text>
        </View>
      </View>
    );
  }, [colors, partner, user?.id]);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior="padding" keyboardVerticalOffset={0}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Avatar uri={partner?.avatar_url} name={partner?.full_name} size={36} />
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
            {partner?.full_name || 'Chat'}
          </Text>
        </View>
      </View>

      <FlatList
        data={reversedMessages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        inverted
        contentContainerStyle={styles.msgList}
        showsVerticalScrollIndicator={false}
        maxToRenderPerBatch={15}
        windowSize={7}
        initialNumToRender={20}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      />

      <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 8) }]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          placeholder="Type a message..."
          placeholderTextColor={colors.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
        />
        <Pressable
          onPress={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
          style={({ pressed }) => [
            styles.sendBtn,
            { backgroundColor: text.trim() ? colors.tint : colors.surfaceElevated },
            pressed && { opacity: 0.85 },
          ]}
          hitSlop={8}
        >
          <Ionicons name="send" size={18} color={text.trim() ? '#fff' : colors.textTertiary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14,
    paddingBottom: 12, borderBottomWidth: 1,
  },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  msgList: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginVertical: 3, maxWidth: '80%' },
  msgRowSelf: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, maxWidth: '100%' },
  msgText: { fontSize: 15, lineHeight: 21, fontFamily: 'Inter_400Regular' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 14,
    paddingTop: 8, borderTopWidth: 1,
  },
  input: {
    flex: 1, fontSize: 15, padding: 12, borderRadius: 20, borderWidth: 1,
    maxHeight: 100, fontFamily: 'Inter_400Regular',
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
