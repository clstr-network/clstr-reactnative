/**
 * AlertDialog — cross-platform
 *
 * Replaces shadcn/ui AlertDialog — built on Dialog with
 * non-dismissable overlay.
 */
import React, { createContext, useContext, useState } from 'react';
import {
  Modal,
  StyleSheet,
  View as RNView,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import { View } from './primitives/View';
import { Text } from './primitives/Text';
import { Pressable } from './primitives/Pressable';
import { tokens } from '../../design/tokens';

const AlertDialogContext = createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
}>({ open: false, setOpen: () => {} });

export interface AlertDialogProps {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  children?: React.ReactNode;
}

export function AlertDialog({ open: controlledOpen, onOpenChange, children }: AlertDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  return (
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

export function AlertDialogTrigger({ children }: { children: React.ReactNode }) {
  const { setOpen } = useContext(AlertDialogContext);
  return <Pressable onPress={() => setOpen(true)}>{children}</Pressable>;
}

export function AlertDialogContent({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { open } = useContext(AlertDialogContext);
  return (
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent>
      <RNView style={styles.overlay}>
        <View style={[styles.content, style]}>{children}</View>
      </RNView>
    </Modal>
  );
}

export function AlertDialogHeader({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.header, style]}>{children}</View>;
}

export function AlertDialogFooter({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

export function AlertDialogTitle({ children, style }: { children?: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text size={18} weight="600" style={style}>{children}</Text>;
}

export function AlertDialogDescription({ children, style }: { children?: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text size={14} muted style={style}>{children}</Text>;
}

export function AlertDialogAction({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  const { setOpen } = useContext(AlertDialogContext);
  return (
    <Pressable onPress={() => { onPress?.(); setOpen(false); }} style={styles.actionBtn}>
      {typeof children === 'string' ? (
        <Text size={14} weight="500" style={{ color: '#FFFFFF' }}>{children}</Text>
      ) : children}
    </Pressable>
  );
}

export function AlertDialogCancel({ children, onPress }: { children?: React.ReactNode; onPress?: () => void }) {
  const { setOpen } = useContext(AlertDialogContext);
  return (
    <Pressable onPress={() => { onPress?.(); setOpen(false); }} style={styles.cancelBtn}>
      {typeof children === 'string' ? (
        <Text size={14} weight="500" style={{ color: 'rgba(255,255,255,0.60)' }}>{children ?? 'Cancel'}</Text>
      ) : children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.80)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.md,
  },
  content: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  header: { gap: 6 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: tokens.radius.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
});
