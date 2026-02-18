/**
 * CLSTR Navigation — Profile Stack
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import type { ProfileStackParamList } from './types';
import { tokens } from '../design/tokens';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

const PlaceholderScreen = ({ title }: { title: string }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>Phase 2</Text>
  </View>
);

const ProfileScreen = () => <PlaceholderScreen title="Profile" />;
const ProfileConnectionsScreen = () => <PlaceholderScreen title="Connections" />;
const SettingsScreen = () => <PlaceholderScreen title="Settings" />;
const HelpCenterScreen = () => <PlaceholderScreen title="Help Center" />;
const SavedItemsScreen = () => <PlaceholderScreen title="Saved Items" />;
const SkillAnalysisScreen = () => <PlaceholderScreen title="Skill Analysis" />;

export function ProfileStack() {
  return (
    <Stack.Navigator
      id="ProfileStack"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.colors.dark.background },
      }}
    >
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="ProfileConnections" component={ProfileConnectionsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <Stack.Screen name="SavedItems" component={SavedItemsScreen} />
      <Stack.Screen name="SkillAnalysis" component={SkillAnalysisScreen} />
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
