/**
 * HoverCard — cross-platform
 *
 * On native, implemented as press-to-reveal card overlay.
 */
import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  View as RNView,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { Pressable } from './primitives/Pressable';
import { View } from './primitives/View';
import { tokens } from '../../design/tokens';

export interface HoverCardProps {
  children: React.ReactNode;
}

export function HoverCard({ children }: HoverCardProps) {
  return <>{children}</>;
}

export function HoverCardTrigger({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  return <Pressable onPress={onPress}>{children}</Pressable>;
}

export function HoverCardContent({ children, style, visible, onClose }: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  visible?: boolean;
  onClose?: () => void;
}) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onClose}>
        <RNView style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.card, style]}>{children}</View>
          </TouchableWithoutFeedback>
        </RNView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.50)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.md,
  },
  card: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.md,
    width: '100%',
    maxWidth: 320,
  },
});
