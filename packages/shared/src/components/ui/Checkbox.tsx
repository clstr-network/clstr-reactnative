/**
 * Checkbox — cross-platform
 *
 * Replaces shadcn/ui Checkbox with Pressable toggle.
 */
import React from 'react';
import {
  StyleSheet,
  View as RNView,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { Pressable } from './primitives/Pressable';
import { Text } from './primitives/Text';
import { tokens } from '../../design/tokens';

export interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function Checkbox({
  checked = false,
  onCheckedChange,
  disabled = false,
  label,
  style,
}: CheckboxProps) {
  return (
    <Pressable
      onPress={() => onCheckedChange?.(!checked)}
      disabled={disabled}
      style={[styles.row, style]}
    >
      <RNView
        style={[
          styles.box,
          checked && styles.boxChecked,
          disabled && styles.disabled,
        ]}
      >
        {checked && (
          <Text size={12} weight="700" style={styles.check}>
            ✓
          </Text>
        )}
      </RNView>
      {label ? (
        <Text size={14} style={styles.label}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: tokens.touchTarget.min,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: tokens.radius.sm / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: tokens.colors.signal.blue,
    borderColor: tokens.colors.signal.blue,
  },
  disabled: {
    opacity: 0.5,
  },
  check: {
    color: '#FFFFFF',
  },
  label: {
    color: '#FFFFFF',
  },
});
