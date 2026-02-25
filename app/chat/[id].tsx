import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable, Platform, ScrollView,
  Image, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/lib/auth-context';
import { QUERY_KEYS, MOBILE_QUERY_KEYS } from '@/lib/query-keys';
import { useMessageSubscription } from '@/lib/hooks/useMessageSubscription';
import { isUserOnline } from '@/lib/api/messages';
import type { MessageAttachment } from '@/lib/api/messages';
import { useFileUpload } from '@/lib/hooks/useFileUpload';
import { formatRelativeTime } from '@/lib/time';
import {
  getMessages,
  getProfile,
  sendMessage,
  markMessagesAsRead,
  type Message,
} from '@/lib/api';
import { checkConnectionStatus } from '@/lib/api/social';

const SUGGESTED_REPLIES = [
  "Thanks for letting me know!",
  "Yes, I'd be interested in learning more.",
  "Could you send me more details?",
];

export default function ChatScreen() {
  const { id: partnerId } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<MessageAttachment | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const { pickImage, takePhoto, uploadImage, isUploading, progress } = useFileUpload({
    bucket: 'message-attachments',
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  // Phase 3.1 — Realtime message subscription (active partner level)
  useMessageSubscription({ activePartnerId: partnerId });

  // F6 — Connection eligibility check
  const { data: connectionStatus, isLoading: isCheckingConnection } = useQuery({
    queryKey: MOBILE_QUERY_KEYS.connectionStatus(partnerId!),
    queryFn: () => checkConnectionStatus(partnerId!),
    enabled: !!partnerId,
    staleTime: 60_000,
  });

  const { data } = useQuery({
    queryKey: QUERY_KEYS.chat(partnerId!),
    queryFn: () => getMessages(partnerId!),
    enabled: !!partnerId,
    staleTime: 10_000,       // 10s — realtime handles live message delivery
    gcTime: 5 * 60 * 1000,   // 5min
  });

  const { data: partner } = useQuery({
    queryKey: QUERY_KEYS.profile(partnerId!),
    queryFn: () => getProfile(partnerId!),
    enabled: !!partnerId,
  });

  const messages = data ?? [];
  const reversedMessages = [...messages].reverse();

  // Mark messages as read on mount
  useEffect(() => {
    if (partnerId) {
      markMessagesAsRead(partnerId).catch(() => {});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
    }
  }, [partnerId, queryClient]);

  const sendMutation = useMutation({
    mutationFn: ({ content, attachment }: { content: string; attachment?: MessageAttachment | null }) =>
      sendMessage(partnerId!, content, attachment ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chat(partnerId!) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
    },
  });

  const handleSend = useCallback(() => {
    if ((!text.trim() && !pendingAttachment) || !partnerId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const content = text.trim();
    setText('');
    const attachment = pendingAttachment;
    setPendingAttachment(null);
    setShowAttachMenu(false);
    sendMutation.mutate({ content, attachment });
    inputRef.current?.focus();
  }, [text, partnerId, pendingAttachment, sendMutation]);

  const handleQuickReply = useCallback((reply: string) => {
    if (!partnerId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMutation.mutate({ content: reply });
  }, [partnerId, sendMutation]);

  const showSuggestions = messages.length < 3;

  const handlePickImage = useCallback(async () => {
    setShowAttachMenu(false);
    const result = await pickImage();
    if (!result || result.canceled) return;
    const asset = result.assets[0];
    if (!user?.id) return;
    const url = await uploadImage(asset.uri, user.id, { folder: user.id });
    if (url) {
      const name = asset.fileName || `image_${Date.now()}.jpg`;
      const type = asset.mimeType || 'image/jpeg';
      setPendingAttachment({ url, type, name });
    }
  }, [pickImage, uploadImage, user?.id]);

  const handleTakePhoto = useCallback(async () => {
    setShowAttachMenu(false);
    const result = await takePhoto();
    if (!result || result.canceled) return;
    const asset = result.assets[0];
    if (!user?.id) return;
    const url = await uploadImage(asset.uri, user.id, { folder: user.id });
    if (url) {
      const name = `photo_${Date.now()}.jpg`;
      const type = asset.mimeType || 'image/jpeg';
      setPendingAttachment({ url, type, name });
    }
  }, [takePhoto, uploadImage, user?.id]);

  const handlePickDocument = useCallback(async () => {
    setShowAttachMenu(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!user?.id) return;
      const url = await uploadImage(asset.uri, user.id, { folder: user.id });
      if (url) {
        setPendingAttachment({
          url,
          type: asset.mimeType || 'application/octet-stream',
          name: asset.name || `document_${Date.now()}`,
        });
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to pick document');
    }
  }, [uploadImage, user?.id]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isSelf = item.sender_id === user?.id;
    const hasImage = item.attachment_url && item.attachment_type?.startsWith('image/');
    const hasDocument = item.attachment_url && !item.attachment_type?.startsWith('image/');
    // Hide auto-generated fallback text when attachment is visible
    const isAutoContent = item.attachment_url && /^Sent (an image|a file)$/.test(item.content || '');
    const showContent = item.content && !isAutoContent;

    return (
      <View style={[styles.msgRow, isSelf && styles.msgRowSelf]}>
        {!isSelf && <Avatar uri={partner?.avatar_url} name={partner?.full_name} size={30} />}
        <View style={[
          styles.msgBubble,
          isSelf
            ? { backgroundColor: colors.tint, borderBottomRightRadius: 4 }
            : { backgroundColor: colors.surfaceElevated, borderBottomLeftRadius: 4 },
          hasImage && styles.msgBubbleImage,
        ]}>
          {hasImage && (
            <Image
              source={{ uri: item.attachment_url! }}
              style={styles.attachmentImage}
              resizeMode="cover"
            />
          )}
          {hasDocument && (
            <View style={[styles.documentAttachment, { backgroundColor: isSelf ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)' }]}>
              <Ionicons name="document-text-outline" size={20} color={isSelf ? '#fff' : colors.tint} />
              <Text style={[styles.documentName, { color: isSelf ? '#fff' : colors.text }]} numberOfLines={1}>
                {item.attachment_name || 'File'}
              </Text>
            </View>
          )}
          {showContent && (
            <Text style={[styles.msgText, { color: isSelf ? '#fff' : colors.text }]}>{item.content}</Text>
          )}
        </View>
      </View>
    );
  }, [colors, partner, user?.id]);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  // F6 — Block access if not connected
  if (!isCheckingConnection && connectionStatus !== 'connected') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: colors.text }]}>Chat</Text>
          </View>
        </View>
        <View style={styles.blockedState}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.blockedTitle, { color: colors.textSecondary }]}>
            Connection Required
          </Text>
          <Text style={[styles.blockedText, { color: colors.textTertiary }]}>
            You need to be connected with this user to send messages.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.blockedBtn, { backgroundColor: colors.tint }]}
          >
            <Text style={styles.blockedBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior="padding" keyboardVerticalOffset={0}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.avatarWrapper}>
          <Avatar uri={partner?.avatar_url} name={partner?.full_name} size={36} />
          {partner?.last_seen && isUserOnline(partner.last_seen) && (
            <View style={[styles.onlineDot, { borderColor: colors.surface }]} />
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
            {partner?.full_name || 'Chat'}
          </Text>
          <Text style={[styles.headerStatus, { color: colors.textTertiary }]} numberOfLines={1}>
            {partner?.last_seen
              ? isUserOnline(partner.last_seen)
                ? 'Online'
                : `Last seen ${formatRelativeTime(partner.last_seen)} ago`
              : ''}
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

      {showSuggestions && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsRow}
          style={[styles.suggestionsContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}
          keyboardShouldPersistTaps="handled"
        >
          {SUGGESTED_REPLIES.map((reply) => (
            <Pressable
              key={reply}
              onPress={() => handleQuickReply(reply)}
              style={({ pressed }) => [
                styles.suggestionChip,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.suggestionText, { color: colors.tint }]} numberOfLines={1}>{reply}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Attachment preview strip */}
      {pendingAttachment && (
        <View style={[styles.attachmentPreview, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {pendingAttachment.type.startsWith('image/') ? (
            <Image source={{ uri: pendingAttachment.url }} style={styles.previewThumb} />
          ) : (
            <View style={[styles.previewDocIcon, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="document-text-outline" size={20} color={colors.tint} />
            </View>
          )}
          <Text style={[styles.previewName, { color: colors.text }]} numberOfLines={1}>
            {pendingAttachment.name}
          </Text>
          <Pressable onPress={() => setPendingAttachment(null)} hitSlop={8}>
            <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
          </Pressable>
        </View>
      )}

      {/* Upload progress */}
      {isUploading && (
        <View style={[styles.uploadBar, { backgroundColor: colors.surface }]}>
          <ActivityIndicator size="small" color={colors.tint} />
          <Text style={[styles.uploadText, { color: colors.textSecondary }]}>
            Uploading... {Math.round(progress * 100)}%
          </Text>
        </View>
      )}

      {/* Attachment menu */}
      {showAttachMenu && (
        <View style={[styles.attachMenu, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Pressable onPress={handlePickImage} style={styles.attachOption}>
            <Ionicons name="images-outline" size={22} color={colors.tint} />
            <Text style={[styles.attachOptionText, { color: colors.text }]}>Gallery</Text>
          </Pressable>
          <Pressable onPress={handleTakePhoto} style={styles.attachOption}>
            <Ionicons name="camera-outline" size={22} color={colors.tint} />
            <Text style={[styles.attachOptionText, { color: colors.text }]}>Camera</Text>
          </Pressable>
          <Pressable onPress={handlePickDocument} style={styles.attachOption}>
            <Ionicons name="document-outline" size={22} color={colors.tint} />
            <Text style={[styles.attachOptionText, { color: colors.text }]}>Document</Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 8) }]}>
        <Pressable
          onPress={() => setShowAttachMenu((v) => !v)}
          style={({ pressed }) => [styles.attachBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <Ionicons name={showAttachMenu ? 'close' : 'add-circle-outline'} size={26} color={colors.tint} />
        </Pressable>
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
          disabled={(!text.trim() && !pendingAttachment) || sendMutation.isPending}
          style={({ pressed }) => [
            styles.sendBtn,
            { backgroundColor: (text.trim() || pendingAttachment) ? colors.tint : colors.surfaceElevated },
            pressed && { opacity: 0.85 },
          ]}
          hitSlop={8}
        >
          <Ionicons name="send" size={18} color={(text.trim() || pendingAttachment) ? '#fff' : colors.textTertiary} />
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
  headerName: { fontSize: fontSize.xl, fontWeight: '700', fontFamily: fontFamily.bold },
  headerStatus: { fontSize: fontSize.sm, marginTop: 1, fontFamily: fontFamily.regular },
  avatarWrapper: { position: 'relative' as const },
  onlineDot: {
    position: 'absolute' as const, bottom: 0, right: 0,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#22c55e', borderWidth: 2,
  },
  msgList: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginVertical: 3, maxWidth: '80%' },
  msgRowSelf: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, maxWidth: '100%' },
  msgBubbleImage: { paddingHorizontal: 4, paddingTop: 4 },
  msgText: { fontSize: fontSize.body, lineHeight: 21, fontFamily: fontFamily.regular },
  attachmentImage: { width: 200, height: 150, borderRadius: 14, marginBottom: 6 },
  documentAttachment: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, marginBottom: 6,
  },
  documentName: { fontSize: fontSize.md, fontFamily: fontFamily.medium, flex: 1 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 14,
    paddingTop: 8, borderTopWidth: 1,
  },
  attachBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1, fontSize: fontSize.body, padding: 12, borderRadius: 20, borderWidth: 1,
    maxHeight: 100, fontFamily: fontFamily.regular,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  suggestionsContainer: { borderTopWidth: 1, paddingVertical: 8 },
  suggestionsRow: { paddingHorizontal: 14, gap: 8 },
  suggestionChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    borderWidth: 1,
  },
  suggestionText: { fontSize: fontSize.md, fontFamily: fontFamily.medium },
  attachmentPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1,
  },
  previewThumb: { width: 44, height: 44, borderRadius: 8 },
  previewDocIcon: {
    width: 44, height: 44, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  previewName: { flex: 1, fontSize: fontSize.md, fontFamily: fontFamily.regular },
  uploadBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  uploadText: { fontSize: fontSize.sm, fontFamily: fontFamily.regular },
  attachMenu: {
    flexDirection: 'row', gap: 16, paddingHorizontal: 14,
    paddingVertical: 10, borderTopWidth: 1,
  },
  attachOption: { alignItems: 'center', gap: 4 },
  attachOptionText: { fontSize: fontSize.xs, fontFamily: fontFamily.medium },
  blockedState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  blockedTitle: { fontSize: fontSize.xl, fontWeight: '700', fontFamily: fontFamily.bold },
  blockedText: { fontSize: fontSize.base, textAlign: 'center', lineHeight: 20, fontFamily: fontFamily.regular },
  blockedBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  blockedBtnText: { color: '#fff', fontSize: fontSize.body, fontWeight: '700', fontFamily: fontFamily.bold },
});
