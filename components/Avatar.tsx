import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface AvatarProps {
  initials: string;
  size?: number;
  isOnline?: boolean;
  color?: string;
}

const avatarColors = [
  'rgba(255, 255, 255, 0.12)',
  'rgba(255, 255, 255, 0.10)',
  'rgba(255, 255, 255, 0.14)',
  'rgba(255, 255, 255, 0.08)',
  'rgba(255, 255, 255, 0.11)',
];

function getColorIndex(initials: string): number {
  let hash = 0;
  for (let i = 0; i < initials.length; i++) {
    hash = initials.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % avatarColors.length;
}

export function Avatar({ initials, size = 44, isOnline }: AvatarProps) {
  const bgColor = avatarColors[getColorIndex(initials)];
  const fontSize = size * 0.36;

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bgColor,
          },
        ]}
      >
        <Text
          style={[
            styles.text,
            {
              fontSize,
              color: Colors.dark.textBody,
            },
          ]}
        >
          {initials}
        </Text>
      </View>
      {isOnline !== undefined && (
        <View
          style={[
            styles.indicator,
            {
              width: size * 0.27,
              height: size * 0.27,
              borderRadius: size * 0.135,
              backgroundColor: isOnline ? Colors.dark.success : Colors.dark.textMeta,
              borderWidth: 2,
              borderColor: Colors.dark.background,
              right: 0,
              bottom: 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    letterSpacing: 0.5,
  },
  indicator: {
    position: 'absolute',
  },
});
