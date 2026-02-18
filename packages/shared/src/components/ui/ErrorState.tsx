/**
 * ErrorState — cross-platform
 *
 * Displays an error message with optional retry button.
 */
import React from 'react';
import { StyleSheet, View as RNView, type ViewStyle, type StyleProp } from 'react-native';
import { tokens } from '../../design/tokens';
import { useTheme } from '../../design/useTheme';
import { Text } from './primitives/Text';
import { Pressable } from './primitives/Pressable';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  style,
}: ErrorStateProps) {
  const { colors } = useTheme();
  return (
    <RNView style={[styles.root, style]}>
      <Text weight="semibold" size="lg" style={{ color: colors.destructive, textAlign: 'center' }}>
        {title}
      </Text>
      {message && (
        <Text size="sm" style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: tokens.spacing.xs }}>
          {message}
        </Text>
      )}
      {onRetry && (
        <Pressable
          onPress={onRetry}
          style={[styles.btn, { backgroundColor: colors.primary }]}
        >
          <Text size="sm" weight="medium" style={{ color: colors.primaryForeground }}>
            {retryLabel}
          </Text>
        </Pressable>
      )}
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
  btn: {
    marginTop: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radius.sm,
  },
});
