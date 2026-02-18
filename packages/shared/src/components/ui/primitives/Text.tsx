/**
 * Themed Text primitive.
 *
 * Wraps React Native Text with design-token-aware defaults:
 * - Font family (Space Grotesk)
 * - Theme-aware color
 * - Typography scale shortcuts
 */
import React from 'react';
import {
  Text as RNText,
  type TextProps as RNTextProps,
  type TextStyle,
  StyleSheet,
} from 'react-native';
import { tokens, type FontSizeKey, type FontWeightKey } from '../../../design/tokens';
import { useTheme } from '../../../design/useTheme';

export interface TextProps extends RNTextProps {
  /** Typography size key or numeric font size */
  size?: FontSizeKey | number;
  /** Font weight key or CSS weight string */
  weight?: FontWeightKey | string;
  /** Semantic color override */
  color?: string;
  /** Use muted foreground color */
  muted?: boolean;
}

export function Text({
  size = 'base',
  weight = 'regular',
  color,
  muted,
  style,
  children,
  ...props
}: TextProps) {
  const { colors } = useTheme();

  const textColor = color ?? (muted ? colors.mutedForeground : colors.foreground);

  return (
    <RNText
      style={[
        {
          fontFamily: tokens.typography.fontFamily.sans,
          fontSize: typeof size === 'number' ? size : tokens.typography.fontSize[size],
          fontWeight: (weight in tokens.typography.fontWeight
            ? tokens.typography.fontWeight[weight as FontWeightKey]
            : weight) as TextStyle['fontWeight'],
          color: textColor,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}

export default Text;
