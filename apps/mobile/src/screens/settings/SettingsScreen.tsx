/**
 * SettingsScreen — User preferences (theme, notification toggles, account actions).
 */
import React, { useCallback, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@clstr/shared/design/useTheme';
import type { ThemeMode } from '@clstr/shared/design/theme';
import { tokens } from '@clstr/shared/design/tokens';
import { H3 } from '@clstr/shared/components/ui/Typography';
import { View } from '@clstr/shared/components/ui/primitives/View';
import { Text } from '@clstr/shared/components/ui/primitives/Text';
import { Pressable } from '@clstr/shared/components/ui/primitives/Pressable';
import { useAuth } from '@clstr/shared/hooks/useAuth';
import { supabase } from '@clstr/shared/integrations/supabase/client';

import { useSettings, useUpdateSettings } from '../../hooks/useSettings';
import { SettingsRow } from '../../components/settings/SettingsRow';

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
];

export function SettingsScreen() {
  const navigation = useNavigation();
  const { colors, themeMode, setThemeMode } = useTheme();
  const { user, signOut } = useAuth();
  const userId = user?.id;

  const { settings } = useSettings(userId);
  const updateSettings = useUpdateSettings(userId);

  // ── Theme ──
  const handleThemeChange = useCallback(
    (mode: ThemeMode) => {
      setThemeMode(mode);
    },
    [setThemeMode],
  );

  // ── Notification toggles (persisted in user_settings) ──
  const emailNotifications = settings?.email_notifications ?? true;
  const pushNotifications = settings?.push_notifications ?? true;

  const toggleEmail = useCallback(() => {
    updateSettings.mutate({ email_notifications: !emailNotifications });
  }, [emailNotifications, updateSettings]);

  const togglePush = useCallback(() => {
    updateSettings.mutate({ push_notifications: !pushNotifications });
  }, [pushNotifications, updateSettings]);

  // ── Account ──
  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // In production this should call a server-side function.
            // For now we sign out as a placeholder.
            await signOut();
          },
        },
      ],
    );
  }, [signOut]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.headerBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text size="lg">←</Text>
        </Pressable>
        <H3>Settings</H3>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Appearance ── */}
        <Text size="xs" weight="bold" style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          APPEARANCE
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          {THEME_OPTIONS.map((opt) => (
            <SettingsRow
              key={opt.value}
              label={opt.label}
              value={themeMode === opt.value}
              onValueChange={() => handleThemeChange(opt.value)}
            />
          ))}
        </View>

        {/* ── Notifications ── */}
        <Text size="xs" weight="bold" style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          NOTIFICATIONS
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <SettingsRow
            label="Email Notifications"
            value={emailNotifications}
            onValueChange={toggleEmail}
          />
          <SettingsRow
            label="Push Notifications"
            value={pushNotifications}
            onValueChange={togglePush}
          />
        </View>

        {/* ── Account ── */}
        <Text size="xs" weight="bold" style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          ACCOUNT
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <SettingsRow label="Sign Out" onPress={handleSignOut} />
          <SettingsRow
            label="Delete Account"
            onPress={handleDeleteAccount}
            labelStyle={{ color: colors.destructive }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  backBtn: {
    padding: tokens.spacing.xs,
  },
  scroll: {
    paddingBottom: tokens.spacing['2xl'],
  },
  sectionLabel: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xs,
  },
  section: {
    marginHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
  },
});
