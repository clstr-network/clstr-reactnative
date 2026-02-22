/**
 * ═══════════════════════════════════════════════════════════════
 * CLSTR MOBILE TYPOGRAPHY — Centralized Type System
 * ═══════════════════════════════════════════════════════════════
 *
 * Single source of truth for all typography in the mobile app.
 * Uses Inter font family (loaded via @expo-google-fonts/inter).
 *
 * Font loading is handled in app/_layout.tsx via useFonts().
 *
 * Phase 6.2: Typography Scale
 */

import { TextStyle, Platform } from 'react-native';

// ─── Font Families ───────────────────────────────────────────
// Inter font weights mapped to their expo-google-fonts names.
// Falls back to system font if Inter isn't loaded yet.

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
} as const;

// ─── System Font Fallbacks ───────────────────────────────────
// Used when Inter fonts haven't loaded yet (splash screen period)

export const systemFont = {
  regular: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }),
  medium: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }),
  bold: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }),
} as const;

// ─── Type Scale ──────────────────────────────────────────────
// Mobile-optimized sizes in pixels (not rem).
// Matches the web design-tokens.ts ratios.

export const fontSize = {
  /** 10px — micro labels */
  '2xs': 10,
  /** 11px — badge labels, captions */
  xs: 11,
  /** 12px — meta, timestamps, footnotes */
  sm: 12,
  /** 13px — secondary body text, labels */
  md: 13,
  /** 14px — body small, list items */
  base: 14,
  /** 15px — body default */
  body: 15,
  /** 16px — card titles, emphasis */
  lg: 16,
  /** 18px — section headings */
  xl: 18,
  /** 20px — screen sub-headings */
  '2xl': 20,
  /** 22px — screen headings */
  '3xl': 22,
  /** 28px — hero / large headings */
  '4xl': 28,
} as const;

// ─── Line Heights ────────────────────────────────────────────

export const lineHeight = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
} as const;

// ─── Letter Spacing ──────────────────────────────────────────

export const letterSpacing = {
  tight: -0.3,
  normal: 0,
  wide: 0.5,
  wider: 1,
} as const;

// ─── Preset Text Styles ─────────────────────────────────────
// Ready-to-use text styles that match the web typography scale.
// Usage: <Text style={typography.h1}>Heading</Text>

export const typography = {
  /** 28px ExtraBold — Hero headings */
  h1: {
    fontSize: fontSize['4xl'],
    fontWeight: '800',
    fontFamily: fontFamily.extraBold,
    letterSpacing: letterSpacing.tight,
    lineHeight: fontSize['4xl'] * lineHeight.tight,
  } as TextStyle,

  /** 22px Bold — Screen headings */
  h2: {
    fontSize: fontSize['3xl'],
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    letterSpacing: letterSpacing.tight,
    lineHeight: fontSize['3xl'] * lineHeight.tight,
  } as TextStyle,

  /** 18px SemiBold — Section headings */
  h3: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
    lineHeight: fontSize.xl * lineHeight.normal,
  } as TextStyle,

  /** 16px SemiBold — Card titles */
  h4: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
    lineHeight: fontSize.lg * lineHeight.normal,
  } as TextStyle,

  /** 15px Regular — Default body text */
  body: {
    fontSize: fontSize.body,
    fontWeight: '400',
    fontFamily: fontFamily.regular,
    lineHeight: fontSize.body * lineHeight.relaxed,
  } as TextStyle,

  /** 14px Regular — Body small / list items */
  bodySmall: {
    fontSize: fontSize.base,
    fontWeight: '400',
    fontFamily: fontFamily.regular,
    lineHeight: fontSize.base * lineHeight.relaxed,
  } as TextStyle,

  /** 13px Medium — Labels, secondary text */
  label: {
    fontSize: fontSize.md,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
    lineHeight: fontSize.md * lineHeight.normal,
  } as TextStyle,

  /** 12px Regular — Timestamps, footnotes */
  caption: {
    fontSize: fontSize.sm,
    fontWeight: '400',
    fontFamily: fontFamily.regular,
    lineHeight: fontSize.sm * lineHeight.normal,
  } as TextStyle,

  /** 11px SemiBold — Badge labels */
  badge: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
    lineHeight: fontSize.xs * lineHeight.normal,
  } as TextStyle,

  /** 10px Medium — Micro labels */
  micro: {
    fontSize: fontSize['2xs'],
    fontWeight: '500',
    fontFamily: fontFamily.medium,
    lineHeight: fontSize['2xs'] * lineHeight.normal,
    letterSpacing: letterSpacing.wide,
  } as TextStyle,

  /** 15px SemiBold — Button labels */
  button: {
    fontSize: fontSize.body,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
    lineHeight: fontSize.body * lineHeight.normal,
  } as TextStyle,

  /** 13px SemiBold — Small button labels */
  buttonSmall: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
    lineHeight: fontSize.md * lineHeight.normal,
  } as TextStyle,

  /** 15px Medium — Input text */
  input: {
    fontSize: fontSize.body,
    fontWeight: '400',
    fontFamily: fontFamily.regular,
    lineHeight: fontSize.body * lineHeight.normal,
  } as TextStyle,

  /** 15px Bold — Name / title in cards */
  cardName: {
    fontSize: fontSize.body,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
  } as TextStyle,

  /** 14px Regular — Card subtitle / content preview */
  cardBody: {
    fontSize: fontSize.base,
    fontWeight: '400',
    fontFamily: fontFamily.regular,
    lineHeight: fontSize.base * lineHeight.relaxed,
  } as TextStyle,
} as const;

export default typography;
