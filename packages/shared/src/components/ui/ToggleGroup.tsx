/**
 * ToggleGroup — cross-platform
 *
 * Replaces shadcn/ui ToggleGroup / ToggleGroupItem.
 */
import React, { createContext, useContext } from 'react';
import { StyleSheet, View as RNView, type ViewStyle, type StyleProp } from 'react-native';
import { Pressable } from './primitives/Pressable';
import { Text } from './primitives/Text';
import { tokens } from '../../design/tokens';

const ToggleGroupCtx = createContext<{
  value: string | string[];
  onValueChange: (v: string | string[]) => void;
  type: 'single' | 'multiple';
}>({ value: '', onValueChange: () => {}, type: 'single' });

export interface ToggleGroupProps {
  type?: 'single' | 'multiple';
  value?: string | string[];
  onValueChange?: (v: string | string[]) => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ToggleGroup({ type = 'single', value = type === 'multiple' ? [] : '', onValueChange = () => {}, children, style }: ToggleGroupProps) {
  return (
    <ToggleGroupCtx.Provider value={{ value, onValueChange, type }}>
      <RNView style={[styles.group, style]}>{children}</RNView>
    </ToggleGroupCtx.Provider>
  );
}

export interface ToggleGroupItemProps {
  value: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ToggleGroupItem({ value, children, style }: ToggleGroupItemProps) {
  const ctx = useContext(ToggleGroupCtx);
  const isActive = Array.isArray(ctx.value) ? ctx.value.includes(value) : ctx.value === value;

  const handlePress = () => {
    if (ctx.type === 'multiple') {
      const arr = Array.isArray(ctx.value) ? ctx.value : [];
      ctx.onValueChange(isActive ? arr.filter((v) => v !== value) : [...arr, value]);
    } else {
      ctx.onValueChange(isActive ? '' : value);
    }
  };

  return (
    <Pressable onPress={handlePress} style={[styles.item, isActive && styles.itemActive, style]}>
      {typeof children === 'string' ? (
        <Text size={14} weight={isActive ? '600' : '400'}>{children}</Text>
      ) : children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: tokens.radius.md,
    padding: 4,
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemActive: {
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
});
