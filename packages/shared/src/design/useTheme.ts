/**
 * Cross-platform useTheme hook.
 *
 * Returns the current theme object, effective mode,
 * and a setter for the theme preference.
 */
import { useThemeContext } from './ThemeProvider';

export function useTheme() {
  const ctx = useThemeContext();
  return {
    theme: ctx.theme,
    themeMode: ctx.themeMode,
    effectiveTheme: ctx.effectiveTheme,
    setThemeMode: ctx.setThemeMode,
    isInitialized: ctx.isInitialized,
    /** Convenience: true when dark mode is active */
    isDark: ctx.effectiveTheme === 'dark',
    /** Convenience: current color palette */
    colors: ctx.theme.colors,
  };
}
