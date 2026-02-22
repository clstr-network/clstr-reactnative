const Colors = {
  dark: {
    background: '#0A0E17',
    surface: '#131929',
    surfaceElevated: '#1A2236',
    border: '#1E2A42',
    borderLight: '#263352',
    text: '#FFFFFF',
    textSecondary: '#8B95B0',
    textTertiary: '#5A6380',
    tint: '#00D1B2',
    tintLight: '#00E5C4',
    tintDark: '#00B89C',
    accent: '#3B82F6',
    accentLight: '#60A5FA',
    danger: '#EF4444',
    dangerLight: '#F87171',
    warning: '#F59E0B',
    success: '#10B981',
    studentBadge: '#3B82F6',
    facultyBadge: '#8B5CF6',
    alumniBadge: '#F59E0B',
    tabIconDefault: '#5A6380',
    tabIconSelected: '#00D1B2',
    cardShadow: 'rgba(0, 0, 0, 0.3)',
    overlay: 'rgba(10, 14, 23, 0.8)',
  },
  light: {
    background: '#F5F7FA',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    border: '#E2E8F0',
    borderLight: '#EDF2F7',
    text: '#0F172A',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    tint: '#00B89C',
    tintLight: '#00D1B2',
    tintDark: '#009B83',
    accent: '#3B82F6',
    accentLight: '#60A5FA',
    danger: '#EF4444',
    dangerLight: '#F87171',
    warning: '#F59E0B',
    success: '#10B981',
    studentBadge: '#3B82F6',
    facultyBadge: '#8B5CF6',
    alumniBadge: '#F59E0B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#00B89C',
    cardShadow: 'rgba(0, 0, 0, 0.08)',
    overlay: 'rgba(245, 247, 250, 0.8)',
  },
};

export default Colors;

export function useThemeColors(colorScheme: 'light' | 'dark' | null | undefined) {
  return colorScheme === 'dark' ? Colors.dark : Colors.light;
}

export function getRoleBadgeColor(role: string, colors: typeof Colors.dark) {
  switch (role) {
    case 'student':
      return colors.studentBadge;
    case 'faculty':
      return colors.facultyBadge;
    case 'alumni':
      return colors.alumniBadge;
    default:
      return colors.textTertiary;
  }
}
