/**
 * Avatar — cross-platform
 *
 * Replaces shadcn/ui Avatar / AvatarImage / AvatarFallback.
 */
import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { View } from './primitives/View';
import { Text } from './primitives/Text';
import { tokens } from '../../design/tokens';

export interface AvatarProps {
  src?: string | null;
  fallback?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function Avatar({ src, fallback, size = 40, style }: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden',
  };

  if (src && !hasError) {
    return (
      <View style={[styles.root, containerStyle, style]}>
        <Image
          source={{ uri: src }}
          style={{ width: size, height: size }}
          onError={() => setHasError(true)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, styles.fallback, containerStyle, style]}>
      <Text size={size * 0.4} weight="600" style={{ color: '#FFFFFF' }}>
        {fallback ?? '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  fallback: {
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
});
