import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Image } from 'expo-image';
import { useThemeColors } from '@/constants/colors';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  showBorder?: boolean;
}

export const Avatar = React.memo(function Avatar({ uri, name, size = 44, showBorder = false }: AvatarProps) {
  const colors = useThemeColors(useColorScheme());
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
  const fontSize = size * 0.36;

  if (uri) {
    return (
      <View style={[{ width: size, height: size, borderRadius: size / 2 }, showBorder && { borderWidth: 2, borderColor: colors.tint }]}>
        <Image
          source={{ uri }}
          style={{ width: size - (showBorder ? 4 : 0), height: size - (showBorder ? 4 : 0), borderRadius: size / 2 }}
          contentFit="cover"
          transition={200}
        />
      </View>
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceElevated }, showBorder && { borderWidth: 2, borderColor: colors.tint }]}>
      <Text style={[styles.initials, { fontSize, color: colors.textSecondary }]}>{initials}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '700' },
});
