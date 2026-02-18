/**
 * PageNotFound — cross-platform
 *
 * 404 placeholder screen with navigation back action.
 */
import React from 'react';
import { StyleSheet, View as RNView, type ViewStyle, type StyleProp } from 'react-native';
import { tokens } from '../../design/tokens';
import { useTheme } from '../../design/useTheme';
import { Text } from './primitives/Text';
import { Pressable } from './primitives/Pressable';

export interface PageNotFoundProps {
  onGoBack?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function PageNotFound({ onGoBack, style }: PageNotFoundProps) {
  const { colors } = useTheme();
  return (
    <RNView style={[styles.root, { backgroundColor: colors.background }, style]}>
      <Text weight="bold" style={[styles.code, { color: colors.primary }]}>
        404
      </Text>
      <Text weight="semibold" size="xl" style={{ color: colors.foreground, marginTop: tokens.spacing.sm }}>
        Page not found
      </Text>
      <Text size="sm" style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: tokens.spacing.xs }}>
        The page you're looking for doesn't exist or has been moved.
      </Text>
      {onGoBack && (
        <Pressable
          onPress={onGoBack}
          style={[styles.btn, { backgroundColor: colors.primary }]}
        >
          <Text size="sm" weight="medium" style={{ color: colors.primaryForeground }}>
            Go back
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
  code: {
    fontSize: 64,
  },
  btn: {
    marginTop: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radius.sm,
  },
});
