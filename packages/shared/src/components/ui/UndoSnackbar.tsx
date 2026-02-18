/**
 * UndoSnackbar — cross-platform
 *
 * A brief toast-like bar with an Undo action.
 * Auto-dismisses after timeout, calls onConfirm if no undo.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View as RNView,
  Animated,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { tokens } from '../../design/tokens';
import { useTheme } from '../../design/useTheme';
import { Text } from './primitives/Text';
import { Pressable } from './primitives/Pressable';

export interface UndoSnackbarProps {
  message: string;
  /** Called when snackbar dismisses without undo */
  onConfirm?: () => void;
  /** Called when user presses Undo */
  onUndo?: () => void;
  duration?: number;
  visible?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function UndoSnackbar({
  message,
  onConfirm,
  onUndo,
  duration = 5000,
  visible = true,
  style,
}: UndoSnackbarProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const [show, setShow] = useState(visible);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const dismiss = useCallback((confirmed: boolean) => {
    clearTimeout(timerRef.current);
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setShow(false);
      if (confirmed) onConfirm?.();
    });
  }, [opacity, onConfirm]);

  useEffect(() => {
    if (visible) {
      setShow(true);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      timerRef.current = setTimeout(() => {
        dismiss(true);
      }, duration);
    }
    return () => clearTimeout(timerRef.current);
  }, [visible, dismiss, duration, opacity]);

  if (!show) return null;

  return (
    <Animated.View
      style={[
        styles.root,
        { backgroundColor: colors.foreground, opacity },
        style,
      ]}
    >
      <Text size="sm" style={{ color: colors.background, flex: 1 }}>
        {message}
      </Text>
      <Pressable
        onPress={() => {
          dismiss(false);
          onUndo?.();
        }}
        style={styles.undoBtn}
      >
        <Text size="sm" weight="bold" style={{ color: colors.primary }}>
          Undo
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    bottom: tokens.spacing.xl,
    left: tokens.spacing.md,
    right: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    ...tokens.shadows.md,
  },
  undoBtn: {
    marginLeft: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
  },
});
