/**
 * Pagination — cross-platform
 *
 * Replaces shadcn/ui Pagination / PaginationContent /
 * PaginationItem / PaginationLink / PaginationPrevious /
 * PaginationNext / PaginationEllipsis.
 */
import React from 'react';
import { StyleSheet, View as RNView, type ViewStyle, type StyleProp } from 'react-native';
import { Pressable } from './primitives/Pressable';
import { Text } from './primitives/Text';
import { tokens } from '../../design/tokens';

export function Pagination({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={[styles.root, style]}>{children}</RNView>;
}

export function PaginationContent({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={[styles.content, style]}>{children}</RNView>;
}

export function PaginationItem({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={style}>{children}</RNView>;
}

export function PaginationLink({ children, isActive, onPress, style }: {
  children?: React.ReactNode;
  isActive?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.link, isActive && styles.linkActive, style]}>
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text size={14} weight={isActive ? '600' : '400'} style={{ color: '#FFFFFF' }}>{String(children)}</Text>
      ) : children}
    </Pressable>
  );
}

export function PaginationPrevious({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.link}>
      <Text size={14} style={{ color: '#FFFFFF' }}>‹ Prev</Text>
    </Pressable>
  );
}

export function PaginationNext({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.link}>
      <Text size={14} style={{ color: '#FFFFFF' }}>Next ›</Text>
    </Pressable>
  );
}

export function PaginationEllipsis() {
  return (
    <RNView style={styles.link}>
      <Text size={14} muted>…</Text>
    </RNView>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  link: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkActive: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
});
