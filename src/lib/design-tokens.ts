/**
 * ═══════════════════════════════════════════════════════════════
 * CLSTR DESIGN SYSTEM — Centralized Theme Tokens
 * ═══════════════════════════════════════════════════════════════
 *
 * Single source of truth for all design decisions.
 * Import from here instead of hardcoding values.
 *
 * Background: pure black (#000000)
 * Cards: white-translucent over black
 * Typography: Space Grotesk only
 * No neon. No gradients. No glow.
 */

// ─── Surface Tiers ───────────────────────────────────────────
// Solid dark-gray hierarchy for card surfaces over pure black.
export const surface = {
  /** Tier 1 — Strongest: Composer, ProfileCompletion */
  tier1: {
    bg: 'rgb(23, 22, 22)',
    bgHover: 'rgb(30, 29, 29)',
    border: 'rgba(255, 255, 255, 0.12)',
    className: 'home-card-tier1',
  },
  /** Tier 2 — Neutral: Feed cards, PostCard, EventCard */
  tier2: {
    bg: 'rgb(23, 22, 22)',
    bgHover: 'rgb(30, 29, 29)',
    border: 'rgba(255, 255, 255, 0.08)',
    className: 'home-card-tier2',
  },
  /** Tier 3 — Quietest: Sidebars, secondary panels */
  tier3: {
    bg: 'rgb(23, 22, 22)',
    bgHover: 'rgb(30, 29, 29)',
    border: 'rgba(255, 255, 255, 0.06)',
    className: 'home-card-tier3',
  },
} as const;

// ─── Colors ──────────────────────────────────────────────────
export const colors = {
  // Base
  black: '#000000',
  white: '#ffffff',

  // Text opacity scale (over black)
  text: {
    primary: 'rgba(255, 255, 255, 1)',
    secondary: 'rgba(255, 255, 255, 0.90)',
    tertiary: 'rgba(255, 255, 255, 0.60)',
    quaternary: 'rgba(255, 255, 255, 0.45)',
    muted: 'rgba(255, 255, 255, 0.30)',
    disabled: 'rgba(255, 255, 255, 0.20)',
  },

  // Signal colors — accent only, not decoration
  signal: {
    red: '#ef4444',
    yellow: '#eab308',
    green: '#22c55e',
    blue: '#3b82f6',
    orange: '#f97316',
  },

  // Border opacity scale
  border: {
    strong: 'rgba(255, 255, 255, 0.15)',
    default: 'rgba(255, 255, 255, 0.10)',
    subtle: 'rgba(255, 255, 255, 0.07)',
    faint: 'rgba(255, 255, 255, 0.04)',
  },

  // Interactive state overlays
  overlay: {
    hover: 'rgba(255, 255, 255, 0.06)',
    active: 'rgba(255, 255, 255, 0.10)',
    focus: 'rgba(255, 255, 255, 0.12)',
  },
} as const;

// ─── Typography ──────────────────────────────────────────────
export const typography = {
  fontFamily: "'Space Grotesk', sans-serif",

  // Type scale (rem)
  size: {
    xs: '0.75rem',    // 12px — meta, captions
    sm: '0.875rem',   // 14px — body small, labels
    base: '1rem',     // 16px — body
    lg: '1.125rem',   // 18px — subheadings
    xl: '1.25rem',    // 20px — headings
    '2xl': '1.5rem',  // 24px — page titles
    '3xl': '1.875rem', // 30px — hero
  },

  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },

  letterSpacing: {
    tight: '-0.02em',
    normal: '-0.01em',
    wide: '0.05em',
  },
} as const;

// ─── Spacing ─────────────────────────────────────────────────
export const spacing = {
  /** Card internal padding */
  cardPadding: {
    sm: '0.75rem',  // 12px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
  },
  /** Gap between feed items */
  feedGap: '1.25rem', // 20px
  /** Section spacing */
  sectionGap: '1.5rem', // 24px
  /** Sidebar item spacing */
  sidebarGap: '1.25rem', // 20px
} as const;

// ─── Radii ───────────────────────────────────────────────────
export const radius = {
  sm: '0.5rem',    // 8px
  md: '0.75rem',   // 12px — cards
  lg: '1rem',      // 16px — modals
  xl: '1.25rem',   // 20px — feature sections
  full: '9999px',  // pill shape
} as const;

// ─── Shadows ─────────────────────────────────────────────────
// Minimal shadows — rely on borders and opacity tiers instead
export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 12px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.5)',
  /** Lifted card on hover */
  lifted: '0 8px 32px rgba(0, 0, 0, 0.6)',
} as const;

// ─── Transitions ─────────────────────────────────────────────
export const transitions = {
  fast: '150ms ease',
  default: '200ms ease',
  slow: '300ms ease',
  spring: '400ms cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

// ─── Breakpoints ─────────────────────────────────────────────
export const breakpoints = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// ─── Z-Index ─────────────────────────────────────────────────
export const zIndex = {
  base: 0,
  card: 1,
  sticky: 10,
  header: 50,
  overlay: 100,
  modal: 200,
  toast: 300,
  tooltip: 400,
} as const;
