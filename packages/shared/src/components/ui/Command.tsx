/**
 * Command — cross-platform
 *
 * Replaces shadcn/ui Command (cmdk) with searchable list modal.
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
import { Input } from './Input';
import { Text } from './primitives/Text';
import { Pressable } from './primitives/Pressable';
import { View } from './primitives/View';
import { tokens } from '../../design/tokens';

const CmdCtx = createContext<{
  search: string;
  setSearch: (v: string) => void;
}>({ search: '', setSearch: () => {} });

export function Command({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const [search, setSearch] = useState('');
  return (
    <CmdCtx.Provider value={{ search, setSearch }}>
      <View style={[styles.container, style]}>{children}</View>
    </CmdCtx.Provider>
  );
}

export function CommandInput({ placeholder, style }: { placeholder?: string; style?: StyleProp<TextStyle> }) {
  const { search, setSearch } = useContext(CmdCtx);
  return (
    <Input
      value={search}
      onChangeText={setSearch}
      placeholder={placeholder ?? 'Search…'}
      style={[styles.input, style]}
    />
  );
}

export function CommandList({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={[styles.list, style]}>{children}</RNView>;
}

export function CommandEmpty({ children }: { children?: React.ReactNode }) {
  return (
    <RNView style={styles.empty}>
      {typeof children === 'string' ? (
        <Text size={14} muted>{children}</Text>
      ) : children ?? <Text size={14} muted>No results found.</Text>}
    </RNView>
  );
}

export function CommandGroup({ heading, children, style }: {
  heading?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <RNView style={style}>
      {heading && <Text size={12} weight="600" muted style={styles.groupHeading}>{heading}</Text>}
      {children}
    </RNView>
  );
}

export function CommandItem({ children, onSelect, style }: {
  children?: React.ReactNode;
  onSelect?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable onPress={onSelect} style={[styles.item, style]}>
      {typeof children === 'string' ? <Text size={14}>{children}</Text> : children}
    </Pressable>
  );
}

export function CommandSeparator() {
  return <RNView style={styles.separator} />;
}

export function CommandShortcut({ children }: { children?: React.ReactNode }) {
  return <Text size={12} muted>{children}</Text>;
}

/** CommandDialog: Command inside a modal */
export function CommandDialog({ open, onOpenChange, children }: {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => onOpenChange?.(false)} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={() => onOpenChange?.(false)}>
        <RNView style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.dialog}>{children}</View>
          </TouchableWithoutFeedback>
        </RNView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  list: {
    maxHeight: 300,
  },
  empty: {
    padding: tokens.spacing.md,
    alignItems: 'center',
  },
  groupHeading: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: tokens.touchTarget.min,
    gap: 8,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 4,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.60)',
    padding: tokens.spacing.md,
  },
  dialog: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#0A0A0A',
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
});
