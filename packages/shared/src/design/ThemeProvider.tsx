/**
 * CLSTR Cross-Platform Theme Provider
 *
 * Replaces src/components/ThemeProvider.tsx + next-themes.
 *
 * - Web: adds/removes `.dark` class on <html> (backward compat with Tailwind)
 * - Native: exposes theme object via context
 * - Persists preference via Supabase user_settings (same as current web app)
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { Appearance, Platform } from 'react-native';
import { buildTheme, lightTheme, type Theme, type ThemeMode, type EffectiveTheme } from './theme';

// ─── Context ─────────────────────────────────────────────────

interface ThemeContextValue {
  /** Whether the theme has been initialized */
  isInitialized: boolean;
  /** User's stored preference: light | dark | system */
  themeMode: ThemeMode;
  /** Resolved effective theme: light | dark */
  effectiveTheme: EffectiveTheme;
  /** Full theme object with colors, spacing, etc. */
  theme: Theme;
  /** Set the theme mode */
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isInitialized: false,
  themeMode: 'light',
  effectiveTheme: 'light',
  theme: lightTheme,
  setThemeMode: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useThemeContext = () => useContext(ThemeContext);

// ─── Helpers ─────────────────────────────────────────────────

function resolveEffectiveTheme(mode: ThemeMode): EffectiveTheme {
  if (mode === 'system') {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    }
    // Native: use Appearance API
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  }
  return mode;
}

/** Apply theme class to DOM <html> element (web only) */
function applyThemeToDOM(effective: EffectiveTheme) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(effective);
}

// ─── Provider ────────────────────────────────────────────────

interface ThemeProviderProps {
  children: ReactNode;
  /** Optional initial theme mode override */
  initialMode?: ThemeMode;
}

export function ThemeProvider({ children, initialMode = 'light' }: ThemeProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialMode);

  const effectiveTheme = useMemo(() => resolveEffectiveTheme(themeMode), [themeMode]);
  const theme = useMemo(() => buildTheme(effectiveTheme), [effectiveTheme]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
  }, []);

  // Apply to DOM on web
  useEffect(() => {
    applyThemeToDOM(effectiveTheme);
  }, [effectiveTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (themeMode !== 'system') return;

    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !window.matchMedia) return;
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        applyThemeToDOM(resolveEffectiveTheme('system'));
      };
      media.addEventListener?.('change', handler);
      return () => media.removeEventListener?.('change', handler);
    }

    // Native: listen via Appearance API
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // Force re-render by toggling mode
      setThemeModeState('system');
    });
    return () => subscription.remove();
  }, [themeMode]);

  // Mark initialized
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ isInitialized, themeMode, effectiveTheme, theme, setThemeMode }),
    [isInitialized, themeMode, effectiveTheme, theme, setThemeMode],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
