/**
 * RadioGroup — cross-platform
 *
 * Replaces shadcn/ui RadioGroup / RadioGroupItem.
 */
import React, { createContext, useContext } from 'react';
import {
  StyleSheet,
  View as RNView,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { Pressable } from './primitives/Pressable';
import { Text } from './primitives/Text';
import { tokens } from '../../design/tokens';

/* ── Context ─────────────────────────────────────── */
const RadioGroupContext = createContext<{
  value?: string;
  onValueChange?: (v: string) => void;
}>({});

/* ── Group ───────────────────────────────────────── */
export interface RadioGroupProps {
  value?: string;
  onValueChange?: (v: string) => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function RadioGroup({ value, onValueChange, children, style }: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <RNView style={[styles.group, style]}>{children}</RNView>
    </RadioGroupContext.Provider>
  );
}

/* ── Item ────────────────────────────────────────── */
export interface RadioGroupItemProps {
  value: string;
  label?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function RadioGroupItem({ value, label, disabled, style }: RadioGroupItemProps) {
  const ctx = useContext(RadioGroupContext);
  const selected = ctx.value === value;

  return (
    <Pressable
      onPress={() => ctx.onValueChange?.(value)}
      disabled={disabled}
      style={[styles.row, style]}
    >
      <RNView style={[styles.circle, selected && styles.circleSelected, disabled && styles.disabled]}>
        {selected && <RNView style={styles.dot} />}
      </RNView>
      {label ? <Text size={14}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: tokens.touchTarget.min,
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleSelected: {
    borderColor: tokens.colors.signal.blue,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: tokens.colors.signal.blue,
  },
  disabled: {
    opacity: 0.5,
  },
});
