/**
 * Breadcrumb — cross-platform
 *
 * Replaces shadcn/ui Breadcrumb / BreadcrumbItem / BreadcrumbLink /
 * BreadcrumbPage / BreadcrumbSeparator / BreadcrumbList / BreadcrumbEllipsis.
 */
import React from 'react';
import { StyleSheet, View as RNView, type ViewStyle, type StyleProp } from 'react-native';
import { Pressable } from './primitives/Pressable';
import { Text } from './primitives/Text';

export function Breadcrumb({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView accessibilityRole="header" style={[styles.root, style]}>{children}</RNView>;
}

export function BreadcrumbList({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={[styles.list, style]}>{children}</RNView>;
}

export function BreadcrumbItem({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={[styles.item, style]}>{children}</RNView>;
}

export function BreadcrumbLink({ children, onPress }: { children?: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress}>
      {typeof children === 'string' ? (
        <Text size={14} style={{ color: 'rgba(255,255,255,0.60)' }}>{children}</Text>
      ) : children}
    </Pressable>
  );
}

export function BreadcrumbPage({ children }: { children?: React.ReactNode }) {
  return typeof children === 'string' ? (
    <Text size={14} weight="500">{children}</Text>
  ) : <>{children}</>;
}

export function BreadcrumbSeparator({ children }: { children?: React.ReactNode }) {
  return (
    <Text size={14} style={{ color: 'rgba(255,255,255,0.30)' }}>
      {children ?? '/'}
    </Text>
  );
}

export function BreadcrumbEllipsis() {
  return <Text size={14} style={{ color: 'rgba(255,255,255,0.30)' }}>…</Text>;
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
