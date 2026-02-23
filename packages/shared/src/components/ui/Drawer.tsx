/**
 * Drawer — cross-platform (Bottom Sheet variant)
 *
 * Replaces shadcn/ui Drawer. On mobile, identical to Sheet
 * (bottom sheet behavior).
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

const DrawerCtx = createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
}>({ open: false, setOpen: () => {} });

export interface DrawerProps {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  children?: React.ReactNode;
}

export function Drawer({ open: controlled, onOpenChange, children }: DrawerProps) {
  const [internal, setInternal] = useState(false);
  const open = controlled ?? internal;
  const setOpen = onOpenChange ?? setInternal;
  return (
    <DrawerCtx.Provider value={{ open, setOpen }}>
      {children}
    </DrawerCtx.Provider>
  );
}

export function DrawerTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const { setOpen } = useContext(DrawerCtx);
  return <Pressable onPress={() => setOpen(true)}>{children}</Pressable>;
}

export function DrawerContent({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { open, setOpen } = useContext(DrawerCtx);
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={() => setOpen(false)}>
        <RNView style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.drawer, style]}>
              <RNView style={styles.handle} />
              {children}
            </View>
          </TouchableWithoutFeedback>
        </RNView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export function DrawerHeader({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.header, style]}>{children}</View>;
}

export function DrawerFooter({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

export function DrawerTitle({ children, style }: { children?: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text size={18} weight="600" style={style}>{children}</Text>;
}

export function DrawerDescription({ children, style }: { children?: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text size={14} muted style={style}>{children}</Text>;
}

export function DrawerClose({ children }: { children?: React.ReactNode }) {
  const { setOpen } = useContext(DrawerCtx);
  return <Pressable onPress={() => setOpen(false)}>{children ?? <Text>✕</Text>}</Pressable>;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.60)',
  },
  drawer: {
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
