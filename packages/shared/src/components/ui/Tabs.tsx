/**
 * Tabs — cross-platform
 *
 * Replaces shadcn/ui Tabs / TabsList / TabsTrigger / TabsContent.
 */
import React, { createContext, useContext, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View as RNView,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { Pressable } from './primitives/Pressable';
import { Text } from './primitives/Text';
import { tokens } from '../../design/tokens';

const TabsContext = createContext<{
  value: string;
  onValueChange: (v: string) => void;
}>({ value: '', onValueChange: () => {} });

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Tabs({ value: controlled, defaultValue = '', onValueChange, children, style }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled ?? internal;
  const setValue = onValueChange ?? setInternal;
  return (
    <TabsContext.Provider value={{ value, onValueChange: setValue }}>
      <RNView style={style}>{children}</RNView>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.list, style]}>
      {children}
    </ScrollView>
  );
}

export interface TabsTriggerProps {
  value: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function TabsTrigger({ value, children, style }: TabsTriggerProps) {
  const ctx = useContext(TabsContext);
  const active = ctx.value === value;
  return (
    <Pressable onPress={() => ctx.onValueChange(value)} style={[styles.trigger, active && styles.triggerActive, style]}>
      {typeof children === 'string' ? (
        <Text size={14} weight={active ? '600' : '400'} style={{ color: active ? '#FFFFFF' : 'rgba(255,255,255,0.60)' }}>
          {children}
        </Text>
      ) : children}
    </Pressable>
  );
}

export interface TabsContentProps {
  value: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function TabsContent({ value, children, style }: TabsContentProps) {
  const ctx = useContext(TabsContext);
  if (ctx.value !== value) return null;
  return <RNView style={style}>{children}</RNView>;
}

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: tokens.radius.md,
  },
  trigger: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.sm,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerActive: {
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
});
