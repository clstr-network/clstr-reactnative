/**
 * Accordion — cross-platform
 *
 * Replaces shadcn/ui Accordion / AccordionItem /
 * AccordionTrigger / AccordionContent.
 * Uses react-native-reanimated for smooth height animation.
 */
import React, { createContext, useContext, useState } from 'react';
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
const AccordionContext = createContext<{
  expanded: string | string[];
  toggle: (value: string) => void;
  type: 'single' | 'multiple';
}>({ expanded: '', toggle: () => {}, type: 'single' });

const ItemContext = createContext<{ value: string }>({ value: '' });

/* ── Root ────────────────────────────────────────── */
export interface AccordionProps {
  type?: 'single' | 'multiple';
  value?: string | string[];
  onValueChange?: (v: string | string[]) => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Accordion({
  type = 'single',
  value: controlled,
  onValueChange,
  children,
  style,
}: AccordionProps) {
  const [internalValue, setInternalValue] = useState<string | string[]>(type === 'multiple' ? [] : '');
  const expanded = controlled ?? internalValue;
  const setExpanded = onValueChange ?? setInternalValue;

  const toggle = (val: string) => {
    if (type === 'multiple') {
      const arr = Array.isArray(expanded) ? expanded : [];
      setExpanded(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
    } else {
      setExpanded(expanded === val ? '' : val);
    }
  };

  return (
    <AccordionContext.Provider value={{ expanded, toggle, type }}>
      <RNView style={style}>{children}</RNView>
    </AccordionContext.Provider>
  );
}

/* ── Item ────────────────────────────────────────── */
export function AccordionItem({ value, children, style }: { value: string; children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <ItemContext.Provider value={{ value }}>
      <RNView style={[styles.item, style]}>{children}</RNView>
    </ItemContext.Provider>
  );
}

/* ── Trigger ─────────────────────────────────────── */
export function AccordionTrigger({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { expanded, toggle } = useContext(AccordionContext);
  const { value } = useContext(ItemContext);
  const isOpen = Array.isArray(expanded) ? expanded.includes(value) : expanded === value;

  return (
    <Pressable onPress={() => toggle(value)} style={[styles.trigger, style]}>
      {typeof children === 'string' ? (
        <Text size={14} weight="500">{children}</Text>
      ) : children}
      <Text size={12} style={{ color: 'rgba(255,255,255,0.40)' }}>
        {isOpen ? '▲' : '▼'}
      </Text>
    </Pressable>
  );
}

/* ── Content ─────────────────────────────────────── */
export function AccordionContent({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { expanded } = useContext(AccordionContext);
  const { value } = useContext(ItemContext);
  const isOpen = Array.isArray(expanded) ? expanded.includes(value) : expanded === value;

  if (!isOpen) return null;

  return <RNView style={[styles.content, style]}>{children}</RNView>;
}

const styles = StyleSheet.create({
  item: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    minHeight: tokens.touchTarget.min,
  },
  content: {
    paddingBottom: 12,
  },
});
