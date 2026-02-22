import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemeColors, useSurfaceTiers, getRoleBadgeColor, radius } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { Avatar } from './Avatar';

interface UserCardUser {
  id?: number | string;
  full_name?: string;
  name?: string;
  avatar_url?: string | null;
  role?: string;
  userType?: string;
  department?: string | null;
  headline?: string | null;
  bio?: string | null;
  connectionStatus?: 'pending' | 'connected' | 'none' | string;
}

interface UserCardProps {
  user: UserCardUser;
  onPress?: () => void;
  onConnect?: () => void;
}

function UserCard({ user, onPress, onConnect }: UserCardProps) {
  const colors = useThemeColors();
  const tiers = useSurfaceTiers();
  const role = user.role ?? user.userType ?? '';
  const badge = getRoleBadgeColor(role);
  const displayName = user.full_name ?? user.name ?? 'Unknown';

  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConnect?.();
  };

  const getButtonConfig = () => {
    switch (user.connectionStatus) {
      case 'pending': return { label: 'Cancel Request', color: colors.primary };
      case 'connected': return { label: 'Connected', color: colors.success };
      default: return { label: 'Connect', color: colors.primary };
    }
  };

  const btn = getButtonConfig();

  return (
    <Pressable style={[styles.card, tiers.tier2]} onPress={onPress}>
      <View style={styles.top}>
        <Avatar name={displayName} uri={user.avatar_url} size="lg" />
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{displayName}</Text>
          <View style={styles.badgeRow}>
            {role ? (
              <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                <Text style={[styles.badgeText, { color: badge.text }]}>{role}</Text>
              </View>
            ) : null}
            {user.department ? (
              <Text style={[styles.dept, { color: colors.textTertiary }]} numberOfLines={1}>
                {user.department}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
      {(user.bio || user.headline) ? (
        <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={2}>
          {user.bio ?? user.headline}
        </Text>
      ) : null}
      <Pressable style={[styles.actionBtn, { borderColor: btn.color }]} onPress={handleAction}>
        <Text style={[styles.actionText, { color: btn.color }]}>{btn.label}</Text>
      </Pressable>
    </Pressable>
  );
}

export { UserCard };
export default React.memo(UserCard);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 14,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 6,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
  },
  dept: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    flex: 1,
  },
  bio: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: 17,
    marginTop: 10,
  },
  actionBtn: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  actionText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
});
