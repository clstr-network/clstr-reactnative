import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import { Message } from '@/lib/types';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <View style={[styles.row, message.isOwn && styles.ownRow]}>
      <View style={[styles.bubble, message.isOwn ? styles.ownBubble : styles.otherBubble]}>
        <Text style={[styles.text, message.isOwn ? styles.ownText : styles.otherText]}>
          {message.text}
        </Text>
        <Text style={[styles.time, message.isOwn && styles.ownTime]}>
          {message.timestamp}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  ownRow: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: Colors.dark.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: Colors.dark.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
  },
  text: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  ownText: {
    color: Colors.dark.primaryForeground,
  },
  otherText: {
    color: Colors.dark.textBody,
  },
  time: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 10,
    color: Colors.dark.textMeta,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownTime: {
    color: 'rgba(0, 0, 0, 0.45)',
  },
});
