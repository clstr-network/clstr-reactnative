/**
 * AuthCallbackScreen — Handles deep-link redirects from Supabase auth emails.
 *
 * URL shape: clstr://auth/callback#access_token=...&refresh_token=...
 * or with PKCE: clstr://auth/callback?code=...
 *
 * On native, Supabase's JS client auto-detects hash fragments if
 * `detectSessionInUrl` is enabled. Since we disabled it in core-client for
 * stability, we manually extract tokens from the URL and set the session.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { router, useLocalSearchParams, useGlobalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/adapters/core-client';
import { useThemeColors } from '@/constants/colors';

export default function AuthCallbackScreen() {
  const colors = useThemeColors();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      // Get the full URL that opened the app
      const url = await Linking.getInitialURL();
      if (!url) {
        // Fallback: the Supabase listener in auth-context will pick up
        // the session change triggered by the email link.
        // Just redirect after a short delay.
        await waitForSession();
        return;
      }

      // Parse hash fragment tokens (magic link / email confirm)
      const hashParams = parseHashFragment(url);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;
        router.replace('/');
        return;
      }

      // Parse query params (PKCE flow)
      const queryParams = parseQueryString(url);
      const code = queryParams.get('code');

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
        router.replace('/');
        return;
      }

      // No tokens found — wait for auth state change (could be set by Supabase internally)
      await waitForSession();
    } catch (e: any) {
      console.error('[AuthCallback]', e);
      setError(e.message || 'Authentication failed');
      // Redirect to login after showing error briefly
      setTimeout(() => router.replace('/(auth)/login'), 2500);
    }
  }

  /** Wait for auth state change (max 5 seconds), then redirect */
  async function waitForSession() {
    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        resolve();
        router.replace('/');
      }, 5000);

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          clearTimeout(timeout);
          subscription.unsubscribe();
          resolve();
          router.replace('/');
        }
      });
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {error ? (
        <>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <Text style={[styles.subText, { color: colors.textSecondary }]}>Redirecting to login...</Text>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Signing you in...</Text>
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// URL parsing helpers
// ---------------------------------------------------------------------------

function parseHashFragment(url: string): Map<string, string> {
  const map = new Map<string, string>();
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return map;
  const fragment = url.substring(hashIndex + 1);
  for (const pair of fragment.split('&')) {
    const [key, value] = pair.split('=');
    if (key && value) map.set(decodeURIComponent(key), decodeURIComponent(value));
  }
  return map;
}

function parseQueryString(url: string): Map<string, string> {
  const map = new Map<string, string>();
  const qIndex = url.indexOf('?');
  if (qIndex === -1) return map;
  const hash = url.indexOf('#', qIndex);
  const qs = hash === -1 ? url.substring(qIndex + 1) : url.substring(qIndex + 1, hash);
  for (const pair of qs.split('&')) {
    const [key, value] = pair.split('=');
    if (key && value) map.set(decodeURIComponent(key), decodeURIComponent(value));
  }
  return map;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 16, fontFamily: 'Inter_500Medium', marginTop: 8 },
  errorText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  subText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
});
