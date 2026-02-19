/**
 * SettingsRow — Reusable settings row component.
 *
 * Displays a label, optional description, and a right-side control
 * (Switch toggle or chevron for navigation).
 */
import React from 'react';
import { StyleSheet, Switch } from 'react-native';
import { View } from '@clstr/shared/components/ui/primitives/View';
import { Text } from '@clstr/shared/components/ui/primitives/Text';
import { Pressable } from '@clstr/shared/components/ui/primitives/Pressable';
import { useTheme } from '@clstr/shared/design/useTheme';
import { tokens } from '@clstr/shared/design/tokens';

export interface SettingsRowProps {
  label: string;
  description?: string;
  /** Render a Switch toggle when provided */
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  /** Render a chevron and make the row pressable when provided */
  onPress?: () => void;
  disabled?: boolean;
  style?: any;
  /** Optional style override for the label text */
  labelStyle?: any;
}

export function SettingsRow({
  label,
  description,
  value,
  onValueChange,
  onPress,
  disabled,
  style,
  labelStyle,
}: SettingsRowProps) {
  const { colors } = useTheme();
  const isToggle = value !== undefined && onValueChange !== undefined;

  const content = (
    <View style={[styles.row, style]}>
      <View style={styles.textContainer}>
        <Text weight="medium" size="sm" style={labelStyle}>
          {label}
        </Text>
        {description && (
          <Text size="xs" muted style={styles.description}>
            {description}
          </Text>
        )}
      </View>

      {isToggle && (
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{
            false: colors.muted,
            true: colors.primary,
          }}
          thumbColor={colors.background}
        />
      )}

      {!isToggle && onPress && (
        <Text size="sm" muted>
          ›
        </Text>
      )}
    </View>
  );

  if (onPress && !isToggle) {
    return (
      <Pressable onPress={onPress} disabled={disabled}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    minHeight: 56,
  },
  textContainer: {
    flex: 1,
    marginRight: tokens.spacing.md,
  },
  description: {
    marginTop: 2,
  },
});
