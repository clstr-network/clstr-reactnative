import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { colors } from '@/constants/colors';

const AUTH_MODE = process.env.EXPO_PUBLIC_AUTH_MODE;

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (AUTH_MODE === 'mock') {
    return <Redirect href="/(tabs)" />;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!user.user_metadata?.full_name) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  // Phase 5 — Route to (tabs) which uses live Supabase screens (not legacy (main)/(tabs))
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
