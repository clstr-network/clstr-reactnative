/**
 * Popover — cross-platform
 *
 * Replaces shadcn/ui Popover with Modal-based popover.
 */
import React, { createContext, useContext, useState } from 'react';
import {
  Modal,
  StyleSheet,
  View as RNView,
  TouchableWithoutFeedback,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { Pressable } from './primitives/Pressable';
import { View } from './primitives/View';
import { tokens } from '../../design/tokens';

const PopoverCtx = createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
}>({ open: false, setOpen: () => {} });

export function Popover({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <PopoverCtx.Provider value={{ open, setOpen }}>
      {children}
    </PopoverCtx.Provider>
  );
}

export function PopoverTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const { setOpen } = useContext(PopoverCtx);
  return <Pressable onPress={() => setOpen(true)}>{children}</Pressable>;
}

export function PopoverContent({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { open, setOpen } = useContext(PopoverCtx);
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.50)',
    padding: tokens.spacing.md,
  },
  content: {
    backgroundColor: '#0A0A0A',
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: tokens.spacing.md,
    width: '100%',
    maxWidth: 360,
  },
});
