/**
 * Button — cross-platform
 *
 * Replaces shadcn/ui Button with RN Pressable + text theming.
 */
import React from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import { Pressable } from './primitives/Pressable';
import { Text } from './primitives/Text';
import { tokens } from '../../design/tokens';

type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link'
  | 'alumni'
  | 'alumni-outline'
  | 'alumni-ghost';

type ButtonSize = 'default' | 'sm' | 'lg' | 'xl' | 'icon';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

/* ── variant styles ────────────────────────────────────── */
const variantMap: Record<ButtonVariant, { bg: string; border: string; text: string }> = {
  default:          { bg: 'rgba(255,255,255,0.10)', border: 'rgba(255,255,255,0.15)', text: '#FFFFFF' },
  destructive:      { bg: 'rgba(239,68,68,0.20)',   border: 'rgba(239,68,68,0.30)',   text: '#F87171' },
  outline:          { bg: 'transparent',            border: 'rgba(255,255,255,0.15)', text: '#FFFFFF' },
  secondary:        { bg: 'rgba(255,255,255,0.06)', border: 'transparent',            text: '#FFFFFF' },
  ghost:            { bg: 'transparent',            border: 'transparent',            text: '#FFFFFF' },
  link:             { bg: 'transparent',            border: 'transparent',            text: 'rgba(255,255,255,0.60)' },
  alumni:           { bg: 'rgba(255,255,255,0.10)', border: 'rgba(255,255,255,0.15)', text: '#FFFFFF' },
  'alumni-outline': { bg: 'transparent',            border: 'rgba(255,255,255,0.15)', text: '#FFFFFF' },
  'alumni-ghost':   { bg: 'transparent',            border: 'transparent',            text: 'rgba(255,255,255,0.60)' },
};

const sizeMap: Record<ButtonSize, ViewStyle> = {
  default: { height: 40, paddingHorizontal: 16 },
  sm:      { height: 36, paddingHorizontal: 12 },
  lg:      { height: 44, paddingHorizontal: 32 },
  xl:      { height: 48, paddingHorizontal: 40 },
  icon:    { height: 40, width: 40 },
};

const textSizeMap: Record<ButtonSize, number> = {
  default: 14,
  sm: 14,
  lg: 14,
  xl: 16,
  icon: 14,
};

export function Button({
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  onPress,
  children,
  style,
  textStyle,
  accessibilityLabel,
}: ButtonProps) {
  const v = variantMap[variant];
  const s = sizeMap[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: v.border === 'transparent' ? 0 : 1,
        },
        s,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : typeof children === 'string' ? (
        <Text
          size={textSizeMap[size]}
          weight="500"
          style={[{ color: v.text }, textStyle]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: tokens.radius.md,
  },
  disabled: {
    opacity: 0.5,
  },
});
