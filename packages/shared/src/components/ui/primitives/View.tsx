/**
 * Themed View primitive.
 *
 * Wraps React Native View with theme-aware background color
 * and shadow support using design tokens.
 */
import React from 'react';
import {
  View as RNView,
  type ViewProps as RNViewProps,
  StyleSheet,
} from 'react-native';
import { tokens, type ShadowKey } from '../../../design/tokens';
import { useTheme } from '../../../design/useTheme';

export interface ViewProps extends RNViewProps {
  /** Apply shadow preset */
  shadow?: ShadowKey;
  /** Use card background color */
  card?: boolean;
}

export function View({ shadow, card, style, children, ...props }: ViewProps) {
  const { colors } = useTheme();

  const shadowStyle = shadow ? tokens.shadows[shadow] : undefined;

  return (
    <RNView
      style={[
        card && { backgroundColor: colors.card },
        shadowStyle,
        style,
      ]}
      {...props}
    >
      {children}
    </RNView>
  );
}

export default View;
