/**
 * Toggle — cross-platform
 *
 * Replaces shadcn/ui Toggle.
 */
import React from 'react';
import { StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Pressable } from './primitives/Pressable';
import { tokens } from '../../design/tokens';

export interface ToggleProps {
  pressed?: boolean;
  onPressedChange?: (v: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Toggle({ pressed = false, onPressedChange, disabled, children, style }: ToggleProps) {
  return (
    <Pressable
      onPress={() => onPressedChange?.(!pressed)}
      disabled={disabled}
      style={[
        styles.toggle,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  pressed: {
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  disabled: {
    opacity: 0.5,
  },
});
