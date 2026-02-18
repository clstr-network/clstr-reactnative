/**
 * ContextMenu — cross-platform
 *
 * On native, implemented as long-press triggered modal menu.
 * API mirrors DropdownMenu for consistency.
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

const CtxMenuCtx = createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
}>({ open: false, setOpen: () => {} });

export function ContextMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <CtxMenuCtx.Provider value={{ open, setOpen }}>
      {children}
    </CtxMenuCtx.Provider>
  );
}

export function ContextMenuTrigger({ children }: { children: React.ReactNode }) {
  const { setOpen } = useContext(CtxMenuCtx);
  return (
    <Pressable onLongPress={() => setOpen(true)} delayLongPress={500}>
      {children}
    </Pressable>
  );
}

export function ContextMenuContent({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { open, setOpen } = useContext(CtxMenuCtx);
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

export function ContextMenuItem({ children, onPress, disabled, style }: {
  children?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { setOpen } = useContext(CtxMenuCtx);
  return (
    <Pressable
      onPress={() => { onPress?.(); setOpen(false); }}
      disabled={disabled}
      style={[styles.item, disabled && styles.disabled, style]}
    >
      {typeof children === 'string' ? <Text size={14}>{children}</Text> : children}
    </Pressable>
  );
}

export function ContextMenuSeparator() {
  return <RNView style={styles.separator} />;
}

export function ContextMenuLabel({ children }: { children?: React.ReactNode }) {
  return <Text size={12} weight="600" muted style={styles.label}>{children}</Text>;
}

export function ContextMenuCheckboxItem({ children, checked, onCheckedChange }: {
  children?: React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
}) {
  const { setOpen } = useContext(CtxMenuCtx);
  return (
    <Pressable onPress={() => { onCheckedChange?.(!checked); setOpen(false); }} style={styles.item}>
      <Text size={14}>{checked ? '☑ ' : '☐ '}</Text>
      {typeof children === 'string' ? <Text size={14}>{children}</Text> : children}
    </Pressable>
  );
}

export function ContextMenuSub({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function ContextMenuSubTrigger({ children }: { children?: React.ReactNode }) {
  return <RNView style={styles.item}>{children}</RNView>;
}

export function ContextMenuSubContent({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function ContextMenuRadioGroup({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function ContextMenuRadioItem({ children }: { children?: React.ReactNode }) {
  return <RNView style={styles.item}>{children}</RNView>;
}

export function ContextMenuGroup({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function ContextMenuShortcut({ children }: { children?: React.ReactNode }) {
  return <Text size="xs" muted style={{ marginLeft: 'auto' as any }}>{children}</Text>;
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
  disabled: { opacity: 0.5 },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 4,
  },
  label: { paddingHorizontal: 12, paddingVertical: 6 },
});
