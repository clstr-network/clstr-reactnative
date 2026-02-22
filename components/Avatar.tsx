import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getInitials, getAvatarColor } from '@/lib/mock-data';
import { colors } from '@/constants/colors';

interface AvatarProps {
  name: string;
  size?: number;
  imageUrl?: string | null;
}

export function Avatar({ name, size = 40, imageUrl }: AvatarProps) {
  const initials = getInitials(name || '?');
  const bgColor = getAvatarColor(name || '?');

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor }]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
