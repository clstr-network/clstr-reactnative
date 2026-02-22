import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors, { surfaceTiers, badgeVariants } from '@/constants/colors';
import { Avatar } from './Avatar';
import type { User } from '@/lib/mock-data';

interface UserCardProps {
  user: User;
  onPress?: () => void;
  onConnect?: () => void;
}

export function UserCard({ user, onPress, onConnect }: UserCardProps) {
  const c = Colors.colors;
  const badge = badgeVariants[user.userType.toLowerCase() as keyof typeof badgeVariants] || badgeVariants.student;

  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConnect?.();
  };

  const getButtonConfig = () => {
    switch (user.connectionStatus) {
      case 'pending': return { label: 'Cancel Request', color: c.primary };
      case 'connected': return { label: 'Connected', color: c.success };
      default: return { label: 'Connect', color: c.primary };
    }
  };

  const btn = getButtonConfig();

  return (
    <Pressable style={[styles.card, surfaceTiers.tier2]} onPress={onPress}>
      <View style={styles.top}>
        <Avatar name={user.name} size={48} />
        <View style={styles.info}>
          <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{user.name}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>{user.userType}</Text>
            </View>
            <Text style={[styles.dept, { color: c.textTertiary }]} numberOfLines={1}>
              {user.department}
            </Text>
          </View>
        </View>
      </View>
      {user.bio ? (
        <Text style={[styles.bio, { color: c.textSecondary }]} numberOfLines={2}>
          {user.bio}
        </Text>
      ) : null}
      <Pressable style={[styles.actionBtn, { borderColor: btn.color }]} onPress={handleAction}>
        <Text style={[styles.actionText, { color: btn.color }]}>{btn.label}</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
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
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
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
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
  },
  dept: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    flex: 1,
  },
  bio: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  actionBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  actionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
});
