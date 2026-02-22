import React from 'react';
import { ScrollView, StyleSheet, View, Text, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { Avatar } from '@/components/Avatar';
import { CURRENT_USER } from '@/lib/mock-data';

interface MenuItem {
  icon: string;
  label: string;
  color?: string;
}

const menuSections: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Account',
    items: [
      { icon: 'person-outline', label: 'My Profile' },
      { icon: 'bookmark-outline', label: 'Saved Posts' },
      { icon: 'notifications-outline', label: 'Notifications' },
    ],
  },
  {
    title: 'Features',
    items: [
      { icon: 'people-outline', label: 'Mentorship' },
      { icon: 'briefcase-outline', label: 'CollabHub' },
      { icon: 'leaf-outline', label: 'EcoCampus' },
      { icon: 'chatbox-outline', label: 'AI Chatbot' },
      { icon: 'grid-outline', label: 'Portfolio' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { icon: 'settings-outline', label: 'Settings' },
      { icon: 'help-circle-outline', label: 'Help & Support' },
      { icon: 'log-out-outline', label: 'Sign Out', color: '#EF4444' },
    ],
  },
];

export default function MoreScreen() {
  const c = Colors.colors;
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.topBar, { paddingTop: (Platform.OS === 'web' ? webTopInset : insets.top) + 4 }]}>
        <Pressable style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color={c.text} />
        </Pressable>
        <View style={[styles.searchBarTop, { backgroundColor: c.backgroundTertiary, borderColor: c.border }]}>
          <Ionicons name="search-outline" size={16} color={c.textTertiary} />
          <Text style={[styles.searchPlaceholder, { color: c.textTertiary }]}>Search...</Text>
        </View>
        <Avatar name={CURRENT_USER.name} size={32} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Avatar name={CURRENT_USER.name} size={56} />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: c.text }]}>{CURRENT_USER.name}</Text>
            <Text style={[styles.profileRole, { color: c.textSecondary }]}>{CURRENT_USER.role}</Text>
            <View style={[styles.badge, { backgroundColor: c.primary + '20', borderColor: c.primary + '40' }]}>
              <Text style={[styles.badgeText, { color: c.primary }]}>{CURRENT_USER.userType}</Text>
            </View>
          </View>
        </View>

        {menuSections.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>{section.title}</Text>
            <View style={[styles.sectionCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              {section.items.map((item, i) => (
                <Pressable
                  key={item.label}
                  style={[
                    styles.menuItem,
                    i < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border },
                  ]}
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
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileInfo: {
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
    borderRadius: 14,
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
