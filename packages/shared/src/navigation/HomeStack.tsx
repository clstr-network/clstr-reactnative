/**
 * CLSTR Navigation — Home Stack
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import type { HomeStackParamList } from './types';
import { tokens } from '../design/tokens';

const Stack = createNativeStackNavigator<HomeStackParamList>();

const PlaceholderScreen = ({ title }: { title: string }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>Phase 2</Text>
  </View>
);

const HomeScreen = () => <PlaceholderScreen title="Home" />;
const PostDetailScreen = () => <PlaceholderScreen title="Post Detail" />;
const EventDetailScreen = () => <PlaceholderScreen title="Event Detail" />;
const ProfileScreen = () => <PlaceholderScreen title="Profile" />;
const ProfileConnectionsScreen = () => <PlaceholderScreen title="Connections" />;

export function HomeStack() {
  return (
    <Stack.Navigator
      id="HomeStack"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.colors.dark.background },
      }}
    >
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="ProfileConnections" component={ProfileConnectionsScreen} />
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
