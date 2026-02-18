/**
 * EmptyState — cross-platform
 *
 * Placeholder view for empty lists/screens.
 */
import React from 'react';
import { StyleSheet, View as RNView, type ViewStyle, type StyleProp } from 'react-native';
import { tokens } from '../../design/tokens';
import { useTheme } from '../../design/useTheme';
import { Text } from './primitives/Text';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ icon, title, description, action, style }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <RNView style={[styles.root, style]}>
      {icon && <RNView style={styles.icon}>{icon}</RNView>}
      <Text weight="semibold" size="lg" style={{ color: colors.foreground, textAlign: 'center' }}>
        {title}
      </Text>
      {description && (
        <Text size="sm" style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: tokens.spacing.xs }}>
          {description}
        </Text>
      )}
      {action && <RNView style={styles.action}>{action}</RNView>}
    </RNView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.xl,
  },
  icon: {
    marginBottom: tokens.spacing.md,
  },
  action: {
    marginTop: tokens.spacing.lg,
  },
});
