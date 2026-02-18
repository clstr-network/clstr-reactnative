/**
 * CLSTR Theme — Light & Dark semantic color maps.
 *
 * Returns the full color set for the active theme mode,
 * consuming values from tokens.ts.
 */
import { tokens, type ThemeColors } from './tokens';

export type ThemeMode = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

export interface Theme {
  mode: EffectiveTheme;
  colors: ThemeColors;
  spacing: typeof tokens.spacing;
  radius: typeof tokens.radius;
  typography: typeof tokens.typography;
  shadows: typeof tokens.shadows;
  zIndex: typeof tokens.zIndex;
  touchTarget: typeof tokens.touchTarget;
}

export function buildTheme(mode: EffectiveTheme): Theme {
  return {
    mode,
    colors: mode === 'dark' ? tokens.colors.dark : tokens.colors.light,
    spacing: tokens.spacing,
    radius: tokens.radius,
    typography: tokens.typography,
    shadows: tokens.shadows,
    zIndex: tokens.zIndex,
    touchTarget: tokens.touchTarget,
  };
}

export const lightTheme = buildTheme('light');
export const darkTheme = buildTheme('dark');
