/**
 * Separator — cross-platform
 *
 * Replaces shadcn/ui Separator.
 */
import React from 'react';
import { View as RNView, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';

export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  style?: StyleProp<ViewStyle>;
}

export function Separator({ orientation = 'horizontal', style }: SeparatorProps) {
  return (
    <RNView
      style={[
        orientation === 'horizontal' ? styles.horizontal : styles.vertical,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  vertical: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
});
