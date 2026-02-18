/**
 * Progress — cross-platform
 *
 * Replaces shadcn/ui Progress with RN View-based bar.
 */
import React from 'react';
import { View as RNView, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { tokens } from '../../design/tokens';

export interface ProgressProps {
  value?: number; // 0-100
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function Progress({ value = 0, color, style }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <RNView style={[styles.track, style]}>
      <RNView
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            backgroundColor: color ?? tokens.colors.signal.blue,
          },
        ]}
      />
    </RNView>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    width: '100%',
    borderRadius: tokens.radius.full,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: tokens.radius.full,
  },
});
