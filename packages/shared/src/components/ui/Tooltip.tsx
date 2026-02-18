/**
 * Tooltip — cross-platform
 *
 * On native, implemented as a simple popover-like text overlay.
 * On web, can be enhanced with proper tooltip positioning.
 */
import React, { useState } from 'react';
import {
  StyleSheet,
  View as RNView,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { Pressable } from './primitives/Pressable';
import { Text } from './primitives/Text';
import { tokens } from '../../design/tokens';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Tooltip({ content, children, style }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <RNView style={[styles.container, style]}>
      <Pressable
        onPress={() => setVisible((v) => !v)}
        onPressIn={() => setVisible(true)}
        onPressOut={() => setVisible(false)}
      >
        {children}
      </Pressable>
      {visible && (
        <RNView style={styles.tooltip}>
          <Text size={12} style={styles.text}>
            {content}
          </Text>
        </RNView>
      )}
    </RNView>
  );
}

/** Convenience wrapper — no-op on native (just renders children). */
export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export const TooltipTrigger = Pressable;
export function TooltipContent({ children }: { children?: React.ReactNode }) {
  return <RNView style={styles.tooltip}>{children}</RNView>;
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: 4,
    backgroundColor: '#1C1C1E',
    borderRadius: tokens.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: tokens.zIndex.tooltip,
  },
  text: {
    color: '#FFFFFF',
  },
});
