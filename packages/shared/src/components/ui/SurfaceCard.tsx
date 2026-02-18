/**
 * SurfaceCard — cross-platform
 *
 * Elevated card with surface-tier theming (surface1 / surface2 / surface3).
 */
import React from 'react';
import { StyleSheet, View as RNView, type ViewStyle, type StyleProp } from 'react-native';
import { tokens } from '../../design/tokens';
import { useTheme } from '../../design/useTheme';

type SurfaceTier = 'surface1' | 'surface2' | 'surface3';

export interface SurfaceCardProps {
  tier?: SurfaceTier;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SurfaceCard({ tier = 'surface1', children, style }: SurfaceCardProps) {
  const { colors } = useTheme();

  const bgColor =
    tier === 'surface3'
      ? tokens.colors.surface.tier3.bg
      : tier === 'surface2'
        ? tokens.colors.surface.tier2.bg
        : tokens.colors.surface.tier1.bg;

  return (
    <RNView
      style={[
        styles.card,
        {
          backgroundColor: bgColor,
          borderColor: colors.border,
          ...tokens.shadows.sm,
        },
        style,
      ]}
    >
      {children}
    </RNView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    padding: tokens.spacing.md,
  },
});
