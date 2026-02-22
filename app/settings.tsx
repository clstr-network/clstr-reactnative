import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, useColorScheme, Platform, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { resetAllData } from '@/lib/storage';
import { useAuth } from '@/lib/auth-context';

interface SettingItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  onPress: () => void;
  destructive?: boolean;
}

export default function SettingsScreen() {
  const colors = useThemeColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const { refresh } = useAuth();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data',
      'This will remove all your data including posts, connections, and messages. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetAllData();
            await refresh();
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  const sections: { title: string; items: SettingItem[] }[] = [
    {
      title: 'Account',
      items: [
        { icon: 'person-outline', label: 'Edit Profile', onPress: () => {} },
        { icon: 'lock-closed-outline', label: 'Privacy', onPress: () => {} },
        { icon: 'notifications-outline', label: 'Notification Preferences', onPress: () => {} },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'color-palette-outline', label: 'Appearance', onPress: () => {} },
        { icon: 'language-outline', label: 'Language', onPress: () => {} },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center', onPress: () => {} },
        { icon: 'chatbubble-ellipses-outline', label: 'Send Feedback', onPress: () => {} },
        { icon: 'document-text-outline', label: 'Terms of Service', onPress: () => {} },
        { icon: 'shield-checkmark-outline', label: 'Privacy Policy', onPress: () => {} },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        { icon: 'trash-outline', label: 'Reset All Data', onPress: handleResetData, destructive: true },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{section.title}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {section.items.map((item, idx) => (
                <Pressable
                  key={item.label}
                  onPress={() => { Haptics.selectionAsync(); item.onPress(); }}
                  style={({ pressed }) => [
                    styles.settingRow,
                    pressed && { backgroundColor: colors.surfaceElevated },
                    idx < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <Ionicons name={item.icon} size={20} color={item.destructive ? colors.danger : colors.textSecondary} />
                  <Text style={[styles.settingLabel, { color: item.destructive ? colors.danger : colors.text }]}>
                    {item.label}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
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
    paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  scrollContent: { paddingBottom: 40 },
  section: { paddingTop: 20, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, paddingLeft: 4, fontFamily: 'Inter_700Bold' },
  sectionCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  settingLabel: { flex: 1, fontSize: 15, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  version: { textAlign: 'center', fontSize: 13, marginTop: 24, fontFamily: 'Inter_400Regular' },
});
