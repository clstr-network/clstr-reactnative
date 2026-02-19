/**
 * CLSTR Navigation — Events Stack
 *
 * Accepts a `screens` prop map so the consuming app (apps/mobile)
 * can inject real screen implementations without creating a
 * dependency from packages/shared → apps/mobile.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import type { EventsStackParamList } from './types';
import { tokens } from '../design/tokens';

const Stack = createNativeStackNavigator<EventsStackParamList>();

// ── Placeholder fallbacks (used when no screen map is provided) ──

const PlaceholderScreen = ({ title }: { title: string }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>Phase 2</Text>
  </View>
);

const DefaultEventsScreen = () => <PlaceholderScreen title="Events" />;
const DefaultEventDetailScreen = () => <PlaceholderScreen title="Event Detail" />;

// ── Screen registry type ──

export type EventsStackScreens = {
  EventsScreen?: React.ComponentType<any>;
  EventDetail?: React.ComponentType<any>;
};

export function EventsStack({ screens }: { screens?: EventsStackScreens } = {}) {
  return (
    <Stack.Navigator
      id="EventsStack"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.colors.dark.background },
      }}
    >
      <Stack.Screen
        name="EventsScreen"
        component={screens?.EventsScreen ?? DefaultEventsScreen}
      />
      <Stack.Screen
        name="EventDetail"
        component={screens?.EventDetail ?? DefaultEventDetailScreen}
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
