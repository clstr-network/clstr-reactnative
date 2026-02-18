/**
 * CLSTR Navigation — Root Navigator
 *
 * Top-level navigator that switches between:
 * - AuthStack (not logged in)
 * - OnboardingStack (logged in but not onboarded)
 * - MainTabs (fully authenticated)
 *
 * Auth state is checked via Supabase session.
 */
import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import type { RootStackParamList } from './types';
import { tokens } from '../design/tokens';

import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Placeholder screens for additional top-level routes
const PlaceholderScreen = ({ title }: { title: string }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>Phase 2</Text>
  </View>
);

const OnboardingScreen = () => <PlaceholderScreen title="Onboarding" />;
const MentorshipScreen = () => <PlaceholderScreen title="Mentorship" />;
const ClubsScreen = () => <PlaceholderScreen title="Clubs" />;
const ProjectsScreen = () => <PlaceholderScreen title="Projects" />;
const SearchScreen = () => <PlaceholderScreen title="Search" />;
const EcoCampusScreen = () => <PlaceholderScreen title="EcoCampus" />;
const JobsScreen = () => <PlaceholderScreen title="Jobs" />;

export function RootNavigator() {
  // In Phase 1, we always show MainTabs to verify the navigation shell works.
  // Phase 2 will wire up actual auth state checking.
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Simulate auth check — in Phase 2 this will use Supabase session
    const timer = setTimeout(() => {
      // Default to showing Main tabs for development/testing
      setIsAuthenticated(true);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tokens.colors.dark.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      id="RootStack"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.colors.dark.background },
        animation: 'fade',
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Mentorship" component={MentorshipScreen} />
          <Stack.Screen name="Clubs" component={ClubsScreen} />
          <Stack.Screen name="Projects" component={ProjectsScreen} />
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="EcoCampus" component={EcoCampusScreen} />
          <Stack.Screen name="Jobs" component={JobsScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Auth" component={AuthStack} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        </>
      )}
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
  loadingContainer: {
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
