/**
 * ═══════════════════════════════════════════════════════════════
 * AnimatedPressable — Micro-interaction wrapper for cards & icons
 * ═══════════════════════════════════════════════════════════════
 *
 * Mobile equivalent of web's `cardHoverVariants` / `iconPress` from
 * `src/lib/animations.ts`. Uses react-native-reanimated for 60fps.
 *
 * Usage:
 *   <AnimatedPressable onPress={...}>
 *     <CardContent />
 *   </AnimatedPressable>
 *
 *   <AnimatedPressable variant="icon" onPress={handleLike}>
 *     <Ionicons name="heart" />
 *   </AnimatedPressable>
 */

import React, { useCallback } from 'react';
import {
  Pressable,
  type PressableProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

// ─── Spring configs matching web's snappySpring ──────────────

const CARD_SPRING = {
  damping: 30,
  stiffness: 400,
  mass: 0.5,
};

const ICON_SPRING = {
  damping: 20,
  stiffness: 300,
  mass: 0.8,
};

// ─── Preset Variants ─────────────────────────────────────────

export type AnimationVariant = 'card' | 'icon' | 'reaction';

interface VariantConfig {
  pressedScale: number;
  pressedOpacity: number;
  spring: { damping: number; stiffness: number; mass: number };
}

const VARIANTS: Record<AnimationVariant, VariantConfig> = {
  /** Card press — subtle scale + fade matching web tap: scale 0.99 */
  card: {
    pressedScale: 0.98,
    pressedOpacity: 0.9,
    spring: CARD_SPRING,
  },
  /** Icon press — snappy micro scale matching web iconPress: scale 0.85 */
  icon: {
    pressedScale: 0.85,
    pressedOpacity: 1,
    spring: ICON_SPRING,
  },
  /** Reaction pulse — heartbeat style matching web reactionPulse */
  reaction: {
    pressedScale: 1.3,
    pressedOpacity: 1,
    spring: { damping: 15, stiffness: 250, mass: 0.4 },
  },
};

// ─── Component ───────────────────────────────────────────────

export interface AnimatedPressableProps extends PressableProps {
  /** Animation preset — defaults to 'card' */
  variant?: AnimationVariant;
  /** Custom pressed scale (overrides variant default) */
  pressedScale?: number;
  /** Custom pressed opacity (overrides variant default) */
  pressedOpacity?: number;
  /** Animated style applied to the wrapper */
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function AnimatedPressable({
  variant = 'card',
  pressedScale,
  pressedOpacity,
  style,
  children,
  disabled,
  onPressIn,
  onPressOut,
  ...pressableProps
}: AnimatedPressableProps) {
  const config = VARIANTS[variant];
  const targetScale = pressedScale ?? config.pressedScale;
  const targetOpacity = pressedOpacity ?? config.pressedOpacity;

  const pressed = useSharedValue(0);

  const handlePressIn = useCallback(
    (e: any) => {
      pressed.value = withSpring(1, config.spring);
      onPressIn?.(e);
    },
    [pressed, config.spring, onPressIn],
  );

  const handlePressOut = useCallback(
    (e: any) => {
      if (variant === 'reaction') {
        // Heartbeat: overshoot then settle
        pressed.value = withSpring(0, {
          damping: 10,
          stiffness: 200,
          mass: 0.3,
        });
      } else {
        pressed.value = withSpring(0, config.spring);
      }
      onPressOut?.(e);
    },
    [pressed, variant, config.spring, onPressOut],
  );

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      pressed.value,
      [0, 1],
      [1, targetScale],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      pressed.value,
      [0, 1],
      [1, targetOpacity],
      Extrapolation.CLAMP,
    );
    return { transform: [{ scale }], opacity };
  });

  return (
    <AnimatedPressableBase
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[animatedStyle, style]}
      {...pressableProps}
    >
      {children}
    </AnimatedPressableBase>
  );
}

// ─── Expand/Collapse Hook ────────────────────────────────────

/**
 * useExpandCollapse — animated height toggle for sections like comments.
 *
 * Usage:
 *   const { height, expanded, toggle } = useExpandCollapse();
 *   <Animated.View style={{ height, overflow: 'hidden' }}>
 *     <View onLayout={onContentLayout}>...</View>
 *   </Animated.View>
 */
export function useExpandCollapse(initialExpanded = false) {
  const expanded = useSharedValue(initialExpanded ? 1 : 0);
  const contentHeight = useSharedValue(0);

  const toggle = useCallback(() => {
    expanded.value = withTiming(expanded.value === 1 ? 0 : 1, {
      duration: 250,
    });
  }, [expanded]);

  const setExpanded = useCallback(
    (value: boolean) => {
      expanded.value = withTiming(value ? 1 : 0, { duration: 250 });
    },
    [expanded],
  );

  const animatedHeight = useAnimatedStyle(() => ({
    height: interpolate(
      expanded.value,
      [0, 1],
      [0, contentHeight.value],
      Extrapolation.CLAMP,
    ),
    overflow: 'hidden' as const,
  }));

  const onContentLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      contentHeight.value = e.nativeEvent.layout.height;
    },
    [contentHeight],
  );

  const isExpanded = useCallback(() => expanded.value === 1, [expanded]);

  return {
    animatedHeight,
    toggle,
    setExpanded,
    onContentLayout,
    isExpanded,
  };
}

export default AnimatedPressable;
