/**
 * Sidebar — cross-platform (mobile adaptation)
 *
 * On native this renders as a slide-in drawer overlay.
 * Web uses the standard sidebar pattern.
 */
import React, { createContext, useContext, useState } from 'react';
import {
  StyleSheet,
  Modal,
  View as RNView,
  ScrollView,
  Pressable as RNPressable,
  Dimensions,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { tokens } from '../../design/tokens';
import { useTheme } from '../../design/useTheme';
import { Text } from './primitives/Text';

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

interface SidebarCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarCtx>({ open: false, setOpen: () => {} });

export function useSidebar() {
  return useContext(SidebarContext);
}

/* ------------------------------------------------------------------ */
/*  Provider                                                          */
/* ------------------------------------------------------------------ */

export function SidebarProvider({
  children,
  defaultOpen = false,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar                                                           */
/* ------------------------------------------------------------------ */

const SIDEBAR_W = Math.min(280, Dimensions.get('window').width * 0.8);

export interface SidebarProps {
  children: React.ReactNode;
  side?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
}

export function Sidebar({ children, side = 'left', style }: SidebarProps) {
  const { open, setOpen } = useSidebar();
  const { colors } = useTheme();

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <RNPressable style={styles.overlay} onPress={() => setOpen(false)} />
      <RNView
        style={[
          styles.drawer,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            [side === 'left' ? 'left' : 'right']: 0,
          },
          style,
        ]}
      >
        <ScrollView contentContainerStyle={styles.scroll}>{children}</ScrollView>
      </RNView>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

export function SidebarTrigger({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { setOpen, open } = useSidebar();
  return (
    <RNPressable
      onPress={() => setOpen(!open)}
      style={style}
      accessibilityRole="button"
      accessibilityLabel="Toggle sidebar"
    >
      {children ?? <Text>☰</Text>}
    </RNPressable>
  );
}

export function SidebarHeader({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={[styles.header, style]}>{children}</RNView>;
}

export function SidebarContent({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={[styles.content, style]}>{children}</RNView>;
}

export function SidebarFooter({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={[styles.footer, style]}>{children}</RNView>;
}

export function SidebarGroup({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={[styles.group, style]}>{children}</RNView>;
}

export function SidebarGroupLabel({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text size="xs" weight="semibold" style={{ color: colors.mutedForeground, marginBottom: tokens.spacing.xs }}>
      {children}
    </Text>
  );
}

export function SidebarGroupContent({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={style}>{children}</RNView>;
}

export function SidebarMenu({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={style}>{children}</RNView>;
}

export function SidebarMenuItem({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={[styles.menuItem, style]}>{children}</RNView>;
}

export function SidebarMenuButton({
  children,
  onPress,
  isActive,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  isActive?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <RNPressable
      onPress={onPress}
      style={[
        styles.menuBtn,
        isActive && { backgroundColor: colors.accent },
        style,
      ]}
    >
      {children}
    </RNPressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SIDEBAR_W,
    borderRightWidth: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  header: {
    padding: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  content: {
    flex: 1,
    padding: tokens.spacing.sm,
  },
  footer: {
    padding: tokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  group: {
    marginBottom: tokens.spacing.md,
  },
  menuItem: {
    marginBottom: 2,
  },
  menuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
    gap: tokens.spacing.sm,
  },
});
