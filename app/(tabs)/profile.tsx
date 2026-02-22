import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, useColorScheme, Platform, Alert, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useThemeColors, getRoleBadgeColor } from '@/constants/colors';
import { Avatar } from '@/components/Avatar';
import { RoleBadge } from '@/components/RoleBadge';
import { useAuth } from '@/lib/auth-context';
import { getProfileById, type UserProfile, calculateProfileCompletion, getMissingProfileFields, getConnectionCount } from '@/lib/api';
import { getUserPostsCount } from '@/lib/api/social';
import { QUERY_KEYS, MOBILE_QUERY_KEYS } from '@/lib/query-keys';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { useRolePermissions } from '@/lib/hooks/useRolePermissions';

export default function ProfileScreen() {
  const colors = useThemeColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  // Phase 4 — Role-based permissions
  const { canDoSkillAnalysis, canOfferMentorship, canToggleMentorStatus, isAlumni, isFaculty, isClubLead } = useRolePermissions();
  const { canBrowseJobs, canAccessSkillAnalysis, canBrowseEcoCampus, canSaveBookmarks } = useFeatureAccess();

  const { data: profile, isLoading } = useQuery({
    queryKey: QUERY_KEYS.profile(user?.id ?? ''),
    queryFn: () => getProfileById(user!.id),
    enabled: !!user?.id,
  });

  // F9 — Use dedicated DB count queries instead of profile.connections?.length
  const { data: connectionsCount = 0 } = useQuery({
    queryKey: MOBILE_QUERY_KEYS.connectionCount(user?.id ?? ''),
    queryFn: () => getConnectionCount(user!.id),
    enabled: !!user?.id,
  });

  const { data: postsCount = 0 } = useQuery({
    queryKey: MOBILE_QUERY_KEYS.userPostsCount(user?.id ?? ''),
    queryFn: () => getUserPostsCount(user!.id),
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Profile not found</Text>
        </View>
      </View>
    );
  }

  const badgeColor = getRoleBadgeColor(profile.role ?? 'Student', colors);
  // F9: connectionsCount and postsCount now come from dedicated useQuery hooks above
  const completionPct = calculateProfileCompletion(profile);
  const missingFields = getMissingProfileFields(profile);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  // Phase 4 — Role-specific menu items (F4: all wired with navigation)
  const MENU_ITEMS = [
    { icon: 'person-outline' as const, label: 'Edit Profile', color: colors.tint, onPress: () => router.push('/edit-profile' as any), visible: true },
    { icon: 'bookmark-outline' as const, label: 'Saved Posts', color: colors.warning, onPress: () => router.push('/saved'), visible: canSaveBookmarks },
    ...(canBrowseJobs ? [{ icon: 'briefcase-outline' as const, label: 'Jobs & Careers', color: colors.tint, onPress: () => router.push('/jobs'), visible: true }] : []),
    ...(canAccessSkillAnalysis ? [{ icon: 'analytics-outline' as const, label: 'Skill Analysis', color: colors.success, onPress: () => router.push('/skill-analysis'), visible: true }] : []),
    ...(canOfferMentorship ? [{ icon: 'people-outline' as const, label: 'Mentorship', color: colors.warning, onPress: () => router.push('/mentorship'), visible: true }] : []),
    ...(canBrowseEcoCampus ? [{ icon: 'storefront-outline' as const, label: 'EcoCampus', color: colors.tint, onPress: () => router.push('/ecocampus'), visible: true }] : []),
    { icon: 'settings-outline' as const, label: 'Settings', color: colors.textSecondary, onPress: () => router.push('/settings'), visible: true },
    { icon: 'help-circle-outline' as const, label: 'Help & Support', color: colors.textSecondary, onPress: () => router.push('/settings'), visible: true },
  ].filter(item => item.visible);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.headerBg, { backgroundColor: badgeColor + '15', paddingTop: insets.top + webTopInset }]}>
        {/* Phase 5 — Header actions: settings + notifications */}
        <View style={styles.headerBar}>
          <View style={{ width: 38 }} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push('/settings')} style={styles.headerIconBtn} hitSlop={8}>
              <Ionicons name="settings-outline" size={22} color={colors.text} />
            </Pressable>
            <Pressable onPress={() => router.push('/notifications')} style={styles.headerIconBtn} hitSlop={8}>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
            </Pressable>
          </View>
        </View>
        <View style={styles.profileSection}>
          <Avatar uri={profile.avatar_url} name={profile.full_name ?? 'User'} size={80} showBorder />
          <Text style={[styles.name, { color: colors.text }]}>{profile.full_name ?? 'User'}</Text>
          {profile.headline && (
            <Text style={[styles.username, { color: colors.textSecondary }]}>{profile.headline}</Text>
          )}
          {profile.role && <RoleBadge role={profile.role} size="medium" />}
          {!!profile.bio && <Text style={[styles.bio, { color: colors.textSecondary }]}>{profile.bio}</Text>}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.text }]}>{connectionsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Connections</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.text }]}>{postsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.text }]}>{profile.major ?? profile.university ?? '—'}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Department</Text>
          </View>
        </View>
      </View>

      {/* F5 — Profile Completion Banner */}
      {completionPct < 100 && (
        <Pressable
          onPress={() => router.push('/edit-profile' as any)}
          style={[styles.completionBanner, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '30' }]}
        >
          <View style={styles.completionRow}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
            <Text style={[styles.completionText, { color: colors.text }]}>
              Profile {completionPct}% complete
            </Text>
          </View>
          {missingFields.length > 0 && (
            <Text style={[styles.completionHint, { color: colors.textSecondary }]}>
              Add {missingFields.slice(0, 2).join(', ')} to stand out
            </Text>
          )}
          <View style={[styles.completionBar, { backgroundColor: colors.border }]}>
            <View style={[styles.completionFill, { width: `${completionPct}%`, backgroundColor: colors.warning }]} />
          </View>
        </Pressable>
      )}

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
            { backgroundColor: pressed ? colors.error + '10' : 'transparent', borderColor: colors.border },
          ]}
          onPress={handleLogout}
        >
          <View style={[styles.menuIconBg, { backgroundColor: colors.error + '15' }]}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
          </View>
          <Text style={[styles.menuLabel, { color: colors.error }]}>Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBg: { paddingBottom: 24 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerIconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  profileSection: { alignItems: 'center', paddingTop: 12, gap: 6 },
  name: { fontSize: 24, fontWeight: '800', marginTop: 8, fontFamily: 'Inter_800ExtraBold' },
  username: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  bio: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, marginTop: 4, lineHeight: 20, fontFamily: 'Inter_400Regular' },
  statsRow: { flexDirection: 'row', marginTop: 20, marginHorizontal: 16, borderRadius: 14, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statNum: { fontSize: 18, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  statLabel: { fontSize: 12, marginTop: 2, fontFamily: 'Inter_400Regular' },
  statDivider: { width: 1, marginVertical: 10 },
  menuSection: { paddingHorizontal: 16, paddingTop: 20, gap: 8 },
  completionBanner: {
    marginHorizontal: 16, marginTop: 16, padding: 14, borderRadius: 14, borderWidth: 1,
  },
  completionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  completionText: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  completionHint: { fontSize: 13, marginTop: 4, marginLeft: 28, fontFamily: 'Inter_400Regular' },
  completionBar: { height: 4, borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  completionFill: { height: '100%', borderRadius: 2 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14,
    borderWidth: 1, gap: 12,
  },
  menuIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  logoutItem: { marginTop: 12, borderWidth: 0 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16, fontFamily: 'Inter_400Regular' },
});
