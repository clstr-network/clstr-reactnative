import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { useThemeColors, getRoleBadgeColor } from '@/constants/colors';
import type { UserRole } from '@/lib/storage';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'small' | 'medium';
}

export const RoleBadge = React.memo(function RoleBadge({ role, size = 'small' }: RoleBadgeProps) {
  const colors = useThemeColors(useColorScheme());
  const badgeColor = getRoleBadgeColor(role, colors);
  const isSmall = size === 'small';

  return (
    <View style={[styles.badge, { backgroundColor: badgeColor + '20', borderColor: badgeColor + '40' }, isSmall && styles.badgeSmall]}>
      <Text style={[styles.badgeText, { color: badgeColor }, isSmall && styles.badgeTextSmall]}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextSmall: {
    fontSize: 10,
  },
});
