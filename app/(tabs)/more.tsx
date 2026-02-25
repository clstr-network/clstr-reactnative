import React from 'react';
import { ScrollView, StyleSheet, View, Text, Platform, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useThemeColors } from '@/constants/colors';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/lib/auth-context';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { getProfile } from '@/lib/api';
import { QUERY_KEYS } from '@/lib/query-keys';

import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

interface MenuItem {
  icon: string;
  label: string;
  color?: string;
  route?: string;
  action?: () => void;
}

/**
 * Phase 5 — Role-filtered menu sections.
 * Items are filtered by the feature permission flags so each role
 * only sees features they can actually access.
 */
function buildMenuSections(
  handleSignOut: () => void,
  permissions: {
    canSaveBookmarks: boolean;
    canBrowseMentors: boolean;
    canViewProjects: boolean;
    canBrowseEcoCampus: boolean;
  },
): { title: string; items: MenuItem[] }[] {
  const accountItems: MenuItem[] = [
    { icon: 'person-outline', label: 'My Profile', route: '/(tabs)/profile' },
  ];
  if (permissions.canSaveBookmarks) {
    accountItems.push({ icon: 'bookmark-outline', label: 'Saved Posts', route: '/saved' });
  }
  accountItems.push({ icon: 'notifications-outline', label: 'Notifications', route: '/(tabs)/notifications' });

  const featureItems: MenuItem[] = [];
  if (permissions.canBrowseMentors) {
    featureItems.push({ icon: 'people-outline', label: 'Mentorship', route: '/mentorship' });
  }
  if (permissions.canViewProjects) {
    featureItems.push({ icon: 'briefcase-outline', label: 'CollabHub', route: '/projects' });
  }
  if (permissions.canBrowseEcoCampus) {
    featureItems.push({ icon: 'leaf-outline', label: 'EcoCampus', route: '/ecocampus' });
  }
  // AI Chatbot & Portfolio are available to all roles — no gating needed
  featureItems.push({ icon: 'chatbox-outline', label: 'AI Chatbot', route: '/ai-chat' });
  featureItems.push({ icon: 'grid-outline', label: 'Portfolio', route: '/portfolio' });

  const sections: { title: string; items: MenuItem[] }[] = [
    { title: 'Account', items: accountItems },
  ];
  if (featureItems.length > 0) {
    sections.push({ title: 'Features', items: featureItems });
  }
  sections.push({
    title: 'Settings',
    items: [
      { icon: 'settings-outline', label: 'Settings', route: '/settings' },
      { icon: 'help-circle-outline', label: 'Help & Support', route: '/settings' },
      { icon: 'log-out-outline', label: 'Sign Out', color: '#EF4444', action: handleSignOut },
    ],
  });

  return sections;
}

export default function MoreScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const { user, signOut } = useAuth();
  const {
    canSaveBookmarks,
    canBrowseMentors,
    canViewProjects,
    canBrowseEcoCampus,
  } = useFeatureAccess();

  const { data: profile, isLoading } = useQuery({
    queryKey: QUERY_KEYS.profile(user?.id ?? ''),
    queryFn: () => getProfile(user!.id),
    enabled: !!user?.id,
  });

  const displayName = profile?.full_name ?? user?.email?.split('@')[0] ?? 'User';
  const displayRole = profile?.headline ?? profile?.role ?? '';
  const displayType = profile?.user_type ?? profile?.role ?? 'Student';
  const c = colors;

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  };

  const menuSections = buildMenuSections(handleSignOut, {
    canSaveBookmarks,
    canBrowseMentors,
    canViewProjects,
    canBrowseEcoCampus,
  });

  const handleMenuPress = (item: MenuItem) => {
    Haptics.selectionAsync();
    if (item.action) {
      item.action();
    } else if (item.route) {
      router.push(item.route as any);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.topBar, { paddingTop: (Platform.OS === 'web' ? webTopInset : insets.top) + 4 }]}>
        <Pressable style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color={c.text} />
        </Pressable>
        <View style={[styles.searchBarTop, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
          <Ionicons name="search-outline" size={16} color={c.textTertiary} />
          <Text style={[styles.searchPlaceholder, { color: c.textTertiary }]}>Search...</Text>
        </View>
        <Avatar uri={profile?.avatar_url} name={displayName} size={32} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
        <Pressable
          style={[styles.profileCard, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Avatar uri={profile?.avatar_url} name={displayName} size={56} />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: c.text }]}>{displayName}</Text>
            <Text style={[styles.profileRole, { color: c.textSecondary }]}>{displayRole}</Text>
            <View style={[styles.badge, { backgroundColor: c.tint + '20', borderColor: c.tint + '40' }]}>
              <Text style={[styles.badgeText, { color: c.tint }]}>{displayType}</Text>
            </View>
          </View>
        </Pressable>

        {menuSections.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>{section.title}</Text>
            <View style={[styles.sectionCard, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
              {section.items.map((item, i) => (
                <Pressable
                  key={item.label}
                  style={({ pressed }) => [
                    styles.menuItem,
                    i < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border },
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => handleMenuPress(item)}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name={item.icon as any} size={20} color={item.color || c.textSecondary} />
                    <Text style={[styles.menuItemText, { color: item.color || c.text }]}>{item.label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 10,
  },
  menuBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarTop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    gap: 6,
  },
  searchPlaceholder: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  profileInfo: {
    marginLeft: 14,
    flex: 1,
  },
  profileName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
  },
  profileRole: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    marginTop: 6,
  },
  badgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginBottom: 6,
  },
  sectionCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  scroll: {},
});
