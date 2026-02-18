/**
 * Badge — cross-platform
 *
 * Replaces shadcn/ui Badge with RN View + Text.
 */
import React from 'react';
import { StyleSheet, type ViewStyle, type TextStyle, type StyleProp } from 'react-native';
import { View } from './primitives/View';
import { Text } from './primitives/Text';
import { tokens } from '../../design/tokens';

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'alumni'
  | 'success'
  | 'warning'
  | 'info';

export interface BadgeProps {
  variant?: BadgeVariant;
  label?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const variantStyles: Record<BadgeVariant, { bg: string; border: string; text: string }> = {
  default:     { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)', text: '#FFFFFF' },
  secondary:   { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)', text: 'rgba(255,255,255,0.60)' },
  destructive: { bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.30)',   text: '#F87171' },
  outline:     { bg: 'transparent',            border: 'rgba(255,255,255,0.15)', text: '#FFFFFF' },
  alumni:      { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)', text: '#FFFFFF' },
  success:     { bg: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.30)',   text: '#4ADE80' },
  warning:     { bg: 'rgba(234,179,8,0.10)',   border: 'rgba(234,179,8,0.30)',   text: '#FACC15' },
  info:        { bg: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.30)',  text: '#60A5FA' },
};

export function Badge({ variant = 'default', label, children, style, textStyle }: BadgeProps) {
  const v = variantStyles[variant];
  return (
    <View
      style={[
        styles.root,
        { backgroundColor: v.bg, borderColor: v.border },
        style,
      ]}
    >
      <Text size={12} weight="600" style={[{ color: v.text }, textStyle]}>
        {label ?? children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
});
