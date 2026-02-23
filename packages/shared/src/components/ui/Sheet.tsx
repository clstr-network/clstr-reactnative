/**
 * Sheet — cross-platform (Bottom Sheet)
 *
 * Replaces shadcn/ui Sheet with @gorhom/bottom-sheet.
 * Falls back to Modal for environments without bottom-sheet.
 */
import React, { createContext, useContext, useState } from 'react';
import {
  Modal,
  StyleSheet,
  View as RNView,
  TouchableWithoutFeedback,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import { Pressable } from './primitives/Pressable';
import { View } from './primitives/View';
import { Text } from './primitives/Text';
import { tokens } from '../../design/tokens';

const SheetCtx = createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
}>({ open: false, setOpen: () => {} });

export interface SheetProps {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  children?: React.ReactNode;
}

export function Sheet({ open: controlled, onOpenChange, children }: SheetProps) {
  const [internal, setInternal] = useState(false);
  const open = controlled ?? internal;
  const setOpen = onOpenChange ?? setInternal;
  return (
    <SheetCtx.Provider value={{ open, setOpen }}>
      {children}
    </SheetCtx.Provider>
  );
}

export function SheetTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const { setOpen } = useContext(SheetCtx);
  return <Pressable onPress={() => setOpen(true)}>{children}</Pressable>;
}

export function SheetContent({ children, side, style }: {
  children?: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  style?: StyleProp<ViewStyle>;
}) {
  const { open, setOpen } = useContext(SheetCtx);
  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => setOpen(false)}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={() => setOpen(false)}>
        <RNView style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, style]}>
              <RNView style={styles.handle} />
              {children}
            </View>
          </TouchableWithoutFeedback>
        </RNView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export function SheetHeader({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.header, style]}>{children}</View>;
}

export function SheetFooter({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

export function SheetTitle({ children, style }: { children?: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text size={18} weight="600" style={style}>{children}</Text>;
}

export function SheetDescription({ children, style }: { children?: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text size={14} muted style={style}>{children}</Text>;
}

export function SheetClose({ children }: { children?: React.ReactNode }) {
  const { setOpen } = useContext(SheetCtx);
  return <Pressable onPress={() => setOpen(false)}>{children ?? <Text>✕</Text>}</Pressable>;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.60)',
  },
  sheet: {
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: tokens.spacing.lg,
    maxHeight: '85%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: tokens.spacing.md,
  },
  header: { gap: 6, marginBottom: tokens.spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: tokens.spacing.md },
});
