/**
 * ═══════════════════════════════════════════════════════════════
 * CLSTR MOBILE DESIGN SYSTEM — Centralized Theme Tokens
 * ═══════════════════════════════════════════════════════════════
 *
 * Single source of truth for all mobile design decisions.
 * Mirrors the web design-tokens.ts adapted for React Native.
 *
 * Phase 6: Design Token Alignment
 */

// useColorScheme no longer needed — forced dark mode (Phase 3)

// ─── Core Palette ────────────────────────────────────────────

const light = {
  // Brand
  primary: '#2563EB',
  primaryLight: '#DBEAFE',
  primaryForeground: '#FFFFFF',

  // Backgrounds
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  surfaceHover: '#F1F5F9',
  surfaceElevated: '#F1F5F9',

  // Text hierarchy
  text: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textMeta: '#CBD5E1',

  // Borders
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  surfaceBorder: '#E2E8F0',
  surfaceBorderStrong: '#CBD5E1',
  divider: '#F1F5F9',

  // Tab bar
  tint: '#2563EB',
  tabIconDefault: '#94A3B8',
  tabIconSelected: '#2563EB',

  // Signal colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  accent: '#8B5CF6',
  danger: '#EF4444',

  // Utility
  secondary: '#F1F5F9',
  muted: '#E2E8F0',
  cardShadow: 'rgba(0, 0, 0, 0.05)',
  inputBackground: '#F1F5F9',
  inputBorder: '#E2E8F0',
};

const dark = {
  // Brand — white-accent on pure black (matches web)
  primary: 'rgba(255, 255, 255, 0.90)',
  primaryLight: 'rgba(255, 255, 255, 0.08)',
  primaryForeground: '#000000',

  // Backgrounds — pure black OLED
  background: '#000000',
  surface: 'rgba(255, 255, 255, 0.04)',
  surfaceSecondary: 'rgba(255, 255, 255, 0.06)',
  surfaceHover: 'rgba(255, 255, 255, 0.08)',
  surfaceElevated: 'rgba(255, 255, 255, 0.08)',

  // Text hierarchy
  text: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.60)',
  textTertiary: 'rgba(255, 255, 255, 0.40)',
  textMeta: 'rgba(255, 255, 255, 0.25)',

  // Borders
  border: 'rgba(255, 255, 255, 0.10)',
  borderLight: 'rgba(255, 255, 255, 0.06)',
  surfaceBorder: 'rgba(255, 255, 255, 0.10)',
  surfaceBorderStrong: 'rgba(255, 255, 255, 0.16)',
  divider: 'rgba(255, 255, 255, 0.06)',

  // Tab bar
  tint: 'rgba(255, 255, 255, 0.90)',
  tabIconDefault: 'rgba(255, 255, 255, 0.40)',
  tabIconSelected: 'rgba(255, 255, 255, 0.95)',

  // Signal colors
  success: '#34D399',
  error: '#F87171',
  warning: '#FBBF24',
  accent: '#A78BFA',
  danger: '#F87171',

  // Utility
  secondary: 'rgba(255, 255, 255, 0.06)',
  muted: 'rgba(255, 255, 255, 0.10)',
  cardShadow: 'rgba(0, 0, 0, 0.5)',
  inputBackground: 'rgba(255, 255, 255, 0.04)',
  inputBorder: 'rgba(255, 255, 255, 0.10)',
};

export type ThemeColors = typeof light;

// ─── Surface Tiers ───────────────────────────────────────────
// Hierarchical surface system matching web design-tokens.ts

export const surfaceTiers = {
  /** Tier 1 — Strongest: Composer, ProfileCompletion */
  tier1: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 14,
  },
  /** Tier 2 — Neutral: Feed cards, PostCard, EventCard */
  tier2: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 14,
  },
  /** Tier 3 — Quietest: Sidebars, secondary panels */
  tier3: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F5F9',
    borderWidth: 1,
    borderRadius: 14,
  },
} as const;

export const darkSurfaceTiers = {
  tier1: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderRadius: 14,
  },
  tier2: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderRadius: 14,
  },
  tier3: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderRadius: 14,
  },
} as const;

// ─── Badge Variants ──────────────────────────────────────────
// Role-specific badge colors — matches web exactly

export const badgeVariants = {
  student: {
    bg: '#DBEAFE',
    text: '#1D4ED8',
    border: '#BFDBFE',
  },
  faculty: {
    bg: '#FEF3C7',
    text: '#92400E',
    border: '#FDE68A',
  },
  alumni: {
    bg: '#D1FAE5',
    text: '#065F46',
    border: '#A7F3D0',
  },
  club: {
    bg: '#EDE9FE',
    text: '#5B21B6',
    border: '#DDD6FE',
  },
  organization: {
    bg: '#EDE9FE',
    text: '#5B21B6',
    border: '#DDD6FE',
  },
  default: {
    bg: '#F1F5F9',
    text: '#475569',
    border: '#E2E8F0',
  },
} as const;

// ─── Avatar Sizes ────────────────────────────────────────────
// Standard avatar size presets for consistent sizing across the app

export const AVATAR_SIZES = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  '2xl': 80,
} as const;

export type AvatarSize = keyof typeof AVATAR_SIZES;

// ─── Spacing ─────────────────────────────────────────────────

export const spacing = {
  /** Extra small: 4px */
  xs: 4,
  /** Small: 8px */
  sm: 8,
  /** Medium: 12px */
  md: 12,
  /** Default: 16px */
  default: 16,
  /** Large: 20px */
  lg: 20,
  /** Extra large: 24px */
  xl: 24,
  /** 2XL: 32px */
  '2xl': 32,
  /** Card internal padding */
  cardPadding: 14,
  /** Feed item gap */
  feedGap: 6,
  /** Screen horizontal margin */
  screenHorizontal: 16,
} as const;

// ─── Radii ───────────────────────────────────────────────────

export const radius = {
  /** Small: 8px — inputs, small badges */
  sm: 8,
  /** Medium: 12px — cards */
  md: 12,
  /** Large: 14px — main cards */
  lg: 14,
  /** XL: 16px — modals */
  xl: 16,
  /** 2XL: 20px — feature sections */
  '2xl': 20,
  /** Full: pill shape */
  full: 9999,
} as const;

// ─── Hooks ───────────────────────────────────────────────────

export function useThemeColors() {
  // Phase 3: Force dark-only mode to match web's pure-black theme
  return dark;
}

export function useSurfaceTiers() {
  // Phase 3: Force dark-only surface tiers
  return darkSurfaceTiers;
}

/** Static light-theme palette for use in StyleSheet.create() and other module-level code. */
export const colors = light;

// ─── Role Badge Color ────────────────────────────────────────

export function getRoleBadgeColor(role: string) {
  const key = role?.toLowerCase() as keyof typeof badgeVariants;
  const variant = badgeVariants[key] || badgeVariants.default;
  return { bg: variant.bg, text: variant.text, border: variant.border };
}

// ─── Default Export ──────────────────────────────────────────
// Backward-compatible: Colors.light / Colors.dark / Colors.colors

export default { light, dark, colors: light };
