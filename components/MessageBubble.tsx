import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/constants/colors';

interface Message {
  content?: string;
  created_at?: string;
  sender_id?: number | string;
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <View
        style={[
          styles.bubble,
          isOwn
            ? [styles.bubbleOwn, { backgroundColor: colors.primary }]
            : [styles.bubbleOther, { backgroundColor: colors.surfaceSecondary }],
        ]}
      >
        <Text style={[styles.content, { color: isOwn ? '#FFFFFF' : colors.text }]}>
          {message.content ?? ''}
        </Text>
        <Text
          style={[
            styles.time,
            { color: isOwn ? 'rgba(255,255,255,0.7)' : colors.textTertiary },
          ]}
        >
          {formatTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    marginVertical: 2,
  },
  rowOwn: {
    alignItems: 'flex-end',
  },
  rowOther: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  bubbleOwn: {
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    borderBottomLeftRadius: 4,
  },
  content: {
    fontSize: 15,
    lineHeight: 20,
  },
  time: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
});
