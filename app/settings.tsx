/**
 * Settings Screen — Phase 8.3 Enhanced
 *
 * Features:
 *   - Theme toggle (light/dark/system) via user_settings
 *   - Notification preferences (email, push, messages, connections)
 *   - Privacy settings (profile visibility)
 *   - Account deletion (deactivateOwnAccount)
 *   - About / Help / Legal links
 *   - Sign out
 *   - Saved items navigation
 */

import React, { useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert, Switch, Linking,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { useAuth } from '@/lib/auth-context';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { getUserSettings, updateUserSettings } from '@/lib/api/settings';
import type { UserSettings, UserSettingsUpdate, ThemeMode, ProfileVisibility } from '@/lib/api/settings';
import { deactivateOwnAccount } from '@/lib/api/account';
import { QUERY_KEYS } from '@/lib/query-keys';

// ─── Types ───────────────────────────────────────────────────

interface SettingItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  destructive?: boolean;
  rightElement?: React.ReactNode;
  subtitle?: string;
}

// ─── Theme option labels ─────────────────────────────────────

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

const VISIBILITY_OPTIONS: { value: ProfileVisibility; label: string }[] = [
  { value: 'public', label: 'Public' },
  { value: 'connections', label: 'Connections only' },
  { value: 'private', label: 'Private' },
];

// ─── Screen ──────────────────────────────────────────────────

export default function SettingsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { identity } = useIdentityContext();
  const userId = identity?.user_id ?? '';
  const queryClient = useQueryClient();

  // ── Fetch user settings ──
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: QUERY_KEYS.userSettings(userId),
    queryFn: () => getUserSettings(userId),
    enabled: !!userId,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  // ── Update settings mutation ──
  const updateMutation = useMutation({
    mutationFn: (updates: UserSettingsUpdate) => updateUserSettings(userId, updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.userSettings(userId) });
      const previous = queryClient.getQueryData<UserSettings>(QUERY_KEYS.userSettings(userId));
      if (previous) {
        queryClient.setQueryData(QUERY_KEYS.userSettings(userId), { ...previous, ...updates });
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(QUERY_KEYS.userSettings(userId), ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userSettings(userId) });
    },
  });

  // ── Toggle helpers ──
  const toggleSetting = useCallback(
    (key: keyof UserSettingsUpdate) => {
      if (!settings) return;
      const currentVal = settings[key as keyof UserSettings];
      if (typeof currentVal === 'boolean') {
        updateMutation.mutate({ [key]: !currentVal });
      }
    },
    [settings, updateMutation],
  );

  const setTheme = useCallback(
    (theme: ThemeMode) => {
      Haptics.selectionAsync();
      updateMutation.mutate({ theme_mode: theme });
    },
    [updateMutation],
  );

  const setVisibility = useCallback(
    (visibility: ProfileVisibility) => {
      Haptics.selectionAsync();
      updateMutation.mutate({ profile_visibility: visibility });
    },
    [updateMutation],
  );

  // ── Sign out ──
  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }, [signOut]);

  // ── Delete account ──
  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This will permanently deactivate your account and remove your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Are you absolutely sure? All your posts, connections, and messages will be lost.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deactivateOwnAccount();
                      await signOut();
                      router.replace('/(auth)/login');
                    } catch (err) {
                      Alert.alert('Error', 'Failed to delete account. Please try again later.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [signOut]);

  // ── Switch component builder ──
  const renderSwitch = useCallback(
    (key: keyof UserSettingsUpdate) => (
      <Switch
        value={settings?.[key as keyof UserSettings] as boolean ?? false}
        onValueChange={() => toggleSetting(key)}
        trackColor={{ false: colors.muted, true: colors.primary }}
        thumbColor="#fff"
        disabled={settingsLoading}
      />
    ),
    [settings, settingsLoading, colors, toggleSetting],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 8),
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      {settingsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ── Appearance ── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Appearance</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.themeRow}>
                {THEME_OPTIONS.map((opt) => {
                  const isSelected = (settings?.theme_mode ?? 'system') === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setTheme(opt.value)}
                      style={[
                        styles.themeOption,
                        {
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={18}
                        color={isSelected ? '#fff' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.themeLabel,
                          { color: isSelected ? '#fff' : colors.textSecondary },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ── Notifications ── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Notifications</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {([
                { key: 'email_notifications' as const, label: 'Email Notifications', icon: 'mail-outline' as const },
                { key: 'push_notifications' as const, label: 'Push Notifications', icon: 'notifications-outline' as const },
                { key: 'message_notifications' as const, label: 'Message Notifications', icon: 'chatbubble-outline' as const },
                { key: 'connection_notifications' as const, label: 'Connection Notifications', icon: 'people-outline' as const },
              ]).map((item, idx, arr) => (
                <View
                  key={item.key}
                  style={[
                    styles.settingRow,
                    idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
                  <Text style={[styles.settingLabel, { color: colors.text }]}>{item.label}</Text>
                  {renderSwitch(item.key)}
                </View>
              ))}
            </View>
          </View>

          {/* ── Privacy ── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Privacy</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.privacyLabel, { color: colors.text }]}>Profile Visibility</Text>
              <View style={styles.visibilityRow}>
                {VISIBILITY_OPTIONS.map((opt) => {
                  const isSelected = (settings?.profile_visibility ?? 'public') === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setVisibility(opt.value)}
                      style={[
                        styles.visibilityOption,
                        {
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.visibilityLabel,
                          { color: isSelected ? '#fff' : colors.textSecondary },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ── Account ── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Account</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {([
                {
                  icon: 'bookmark-outline' as const,
                  label: 'Saved Items',
                  onPress: () => router.push('/saved'),
                },
                {
                  icon: 'search-outline' as const,
                  label: 'Search',
                  onPress: () => router.push('/search'),
                },
              ] as SettingItem[]).map((item, idx) => (
                <Pressable
                  key={item.label}
                  onPress={() => {
                    Haptics.selectionAsync();
                    item.onPress?.();
                  }}
                  style={({ pressed }) => [
                    styles.settingRow,
                    pressed && { backgroundColor: colors.surfaceHover },
                    idx < 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
                  <Text style={[styles.settingLabel, { color: colors.text }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </Pressable>
              ))}
            </View>
          </View>

          {/* ── Support ── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Support</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {([
                {
                  icon: 'help-circle-outline' as const,
                  label: 'Help Center',
                  onPress: () => Linking.openURL('https://clstr.network/help'),
                },
                {
                  icon: 'chatbubble-ellipses-outline' as const,
                  label: 'Send Feedback',
                  onPress: () => Linking.openURL('mailto:support@clstr.network?subject=App%20Feedback'),
                },
                {
                  icon: 'document-text-outline' as const,
                  label: 'Terms of Service',
                  onPress: () => Linking.openURL('https://clstr.network/terms'),
                },
                {
                  icon: 'shield-checkmark-outline' as const,
                  label: 'Privacy Policy',
                  onPress: () => Linking.openURL('https://clstr.network/privacy'),
                },
              ] as SettingItem[]).map((item, idx, arr) => (
                <Pressable
                  key={item.label}
                  onPress={() => {
                    Haptics.selectionAsync();
                    item.onPress?.();
                  }}
                  style={({ pressed }) => [
                    styles.settingRow,
                    pressed && { backgroundColor: colors.surfaceHover },
                    idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
                  <Text style={[styles.settingLabel, { color: colors.text }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </Pressable>
              ))}
            </View>
          </View>

          {/* ── Danger Zone ── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Danger Zone</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); handleSignOut(); }}
                style={({ pressed }) => [
                  styles.settingRow,
                  pressed && { backgroundColor: colors.surfaceHover },
                  { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <Ionicons name="log-out-outline" size={20} color={colors.warning} />
                <Text style={[styles.settingLabel, { color: colors.warning }]}>Sign Out</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); handleDeleteAccount(); }}
                style={({ pressed }) => [
                  styles.settingRow,
                  pressed && { backgroundColor: colors.surfaceHover },
                ]}
              >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                <Text style={[styles.settingLabel, { color: colors.danger }]}>Delete Account</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>
            </View>
          </View>

          <Text style={[styles.version, { color: colors.textTertiary }]}>clstr v1.0.0</Text>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { paddingBottom: 40 },
  section: { paddingTop: 20, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 4,
    fontFamily: fontFamily.bold,
  },
  sectionCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  settingLabel: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
  },
  themeRow: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  themeLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
  },
  privacyLabel: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.medium,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  visibilityRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: 12,
    gap: 8,
  },
  visibilityOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  visibilityLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
  },
  version: {
    textAlign: 'center',
    fontSize: fontSize.sm,
    marginTop: 24,
    fontFamily: fontFamily.regular,
  },
});
