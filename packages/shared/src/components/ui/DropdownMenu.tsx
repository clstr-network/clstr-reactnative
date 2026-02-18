/**
 * DropdownMenu — cross-platform
 *
 * Replaces shadcn/ui DropdownMenu with modal-based menu.
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
import { Text } from './primitives/Text';
import { View } from './primitives/View';
import { tokens } from '../../design/tokens';

const MenuCtx = createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
}>({ open: false, setOpen: () => {} });

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <MenuCtx.Provider value={{ open, setOpen }}>
      {children}
    </MenuCtx.Provider>
  );
}

export function DropdownMenuTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const { setOpen } = useContext(MenuCtx);
  return <Pressable onPress={() => setOpen(true)}>{children}</Pressable>;
}

export function DropdownMenuContent({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { open, setOpen } = useContext(MenuCtx);
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={() => setOpen(false)}>
        <RNView style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.menu, style]}>{children}</View>
          </TouchableWithoutFeedback>
        </RNView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export function DropdownMenuItem({ children, onPress, disabled, style }: {
  children?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { setOpen } = useContext(MenuCtx);
  return (
    <Pressable
      onPress={() => { onPress?.(); setOpen(false); }}
      disabled={disabled}
      style={[styles.item, disabled && styles.disabled, style]}
    >
      {typeof children === 'string' ? (
        <Text size={14}>{children}</Text>
      ) : children}
    </Pressable>
  );
}

export function DropdownMenuSeparator() {
  return <RNView style={styles.separator} />;
}

export function DropdownMenuLabel({ children }: { children?: React.ReactNode }) {
  return (
    <Text size={12} weight="600" muted style={styles.label}>
      {children}
    </Text>
  );
}

export function DropdownMenuGroup({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function DropdownMenuSub({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function DropdownMenuSubTrigger({ children }: { children?: React.ReactNode }) {
  return <RNView style={styles.item}>{children}</RNView>;
}

export function DropdownMenuSubContent({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function DropdownMenuCheckboxItem({ children, checked, onCheckedChange }: {
  children?: React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
}) {
  const { setOpen } = useContext(MenuCtx);
  return (
    <Pressable
      onPress={() => { onCheckedChange?.(!checked); setOpen(false); }}
      style={styles.item}
    >
      <Text size={14}>{checked ? '☑ ' : '☐ '}</Text>
      {typeof children === 'string' ? <Text size={14}>{children}</Text> : children}
    </Pressable>
  );
}

export function DropdownMenuRadioGroup({ value, onValueChange, children }: {
  value?: string;
  onValueChange?: (v: string) => void;
  children?: React.ReactNode;
}) {
  return <>{children}</>;
}

export function DropdownMenuRadioItem({ value, children }: { value: string; children?: React.ReactNode }) {
  return (
    <RNView style={styles.item}>
      {typeof children === 'string' ? <Text size={14}>{children}</Text> : children}
    </RNView>
  );
}

export function DropdownMenuShortcut({ children }: { children?: React.ReactNode }) {
  return <Text size={12} muted>{children}</Text>;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.50)',
    padding: tokens.spacing.md,
  },
  menu: {
    backgroundColor: '#0A0A0A',
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingVertical: 4,
    width: '100%',
    maxWidth: 280,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: tokens.touchTarget.min,
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 4,
  },
  label: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
