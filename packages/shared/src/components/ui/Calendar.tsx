/**
 * Calendar — cross-platform
 *
 * Basic month calendar grid built with View + Text.
 * Replace with react-native-calendars later if needed.
 */
import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View as RNView,
  Pressable as RNPressable,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { tokens } from '../../design/tokens';
import { useTheme } from '../../design/useTheme';
import { Text } from './primitives/Text';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  style?: StyleProp<ViewStyle>;
}

export function Calendar({ selected, onSelect, style }: CalendarProps) {
  const { colors } = useTheme();
  const [viewing, setViewing] = useState(() => selected ?? new Date());
  const year = viewing.getFullYear();
  const month = viewing.getMonth();

  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [year, month]);

  const prev = () => setViewing(new Date(year, month - 1, 1));
  const next = () => setViewing(new Date(year, month + 1, 1));

  const isSelected = (d: number) =>
    selected &&
    selected.getFullYear() === year &&
    selected.getMonth() === month &&
    selected.getDate() === d;

  const isToday = (d: number) => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() === month && now.getDate() === d;
  };

  const monthLabel = viewing.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <RNView style={[styles.root, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {/* Header */}
      <RNView style={styles.header}>
        <RNPressable onPress={prev} style={styles.navBtn} accessibilityLabel="Previous month">
          <Text weight="bold" style={{ color: colors.foreground }}>{'‹'}</Text>
        </RNPressable>
        <Text weight="semibold" size="sm" style={{ color: colors.foreground }}>{monthLabel}</Text>
        <RNPressable onPress={next} style={styles.navBtn} accessibilityLabel="Next month">
          <Text weight="bold" style={{ color: colors.foreground }}>{'›'}</Text>
        </RNPressable>
      </RNView>

      {/* Day headers */}
      <RNView style={styles.row}>
        {DAYS.map((d) => (
          <RNView key={d} style={styles.cell}>
            <Text size="xs" style={{ color: colors.mutedForeground }}>{d}</Text>
          </RNView>
        ))}
      </RNView>

      {/* Day grid */}
      <RNView style={styles.grid}>
        {days.map((d, i) => (
          <RNView key={i} style={styles.cell}>
            {d !== null ? (
              <RNPressable
                onPress={() => onSelect?.(new Date(year, month, d))}
                style={[
                  styles.dayBtn,
                  isSelected(d) && { backgroundColor: colors.primary },
                  isToday(d) && !isSelected(d) && styles.today,
                ]}
              >
                <Text
                  size="sm"
                  style={{
                    color: isSelected(d) ? colors.primaryForeground : colors.foreground,
                  }}
                >
                  {d}
                </Text>
              </RNPressable>
            ) : null}
          </RNView>
        ))}
      </RNView>
    </RNView>
  );
}

const CELL = 36;

const styles = StyleSheet.create({
  root: {
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    padding: tokens.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.sm,
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%` as any,
    alignItems: 'center',
    justifyContent: 'center',
    height: CELL,
  },
  dayBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
});
