/**
 * CircularProgress — cross-platform
 *
 * SVG-based circular progress indicator using react-native-svg.
 * Falls back to a simple View representation when svg is unavailable.
 */
import React from 'react';
import { StyleSheet, View as RNView, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '../../design/useTheme';
import { Text } from './primitives/Text';

export interface CircularProgressProps {
  /** 0–100 */
  value?: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function CircularProgress({
  value = 0,
  size = 48,
  strokeWidth = 4,
  showLabel = false,
  style,
}: CircularProgressProps) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(100, value));

  // Simple fallback: arc-like indicator using border
  const borderRadius = size / 2;

  return (
    <RNView
      style={[
        styles.root,
        {
          width: size,
          height: size,
          borderRadius,
          borderWidth: strokeWidth,
          borderColor: colors.muted,
        },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
    >
      {/* Overlay arc simulation */}
      <RNView
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius,
            borderWidth: strokeWidth,
            borderColor: colors.primary,
            borderTopColor: clamped > 75 ? colors.primary : 'transparent',
            borderRightColor: clamped > 50 ? colors.primary : 'transparent',
            borderBottomColor: clamped > 25 ? colors.primary : 'transparent',
            borderLeftColor: clamped > 0 ? colors.primary : 'transparent',
            transform: [{ rotate: `${(clamped / 100) * 360 - 90}deg` }],
          },
        ]}
      />
      {showLabel && (
        <Text size="xs" weight="semibold" style={{ color: colors.foreground }}>
          {Math.round(clamped)}%
        </Text>
      )}
    </RNView>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
