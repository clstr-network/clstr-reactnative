/**
 * PollView — Phase 9.4
 * Renders a poll inside PostCard: question, option bars, vote counts.
 * Tap to vote (optimistic update). Shows results after voting.
 * Handles poll closed state with final results.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors, radius } from '@/constants/colors';
import { fontSize } from '@/constants/typography';

interface PollOption {
  text: string;
  votes: number;
  [key: string]: any;
}

interface PollData {
  question: string;
  options: PollOption[];
  endDate?: string;
}

interface PollViewProps {
  poll: PollData;
  hasVoted?: boolean;
  userVoteIndex?: number | null;
  onVote?: (optionIndex: number) => void;
}

function PollView({ poll, hasVoted = false, userVoteIndex = null, onVote }: PollViewProps) {
  const colors = useThemeColors();
  const [localVote, setLocalVote] = useState<number | null>(userVoteIndex);
  const [localHasVoted, setLocalHasVoted] = useState(hasVoted);

  const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0) + (localHasVoted && !hasVoted ? 1 : 0);
  const isPollClosed = poll.endDate ? new Date(poll.endDate) < new Date() : false;
  const showResults = localHasVoted || isPollClosed;

  const handleVote = useCallback(
    (index: number) => {
      if (localHasVoted || isPollClosed) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLocalVote(index);
      setLocalHasVoted(true);
      onVote?.(index);
    },
    [localHasVoted, isPollClosed, onVote],
  );

  const getTimeDiff = (endDate: string) => {
    const diff = new Date(endDate).getTime() - Date.now();
    if (diff <= 0) return 'Poll closed';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h left`;
    if (hours > 0) return `${hours}h left`;
    const mins = Math.floor(diff / (1000 * 60));
    return `${mins}m left`;
  };

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <Text style={[styles.question, { color: colors.text }]}>{poll.question}</Text>

      {poll.options.map((option, idx) => {
        const optVotes = option.votes + (localVote === idx && !hasVoted ? 1 : 0);
        const percentage = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
        const isUserVote = localVote === idx;

        return (
          <Pressable
            key={idx}
            onPress={() => handleVote(idx)}
            disabled={localHasVoted || isPollClosed}
            style={[
              styles.optionBtn,
              {
                borderColor: isUserVote ? colors.primary : colors.border,
                backgroundColor: colors.surfaceElevated,
              },
            ]}
          >
            {/* Progress bar fill */}
            {showResults && (
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${percentage}%`,
                    backgroundColor: isUserVote
                      ? 'rgba(37, 99, 235, 0.2)'
                      : 'rgba(255, 255, 255, 0.06)',
                  },
                ]}
              />
            )}

            <View style={styles.optionContent}>
              <View style={styles.optionLeft}>
                {isUserVote && showResults && (
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                )}
                <Text
                  style={[
                    styles.optionText,
                    { color: isUserVote ? colors.primary : colors.text },
                    isUserVote && { fontWeight: '600' },
                  ]}
                  numberOfLines={2}
                >
                  {option.text}
                </Text>
              </View>
              {showResults && (
                <Text style={[styles.percentage, { color: colors.textSecondary }]}>
                  {percentage}%
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}

      {/* Footer: vote count + time remaining */}
      <View style={styles.footer}>
        <Text style={[styles.voteCount, { color: colors.textTertiary }]}>
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        </Text>
        {poll.endDate && (
          <>
            <Text style={[styles.dot, { color: colors.textTertiary }]}>·</Text>
            <Text style={[styles.timeLeft, { color: colors.textTertiary }]}>
              {getTimeDiff(poll.endDate)}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

export default React.memo(PollView);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    marginBottom: 10,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 8,
  },
  question: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  optionBtn: {
    borderRadius: radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 44,
    justifyContent: 'center',
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: radius.sm,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  optionText: {
    fontSize: fontSize.base,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  percentage: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  voteCount: {
    fontSize: fontSize.sm,
    fontFamily: 'Inter_400Regular',
  },
  dot: {
    fontSize: fontSize.sm,
    marginHorizontal: 6,
  },
  timeLeft: {
    fontSize: fontSize.sm,
    fontFamily: 'Inter_400Regular',
  },
});
