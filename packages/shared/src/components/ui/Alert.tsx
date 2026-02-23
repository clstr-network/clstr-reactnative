/**
 * Alert — cross-platform
 *
 * Replaces shadcn/ui Alert with RN View + Text.
 */
import React from 'react';
import { StyleSheet, type ViewStyle, type TextStyle, type StyleProp } from 'react-native';
import { View } from './primitives/View';
import { Text } from './primitives/Text';
import { tokens } from '../../design/tokens';

type AlertVariant = 'default' | 'destructive';

interface AlertProps {
  variant?: AlertVariant;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function Alert({ variant = 'default', style, children }: AlertProps) {
  const isDestructive = variant === 'destructive';

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: isDestructive
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.04)',
          borderColor: 'rgba(255,255,255,0.10)',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function AlertTitle({ children, style }: { children?: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Text weight="500" style={[styles.title, style]}>
      {children}
    </Text>
  );
}

export function AlertDescription({ children, style }: { children?: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Text size={14} muted style={[styles.description, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: {
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    width: '100%',
  },
  title: {
    marginBottom: tokens.spacing.xs,
  },
  description: {
    lineHeight: 22,
  },
});
