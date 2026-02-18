/**
 * Dialog — cross-platform
 *
 * Replaces shadcn/ui Dialog with RN Modal.
 * Sub-components: DialogContent, DialogHeader, DialogFooter,
 * DialogTitle, DialogDescription, DialogClose.
 */
import React, { createContext, useContext, useState } from 'react';
import {
  Modal,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
  TouchableWithoutFeedback,
  View as RNView,
} from 'react-native';
import { View } from './primitives/View';
import { Text } from './primitives/Text';
import { Pressable } from './primitives/Pressable';
import { tokens } from '../../design/tokens';

/* ── Context ─────────────────────────────────────── */
const DialogContext = createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
}>({ open: false, setOpen: () => {} });

/* ── Root ────────────────────────────────────────── */
export interface DialogProps {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  children?: React.ReactNode;
}

export function Dialog({ open: controlledOpen, onOpenChange, children }: DialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

/* ── Trigger ─────────────────────────────────────── */
export function DialogTrigger({ children }: { children: React.ReactNode }) {
  const { setOpen } = useContext(DialogContext);
  return (
    <Pressable onPress={() => setOpen(true)}>
      {children}
    </Pressable>
  );
}

/* ── Content ─────────────────────────────────────── */
export interface DialogContentProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function DialogContent({ children, style }: DialogContentProps) {
  const { open, setOpen } = useContext(DialogContext);

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => setOpen(false)}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={() => setOpen(false)}>
        <RNView style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.content, style]}>
              {children}
              <Pressable
                onPress={() => setOpen(false)}
                style={styles.closeButton}
                accessibilityLabel="Close"
              >
                <Text size={16} style={{ color: '#FFFFFF' }}>✕</Text>
              </Pressable>
            </View>
          </TouchableWithoutFeedback>
        </RNView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

/* ── Sub-components ──────────────────────────────── */
export function DialogHeader({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.header, style]}>{children}</View>;
}

export function DialogFooter({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

export function DialogTitle({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Text size={18} weight="600" style={style}>{children}</Text>;
}

export function DialogDescription({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Text size={14} muted style={style}>{children}</Text>;
}

export function DialogClose({ children, onPress }: { children?: React.ReactNode; onPress?: () => void }) {
  const { setOpen } = useContext(DialogContext);
  return (
    <Pressable onPress={() => { onPress?.(); setOpen(false); }}>
      {children}
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
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  header: {
    gap: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
