import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { useThemeColors, AVATAR_SIZES, type AvatarSize } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  /** Pixel size or named preset: 'xs' (24), 'sm' (32), 'md' (40), 'lg' (48), 'xl' (64), '2xl' (80) */
  size?: number | AvatarSize;
  /** Show a green online indicator dot */
  showOnline?: boolean;
  /** Whether the user is online (only rendered if showOnline=true) */
  isOnline?: boolean;
}

const AVATAR_COLORS = [
  '#2563EB', '#7C3AED', '#DB2777', '#059669',
  '#D97706', '#DC2626', '#4F46E5', '#0891B2',
];

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColor(name?: string): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function resolveSize(size: number | AvatarSize): number {
  if (typeof size === 'number') return size;
  return AVATAR_SIZES[size] ?? AVATAR_SIZES.md;
}

function Avatar({ uri, name, size = 'md', showOnline = false, isOnline = false }: AvatarProps) {
  const colors = useThemeColors();
  const px = resolveSize(size);
  const borderRadius = px / 2;
  const fontSize = px * 0.38;
  const onlineDotSize = Math.max(Math.round(px * 0.24), 8);

  const renderOnlineDot = showOnline && (
    <View
      style={[
        styles.onlineDot,
        {
          width: onlineDotSize,
          height: onlineDotSize,
          borderRadius: onlineDotSize / 2,
          borderColor: colors.surface,
          backgroundColor: isOnline ? '#22C55E' : colors.textTertiary,
        },
      ]}
    />
  );

  if (uri) {
    return (
      <View style={{ width: px, height: px }}>
        <Image
          source={{ uri }}
          style={[
            styles.image,
            { width: px, height: px, borderRadius, borderColor: colors.border },
          ]}
        />
        {renderOnlineDot}
      </View>
    );
  }

  return (
    <View style={{ width: px, height: px }}>
      <View
        style={[
          styles.fallback,
          {
            width: px,
            height: px,
            borderRadius,
            backgroundColor: getColor(name),
          },
        ]}
      >
        <Text style={[styles.initials, { fontSize, fontFamily: fontFamily.semiBold }]}>
          {getInitials(name)}
        </Text>
      </View>
      {renderOnlineDot}
    </View>
  );
}

export default React.memo(Avatar);

// Named export for backward-compat with UserCard
export { Avatar };

const styles = StyleSheet.create({
  image: {
    borderWidth: 1,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
  },
});
