import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, useColorScheme, Platform, Alert, Switch
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { resetAllData } from '@/lib/storage';

type MenuSection = {
  title: string;
  items: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    color: string;
    type: 'nav' | 'toggle' | 'danger';
    value?: boolean;
    onPress?: () => void;
  }[];
};

export default function SettingsScreen() {
  const colors = useThemeColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const { user, refresh } = useAuth();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out? This will reset all data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          await resetAllData();
          await refresh();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'This will permanently delete all your data. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await resetAllData();
          await refresh();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  const sections: MenuSection[] = [
    {
      title: 'Account',
      items: [
        { icon: 'person-outline', label: 'Edit Profile', color: colors.accent, type: 'nav' },
        { icon: 'mail-outline', label: 'Email & Username', color: colors.tint, type: 'nav' },
        { icon: 'key-outline', label: 'Password & Security', color: colors.warning, type: 'nav' },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'notifications-outline', label: 'Push Notifications', color: colors.danger, type: 'toggle', value: true },
        { icon: 'moon-outline', label: 'Dark Mode', color: colors.facultyBadge, type: 'toggle', value: true },
        { icon: 'language-outline', label: 'Language', color: colors.accent, type: 'nav' },
      ],
    },
    {
      title: 'Privacy',
      items: [
        { icon: 'shield-checkmark-outline', label: 'Privacy Settings', color: colors.success, type: 'nav' },
        { icon: 'eye-off-outline', label: 'Blocked Users', color: colors.textSecondary, type: 'nav' },
        { icon: 'document-text-outline', label: 'Terms of Service', color: colors.textSecondary, type: 'nav' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center', color: colors.accent, type: 'nav' },
        { icon: 'chatbubble-ellipses-outline', label: 'Contact Us', color: colors.tint, type: 'nav' },
        { icon: 'star-outline', label: 'Rate the App', color: colors.warning, type: 'nav' },
      ],
    },
    {
      title: '',
      items: [
        { icon: 'log-out-outline', label: 'Sign Out', color: colors.danger, type: 'danger', onPress: handleLogout },
        { icon: 'trash-outline', label: 'Delete Account', color: colors.danger, type: 'danger', onPress: handleDeleteAccount },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 + webBottomInset }} showsVerticalScrollIndicator={false}>
        {sections.map((section, si) => (
          <View key={si} style={styles.section}>
            {!!section.title && (
              <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{section.title.toUpperCase()}</Text>
            )}
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {section.items.map((item, ii) => (
                <Pressable
                  key={item.label}
                  onPress={() => {
                    Haptics.selectionAsync();
                    item.onPress?.();
                  }}
                  style={({ pressed }) => [
                    styles.menuItem,
                    ii < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    pressed && item.type !== 'toggle' && { backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  <View style={[styles.menuIconBg, { backgroundColor: item.color + '15' }]}>
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <Text style={[
                    styles.menuLabel,
                    { color: item.type === 'danger' ? colors.danger : colors.text },
                  ]}>{item.label}</Text>
                  {item.type === 'toggle' ? (
                    <Switch
                      value={item.value}
                      trackColor={{ false: colors.border, true: colors.tint }}
                      thumbColor="#fff"
                    />
                  ) : item.type === 'nav' ? (
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Text style={[styles.version, { color: colors.textTertiary }]}>clstr v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 20, marginBottom: 8 },
  sectionCard: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuIconBg: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  version: { textAlign: 'center', fontSize: 12, marginTop: 24 },
});
