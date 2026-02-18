/**
 * AspectRatio — cross-platform
 *
 * Replaces shadcn/ui AspectRatio.
 */
import React from 'react';
import { View as RNView, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';

export interface AspectRatioProps {
  ratio?: number; // width / height (default 1)
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AspectRatio({ ratio = 1, children, style }: AspectRatioProps) {
  return (
    <RNView style={[styles.root, { aspectRatio: ratio }, style]}>
      {children}
    </RNView>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    overflow: 'hidden',
  },
});
