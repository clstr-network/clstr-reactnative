import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Colors from '@/constants/colors';

interface GlassContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
  tier?: 1 | 2 | 3;
}

export function GlassContainer({ children, style, noPadding, tier = 2 }: GlassContainerProps) {
  const borderColor = tier === 1
    ? Colors.dark.surfaceBorderStrong
    : tier === 3
      ? Colors.dark.divider
      : Colors.dark.surfaceBorder;

  return (
    <View style={[styles.container, { borderColor }, noPadding && { padding: 0 }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
});
