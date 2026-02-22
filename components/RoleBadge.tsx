import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getRoleBadgeColor } from '@/constants/colors';

interface RoleBadgeProps {
  role: string;
}

export default function RoleBadge({ role }: RoleBadgeProps) {
  if (!role) return null;
  const { bg, text: textColor } = getRoleBadgeColor(role);

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: textColor }]}>
        {role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
