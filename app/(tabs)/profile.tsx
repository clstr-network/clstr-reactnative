import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, useColorScheme, Platform, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useThemeColors, getRoleBadgeColor } from '@/constants/colors';
import { Avatar } from '@/components/Avatar';
import { RoleBadge } from '@/components/RoleBadge';
import { useAuth } from '@/lib/auth-context';
import { resetAllData } from '@/lib/storage';

export default function ProfileScreen() {
  const colors = useThemeColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const { user, refresh } = useAuth();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Profile not found</Text>
        </View>
      </View>
    );
  }

  const badgeColor = getRoleBadgeColor(user.role, colors);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out? This will reset all data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await resetAllData();
          await refresh();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  const MENU_ITEMS = [
    { icon: 'person-outline' as const, label: 'Edit Profile', color: colors.accent, onPress: () => {} },
    { icon: 'bookmark-outline' as const, label: 'Saved Posts', color: colors.warning, onPress: () => {} },
    { icon: 'settings-outline' as const, label: 'Settings', color: colors.textSecondary, onPress: () => router.push('/settings') },
    { icon: 'help-circle-outline' as const, label: 'Help & Support', color: colors.textSecondary, onPress: () => {} },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.headerBg, { backgroundColor: badgeColor + '15', paddingTop: insets.top + webTopInset }]}>
        <View style={styles.profileSection}>
          <Avatar uri={user.avatarUrl} name={user.name} size={80} showBorder />
          <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
          <Text style={[styles.username, { color: colors.textSecondary }]}>@{user.username}</Text>
          <RoleBadge role={user.role} size="medium" />
          {!!user.bio && <Text style={[styles.bio, { color: colors.textSecondary }]}>{user.bio}</Text>}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.text }]}>{user.connectionsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Connections</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.text }]}>{user.postsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.text }]}>{user.department}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Department</Text>
          </View>
        </View>
      </View>

      <View style={styles.menuSection}>
        {MENU_ITEMS.map((item) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [
              styles.menuItem,
              { backgroundColor: pressed ? colors.surfaceElevated : colors.surface, borderColor: colors.border },
            ]}
            onPress={() => { Haptics.selectionAsync(); item.onPress?.(); }}
          >
            <View style={[styles.menuIconBg, { backgroundColor: item.color + '15' }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
        ))}

        <Pressable
          style={({ pressed }) => [
            styles.menuItem,
            styles.logoutItem,
            { backgroundColor: pressed ? colors.danger + '10' : 'transparent', borderColor: colors.border },
          ]}
          onPress={handleLogout}
        >
          <View style={[styles.menuIconBg, { backgroundColor: colors.danger + '15' }]}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          </View>
          <Text style={[styles.menuLabel, { color: colors.danger }]}>Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBg: { paddingBottom: 24 },
  profileSection: { alignItems: 'center', paddingTop: 24, gap: 6 },
  name: { fontSize: 24, fontWeight: '800', marginTop: 8 },
  username: { fontSize: 15 },
  bio: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, marginTop: 4, lineHeight: 20 },
  statsRow: { flexDirection: 'row', marginTop: 20, marginHorizontal: 16, borderRadius: 14, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, marginVertical: 10 },
  menuSection: { paddingHorizontal: 16, paddingTop: 20, gap: 8 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14,
    borderWidth: 1, gap: 12,
  },
  menuIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  logoutItem: { marginTop: 12, borderWidth: 0 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16 },
});
