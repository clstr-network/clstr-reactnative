import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

interface BadgeProps {
  text: string;
  variant?: 'primary' | 'success' | 'warning' | 'default';
}

export function Badge({ text, variant = 'default' }: BadgeProps) {
  const bgColors = {
    primary: 'rgba(99, 102, 241, 0.15)',
    success: 'rgba(34, 197, 94, 0.15)',
    warning: 'rgba(245, 158, 11, 0.15)',
    default: 'rgba(255, 255, 255, 0.08)',
  };
  const textColors = {
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    default: colors.textSecondary,
  };

  return (
    <View style={[styles.badge, { backgroundColor: bgColors[variant] }]}>
      <Text style={[styles.text, { color: textColors[variant] }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
