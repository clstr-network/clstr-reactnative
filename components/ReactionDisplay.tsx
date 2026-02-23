/**
 * ReactionDisplay — Phase 9.5
 * Shows top 2-3 reaction emojis with total count in the stats row.
 * Tapping opens a summary or triggers the reaction picker.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useThemeColors } from '@/constants/colors';
import { fontSize } from '@/constants/typography';

export interface TopReaction {
  type: string;
  emoji: string;
  count: number;
}

interface ReactionDisplayProps {
  topReactions: TopReaction[];
  totalCount: number;
  onPress?: () => void;
}

const REACTION_EMOJIS: Record<string, string> = {
  like: '👍',
  celebrate: '🎉',
  support: '🤝',
  love: '❤️',
  insightful: '💡',
  curious: '🤔',
  laugh: '😂',
};

function ReactionDisplay({ topReactions, totalCount, onPress }: ReactionDisplayProps) {
  const colors = useThemeColors();

  if (totalCount === 0 && topReactions.length === 0) {
    return null;
  }

  // Take top 3 reactions, sorted by count desc
  const sorted = [...topReactions]
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  if (sorted.length === 0) return null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.emojis}>
        {sorted.map((reaction, index) => (
          <View
            key={reaction.type}
            style={[
              styles.emojiCircle,
              {
                backgroundColor: colors.surface,
                borderColor: colors.background,
                marginLeft: index > 0 ? -4 : 0,
                zIndex: sorted.length - index,
              },
            ]}
          >
            <Text style={styles.emojiText}>
              {reaction.emoji || REACTION_EMOJIS[reaction.type] || '👍'}
            </Text>
          </View>
        ))}
      </View>
      <Text style={[styles.count, { color: colors.textSecondary }]}>
        {formatCount(totalCount)}
      </Text>
    </Pressable>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default React.memo(ReactionDisplay);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  emojis: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 12,
  },
  count: {
    fontSize: fontSize.sm,
    fontFamily: 'Inter_400Regular',
  },
});
