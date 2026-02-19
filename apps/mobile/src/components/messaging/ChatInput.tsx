/**
 * ChatInput — Message input bar for conversation detail.
 *
 * TextInput with placeholder, send button that disables when
 * empty or sending. ActivityIndicator in send button while sending.
 * All styling via design tokens.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { tokens } from '@clstr/shared/design/tokens';

interface ChatInputProps {
  onSend: (content: string) => void;
  isSending: boolean;
}

export function ChatInput({ onSend, isSending }: ChatInputProps) {
  const [text, setText] = useState('');

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    onSend(trimmed);
    setText('');
  }, [text, isSending, onSend]);

  const canSend = text.trim().length > 0 && !isSending;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Type a message..."
        placeholderTextColor={tokens.colors.text.quaternary}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={2000}
        returnKeyType="send"
        onSubmitEditing={handleSend}
        blurOnSubmit={false}
        editable={!isSending}
      />
      <Pressable
        style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
        onPress={handleSend}
        disabled={!canSend}
        hitSlop={8}
      >
        {isSending ? (
          <ActivityIndicator size="small" color={tokens.colors.dark.primaryForeground} />
        ) : (
          <SendIcon color={canSend ? tokens.colors.dark.primaryForeground : tokens.colors.text.disabled} />
        )}
      </Pressable>
    </View>
  );
}

// Simple arrow-up send icon (text fallback until lucide-react-native is wired)
function SendIcon({ color }: { color: string }) {
  return (
    <View style={styles.sendIcon}>
      <View
        style={[
          styles.sendArrow,
          { borderBottomColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tokens.colors.border.default,
    backgroundColor: tokens.colors.dark.background,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: tokens.colors.dark.input,
    borderRadius: tokens.radius.xl,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.typography.fontSize.base,
    color: tokens.colors.dark.foreground,
    marginRight: tokens.spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.dark.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: tokens.colors.dark.muted,
  },
  sendIcon: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: tokens.colors.dark.primaryForeground,
  },
});
