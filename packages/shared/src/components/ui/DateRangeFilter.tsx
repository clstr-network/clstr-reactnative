/**
 * DateRangeFilter — cross-platform
 *
 * Two-date range picker using Calendar.
 */
import React, { useState } from 'react';
import {
  StyleSheet,
  View as RNView,
  Modal,
  Pressable as RNPressable,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { tokens } from '../../design/tokens';
import { useTheme } from '../../design/useTheme';
import { Text } from './primitives/Text';
import { Calendar } from './Calendar';

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface DateRangeFilterProps {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

export function DateRangeFilter({
  value,
  onChange,
  placeholder = 'Select date range',
  style,
}: DateRangeFilterProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState<'from' | 'to'>('from');

  const fmt = (d?: Date) => (d ? d.toLocaleDateString() : '–');
  const label = value?.from ? `${fmt(value.from)} → ${fmt(value.to)}` : placeholder;

  const handleSelect = (date: Date) => {
    if (picking === 'from') {
      onChange?.({ from: date, to: value?.to });
      setPicking('to');
    } else {
      onChange?.({ from: value?.from, to: date });
      setOpen(false);
      setPicking('from');
    }
  };

  return (
    <RNView style={style}>
      <RNPressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, { borderColor: colors.border, backgroundColor: colors.card }]}
      >
        <Text size="sm" style={{ color: value?.from ? colors.foreground : colors.mutedForeground }}>
          {label}
        </Text>
      </RNPressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <RNPressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <RNView style={[styles.modal, { backgroundColor: colors.card }]}>
          <Text size="sm" weight="semibold" style={{ color: colors.foreground, marginBottom: tokens.spacing.sm }}>
            {picking === 'from' ? 'Select start date' : 'Select end date'}
          </Text>
          <Calendar
            selected={picking === 'from' ? value?.from : value?.to}
            onSelect={handleSelect}
          />
        </RNView>
      </Modal>
    </RNView>
  );
}

const styles = StyleSheet.create({
  trigger: {
    height: tokens.touchTarget.min,
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.sm,
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    position: 'absolute',
    top: '20%',
    left: tokens.spacing.md,
    right: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
  },
});
