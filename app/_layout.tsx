/**
 * RootLayout — Wires providers and auth-guard routing.
 *
 * Provider stack (outside-in):
 *   ErrorBoundary → QueryClientProvider → AuthProvider → IdentityProvider
 *     → GestureHandlerRootView → KeyboardProvider → Stack
 *
 * Auth guard:
 *   • Not authenticated → /(auth)/login
 *   • Authenticated + needsOnboarding → /(auth)/onboarding
 *   • Authenticated + onboarded + in (auth) group → /
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { queryClient } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { IdentityProvider, useIdentityContext } from '@/lib/contexts/IdentityProvider';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// ---------------------------------------------------------------------------
// Auth guard hook
// ---------------------------------------------------------------------------

function useProtectedRoute() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { needsOnboarding, isLoading: idLoading } = useIdentityContext();
  const segments = useSegments();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Wait until both auth and identity are resolved
    if (authLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Not signed in → send to login
      hasRedirected.current = true;
      router.replace('/(auth)/login');
    } else if (isAuthenticated && !idLoading && needsOnboarding && !inAuthGroup) {
      // Signed in but profile not set up → send to onboarding
      hasRedirected.current = true;
      router.replace('/(auth)/onboarding');
    } else if (isAuthenticated && !idLoading && !needsOnboarding && inAuthGroup) {
      // Fully set up but still on an auth screen → send to main
      hasRedirected.current = true;
      router.replace('/');
    }
  }, [isAuthenticated, authLoading, idLoading, needsOnboarding, segments, router]);
}

// ---------------------------------------------------------------------------
// Navigation tree
// ---------------------------------------------------------------------------

function RootLayoutNav() {
  useProtectedRoute();

  return (
    <Stack screenOptions={{ headerShown: false, headerBackTitle: 'Back' }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(main)" />
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------

export default function RootLayout() {
  const splashHidden = useRef(false);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <IdentityProvider>
            <SplashHider onReady={() => { splashHidden.current = true; }} />
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </IdentityProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

/**
 * Hides the splash screen once auth state is known.
 * Rendered inside the provider tree so it can read auth context.
 */
function SplashHider({ onReady }: { onReady: () => void }) {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
      onReady();
    }
  }, [isLoading, onReady]);

  return null;
}
