/**
 * DepartmentFilter — cross-platform
 *
 * Multi-select chip filter for departments.
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

export interface DepartmentFilterProps {
  departments: string[];
  selected?: string[];
  onSelectionChange?: (selected: string[]) => void;
  style?: StyleProp<ViewStyle>;
}

export function DepartmentFilter({
  departments,
  selected = [],
  onSelectionChange,
  style,
}: DepartmentFilterProps) {
  const { colors } = useTheme();
  const [internal, setInternal] = useState<string[]>(selected);
  const active = selected.length ? selected : internal;

  const toggle = (dept: string) => {
    const next = active.includes(dept)
      ? active.filter((d) => d !== dept)
      : [...active, dept];
    setInternal(next);
    onSelectionChange?.(next);
  };

  return (
    <RNView style={style}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {departments.map((dept) => {
          const isActive = active.includes(dept);
          return (
            <RNPressable
              key={dept}
              onPress={() => toggle(dept)}
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
                {dept}
              </Text>
            </RNPressable>
          );
        })}
      </ScrollView>
    </RNView>
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
