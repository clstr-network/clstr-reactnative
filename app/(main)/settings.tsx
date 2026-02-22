import React from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Platform, Switch,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/auth-context';
import { colors } from '@/constants/colors';

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );
}

function SettingsItem({ icon, label, value, onPress, showArrow = true }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.settingsItem, pressed && onPress && { backgroundColor: colors.surfaceElevated }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text style={styles.settingsLabel}>{label}</Text>
      {value && <Text style={styles.settingsValue}>{value}</Text>}
      {showArrow && <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={styles.screen}>
      <View style={[styles.headerBar, { paddingTop: insets.top + webTopInset }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 + (Platform.OS === 'web' ? 34 : insets.bottom) }]} showsVerticalScrollIndicator={false}>
        <SettingsSection title="Account">
          <SettingsItem icon="person-outline" label="Edit Profile" onPress={() => {}} />
          <SettingsItem icon="mail-outline" label="Email" value={user?.email} showArrow={false} />
          <SettingsItem icon="school-outline" label="College" value={user?.collegeName} showArrow={false} />
          <SettingsItem icon="lock-closed-outline" label="Change Password" onPress={() => {}} />
        </SettingsSection>

        <SettingsSection title="Preferences">
          <View style={styles.settingsItem}>
            <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.settingsLabel}>Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFF"
            />
          </View>
          <SettingsItem icon="moon-outline" label="Appearance" value="Dark" />
          <SettingsItem icon="language-outline" label="Language" value="English" />
        </SettingsSection>

        <SettingsSection title="Privacy">
          <SettingsItem icon="eye-outline" label="Profile Visibility" value="College Only" />
          <SettingsItem icon="hand-left-outline" label="Blocked Users" onPress={() => {}} />
        </SettingsSection>

        <SettingsSection title="Support">
          <SettingsItem icon="help-circle-outline" label="Help Center" onPress={() => {}} />
          <SettingsItem icon="document-text-outline" label="Terms of Service" onPress={() => {}} />
          <SettingsItem icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => {}} />
          <SettingsItem icon="information-circle-outline" label="About" value="v1.0.0" showArrow={false} />
        </SettingsSection>

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

        <Pressable style={styles.deleteButton}>
          <Text style={styles.deleteText}>Delete Account</Text>
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
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionContent: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
  },
  settingsValue: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textTertiary,
    marginRight: 4,
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
    marginBottom: 12,
  },
  logoutText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.error,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  deleteText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textTertiary,
  },
});
