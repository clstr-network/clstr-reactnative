/**
 * MessageBubble — Single chat message bubble.
 *
 * React.memo'd for FlatList performance — only re-renders on data change.
 * Sent (right-aligned, overlay.active bg) vs received (left-aligned, overlay.hover bg).
 * Uses design tokens for all colors, spacing, radius.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { tokens } from '@clstr/shared/design/tokens';

interface MessageBubbleProps {
  content: string;
  createdAt: string;
  isSent: boolean;
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function MessageBubbleInner({ content, createdAt, isSent }: MessageBubbleProps) {
  return (
    <View style={[styles.row, isSent ? styles.rowSent : styles.rowReceived]}>
      <View
        style={[
          styles.bubble,
          isSent ? styles.bubbleSent : styles.bubbleReceived,
        ]}
      >
        <Text style={styles.messageText}>{content}</Text>
        <Text style={styles.timestamp}>{formatRelativeTime(createdAt)}</Text>
      </View>
    </View>
  );
}

export const MessageBubble = React.memo(MessageBubbleInner);

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
  },
  rowSent: {
    alignItems: 'flex-end',
  },
  rowReceived: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
  },
  bubbleSent: {
    backgroundColor: tokens.colors.dark.primary,
    borderBottomRightRadius: tokens.radius.sm,
  },
  bubbleReceived: {
    backgroundColor: tokens.colors.overlay.hover,
    borderBottomLeftRadius: tokens.radius.sm,
  },
  messageText: {
    fontSize: tokens.typography.fontSize.base,
    color: tokens.colors.dark.foreground,
    lineHeight: tokens.typography.fontSize.base * tokens.typography.lineHeight.normal,
  },
  timestamp: {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.text.tertiary,
    marginTop: tokens.spacing.xs,
    alignSelf: 'flex-end',
  },
});
