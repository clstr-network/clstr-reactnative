/**
 * CLSTR Navigation — Home Stack
 *
 * Accepts a `screens` prop map so the consuming app (apps/mobile)
 * can inject real screen implementations without creating a
 * dependency from packages/shared → apps/mobile.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import type { HomeStackParamList } from './types';
import { tokens } from '../design/tokens';

const Stack = createNativeStackNavigator<HomeStackParamList>();

// ── Placeholder fallbacks (used when no screen map is provided) ──

const PlaceholderScreen = ({ title }: { title: string }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>Phase 2</Text>
  </View>
);

const DefaultHomeScreen = () => <PlaceholderScreen title="Home" />;
const DefaultPostDetailScreen = () => <PlaceholderScreen title="Post Detail" />;
const DefaultEventDetailScreen = () => <PlaceholderScreen title="Event Detail" />;
const DefaultProfileScreen = () => <PlaceholderScreen title="Profile" />;
const DefaultProfileConnectionsScreen = () => <PlaceholderScreen title="Connections" />;

// ── Screen registry type ──

export type HomeStackScreens = {
  HomeScreen?: React.ComponentType<any>;
  PostDetail?: React.ComponentType<any>;
  EventDetail?: React.ComponentType<any>;
  Profile?: React.ComponentType<any>;
  ProfileConnections?: React.ComponentType<any>;
};

export function HomeStack({ screens }: { screens?: HomeStackScreens } = {}) {
  return (
    <Stack.Navigator
      id="HomeStack"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.colors.dark.background },
      }}
    >
      <Stack.Screen
        name="HomeScreen"
        component={screens?.HomeScreen ?? DefaultHomeScreen}
      />
      <Stack.Screen
        name="PostDetail"
        component={screens?.PostDetail ?? DefaultPostDetailScreen}
      />
      <Stack.Screen
        name="EventDetail"
        component={screens?.EventDetail ?? DefaultEventDetailScreen}
      />
      <Stack.Screen
        name="Profile"
        component={screens?.Profile ?? DefaultProfileScreen}
      />
      <Stack.Screen
        name="ProfileConnections"
        component={screens?.ProfileConnections ?? DefaultProfileConnectionsScreen}
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
