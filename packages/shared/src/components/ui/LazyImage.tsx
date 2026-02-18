/**
 * LazyImage — cross-platform
 *
 * Image with loading shimmer and error fallback.
 */
import React, { useState } from 'react';
import {
  StyleSheet,
  Image,
  View as RNView,
  type ImageStyle,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { tokens } from '../../design/tokens';
import { useTheme } from '../../design/useTheme';
import { Skeleton } from './Skeleton';
import { Text } from './primitives/Text';

export interface LazyImageProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

export function LazyImage({
  src,
  alt,
  width,
  height,
  borderRadius = tokens.radius.sm,
  style,
  imageStyle,
}: LazyImageProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <RNView
        style={[styles.fallback, { width, height, borderRadius, backgroundColor: colors.muted }, style]}
        accessibilityLabel={alt}
      >
        <Text size="xs" style={{ color: colors.mutedForeground }}>
          Failed to load
        </Text>
      </RNView>
    );
  }

  return (
    <RNView style={[{ width, height, borderRadius, overflow: 'hidden' }, style]}>
      {loading && (
        <Skeleton
          style={[
            StyleSheet.absoluteFill,
            { borderRadius },
          ]}
        />
      )}
      <Image
        source={{ uri: src }}
        style={[
          { width: '100%' as any, height: '100%' as any, borderRadius },
          imageStyle,
        ]}
        resizeMode="cover"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setErrored(true);
        }}
        accessibilityLabel={alt}
      />
    </RNView>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
