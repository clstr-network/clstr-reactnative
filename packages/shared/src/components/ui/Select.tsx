/**
 * Select — cross-platform
 *
 * Replaces shadcn/ui Select with a modal picker.
 */
import React, { createContext, useContext, useState } from 'react';
import {
  Modal,
  FlatList,
  StyleSheet,
  View as RNView,
  TouchableWithoutFeedback,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { Pressable } from './primitives/Pressable';
import { Text } from './primitives/Text';
import { View } from './primitives/View';
import { tokens } from '../../design/tokens';

/* ── Context ─────────────────────────────────────── */
const SelectCtx = createContext<{
  value: string;
  onValueChange: (v: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}>({ value: '', onValueChange: () => {}, open: false, setOpen: () => {} });

/* ── Root ────────────────────────────────────────── */
export interface SelectProps {
  value?: string;
  onValueChange?: (v: string) => void;
  children?: React.ReactNode;
}

export function Select({ value = '', onValueChange = () => {}, children }: SelectProps) {
  const [open, setOpen] = useState(false);
  return (
    <SelectCtx.Provider value={{ value, onValueChange, open, setOpen }}>
      {children}
    </SelectCtx.Provider>
  );
}

/* ── Trigger ─────────────────────────────────────── */
export function SelectTrigger({ children, placeholder, style }: {
  children?: React.ReactNode;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { value, setOpen } = useContext(SelectCtx);
  return (
    <Pressable onPress={() => setOpen(true)} style={[styles.trigger, style]}>
      {children ?? (
        <Text size={14} style={{ color: value ? '#FFFFFF' : 'rgba(255,255,255,0.40)' }}>
          {value || placeholder || 'Select…'}
        </Text>
      )}
      <Text size={12} style={{ color: 'rgba(255,255,255,0.40)' }}>▼</Text>
    </Pressable>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = useContext(SelectCtx);
  return (
    <Text size={14} style={{ color: value ? '#FFFFFF' : 'rgba(255,255,255,0.40)', flex: 1 }}>
      {value || placeholder || 'Select…'}
    </Text>
  );
}

/* ── Content (modal list) ────────────────────────── */
export function SelectContent({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { open, setOpen } = useContext(SelectCtx);
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={() => setOpen(false)}>
        <RNView style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.content, style]}>{children}</View>
          </TouchableWithoutFeedback>
        </RNView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

/* ── Item ────────────────────────────────────────── */
export function SelectItem({ value, children, style }: {
  value: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const ctx = useContext(SelectCtx);
  const selected = ctx.value === value;
  return (
    <Pressable
      onPress={() => { ctx.onValueChange(value); ctx.setOpen(false); }}
      style={[styles.item, selected && styles.itemSelected, style]}
    >
      {typeof children === 'string' ? (
        <Text size={14} weight={selected ? '600' : '400'} style={{ color: '#FFFFFF' }}>
          {children}
        </Text>
      ) : children}
      {selected && <Text size={14} style={{ color: tokens.colors.signal.blue }}>✓</Text>}
    </Pressable>
  );
}

export function SelectGroup({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={style}>{children}</RNView>;
}

export function SelectLabel({ children }: { children?: React.ReactNode }) {
  return <Text size={12} weight="600" muted style={styles.label}>{children}</Text>;
}

export function SelectSeparator() {
  return <RNView style={styles.separator} />;
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  content: {
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    maxHeight: '60%',
    paddingVertical: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: tokens.touchTarget.min,
  },
  itemSelected: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  label: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 4,
  },
});
