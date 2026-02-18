/**
 * Typography — cross-platform
 *
 * Pre-styled text components for headings, body, muted, lead, etc.
 * Mirrors shadcn/ui typography system.
 */
import React from 'react';
import { StyleSheet, type TextStyle, type StyleProp } from 'react-native';
import { tokens } from '../../design/tokens';
import { useTheme } from '../../design/useTheme';
import { Text } from './primitives/Text';

interface TypoProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export function H1({ children, style }: TypoProps) {
  const { colors } = useTheme();
  return (
    <Text weight="bold" style={[styles.h1, { color: colors.foreground }, style]}>
      {children}
    </Text>
  );
}

export function H2({ children, style }: TypoProps) {
  const { colors } = useTheme();
  return (
    <Text weight="semibold" style={[styles.h2, { color: colors.foreground }, style]}>
      {children}
    </Text>
  );
}

export function H3({ children, style }: TypoProps) {
  const { colors } = useTheme();
  return (
    <Text weight="semibold" style={[styles.h3, { color: colors.foreground }, style]}>
      {children}
    </Text>
  );
}

export function H4({ children, style }: TypoProps) {
  const { colors } = useTheme();
  return (
    <Text weight="semibold" style={[styles.h4, { color: colors.foreground }, style]}>
      {children}
    </Text>
  );
}

export function Paragraph({ children, style }: TypoProps) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.p, { color: colors.foreground }, style]}>
      {children}
    </Text>
  );
}

export function Lead({ children, style }: TypoProps) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.lead, { color: colors.mutedForeground }, style]}>
      {children}
    </Text>
  );
}

export function Large({ children, style }: TypoProps) {
  const { colors } = useTheme();
  return (
    <Text weight="semibold" style={[styles.large, { color: colors.foreground }, style]}>
      {children}
    </Text>
  );
}

export function Small({ children, style }: TypoProps) {
  const { colors } = useTheme();
  return (
    <Text weight="medium" style={[styles.small, { color: colors.foreground }, style]}>
      {children}
    </Text>
  );
}

export function Muted({ children, style }: TypoProps) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.muted, { color: colors.mutedForeground }, style]}>
      {children}
    </Text>
  );
}

export function InlineCode({ children, style }: TypoProps) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.code, { color: colors.foreground, backgroundColor: colors.muted }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontSize: tokens.typography.fontSize['4xl'],
    lineHeight: tokens.typography.lineHeight.tight * tokens.typography.fontSize['4xl'],
  },
  h2: {
    fontSize: tokens.typography.fontSize['3xl'],
    lineHeight: tokens.typography.lineHeight.tight * tokens.typography.fontSize['3xl'],
  },
  h3: {
    fontSize: tokens.typography.fontSize['2xl'],
    lineHeight: tokens.typography.lineHeight.snug * tokens.typography.fontSize['2xl'],
  },
  h4: {
    fontSize: tokens.typography.fontSize.xl,
    lineHeight: tokens.typography.lineHeight.snug * tokens.typography.fontSize.xl,
  },
  p: {
    fontSize: tokens.typography.fontSize.base,
    lineHeight: tokens.typography.lineHeight.relaxed * tokens.typography.fontSize.base,
  },
  lead: {
    fontSize: tokens.typography.fontSize.xl,
    lineHeight: tokens.typography.lineHeight.relaxed * tokens.typography.fontSize.xl,
  },
  large: {
    fontSize: tokens.typography.fontSize.lg,
  },
  small: {
    fontSize: tokens.typography.fontSize.sm,
  },
  muted: {
    fontSize: tokens.typography.fontSize.sm,
  },
  code: {
    fontFamily: tokens.typography.fontFamily.mono,
    fontSize: tokens.typography.fontSize.sm,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
});
