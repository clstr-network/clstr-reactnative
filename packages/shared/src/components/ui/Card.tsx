/**
 * Card — cross-platform
 *
 * Replaces shadcn/ui Card / CardHeader / CardTitle / CardDescription /
 * CardContent / CardFooter.
 */
import React from 'react';
import { StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { View } from './primitives/View';
import { Text } from './primitives/Text';
import { tokens } from '../../design/tokens';

export interface CardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
  return (
    <View style={[styles.root, style]}>
      {children}
    </View>
  );
}

export function CardHeader({ children, style }: CardProps) {
  return <View style={[styles.header, style]}>{children}</View>;
}

export function CardTitle({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Text size={24} weight="600" style={style}>
      {children}
    </Text>
  );
}

export function CardDescription({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Text size={14} muted style={style}>
      {children}
    </Text>
  );
}

export function CardContent({ children, style }: CardProps) {
  return <View style={[styles.content, style]}>{children}</View>;
}

export function CardFooter({ children, style }: CardProps) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: tokens.radius.xl,
  },
  header: {
    padding: tokens.spacing.lg,
    gap: 6,
  },
  content: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.lg,
  },
});
