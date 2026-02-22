import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSurfaceTiers, radius } from '@/constants/colors';

interface GlassContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
  tier?: 1 | 2 | 3;
}

function GlassContainer({ children, style, noPadding, tier = 2 }: GlassContainerProps) {
  const tiers = useSurfaceTiers();
  const tierKey = `tier${tier}` as keyof typeof tiers;
  const tierStyle = tiers[tierKey];

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: tierStyle.backgroundColor,
        borderColor: tierStyle.borderColor,
      },
      noPadding && { padding: 0 },
      style,
    ]}>
      {children}
    </View>
  );
}

export { GlassContainer };
export default React.memo(GlassContainer);

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
});
