/**
 * CLSTR Navigation — Root Navigator
 *
 * Top-level navigator with 3-way conditional rendering:
 * 1. AuthStack        → not logged in
 * 2. OnboardingScreen → logged in but `profiles.onboarded` is false
 * 3. MainTabs         → fully authenticated & onboarded
 *
 * Auth state comes from useAuth(); onboarding state is fetched from
 * the `profiles` table and exposed via OnboardingProvider so the
 * OnboardingScreen can call `markOnboarded()` after a successful upsert
 * without needing a round-trip re-query.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import type { RootStackParamList } from './types';
import { tokens } from '../design/tokens';

import { useAuth } from '../hooks/useAuth';
import { supabase } from '../integrations/supabase/client';
import { OnboardingProvider } from './OnboardingContext';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Placeholder screens for additional top-level routes
const PlaceholderScreen = ({ title }: { title: string }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>Phase 2</Text>
  </View>
);

const MentorshipScreen = () => <PlaceholderScreen title="Mentorship" />;
const ClubsScreen = () => <PlaceholderScreen title="Clubs" />;
const ProjectsScreen = () => <PlaceholderScreen title="Projects" />;
const SearchScreen = () => <PlaceholderScreen title="Search" />;
const EcoCampusScreen = () => <PlaceholderScreen title="EcoCampus" />;
const JobsScreen = () => <PlaceholderScreen title="Jobs" />;

export function RootNavigator() {
  const { isLoading, isAuthenticated, user } = useAuth();
  // null = still checking, false = needs onboarding, true = done
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);

  // Query `profiles.onboarded` whenever the authenticated user changes.
  // We key on `user` (not `user?.id`) to satisfy exhaustive-deps; the
  // early-return handles the null case.
  useEffect(() => {
    if (!user) {
      setIsOnboarded(null);
      return;
    }

    let cancelled = false;
    supabase
      .from('profiles')
      .select('onboarded')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          // No profile row yet → needs onboarding
          setIsOnboarded(false);
          return;
        }
        setIsOnboarded(!!(data as { onboarded?: boolean }).onboarded);
      });

    return () => { cancelled = true; };
  }, [user]);

  /** Called by OnboardingScreen after successful profile upsert */
  const markOnboarded = useCallback(() => setIsOnboarded(true), []);

  // Show loading spinner while auth or onboarding state is resolving
  if (isLoading || (isAuthenticated && isOnboarded === null)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tokens.colors.dark.primary} />
      </View>
    );
  }

  return (
    <OnboardingProvider value={{ isOnboarded, markOnboarded }}>
      <Stack.Navigator
        id="RootStack"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tokens.colors.dark.background },
          animation: 'fade',
        }}
      >
        {!isAuthenticated ? (
          // ─── Not authenticated ───────────────────────────
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : !isOnboarded ? (
          // ─── Authenticated but NOT onboarded ─────────────
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          // ─── Fully authenticated & onboarded ─────────────
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Mentorship" component={MentorshipScreen} />
            <Stack.Screen name="Clubs" component={ClubsScreen} />
            <Stack.Screen name="Projects" component={ProjectsScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="EcoCampus" component={EcoCampusScreen} />
            <Stack.Screen name="Jobs" component={JobsScreen} />
          </>
        )}
      </Stack.Navigator>
    </OnboardingProvider>
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
