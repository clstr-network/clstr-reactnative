/**
 * BatchFilter — cross-platform
 *
 * Filter chip list for selecting batch/year values.
 */
import React, { useState } from 'react';
import {
  StyleSheet,
  View as RNView,
  ScrollView,
  Pressable as RNPressable,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { tokens } from '../../design/tokens';
import { useTheme } from '../../design/useTheme';
import { Text } from './primitives/Text';

export interface BatchFilterProps {
  options: string[];
  selected?: string[];
  onSelectionChange?: (selected: string[]) => void;
  style?: StyleProp<ViewStyle>;
}

export function BatchFilter({
  options,
  selected = [],
  onSelectionChange,
  style,
}: BatchFilterProps) {
  const { colors } = useTheme();
  const [internal, setInternal] = useState<string[]>(selected);
  const active = selected.length ? selected : internal;

  const toggle = (value: string) => {
    const next = active.includes(value)
      ? active.filter((v) => v !== value)
      : [...active, value];
    setInternal(next);
    onSelectionChange?.(next);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, style]}
    >
      {options.map((opt) => {
        const isActive = active.includes(opt);
        return (
          <RNPressable
            key={opt}
            onPress={() => toggle(opt)}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? colors.primary : colors.muted,
                borderColor: isActive ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              size="sm"
              weight={isActive ? 'semibold' : 'normal'}
              style={{ color: isActive ? colors.primaryForeground : colors.foreground }}
            >
              {opt}
            </Text>
          </RNPressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
  },
  chip: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
});
