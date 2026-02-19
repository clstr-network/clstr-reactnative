/**
 * CLSTR Navigation — Network Stack
 *
 * Accepts a `screens` prop map so the consuming app (apps/mobile)
 * can inject real screen implementations without creating a
 * dependency from packages/shared → apps/mobile.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import type { NetworkStackParamList } from './types';
import { tokens } from '../design/tokens';

const Stack = createNativeStackNavigator<NetworkStackParamList>();

// ── Placeholder fallbacks (used when no screen map is provided) ──

const PlaceholderScreen = ({ title }: { title: string }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>Phase 2</Text>
  </View>
);

const DefaultNetworkScreen = () => <PlaceholderScreen title="Network" />;
const DefaultProfileScreen = () => <PlaceholderScreen title="Profile" />;
const DefaultProfileConnectionsScreen = () => <PlaceholderScreen title="Connections" />;
const DefaultAlumniDirectoryScreen = () => <PlaceholderScreen title="Alumni Directory" />;

// ── Screen registry type ──

export type NetworkStackScreens = {
  NetworkScreen?: React.ComponentType<any>;
  Profile?: React.ComponentType<any>;
  ProfileConnections?: React.ComponentType<any>;
  AlumniDirectory?: React.ComponentType<any>;
};

export function NetworkStack({ screens }: { screens?: NetworkStackScreens } = {}) {
  return (
    <Stack.Navigator
      id="NetworkStack"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.colors.dark.background },
      }}
    >
      <Stack.Screen
        name="NetworkScreen"
        component={screens?.NetworkScreen ?? DefaultNetworkScreen}
      />
      <Stack.Screen
        name="Profile"
        component={screens?.Profile ?? DefaultProfileScreen}
      />
      <Stack.Screen
        name="ProfileConnections"
        component={screens?.ProfileConnections ?? DefaultProfileConnectionsScreen}
      />
      <Stack.Screen
        name="AlumniDirectory"
        component={screens?.AlumniDirectory ?? DefaultAlumniDirectoryScreen}
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
