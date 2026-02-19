/**
 * CLSTR Navigation — Messaging Stack
 *
 * Accepts a `screens` prop map so the consuming app (apps/mobile)
 * can inject real screen implementations without creating a
 * dependency from packages/shared → apps/mobile.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import type { MessagingStackParamList } from './types';
import { tokens } from '../design/tokens';

const Stack = createNativeStackNavigator<MessagingStackParamList>();

// ── Placeholder fallbacks (used when no screen map is provided) ──

const PlaceholderScreen = ({ title }: { title: string }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>Phase 7 — Messaging</Text>
  </View>
);

const DefaultMessagingScreen = () => <PlaceholderScreen title="Messages" />;
const DefaultConversationDetailScreen = () => <PlaceholderScreen title="Conversation" />;

// ── Screen registry type ──

export type MessagingStackScreens = {
  MessagingScreen?: React.ComponentType<any>;
  ConversationDetail?: React.ComponentType<any>;
};

export function MessagingStack({ screens }: { screens?: MessagingStackScreens } = {}) {
  return (
    <Stack.Navigator
      id="MessagingStack"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.colors.dark.background },
      }}
    >
      <Stack.Screen
        name="MessagingScreen"
        component={screens?.MessagingScreen ?? DefaultMessagingScreen}
      />
      <Stack.Screen
        name="ConversationDetail"
        component={screens?.ConversationDetail ?? DefaultConversationDetailScreen}
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
