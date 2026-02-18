/**
 * Table — cross-platform
 *
 * Replaces shadcn/ui Table / TableHeader / TableBody /
 * TableRow / TableHead / TableCell / TableCaption / TableFooter.
 */
import React from 'react';
import { StyleSheet, View as RNView, type ViewStyle, type StyleProp } from 'react-native';
import { ScrollArea } from './ScrollArea';
import { Text } from './primitives/Text';
import { tokens } from '../../design/tokens';

export function Table({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <ScrollArea horizontal>
      <RNView style={[styles.table, style]}>{children}</RNView>
    </ScrollArea>
  );
}

export function TableHeader({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={[styles.header, style]}>{children}</RNView>;
}

export function TableBody({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={style}>{children}</RNView>;
}

export function TableFooter({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={[styles.footer, style]}>{children}</RNView>;
}

export function TableRow({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={[styles.row, style]}>{children}</RNView>;
}

export function TableHead({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <RNView style={[styles.cell, styles.headCell, style]}>
      {typeof children === 'string' ? (
        <Text size={12} weight="600" muted>{children}</Text>
      ) : children}
    </RNView>
  );
}

export function TableCell({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <RNView style={[styles.cell, style]}>
      {typeof children === 'string' ? (
        <Text size={14}>{children}</Text>
      ) : children}
    </RNView>
  );
}

export function TableCaption({ children }: { children?: React.ReactNode }) {
  return (
    <Text size={12} muted style={styles.caption}>{children}</Text>
  );
}

const styles = StyleSheet.create({
  table: {
    width: '100%',
  },
  header: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  footer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
    minHeight: tokens.touchTarget.min,
    alignItems: 'center',
  },
  cell: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 1,
    justifyContent: 'center',
  },
  headCell: {
    paddingVertical: 12,
  },
  caption: {
    paddingVertical: 8,
    textAlign: 'center',
  },
});
