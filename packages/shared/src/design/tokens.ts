/**
 * ═══════════════════════════════════════════════════════════════
 * CLSTR DESIGN SYSTEM — Universal Design Tokens
 * ═══════════════════════════════════════════════════════════════
 *
 * Single source of truth for all design decisions.
 * Produces values consumable by both web (Tailwind) and
 * React Native (StyleSheet).
 *
 * Mirrors the existing src/lib/design-tokens.ts but with
 * cross-platform values (numbers in dp for RN, strings kept
 * for CSS compatibility on web).
 */

export const tokens = {
  colors: {
    black: '#000000',
    white: '#FFFFFF',

    // ─── Semantic — Light Theme ──────────────────────────
    light: {
      background: '#FFFFFF',
      foreground: '#0F172A',
      card: '#FFFFFF',
      cardForeground: '#0F172A',
      popover: '#FFFFFF',
      popoverForeground: '#0F172A',
      primary: '#3B82F6',          // blue-500 (from --primary HSL)
      primaryForeground: '#F8FAFC',
      secondary: '#7C3AED',        // violet-600 (from --secondary HSL)
      secondaryForeground: '#1E293B',
      muted: '#F1F5F9',
      mutedForeground: '#64748B',
      accent: '#6366F1',           // indigo-500 (from --accent HSL)
      accentForeground: '#1E293B',
      destructive: '#EF4444',
      destructiveForeground: '#F8FAFC',
      border: '#E2E8F0',
      input: '#E2E8F0',
      ring: '#3B82F6',
    },

    // ─── Semantic — Dark Theme ───────────────────────────
    dark: {
      background: '#030712',       // from --background dark HSL
      foreground: '#F8FAFC',
      card: '#030712',
      cardForeground: '#F8FAFC',
      popover: '#030712',
      popoverForeground: '#F8FAFC',
      primary: '#3B82F6',
      primaryForeground: '#1E293B',
      secondary: '#7C3AED',
      secondaryForeground: '#F8FAFC',
      muted: '#1E293B',
      mutedForeground: '#94A3B8',
      accent: '#6366F1',
      accentForeground: '#F8FAFC',
      destructive: '#7F1D1D',
      destructiveForeground: '#F8FAFC',
      border: '#1E293B',
      input: '#1E293B',
      ring: '#3B82F6',
    },

    // ─── Signal Colors ───────────────────────────────────
    signal: {
      red: '#EF4444',
      yellow: '#EAB308',
      green: '#22C55E',
      blue: '#3B82F6',
      orange: '#F97316',
    },

    // ─── Surface Tiers (dark) ────────────────────────────
    surface: {
      tier1: {
        bg: 'rgb(23, 22, 22)',
        bgHover: 'rgb(30, 29, 29)',
        border: 'rgba(255, 255, 255, 0.12)',
      },
      tier2: {
        bg: 'rgb(23, 22, 22)',
        bgHover: 'rgb(30, 29, 29)',
        border: 'rgba(255, 255, 255, 0.08)',
      },
      tier3: {
        bg: 'rgb(23, 22, 22)',
        bgHover: 'rgb(30, 29, 29)',
        border: 'rgba(255, 255, 255, 0.06)',
      },
    },

    // ─── Text Opacity Scale (dark) ───────────────────────
    text: {
      primary: 'rgba(255, 255, 255, 1)',
      secondary: 'rgba(255, 255, 255, 0.90)',
      tertiary: 'rgba(255, 255, 255, 0.60)',
      quaternary: 'rgba(255, 255, 255, 0.45)',
      muted: 'rgba(255, 255, 255, 0.30)',
      disabled: 'rgba(255, 255, 255, 0.20)',
    },

    // ─── Border Opacity Scale (dark) ─────────────────────
    border: {
      strong: 'rgba(255, 255, 255, 0.15)',
      default: 'rgba(255, 255, 255, 0.10)',
      subtle: 'rgba(255, 255, 255, 0.07)',
      faint: 'rgba(255, 255, 255, 0.04)',
    },

    // ─── Interactive Overlays ────────────────────────────
    overlay: {
      hover: 'rgba(255, 255, 255, 0.06)',
      active: 'rgba(255, 255, 255, 0.10)',
      focus: 'rgba(255, 255, 255, 0.12)',
    },

    // ─── Admin Palette ───────────────────────────────────
    admin: {
      bg: { DEFAULT: '#f9fafb', elevated: '#ffffff', muted: '#f3f4f6', subtle: '#e5e7eb' },
      ink: { DEFAULT: '#111827', secondary: '#374151', muted: '#6b7280' },
      border: { DEFAULT: '#e5e7eb', strong: '#d1d5db' },
      primary: { DEFAULT: '#8b5cf6', light: '#ede9fe' },
      success: { DEFAULT: '#10b981', light: '#d1fae5' },
      error: { DEFAULT: '#ef4444', light: '#fee2e2' },
      warning: { DEFAULT: '#f59e0b', light: '#fef3c7' },
    },

    // ─── Alumni Palette ──────────────────────────────────
    alumni: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      accent: '#6366f1',
      muted: '#f3f4f6',
      background: '#ffffff',
      card: '#f9fafb',
    },
  },

  // ─── Spacing (dp/px) ───────────────────────────────────
  spacing: {
    '0': 0,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },

  // ─── Border Radius (dp) ───────────────────────────────
  radius: {
    none: 0,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },

  // ─── Typography ────────────────────────────────────────
  typography: {
    fontFamily: {
      sans: 'SpaceGrotesk',
      mono: 'SpaceMono',
    },
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
    },
    fontWeight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
    lineHeight: {
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // ─── Shadows (React Native format) ─────────────────────
  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 5,
    },
    lifted: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
      elevation: 8,
    },
  },

  // ─── Z-Index ───────────────────────────────────────────
  zIndex: {
    base: 0,
    card: 1,
    sticky: 10,
    header: 50,
    overlay: 100,
    modal: 200,
    toast: 300,
    tooltip: 400,
  },

  // ─── Touch Targets ────────────────────────────────────
  touchTarget: {
    min: 44,
    lg: 48,
  },
} as const;

// ─── Derived Types ──────────────────────────────────────
export type ThemeColors = typeof tokens.colors.light | typeof tokens.colors.dark;
export type SemanticColorKey = keyof typeof tokens.colors.light;
export type SpacingKey = keyof typeof tokens.spacing;
export type RadiusKey = keyof typeof tokens.radius;
export type FontSizeKey = keyof typeof tokens.typography.fontSize;
export type FontWeightKey = keyof typeof tokens.typography.fontWeight;
export type ShadowKey = keyof typeof tokens.shadows;
