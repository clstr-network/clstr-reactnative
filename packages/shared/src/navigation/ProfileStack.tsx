/**
 * CLSTR Navigation — Profile Stack
 *
 * Accepts a `screens` prop map so the consuming app (apps/mobile)
 * can inject real screen implementations without creating a
 * dependency from packages/shared → apps/mobile.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import type { ProfileStackParamList } from './types';
import { tokens } from '../design/tokens';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

// ── Placeholder fallbacks ──

const PlaceholderScreen = ({ title }: { title: string }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>Phase 2</Text>
  </View>
);

const DefaultProfileScreen = () => <PlaceholderScreen title="Profile" />;
const DefaultProfileConnectionsScreen = () => <PlaceholderScreen title="Connections" />;
const DefaultSettingsScreen = () => <PlaceholderScreen title="Settings" />;
const DefaultHelpCenterScreen = () => <PlaceholderScreen title="Help Center" />;
const DefaultSavedItemsScreen = () => <PlaceholderScreen title="Saved Items" />;
const DefaultSkillAnalysisScreen = () => <PlaceholderScreen title="Skill Analysis" />;

// ── Screen registry type ──

export type ProfileStackScreens = {
  ProfileScreen?: React.ComponentType<any>;
  ProfileConnections?: React.ComponentType<any>;
  Settings?: React.ComponentType<any>;
  HelpCenter?: React.ComponentType<any>;
  SavedItems?: React.ComponentType<any>;
  SkillAnalysis?: React.ComponentType<any>;
};

export function ProfileStack({ screens }: { screens?: ProfileStackScreens } = {}) {
  return (
    <Stack.Navigator
      id="ProfileStack"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.colors.dark.background },
      }}
    >
      <Stack.Screen
        name="ProfileScreen"
        component={screens?.ProfileScreen ?? DefaultProfileScreen}
      />
      <Stack.Screen
        name="ProfileConnections"
        component={screens?.ProfileConnections ?? DefaultProfileConnectionsScreen}
      />
      <Stack.Screen
        name="Settings"
        component={screens?.Settings ?? DefaultSettingsScreen}
      />
      <Stack.Screen
        name="HelpCenter"
        component={screens?.HelpCenter ?? DefaultHelpCenterScreen}
      />
      <Stack.Screen
        name="SavedItems"
        component={screens?.SavedItems ?? DefaultSavedItemsScreen}
      />
      <Stack.Screen
        name="SkillAnalysis"
        component={screens?.SkillAnalysis ?? DefaultSkillAnalysisScreen}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: tokens.colors.dark.background,
  },
  title: {
    fontSize: tokens.typography.fontSize['2xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.dark.foreground,
    marginBottom: tokens.spacing.sm,
  },
  subtitle: {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.dark.mutedForeground,
  },
});
