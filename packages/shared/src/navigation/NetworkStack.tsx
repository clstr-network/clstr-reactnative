/**
 * CLSTR Navigation — Network Stack
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import type { NetworkStackParamList } from './types';
import { tokens } from '../design/tokens';

const Stack = createNativeStackNavigator<NetworkStackParamList>();

const PlaceholderScreen = ({ title }: { title: string }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>Phase 2</Text>
  </View>
);

const NetworkScreen = () => <PlaceholderScreen title="Network" />;
const ProfileScreen = () => <PlaceholderScreen title="Profile" />;
const ProfileConnectionsScreen = () => <PlaceholderScreen title="Connections" />;
const AlumniDirectoryScreen = () => <PlaceholderScreen title="Alumni Directory" />;

export function NetworkStack() {
  return (
    <Stack.Navigator
      id="NetworkStack"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.colors.dark.background },
      }}
    >
      <Stack.Screen name="NetworkScreen" component={NetworkScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="ProfileConnections" component={ProfileConnectionsScreen} />
      <Stack.Screen name="AlumniDirectory" component={AlumniDirectoryScreen} />
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
