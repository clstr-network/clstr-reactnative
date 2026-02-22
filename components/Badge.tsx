import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';

interface BadgeProps {
  text: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'accent' | 'default';
  /** Size variant for compact contexts */
  size?: 'sm' | 'md';
}

const VARIANT_BG: Record<string, string> = {
  primary: 'rgba(37, 99, 235, 0.12)',
  success: 'rgba(16, 185, 129, 0.12)',
  warning: 'rgba(245, 158, 11, 0.12)',
  error: 'rgba(239, 68, 68, 0.12)',
  accent: 'rgba(139, 92, 246, 0.12)',
  default: 'rgba(100, 116, 139, 0.10)',
};

export const Badge = React.memo(function Badge({ text, variant = 'default', size = 'md' }: BadgeProps) {
  const colors = useThemeColors();
  const textColors: Record<string, string> = {
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    accent: colors.accent,
    default: colors.textSecondary,
  };
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: VARIANT_BG[variant],
          paddingHorizontal: isSmall ? 6 : 8,
          paddingVertical: isSmall ? 2 : 3,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: textColors[variant],
            fontSize: isSmall ? fontSize['2xs'] : fontSize.xs,
            fontFamily: fontFamily.semiBold,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});
