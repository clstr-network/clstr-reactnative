/**
 * AuthCallbackScreen — Mobile Auth Callback Handler
 *
 * Handles deep link auth callbacks (magic links & OAuth):
 * 1. Receives the deep link URL via React Navigation's linking config
 * 2. Extracts `code` param (PKCE) or session tokens from the URL
 * 3. Exchanges code for session via supabase.auth.exchangeCodeForSession()
 * 4. onAuthStateChange fires → useAuth() updates → RootNavigator re-renders
 *
 * Runtime hardening:
 * - Idempotent: tracks consumed PKCE codes to prevent duplicate exchanges
 * - Background-resume safe: checks for existing session before re-exchanging
 * - Stale link detection: won't reprocess a code that was already consumed
 * - Uses route params OR Linking.getInitialURL() for URL retrieval
 */
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  AppState,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { supabase } from '../../integrations/supabase/client';
import { tokens } from '../../design/tokens';
import type { AuthStackParamList } from '../../navigation/types';

type AuthCallbackRoute = RouteProp<AuthStackParamList, 'AuthCallback'>;

type CallbackState =
  | { status: 'loading'; message: string }
  | { status: 'error'; message: string }
  | { status: 'success' };

/**
 * Module-level set of PKCE codes we have already attempted to exchange.
 * Prevents the exact scenario:
 *   1. User taps magic link → app opens
 *   2. exchangeCodeForSession starts
 *   3. User backgrounds app mid-exchange
 *   4. App resumes → useEffect re-fires
 *   5. Without this guard → duplicate exchange → error or ghost session
 */
const consumedCodes = new Set<string>();

/**
 * Parse auth params from the incoming URL.
 *
 * Supabase magic links use PKCE → code is in query params:
 *   https://clstr.network/auth/callback?code=abc123
 *
 * OAuth may also include #access_token and #refresh_token in the
 * hash fragment; we handle both formats.
 */
function extractAuthParams(url: string): {
  code?: string;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  errorDescription?: string;
} {
  try {
    const parsed = Linking.parse(url);
    const params = parsed.queryParams ?? {};

    // PKCE code flow (magic link, email OTP)
    if (params.code) {
      return { code: String(params.code) };
    }

    // Hash-based implicit flow (OAuth fallback)
    // React Navigation may flatten fragment params into queryParams
    if (params.access_token) {
      return {
        accessToken: String(params.access_token),
        refreshToken: params.refresh_token ? String(params.refresh_token) : undefined,
      };
    }

    // Error params (e.g., expired link)
    if (params.error) {
      return {
        error: String(params.error),
        errorDescription: params.error_description
          ? String(params.error_description)
          : undefined,
      };
    }

    return {};
  } catch {
    return {};
  }
}

export function AuthCallbackScreen() {
  const navigation = useNavigation();
  const route = useRoute<AuthCallbackRoute>();
  const [state, setState] = useState<CallbackState>({
    status: 'loading',
    message: 'Completing sign in...',
  });

  // Guards against double-processing in strict mode or HMR
  const processedRef = useRef(false);
  // Track if exchange is currently in-flight (background-resume guard)
  const exchangeInFlightRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;

    async function handleCallback() {
      processedRef.current = true;

      try {
        // ── Step 0: Check if we already have a valid session ──
        // This handles the case where the user backgrounded during exchange
        // and onAuthStateChange already fired successfully.
        const {
          data: { session: existingSession },
        } = await supabase.auth.getSession();
        if (existingSession) {
          setState({ status: 'success' });
          return;
        }

        // ── Step 1: Resolve the callback URL ──
        // Prefer route params (set by linking.subscribe for foreground links)
        // Fall back to Linking.getInitialURL() for cold-start links
        let url = '';
        const routeUrl = route.params && 'url' in route.params ? route.params.url : undefined;
        if (routeUrl) {
          url = routeUrl;
        } else {
          const initialUrl = await Linking.getInitialURL();
          url = initialUrl ?? '';
        }

        if (!url) {
          // No URL at all — check session one more time (race condition guard)
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session) {
            setState({ status: 'success' });
            return;
          }

          setState({
            status: 'error',
            message: 'No sign-in link found. Please request a new link.',
          });
          return;
        }

        setState({ status: 'loading', message: 'Verifying your link...' });

        const params = extractAuthParams(url);

        // Error returned in the URL
        if (params.error) {
          setState({
            status: 'error',
            message:
              params.errorDescription ??
              'Sign-in link is invalid or expired. Please request a new one.',
          });
          return;
        }

        // ── PKCE code exchange (primary flow for magic links) ──
        if (params.code) {
          // Idempotency check: was this code already consumed?
          if (consumedCodes.has(params.code)) {
            // Code was already exchanged — check if we have a session now
            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (session) {
              setState({ status: 'success' });
            } else {
              setState({
                status: 'error',
                message: 'This sign-in link has already been used. Please request a new one.',
              });
            }
            return;
          }

          // Mark code as consumed BEFORE the exchange (prevent re-entry)
          consumedCodes.add(params.code);
          exchangeInFlightRef.current = true;

          setState({ status: 'loading', message: 'Signing you in...' });
          const { error } = await supabase.auth.exchangeCodeForSession(
            params.code,
          );

          exchangeInFlightRef.current = false;

          if (error) {
            const expired =
              error.message.toLowerCase().includes('expired') ||
              error.message.toLowerCase().includes('invalid');
            setState({
              status: 'error',
              message: expired
                ? 'This sign-in link has expired. Please request a new one.'
                : `Sign-in failed: ${error.message}`,
            });
            return;
          }

          // Success — onAuthStateChange will fire, RootNavigator re-renders
          setState({ status: 'success' });
          return;
        }

        // ── Implicit flow fallback (OAuth with tokens in URL) ──
        if (params.accessToken && params.refreshToken) {
          setState({ status: 'loading', message: 'Signing you in...' });
          const { error } = await supabase.auth.setSession({
            access_token: params.accessToken,
            refresh_token: params.refreshToken,
          });

          if (error) {
            setState({
              status: 'error',
              message: `Sign-in failed: ${error.message}`,
            });
            return;
          }

          setState({ status: 'success' });
          return;
        }

        // No recognisable auth params
        setState({
          status: 'error',
          message: 'Invalid sign-in link. Please request a new one.',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setState({
          status: 'error',
          message: `Something went wrong: ${msg}`,
        });
      }
    }

    handleCallback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Background-resume handler ──
  // If the user backgrounds during exchange and comes back,
  // check if the session was created while we were away.
  //
  // BUG FIX: Added `mounted` guard to prevent setState after unmount.
  // Scenario: AuthCallbackScreen unmounts (RootNavigator switches to Main)
  // while the AppState listener's async getSession() is still in-flight.
  // Without this guard → "Can't perform a React state update on unmounted"
  useEffect(() => {
    let mounted = true;

    const sub = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active' && state.status === 'loading') {
        // App just came to foreground while we were in loading state
        // Check if the exchange completed while we were backgrounded
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (mounted && session && !exchangeInFlightRef.current) {
          setState({ status: 'success' });
        }
      }
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [state.status]);

  const handleRetry = () => {
    navigation.navigate('Login' as never);
  };

  // ── Success state → RootNavigator handles navigation automatically ──
  if (state.status === 'success') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={tokens.colors.dark.primary} />
        <Text style={styles.message}>Welcome back!</Text>
      </View>
    );
  }

  // ── Error state ──
  if (state.status === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorIcon}>!</Text>
        <Text style={styles.errorTitle}>Sign-in Failed</Text>
        <Text style={styles.errorMessage}>{state.message}</Text>
        <Pressable style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Back to Login</Text>
        </Pressable>
      </View>
    );
  }

  // ── Loading state ──
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={tokens.colors.dark.primary} />
      <Text style={styles.message}>{state.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: tokens.colors.dark.background,
    paddingHorizontal: tokens.spacing.xl,
  },
  message: {
    marginTop: tokens.spacing.md,
    fontSize: tokens.typography.fontSize.base,
    color: tokens.colors.dark.mutedForeground,
    textAlign: 'center',
  },
  errorIcon: {
    width: 48,
    height: 48,
    lineHeight: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#EF4444',
    fontSize: 24,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: tokens.spacing.md,
    overflow: 'hidden',
  },
  errorTitle: {
    fontSize: tokens.typography.fontSize.xl,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.dark.foreground,
    marginBottom: tokens.spacing.sm,
  },
  errorMessage: {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.dark.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: tokens.spacing.xl,
  },
  retryButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    backgroundColor: tokens.colors.dark.primary,
  },
  retryButtonText: {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.dark.primaryForeground,
  },
});
