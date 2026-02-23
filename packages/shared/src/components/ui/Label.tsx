/**
 * Label — cross-platform
 *
 * Replaces shadcn/ui Label.
 */
import React from 'react';
import { StyleSheet, type ViewStyle, type TextStyle, type StyleProp } from 'react-native';
import { Text } from './primitives/Text';

export interface LabelProps {
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
  required?: boolean;
}

export function Label({ children, style, required }: LabelProps) {
  return (
    <Text size={14} weight="500" style={[styles.label, style]}>
      {children}
      {required ? ' *' : ''}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
  },
});
