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
 *
 * Phase 6.4: Inter font loading + splash hold
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { queryClient } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { IdentityProvider, useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { useAppStateRealtimeLifecycle } from '@/lib/app-state';
import { usePushNotifications } from '@/lib/hooks/usePushNotifications';

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

  // Phase 3.5 — AppState lifecycle: session refresh + realtime reconnect on foreground
  useAppStateRealtimeLifecycle();

  // Phase 8.4 — Push notifications: auto-registers token if permission was previously granted
  usePushNotifications();

  return (
    <Stack screenOptions={{ headerShown: false, headerBackTitle: 'Back' }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(main)" />

      {/* Phase 5 — Detail screens pushed on top of tabs */}
      <Stack.Screen
        name="post/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="chat/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="event/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="user/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="create-post"
        options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="notifications"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="settings"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      {/* Phase 8 — Search, Saved Items */}
      <Stack.Screen
        name="search"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="saved"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />

      {/* Phase 9 — Advanced Features */}
      <Stack.Screen
        name="jobs"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="job/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="mentorship"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="clubs"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="alumni"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="projects"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="project/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ecocampus"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="portfolio"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="skill-analysis"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ai-chat"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------

export default function RootLayout() {
  const splashHidden = useRef(false);

  // Phase 6.4 — Load Inter font family
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <IdentityProvider>
            <SplashHider
              fontsReady={fontsLoaded || !!fontError}
              onReady={() => { splashHidden.current = true; }}
            />
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
 * Hides the splash screen once auth state is known AND fonts are loaded.
 * Rendered inside the provider tree so it can read auth context.
 */
function SplashHider({ fontsReady, onReady }: { fontsReady: boolean; onReady: () => void }) {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && fontsReady) {
      SplashScreen.hideAsync();
      onReady();
    }
  }, [isLoading, fontsReady, onReady]);

  return null;
}
