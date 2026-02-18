/**
 * Chart — cross-platform
 *
 * Thin wrapper / placeholder for chart components.
 * On mobile, use victory-native or react-native-chart-kit.
 * This exports stub components that match the expected API surface.
 */
import React from 'react';
import { StyleSheet, View as RNView, type ViewStyle, type StyleProp } from 'react-native';
import { tokens } from '../../design/tokens';
import { useTheme } from '../../design/useTheme';
import { Text } from './primitives/Text';

/* ------------------------------------------------------------------ */
/*  Chart Container                                                   */
/* ------------------------------------------------------------------ */

export interface ChartContainerProps {
  children: React.ReactNode;
  config?: Record<string, { label: string; color: string }>;
  style?: StyleProp<ViewStyle>;
}

export function ChartContainer({ children, style }: ChartContainerProps) {
  return <RNView style={[styles.container, style]}>{children}</RNView>;
}

/* ------------------------------------------------------------------ */
/*  Chart Tooltip (stub)                                              */
/* ------------------------------------------------------------------ */

export interface ChartTooltipProps {
  content?: React.ReactNode;
  children?: React.ReactNode;
}

export function ChartTooltip({ children }: ChartTooltipProps) {
  return <>{children}</>;
}

export function ChartTooltipContent({
  label,
  value,
  style,
}: {
  label?: string;
  value?: string | number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <RNView style={[styles.tooltip, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {label && (
        <Text size="xs" style={{ color: colors.mutedForeground }}>
          {label}
        </Text>
      )}
      {value !== undefined && (
        <Text size="sm" weight="semibold" style={{ color: colors.foreground }}>
          {value}
        </Text>
      )}
    </RNView>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart Legend                                                      */
/* ------------------------------------------------------------------ */

export interface ChartLegendItem {
  label: string;
  color: string;
}

export function ChartLegend({
  items = [],
  style,
}: {
  items?: ChartLegendItem[];
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <RNView style={[styles.legend, style]}>
      {items.map((item) => (
        <RNView key={item.label} style={styles.legendItem}>
          <RNView style={[styles.legendDot, { backgroundColor: item.color }]} />
          <Text size="xs" style={{ color: colors.mutedForeground }}>
            {item.label}
          </Text>
        </RNView>
      ))}
    </RNView>
  );
}

export function ChartLegendContent({ children }: { children?: React.ReactNode }) {
  return <RNView style={styles.legend}>{children}</RNView>;
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: tokens.spacing.md,
  },
  tooltip: {
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.md,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
