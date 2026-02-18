/**
 * CLSTR Navigation — Messaging Stack
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import type { MessagingStackParamList } from './types';
import { tokens } from '../design/tokens';

const Stack = createNativeStackNavigator<MessagingStackParamList>();

const PlaceholderScreen = ({ title }: { title: string }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>Phase 2</Text>
  </View>
);

const MessagingScreen = () => <PlaceholderScreen title="Messages" />;
const ConversationDetailScreen = () => <PlaceholderScreen title="Conversation" />;

export function MessagingStack() {
  return (
    <Stack.Navigator
      id="MessagingStack"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.colors.dark.background },
      }}
    >
      <Stack.Screen name="MessagingScreen" component={MessagingScreen} />
      <Stack.Screen name="ConversationDetail" component={ConversationDetailScreen} />
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
