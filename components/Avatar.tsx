import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import { getInitials } from '@/lib/mock-data';

interface AvatarProps {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 44 }: AvatarProps) {
  const c = Colors.colors;
  const initials = getInitials(name);
  const fontSize = size * 0.34;

  return (
    <View style={[styles.container, {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: c.tier1,
      borderWidth: 1.5,
      borderColor: c.borderStrong,
    }]}>
      <Text style={[styles.text, { fontSize, color: c.textSecondary }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.3,
  },
});
