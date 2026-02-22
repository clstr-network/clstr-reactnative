import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useData } from '@/lib/data-context';
import { Avatar } from '@/components/Avatar';
import { GlassContainer } from '@/components/GlassContainer';
import { SettingsRow } from '@/components/SettingsRow';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useData();
  const [notifs, setNotifs] = useState(true);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: (Platform.OS === 'web' ? webTopInset : insets.top) + 8,
          paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Pressable
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <Ionicons name="settings-outline" size={22} color={Colors.dark.textSecondary} />
        </Pressable>
      </View>

      <GlassContainer style={styles.profileCard} tier={1}>
        <View style={styles.profileRow}>
          <Avatar initials={user.avatar} size={64} isOnline={user.isOnline} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profileHandle}>{user.handle}</Text>
            <Text style={styles.profileRole}>{user.role}</Text>
          </View>
        </View>
        <Text style={styles.bio}>{user.bio}</Text>
        <View style={styles.profileStats}>
          <View style={styles.profileStat}>
            <Text style={styles.profileStatNum}>{user.connections}</Text>
            <Text style={styles.profileStatLabel}>Connections</Text>
          </View>
          <View style={[styles.profileStat, styles.profileStatBorder]}>
            <Text style={styles.profileStatNum}>{user.posts}</Text>
            <Text style={styles.profileStatLabel}>Posts</Text>
          </View>
          <View style={[styles.profileStat, styles.profileStatBorder]}>
            <Text style={styles.profileStatNum}>{user.joined}</Text>
            <Text style={styles.profileStatLabel}>Joined</Text>
          </View>
        </View>
      </GlassContainer>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <GlassContainer noPadding tier={2}>
          <SettingsRow
            icon="notifications-outline"
            iconColor={Colors.dark.textSecondary}
            label="Push Notifications"
            isSwitch
            switchValue={notifs}
            onSwitchChange={setNotifs}
          />
          <SettingsRow
            icon="moon-outline"
            iconColor={Colors.dark.textSecondary}
            label="Appearance"
            value="Dark"
            onPress={() => {}}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            iconColor={Colors.dark.success}
            label="Privacy"
            onPress={() => {}}
            isLast
          />
        </GlassContainer>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <GlassContainer noPadding tier={2}>
          <SettingsRow
            icon="person-outline"
            iconColor={Colors.dark.textSecondary}
            label="Edit Profile"
            onPress={() => {}}
          />
          <SettingsRow
            icon="key-outline"
            iconColor={Colors.dark.warning}
            label="Change Password"
            onPress={() => {}}
          />
          <SettingsRow
            icon="log-out-outline"
            label="Sign Out"
            isDestructive
            onPress={() => {}}
            isLast
          />
        </GlassContainer>
      </View>
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
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    color: Colors.dark.text,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    marginBottom: 24,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    color: Colors.dark.text,
  },
  profileHandle: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 1,
  },
  profileRole: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    color: Colors.dark.textMeta,
    marginTop: 2,
  },
  bio: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    color: Colors.dark.textBody,
    lineHeight: 24.5,
    marginBottom: 16,
  },
  profileStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.dark.divider,
    paddingTop: 14,
  },
  profileStat: {
    flex: 1,
    alignItems: 'center',
  },
  profileStatBorder: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.dark.divider,
  },
  profileStatNum: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: Colors.dark.text,
  },
  profileStatLabel: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 11,
    color: Colors.dark.textMeta,
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
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
});
