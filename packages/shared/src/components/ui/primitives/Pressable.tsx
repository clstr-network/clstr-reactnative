/**
 * Unified Pressable primitive.
 *
 * Provides:
 * - Press/hover opacity feedback
 * - Optional haptic feedback on native
 * - Accessibility role
 */
import React, { useCallback } from 'react';
import {
  Pressable as RNPressable,
  type PressableProps as RNPressableProps,
  Platform,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';

export interface PressableProps extends Omit<RNPressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Opacity when pressed (default: 0.7) */
  activeOpacity?: number;
}

export function Pressable({
  style,
  activeOpacity = 0.7,
  children,
  ...props
}: PressableProps) {
  return (
    <RNPressable
      style={({ pressed }) => [
        style as ViewStyle,
        pressed && { opacity: activeOpacity },
      ]}
      accessibilityRole="button"
      {...props}
    >
      {children}
    </RNPressable>
  );
}

export default Pressable;
