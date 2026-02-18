/**
 * UserBadge — cross-platform
 *
 * Specialised badge for user roles/status (student, alumni, admin, mentor).
 */
import React from 'react';
import { StyleSheet, View as RNView, type ViewStyle, type StyleProp } from 'react-native';
import { tokens } from '../../design/tokens';
import { useTheme } from '../../design/useTheme';
import { Text } from './primitives/Text';

type BadgeRole = 'student' | 'alumni' | 'admin' | 'mentor' | 'club-lead';

const roleColors: Record<BadgeRole, { bg: string; fg: string }> = {
  student: { bg: 'rgba(59,130,246,0.15)', fg: '#3b82f6' },
  alumni: { bg: 'rgba(168,85,247,0.15)', fg: '#a855f7' },
  admin: { bg: 'rgba(239,68,68,0.15)', fg: '#ef4444' },
  mentor: { bg: 'rgba(34,197,94,0.15)', fg: '#22c55e' },
  'club-lead': { bg: 'rgba(234,179,8,0.15)', fg: '#eab308' },
};

export interface UserBadgeProps {
  role: BadgeRole;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function UserBadge({ role, label, style }: UserBadgeProps) {
  const palette = roleColors[role] ?? roleColors.student;
  const displayLabel = label ?? role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <RNView style={[styles.badge, { backgroundColor: palette.bg }, style]}>
      <Text size="xs" weight="semibold" style={{ color: palette.fg }}>
        {displayLabel}
      </Text>
    </RNView>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
    alignSelf: 'flex-start',
  },
});
