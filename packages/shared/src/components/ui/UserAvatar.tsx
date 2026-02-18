/**
 * UserAvatar — cross-platform
 *
 * Extended Avatar with online indicator and clstr-specific defaults.
 */
import React from 'react';
import {
  StyleSheet,
  View as RNView,
  Image,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { tokens } from '../../design/tokens';
import { useTheme } from '../../design/useTheme';
import { Text } from './primitives/Text';

export interface UserAvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  isOnline?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function UserAvatar({
  src,
  name = '',
  size = 40,
  isOnline,
  style,
}: UserAvatarProps) {
  const { colors } = useTheme();
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const [errored, setErrored] = React.useState(false);

  return (
    <RNView style={[{ width: size, height: size }, style]}>
      {src && !errored ? (
        <Image
          source={{ uri: src }}
          style={[styles.img, { width: size, height: size, borderRadius: size / 2 }]}
          onError={() => setErrored(true)}
        />
      ) : (
        <RNView
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.muted,
            },
          ]}
        >
          <Text weight="semibold" style={{ color: colors.mutedForeground, fontSize: size * 0.38 }}>
            {initials || '?'}
          </Text>
        </RNView>
      )}

      {isOnline !== undefined && (
        <RNView
          style={[
            styles.indicator,
            {
              backgroundColor: isOnline ? '#22c55e' : '#6b7280',
              borderColor: colors.background,
              width: size * 0.3,
              height: size * 0.3,
              borderRadius: size * 0.15,
            },
          ]}
        />
      )}
    </RNView>
  );
}

const styles = StyleSheet.create({
  img: {
    resizeMode: 'cover',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
  },
});
