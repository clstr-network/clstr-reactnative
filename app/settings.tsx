import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { GlassContainer } from '@/components/GlassContainer';
import { SettingsRow } from '@/components/SettingsRow';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(false);
  const [showActivity, setShowActivity] = useState(true);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: (Platform.OS === 'web' ? webTopInset : insets.top) + 8,
          paddingBottom: Math.max(insets.bottom, 24) + 20,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <GlassContainer noPadding>
          <SettingsRow
            icon="notifications-outline"
            iconColor={Colors.dark.textSecondary}
            label="Push Notifications"
            isSwitch
            switchValue={pushNotifs}
            onSwitchChange={setPushNotifs}
          />
          <SettingsRow
            icon="mail-outline"
            iconColor={Colors.dark.textSecondary}
            label="Email Notifications"
            isSwitch
            switchValue={emailNotifs}
            onSwitchChange={setEmailNotifs}
            isLast
          />
        </GlassContainer>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        <GlassContainer noPadding>
          <SettingsRow
            icon="eye-outline"
            iconColor={Colors.dark.success}
            label="Show Activity Status"
            isSwitch
            switchValue={showActivity}
            onSwitchChange={setShowActivity}
          />
          <SettingsRow
            icon="lock-closed-outline"
            iconColor={Colors.dark.warning}
            label="Profile Visibility"
            value="Everyone"
            onPress={() => {}}
          />
          <SettingsRow
            icon="shield-outline"
            iconColor={Colors.dark.textSecondary}
            label="Blocked Users"
            value="0"
            onPress={() => {}}
            isLast
          />
        </GlassContainer>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General</Text>
        <GlassContainer noPadding>
          <SettingsRow
            icon="moon-outline"
            iconColor={Colors.dark.textSecondary}
            label="Appearance"
            value="Dark"
            onPress={() => {}}
          />
          <SettingsRow
            icon="language-outline"
            iconColor={Colors.dark.textSecondary}
            label="Language"
            value="English"
            onPress={() => {}}
          />
          <SettingsRow
            icon="help-circle-outline"
            iconColor={Colors.dark.textSecondary}
            label="Help & Support"
            onPress={() => {}}
            isLast
          />
        </GlassContainer>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <GlassContainer noPadding>
          <SettingsRow
            icon="log-out-outline"
            label="Sign Out"
            isDestructive
            onPress={() => {}}
          />
          <SettingsRow
            icon="trash-outline"
            label="Delete Account"
            isDestructive
            onPress={() => {}}
            isLast
          />
        </GlassContainer>
      </View>

      <Text style={styles.version}>clstr v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    color: Colors.dark.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 13,
    color: Colors.dark.textMeta,
    marginBottom: 8,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  version: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    color: Colors.dark.textMeta,
    textAlign: 'center',
    marginTop: 8,
  },
});
