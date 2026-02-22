import { useColorScheme } from 'react-native';

const light = {
  primary: '#2563EB',
  primaryLight: '#DBEAFE',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  tint: '#2563EB',
  tabIconDefault: '#94A3B8',
  tabIconSelected: '#2563EB',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  accent: '#8B5CF6',
  cardShadow: 'rgba(0, 0, 0, 0.05)',
  inputBackground: '#F1F5F9',
  inputBorder: '#E2E8F0',
};

const dark = {
  primary: '#3B82F6',
  primaryLight: '#1E3A5F',
  background: '#0F172A',
  surface: '#1E293B',
  surfaceSecondary: '#334155',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  border: '#334155',
  borderLight: '#1E293B',
  tint: '#3B82F6',
  tabIconDefault: '#64748B',
  tabIconSelected: '#3B82F6',
  success: '#34D399',
  error: '#F87171',
  warning: '#FBBF24',
  accent: '#A78BFA',
  cardShadow: 'rgba(0, 0, 0, 0.3)',
  inputBackground: '#1E293B',
  inputBorder: '#334155',
};

export function useThemeColors() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}

/** Static light-theme palette for use in StyleSheet.create() and other module-level code. */
export const colors = light;

export function getRoleBadgeColor(role: string) {
  switch (role?.toLowerCase()) {
    case 'student':
      return { bg: '#DBEAFE', text: '#1D4ED8' };
    case 'faculty':
      return { bg: '#FEF3C7', text: '#92400E' };
    case 'alumni':
      return { bg: '#D1FAE5', text: '#065F46' };
    case 'club':
    case 'organization':
      return { bg: '#EDE9FE', text: '#5B21B6' };
    default:
      return { bg: '#F1F5F9', text: '#475569' };
  }
}

export default { light, dark };
