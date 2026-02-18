/**
 * Collapsible — cross-platform
 *
 * Replaces shadcn/ui Collapsible / CollapsibleTrigger / CollapsibleContent.
 */
import React, { createContext, useContext, useState } from 'react';
import {
  View as RNView,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { Pressable } from './primitives/Pressable';

const CollapsibleCtx = createContext<{
  open: boolean;
  toggle: () => void;
}>({ open: false, toggle: () => {} });

export interface CollapsibleProps {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Collapsible({ open: controlled, onOpenChange, children, style }: CollapsibleProps) {
  const [internal, setInternal] = useState(false);
  const open = controlled ?? internal;
  const setOpen = onOpenChange ?? setInternal;
  return (
    <CollapsibleCtx.Provider value={{ open, toggle: () => setOpen(!open) }}>
      <RNView style={style}>{children}</RNView>
    </CollapsibleCtx.Provider>
  );
}

export function CollapsibleTrigger({ children }: { children: React.ReactNode }) {
  const { toggle } = useContext(CollapsibleCtx);
  return <Pressable onPress={toggle}>{children}</Pressable>;
}

export function CollapsibleContent({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { open } = useContext(CollapsibleCtx);
  if (!open) return null;
  return <RNView style={style}>{children}</RNView>;
}
