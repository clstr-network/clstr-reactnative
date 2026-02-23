/**
 * ReactionPicker — Phase 9.5
 * LinkedIn-style 7-type reaction picker.
 * Quick tap = default "like" toggle.
 * Long-press (400ms) = floating reaction tray with 7 emoji options.
 * Spring animations on selection. Haptic feedback.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { fontSize } from '@/constants/typography';

export type ReactionType =
  | 'like'
  | 'celebrate'
  | 'support'
  | 'love'
  | 'insightful'
  | 'curious'
  | 'laugh';

export const REACTIONS: { type: ReactionType; emoji: string; label: string; color: string }[] = [
  { type: 'like', emoji: '👍', label: 'Like', color: '#2563EB' },
  { type: 'celebrate', emoji: '🎉', label: 'Celebrate', color: '#10B981' },
  { type: 'support', emoji: '🤝', label: 'Support', color: '#8B5CF6' },
  { type: 'love', emoji: '❤️', label: 'Love', color: '#EF4444' },
  { type: 'insightful', emoji: '💡', label: 'Insightful', color: '#F59E0B' },
  { type: 'curious', emoji: '🤔', label: 'Curious', color: '#F97316' },
  { type: 'laugh', emoji: '😂', label: 'Laugh', color: '#D97706' },
];

const REACTION_MAP: Record<ReactionType, (typeof REACTIONS)[0]> = Object.fromEntries(
  REACTIONS.map((r) => [r.type, r]),
) as any;

interface ReactionPickerProps {
  currentReaction?: ReactionType | null;
  onReact: (type: ReactionType) => void;
  /** Optional: custom render for the trigger/button area */
  compact?: boolean;
}

function ReactionPicker({ currentReaction, onReact, compact = false }: ReactionPickerProps) {
  const colors = useThemeColors();
  const [showTray, setShowTray] = useState(false);
  const [, setButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scaleAnims = useRef(REACTIONS.map(() => new Animated.Value(0))).current;
  const trayOpacity = useRef(new Animated.Value(0)).current;

  const activeReaction = currentReaction ? REACTION_MAP[currentReaction] : null;

  const showReactionTray = useCallback(() => {
    setShowTray(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animate tray in
    Animated.timing(trayOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Stagger emoji entrance
    scaleAnims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: 1,
        delay: i * 40,
        tension: 300,
        friction: 12,
        useNativeDriver: true,
      }).start();
    });
  }, [scaleAnims, trayOpacity]);

  const hideReactionTray = useCallback(() => {
    Animated.timing(trayOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setShowTray(false);
      scaleAnims.forEach((anim) => anim.setValue(0));
    });
  }, [scaleAnims, trayOpacity]);

  const handleQuickTap = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (showTray) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReact('like');
  }, [showTray, onReact]);

  const handleLongPress = useCallback(() => {
    showReactionTray();
  }, [showReactionTray]);

  const handleSelectReaction = useCallback(
    (type: ReactionType) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      hideReactionTray();
      onReact(type);
    },
    [hideReactionTray, onReact],
  );

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const layout = e.nativeEvent.layout;
    setButtonLayout({ x: layout.x, y: layout.y, width: layout.width, height: layout.height });
  }, []);

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>
      {/* Dismiss overlay when tray is visible */}
      {showTray && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={hideReactionTray}
          // This is mounted in the parent context via absolute positioning
        />
      )}

      {/* Main like button */}
      <Pressable
        onPress={handleQuickTap}
        onLongPress={handleLongPress}
        delayLongPress={400}
        style={styles.triggerButton}
      >
        {activeReaction ? (
          <>
            <Text style={styles.activeEmoji}>{activeReaction.emoji}</Text>
            <Text style={[styles.actionLabel, { color: activeReaction.color }]}>
              {activeReaction.label}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.inactiveEmoji}>👍</Text>
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Like</Text>
          </>
        )}
      </Pressable>

      {/* Floating reaction tray */}
      {showTray && (
        <Animated.View
          style={[
            styles.reactionTray,
            {
              opacity: trayOpacity,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              bottom: 44,
            },
          ]}
        >
          {REACTIONS.map((reaction, i) => (
            <Animated.View
              key={reaction.type}
              style={{
                transform: [{ scale: scaleAnims[i] }],
              }}
            >
              <Pressable
                onPress={() => handleSelectReaction(reaction.type)}
                style={({ pressed }) => [
                  styles.reactionItem,
                  pressed && styles.reactionItemPressed,
                  currentReaction === reaction.type && {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  },
                ]}
              >
                <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
              </Pressable>
            </Animated.View>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

export default React.memo(ReactionPicker);

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 4,
  },
  activeEmoji: {
    fontSize: 18,
  },
  inactiveEmoji: {
    fontSize: 18,
    opacity: 0.5,
  },
  actionLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  reactionTray: {
    position: 'absolute',
    left: -40,
    flexDirection: 'row',
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 2,
    zIndex: 100,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  reactionItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionItemPressed: {
    transform: [{ scale: 1.3 }],
  },
  reactionEmoji: {
    fontSize: 24,
  },
});
