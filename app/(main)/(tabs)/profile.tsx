import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/auth-context';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { colors } from '@/constants/colors';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  if (!user) return null;

  const stats = [
    { label: 'Posts', value: user.postCount || 12 },
    { label: 'Connections', value: user.connectionCount || 47 },
    { label: 'Views', value: 234 },
  ];

  const menuItems = [
    { icon: 'bookmark-outline' as const, label: 'Saved Items', route: '/(main)/settings' },
    { icon: 'briefcase-outline' as const, label: 'Mentorship', route: '/(main)/settings' },
    { icon: 'grid-outline' as const, label: 'Projects', route: '/(main)/settings' },
    { icon: 'people-outline' as const, label: 'Clubs', route: '/(main)/settings' },
    { icon: 'leaf-outline' as const, label: 'EcoCampus', route: '/(main)/settings' },
    { icon: 'help-circle-outline' as const, label: 'Help Center', route: '/(main)/settings' },
    { icon: 'settings-outline' as const, label: 'Settings', route: '/(main)/settings' },
  ];

  return (
    <View style={styles.screen}>
      <View style={[styles.headerBar, { paddingTop: insets.top + webTopInset }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable onPress={() => router.push('/(main)/settings')} style={styles.headerIconButton}>
          <Feather name="edit-2" size={18} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 + (Platform.OS === 'web' ? 34 : 0) }]} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <Avatar name={user.fullName} size={80} />
          <Text style={styles.profileName}>{user.fullName}</Text>
          <View style={styles.roleRow}>
            <Badge text={user.role === 'alumni' ? 'Alumni' : 'Student'} variant="primary" />
            <Text style={styles.collegeName}>{user.collegeName}</Text>
          </View>
          <Text style={styles.department}>{user.department} {user.graduationYear ? `\u00B7 ${user.graduationYear}` : ''}</Text>
          {!!user.bio && <Text style={styles.bio}>{user.bio}</Text>}
        </View>

        <View style={styles.statsRow}>
          {stats.map((stat, i) => (
            <View key={stat.label} style={[styles.statItem, i < stats.length - 1 && styles.statBorder]}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: colors.surfaceElevated }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(item.route as any);
              }}
            >
              <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </Pressable>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.8 }]}
          onPress={async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await logout();
            router.replace('/');
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 16,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
  },
  profileName: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginTop: 14,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  collegeName: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
  },
  department: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textTertiary,
    marginTop: 4,
  },
  bio: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statBorder: {
    borderRightWidth: 1,
    borderRightColor: colors.cardBorder,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textTertiary,
    marginTop: 2,
  },
  menuSection: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  logoutText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.error,
  },
});
