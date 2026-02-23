/**
 * Settings Screen — Phase 6 Enriched
 *
 * Features:
 *   - Theme toggle (light/dark/system) via user_settings
 *   - Notification preferences (email, push, messages, connections)
 *   - Push notification test button
 *   - Privacy settings (profile visibility)
 *   - Email Transition UI (college → personal email)
 *   - Password reset flow
 *   - Account deletion with typed "DEACTIVATE" confirmation
 *   - About / Help / Legal links
 *   - Sign out
 *   - Saved items navigation
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert, Switch, Linking,
  ActivityIndicator, Modal, TextInput, KeyboardAvoidingView,
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
import { QUERY_KEYS } from '@/lib/query-keys';
import { useEmailTransition, RESEND_COOLDOWN_SECONDS } from '@/lib/hooks/useEmailTransition';
import { useDeactivateAccount } from '@/lib/hooks/useDeleteAccount';
import { usePushNotifications } from '@/lib/hooks/usePushNotifications';
import { supabase } from '@/lib/adapters/core-client';

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

  // ── Phase 6: New hooks ──
  const emailTransition = useEmailTransition();
  const deactivateMutation = useDeactivateAccount();
  const pushNotifications = usePushNotifications();

  // ── Phase 6: Local state for modals ──
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

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

  // ── Delete account — typed "DEACTIVATE" confirmation ──
  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirmation.trim().toUpperCase() !== 'DEACTIVATE') {
      Alert.alert('Error', 'Please type DEACTIVATE to confirm.');
      return;
    }
    try {
      await deactivateMutation.mutateAsync();
      setDeleteModalVisible(false);
      setDeleteConfirmation('');
      Alert.alert(
        'Account Deactivated',
        'Your account has been deactivated. Data will be permanently deleted in 15 days.',
      );
      await signOut();
      router.replace('/(auth)/login');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate account.';
      Alert.alert('Deactivation Failed', message);
    }
  }, [deleteConfirmation, deactivateMutation, signOut]);

  // ── Password reset handler ──
  const handleSendPasswordReset = useCallback(async () => {
    const isTransitioned = emailTransition.status === 'transitioned';
    const resetEmail = isTransitioned && emailTransition.personalEmail
      ? emailTransition.personalEmail
      : identity?.email;

    if (!resetEmail) {
      Alert.alert('No email', 'Your account does not have an email address on file.');
      return;
    }

    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'clstr://update-password',
      });
      if (error) throw error;
      Alert.alert('Reset Link Sent', 'Check your email for a password reset link.');
      setPasswordModalVisible(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email.';
      Alert.alert('Error', message);
    } finally {
      setIsSendingReset(false);
    }
  }, [emailTransition.status, emailTransition.personalEmail, identity?.email]);

  // ── Push notification test ──
  const handleTestPush = useCallback(async () => {
    if (!pushNotifications.expoPushToken) {
      Alert.alert('Not Registered', 'Push notifications are not set up yet.');
      return;
    }
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: pushNotifications.expoPushToken,
          title: 'Clstr Test',
          body: 'Push notifications are working!',
          sound: 'default',
        }),
      });
      Alert.alert('Sent', 'You should receive a test notification shortly.');
    } catch (err) {
      Alert.alert('Error', 'Failed to send test notification.');
    }
  }, [pushNotifications.expoPushToken]);

  // ── Email transition helpers ──
  const handleLinkEmail = useCallback(async () => {
    if (!emailInput.trim() || !emailInput.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    try {
      await emailTransition.linkPersonalEmail(emailInput.trim());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to link email.';
      Alert.alert('Error', message);
    }
  }, [emailInput, emailTransition]);

  const handleVerifyEmail = useCallback(async () => {
    if (verificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }
    try {
      await emailTransition.verifyPersonalEmail(verificationCode);
      if (!emailTransition.lastVerifyError) {
        setVerificationCode('');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed.';
      Alert.alert('Error', message);
    }
  }, [verificationCode, emailTransition]);

  const handleResendCode = useCallback(async () => {
    const email = emailTransition.personalEmail ?? emailInput.trim();
    if (!email) return;
    try {
      await emailTransition.resendVerificationCode(email);
    } catch (err) {
      Alert.alert('Error', 'Failed to resend verification code.');
    }
  }, [emailTransition, emailInput]);

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
              {/* Email Notifications */}
              <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Email Notifications</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textTertiary }]}>
                    Receive updates via email
                  </Text>
                </View>
                {renderSwitch('email_notifications')}
              </View>

              {/* Push Notifications */}
              <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Push Notifications</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textTertiary }]}>
                    {pushNotifications.error
                      ? pushNotifications.error
                      : pushNotifications.permissionGranted
                        ? 'Receiving push notifications'
                        : 'Tap the switch to enable'}
                  </Text>
                </View>
                <Switch
                  value={pushNotifications.permissionGranted && (settings?.push_notifications ?? true)}
                  onValueChange={async (enabled) => {
                    if (enabled && !pushNotifications.permissionGranted) {
                      await pushNotifications.requestPermission();
                    }
                    toggleSetting('push_notifications');
                  }}
                  trackColor={{ false: colors.muted, true: colors.primary }}
                  thumbColor="#fff"
                  disabled={pushNotifications.isRegistering}
                />
              </View>

              {/* Test Push Notification button */}
              {pushNotifications.permissionGranted && (settings?.push_notifications ?? true) && (
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); handleTestPush(); }}
                  style={({ pressed }) => [
                    styles.settingRow,
                    pressed && { backgroundColor: colors.surfaceHover },
                    { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <Ionicons name="send-outline" size={20} color={colors.primary} />
                  <Text style={[styles.settingLabel, { color: colors.primary }]}>
                    Send Test Notification
                  </Text>
                </Pressable>
              )}

              {/* Message Notifications */}
              <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Message Notifications</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textTertiary }]}>
                    Get notified when you receive messages
                  </Text>
                </View>
                {renderSwitch('message_notifications')}
              </View>

              {/* Connection Notifications */}
              <View style={styles.settingRow}>
                <Ionicons name="people-outline" size={20} color={colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Connection Requests</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textTertiary }]}>
                    Get notified about new connection requests
                  </Text>
                </View>
                {renderSwitch('connection_notifications')}
              </View>
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
              {/* Saved Items */}
              <Pressable
                onPress={() => { Haptics.selectionAsync(); router.push('/saved'); }}
                style={({ pressed }) => [
                  styles.settingRow,
                  pressed && { backgroundColor: colors.surfaceHover },
                  { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <Ionicons name="bookmark-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>Saved Items</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>

              {/* Search */}
              <Pressable
                onPress={() => { Haptics.selectionAsync(); router.push('/search'); }}
                style={({ pressed }) => [
                  styles.settingRow,
                  pressed && { backgroundColor: colors.surfaceHover },
                  { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>Search</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>

              {/* Password Reset */}
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setPasswordModalVisible(true); }}
                style={({ pressed }) => [
                  styles.settingRow,
                  pressed && { backgroundColor: colors.surfaceHover },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Change Password</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textTertiary }]}>
                    Send a reset link to your email
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>
            </View>
          </View>

          {/* ── Email Transition ── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Email Management</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {/* Current college email */}
              <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <Ionicons name="school-outline" size={20} color={colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingSubtitle, { color: colors.textTertiary }]}>College Email</Text>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    {emailTransition.collegeEmail ?? identity?.email ?? 'Not set'}
                  </Text>
                </View>
              </View>

              {/* Current status */}
              {emailTransition.status === 'none' && (
                <View style={{ padding: 14 }}>
                  <Text style={[styles.settingSubtitle, { color: colors.textTertiary, marginBottom: 8 }]}>
                    Link a personal email to keep access after graduation
                  </Text>
                  <TextInput
                    style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
                    placeholder="your@personal.email"
                    placeholderTextColor={colors.textTertiary}
                    value={emailInput}
                    onChangeText={setEmailInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable
                    onPress={handleLinkEmail}
                    disabled={emailTransition.isLinking}
                    style={[styles.actionButton, { backgroundColor: colors.primary, opacity: emailTransition.isLinking ? 0.6 : 1, marginTop: 10 }]}
                  >
                    <Text style={styles.actionButtonText}>
                      {emailTransition.isLinking ? 'Linking…' : 'Link Personal Email'}
                    </Text>
                  </Pressable>
                </View>
              )}

              {emailTransition.status === 'pending_verification' && (
                <View style={{ padding: 14 }}>
                  <Text style={[styles.settingLabel, { color: colors.text, marginBottom: 4 }]}>
                    Verify: {emailTransition.personalEmail}
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textTertiary, marginBottom: 8 }]}>
                    Enter the 6-digit code sent to your personal email
                  </Text>
                  {emailTransition.lastVerifyError && (
                    <View style={[styles.alertBox, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }]}>
                      <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                      <Text style={{ color: colors.error, fontSize: fontSize.sm, flex: 1, marginLeft: 6 }}>
                        {emailTransition.lastVerifyError.error}
                        {emailTransition.lastVerifyError.attemptsRemaining != null
                          ? ` (${emailTransition.lastVerifyError.attemptsRemaining} attempts left)`
                          : ''}
                      </Text>
                    </View>
                  )}
                  <TextInput
                    style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, textAlign: 'center', letterSpacing: 8 }]}
                    placeholder="000000"
                    placeholderTextColor={colors.textTertiary}
                    value={verificationCode}
                    onChangeText={(t) => setVerificationCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <Pressable
                      onPress={handleVerifyEmail}
                      disabled={emailTransition.isVerifying || verificationCode.length !== 6}
                      style={[styles.actionButton, { flex: 1, backgroundColor: colors.primary, opacity: emailTransition.isVerifying ? 0.6 : 1 }]}
                    >
                      <Text style={styles.actionButtonText}>
                        {emailTransition.isVerifying ? 'Verifying…' : 'Verify'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={handleResendCode}
                      disabled={emailTransition.isOnCooldown || emailTransition.isResending}
                      style={[styles.actionButton, { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, opacity: emailTransition.isOnCooldown ? 0.5 : 1 }]}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.text }]}>
                        {emailTransition.isOnCooldown
                          ? `Resend (${emailTransition.cooldownRemaining}s)`
                          : emailTransition.isResending
                            ? 'Resending…'
                            : 'Resend Code'}
                      </Text>
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={async () => {
                      await emailTransition.removePersonalEmail();
                      setEmailInput('');
                      setVerificationCode('');
                    }}
                    style={{ marginTop: 10 }}
                  >
                    <Text style={{ color: colors.textTertiary, fontSize: fontSize.sm, textAlign: 'center' }}>
                      Cancel &amp; Remove Personal Email
                    </Text>
                  </Pressable>
                </View>
              )}

              {emailTransition.status === 'verified' && (
                <View style={{ padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    <Text style={[styles.settingLabel, { color: colors.success }]}>
                      {emailTransition.personalEmail} verified
                    </Text>
                  </View>
                  <Text style={[styles.settingSubtitle, { color: colors.textTertiary, marginBottom: 10 }]}>
                    Ready to transition. You'll be signed out and will sign in with your personal email.
                  </Text>
                  <Pressable
                    onPress={() => {
                      Alert.alert(
                        'Transition Email?',
                        'You will be signed out and must sign in with your personal email going forward.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Transition',
                            style: 'destructive',
                            onPress: () => emailTransition.transitionEmail(),
                          },
                        ],
                      );
                    }}
                    disabled={emailTransition.isTransitioning}
                    style={[styles.actionButton, { backgroundColor: colors.primary, opacity: emailTransition.isTransitioning ? 0.6 : 1 }]}
                  >
                    <Text style={styles.actionButtonText}>
                      {emailTransition.isTransitioning ? 'Transitioning…' : 'Transition to Personal Email'}
                    </Text>
                  </Pressable>
                </View>
              )}

              {emailTransition.status === 'transitioned' && (
                <View style={[styles.settingRow]}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingSubtitle, { color: colors.textTertiary }]}>Personal Email</Text>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>
                      {emailTransition.personalEmail}
                    </Text>
                    <Text style={[styles.settingSubtitle, { color: colors.success }]}>Active</Text>
                  </View>
                </View>
              )}
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
                onPress={() => { Haptics.selectionAsync(); setDeleteModalVisible(true); }}
                style={({ pressed }) => [
                  styles.settingRow,
                  pressed && { backgroundColor: colors.surfaceHover },
                ]}
              >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: colors.danger }]}>Deactivate Account</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textTertiary }]}>
                    15-day grace period before permanent deletion
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>
            </View>
          </View>

          <Text style={[styles.version, { color: colors.textTertiary }]}>clstr v1.0.0</Text>
        </ScrollView>
      )}

      {/* ── Delete Account Modal ── */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deactivateMutation.isPending) {
            setDeleteModalVisible(false);
            setDeleteConfirmation('');
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              if (!deactivateMutation.isPending) {
                setDeleteModalVisible(false);
                setDeleteConfirmation('');
              }
            }}
          >
            <Pressable style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Deactivate your account?</Text>
              <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                Your account will be scheduled for permanent deletion in 15 days. Log back in before then to restore it.
              </Text>
              <Text style={[styles.modalDescription, { color: colors.textSecondary, marginTop: 8 }]}>
                Type <Text style={{ fontWeight: '700', color: colors.text }}>DEACTIVATE</Text> below to confirm.
              </Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, marginTop: 12 }]}
                placeholder="Type DEACTIVATE"
                placeholderTextColor={colors.textTertiary}
                value={deleteConfirmation}
                onChangeText={setDeleteConfirmation}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!deactivateMutation.isPending}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <Pressable
                  onPress={() => { setDeleteModalVisible(false); setDeleteConfirmation(''); }}
                  disabled={deactivateMutation.isPending}
                  style={[styles.actionButton, { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }]}
                >
                  <Text style={[styles.actionButtonText, { color: colors.text }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleDeleteAccount}
                  disabled={deactivateMutation.isPending || deleteConfirmation.trim().toUpperCase() !== 'DEACTIVATE'}
                  style={[
                    styles.actionButton,
                    {
                      flex: 1,
                      backgroundColor: colors.danger,
                      opacity: deactivateMutation.isPending || deleteConfirmation.trim().toUpperCase() !== 'DEACTIVATE' ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text style={styles.actionButtonText}>
                    {deactivateMutation.isPending ? 'Deactivating…' : 'Deactivate'}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Password Reset Modal ── */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!isSendingReset) setPasswordModalVisible(false); }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => { if (!isSendingReset) setPasswordModalVisible(false); }}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Change Password</Text>
            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              We'll email a secure password reset link to{' '}
              <Text style={{ fontWeight: '600', color: colors.text }}>
                {(() => {
                  const isTransitioned = emailTransition.status === 'transitioned';
                  return isTransitioned && emailTransition.personalEmail
                    ? emailTransition.personalEmail
                    : (identity?.email ?? 'your email');
                })()}
              </Text>.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Pressable
                onPress={() => setPasswordModalVisible(false)}
                disabled={isSendingReset}
                style={[styles.actionButton, { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }]}
              >
                <Text style={[styles.actionButtonText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSendPasswordReset}
                disabled={isSendingReset}
                style={[styles.actionButton, { flex: 1, backgroundColor: colors.primary, opacity: isSendingReset ? 0.6 : 1 }]}
              >
                <Text style={styles.actionButtonText}>
                  {isSendingReset ? 'Sending…' : 'Send Reset Link'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  settingSubtitle: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: fontSize.body,
    fontWeight: '600' as const,
    fontFamily: fontFamily.semiBold,
  },
  alertBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 24,
  },
  modalContent: {
    width: '100%' as unknown as number,
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700' as const,
    fontFamily: fontFamily.bold,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    lineHeight: 20,
  },
  version: {
    textAlign: 'center',
    fontSize: fontSize.sm,
    marginTop: 24,
    fontFamily: fontFamily.regular,
  },
});
