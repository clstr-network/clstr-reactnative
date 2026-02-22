const surface = {
  base: '#000000',
  tier3: '#0A0A0A',
  tier2: '#111111',
  tier1: '#1A1A1A',
  elevated: '#222222',
  overlay: '#2A2A2A',
};

const border = {
  subtle: '#1A1A1A',
  default: '#222222',
  strong: '#333333',
};

const text = {
  primary: '#FFFFFF',
  secondary: '#A0A0A0',
  tertiary: '#666666',
  disabled: '#444444',
};

const accent = {
  primary: '#E5A100',
  primaryHover: '#FFB82E',
  primaryMuted: 'rgba(229, 161, 0, 0.15)',
  primaryBorder: 'rgba(229, 161, 0, 0.30)',
};

const semantic = {
  success: '#10B981',
  successMuted: 'rgba(16, 185, 129, 0.15)',
  danger: '#EF4444',
  dangerMuted: 'rgba(239, 68, 68, 0.15)',
  info: '#3B82F6',
  infoMuted: 'rgba(59, 130, 246, 0.15)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  purple: '#8B5CF6',
  purpleMuted: 'rgba(139, 92, 246, 0.15)',
  pink: '#EC4899',
  pinkMuted: 'rgba(236, 72, 153, 0.15)',
  indigo: '#6366F1',
  indigoMuted: 'rgba(99, 102, 241, 0.15)',
  teal: '#14B8A6',
  tealMuted: 'rgba(20, 184, 166, 0.15)',
};

const colors = {
  ...surface,
  ...accent,
  ...semantic,

  background: surface.base,
  backgroundSecondary: surface.tier3,
  backgroundTertiary: surface.tier2,

  card: surface.tier2,
  cardBorder: border.default,

  border: border.default,
  borderSubtle: border.subtle,
  borderStrong: border.strong,

  text: text.primary,
  textSecondary: text.secondary,
  textTertiary: text.tertiary,
  textDisabled: text.disabled,

  inputBg: surface.tier1,
  inputBorder: border.default,

  tabIconDefault: text.tertiary,
  tabIconSelected: accent.primary,
  tint: accent.primary,

  white: '#FFFFFF',
  black: '#000000',
  overlayBg: 'rgba(0, 0, 0, 0.7)',
};

export const surfaceTiers = {
  tier1: { backgroundColor: surface.tier1, borderColor: border.strong },
  tier2: { backgroundColor: surface.tier2, borderColor: border.default },
  tier3: { backgroundColor: surface.tier3, borderColor: border.subtle },
};

export const badgeVariants = {
  student: { bg: accent.primaryMuted, border: accent.primaryBorder, text: accent.primary },
  alumni: { bg: accent.primaryMuted, border: accent.primaryBorder, text: accent.primary },
  faculty: { bg: semantic.purpleMuted, border: 'rgba(139, 92, 246, 0.30)', text: semantic.purple },
};

export const categoryColors: Record<string, string> = {
  Technology: semantic.info,
  Arts: semantic.pink,
  Workshop: semantic.purple,
  Networking: semantic.warning,
  Research: semantic.success,
  Entrepreneurship: semantic.indigo,
};

export default {
  light: {
    text: colors.text,
    background: colors.background,
    tint: colors.tint,
    tabIconDefault: colors.tabIconDefault,
    tabIconSelected: colors.tabIconSelected,
  },
  colors,
};
