/**
 * AuthCallbackScreen — Handles deep-link redirects from Supabase auth.
 *
 * URL shapes:
 *   clstr://auth/callback#access_token=...&refresh_token=...  (implicit)
 *   clstr://auth/callback?code=...                            (PKCE)
 *
 * Flow (mirrors web's AuthCallback.tsx parity):
 * 1. Extract session from URL (hash fragment or PKCE code exchange)
 * 2. Handle OAuth error params (#error=... or ?error=...)
 * 3. Handle "Database error saving new user" recovery
 * 4. Validate academic email domain (block non-edu emails)
 * 5. Check/update profile domain for OAuth users
 * 6. Sync OAuth metadata (full_name, avatar_url) to profile
 * 7. Route to onboarding (if incomplete) or home
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/adapters/core-client';
import {
  isValidAcademicEmail,
  getDomainFromEmail,
  getCollegeDomainFromEmailServer,
} from '@/lib/adapters/validation';
import { isPublicEmailDomainServer } from '@/lib/adapters/college-utils';
import type { Session } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Profile row subset fetched during callback processing
// ---------------------------------------------------------------------------
type ProfileCallbackRow = {
  id: string;
  email: string | null;
  college_domain: string | null;
  onboarding_complete: boolean | null;
  full_name: string | null;
  avatar_url: string | null;
  email_transition_status: string | null;
};

// ---------------------------------------------------------------------------
// Status messages shown during processing
// ---------------------------------------------------------------------------
type StatusPhase =
  | 'extracting'
  | 'validating'
  | 'profile'
  | 'syncing'
  | 'redirecting'
  | 'error';

const STATUS_TEXT: Record<StatusPhase, string> = {
  extracting: 'Completing sign in…',
  validating: 'Validating your email…',
  profile: 'Setting up your profile…',
  syncing: 'Syncing account data…',
  redirecting: 'Almost there…',
  error: 'Something went wrong',
};

export default function AuthCallbackScreen() {
  const [phase, setPhase] = useState<StatusPhase>('extracting');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  // =========================================================================
  // Main callback handler
  // =========================================================================
  async function handleCallback() {
    try {
      const url = await Linking.getInitialURL();

      // ── Step 1: Check for OAuth error params ──
      if (url) {
        const oauthError = extractError(url);
        if (oauthError) {
          console.error('[AuthCallback] OAuth error:', oauthError);

          // Handle "Database error saving new user" — retry after delay
          if (
            oauthError.description?.includes('Database error saving new user') ||
            oauthError.code === 'unexpected_failure'
          ) {
            console.log(
              '[AuthCallback] Database error during signup — attempting recovery…'
            );
            setPhase('syncing');
            await delay(1500);

            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (session?.user) {
              console.log(
                '[AuthCallback] Session found after DB error, proceeding'
              );
              await processAuthenticatedUser(session);
              return;
            }
          }

          // No recovery — redirect to login
          setErrorMsg(
            oauthError.description || oauthError.error || 'Authentication failed'
          );
          setPhase('error');
          await delay(2500);
          router.replace('/(auth)/login');
          return;
        }
      }

      // ── Step 2: Extract session from URL ──
      if (url) {
        // Try hash fragment first (implicit grant)
        const hashParams = parseHashFragment(url);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        } else {
          // Try query params (PKCE flow)
          const queryParams = parseQueryString(url);
          const code = queryParams.get('code');
          if (code) {
            const { error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
          }
        }
      }

      // ── Step 3: Get current session ──
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('[AuthCallback] Session error:', sessionError);
        throw new Error('Unable to verify session');
      }

      if (!session) {
        // No URL & no session — wait for auth state change (e.g. deep-link)
        if (!url) {
          await waitForSession();
          return;
        }
        throw new Error('Authentication failed — no session created');
      }

      await processAuthenticatedUser(session);
    } catch (e: any) {
      console.error('[AuthCallback]', e);
      setErrorMsg(e.message || 'Authentication failed');
      setPhase('error');
      await delay(2500);
      router.replace('/(auth)/login');
    }
  }

  // =========================================================================
  // Process authenticated user — academic validation, profile, routing
  // =========================================================================
  async function processAuthenticatedUser(session: Session) {
    const user = session.user;
    const userEmail = user.email;

    if (!userEmail) {
      console.error('[AuthCallback] No email on authenticated user');
      await supabase.auth.signOut();
      router.replace('/(auth)/login');
      return;
    }

    // ── Step 4: Validate academic email domain ──
    setPhase('validating');

    const isAcademic = isValidAcademicEmail(userEmail);

    // Check if this is a transitioned personal email (alumni who moved to
    // Gmail etc.)
    let isTransitioned = false;
    if (!isAcademic) {
      isTransitioned = await checkTransitionedPersonalEmail(userEmail);
    }

    if (!isAcademic && !isTransitioned) {
      console.error('[AuthCallback] Non-academic email blocked:', userEmail);
      await supabase.auth.signOut();
      router.replace('/(auth)/academic-email-required' as any);
      return;
    }

    // ── Step 5: Check/update profile ──
    setPhase('profile');

    const emailDomain = getDomainFromEmail(userEmail);
    const collegeDomain = await getCollegeDomainFromEmailServer(userEmail);

    const { data: profileDataRaw, error: profileError } = await supabase
      .from('profiles')
      .select(
        'id, email, college_domain, onboarding_complete, full_name, avatar_url, email_transition_status'
      )
      .eq('id', user.id)
      .maybeSingle();

    const profileData = profileDataRaw as ProfileCallbackRow | null;

    if (profileError && profileError.code !== 'PGRST116') {
      console.warn('[AuthCallback] Error checking profile:', profileError);
    }

    // ── Step 6: Update profile domain + sync OAuth metadata ──
    if (profileData) {
      const isProfileTransitioned =
        profileData.email_transition_status === 'transitioned';

      // Only set college_domain for non-transitioned users whose domain is
      // missing
      if (!isProfileTransitioned && !profileData.college_domain) {
        const isOAuthEmailAcademic = isValidAcademicEmail(userEmail);
        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        if (isOAuthEmailAcademic) {
          // Double-check: don't set a public domain as college_domain
          const isPublicDomain = await isPublicEmailDomainServer(emailDomain);
          if (isPublicDomain) {
            console.warn(
              '[AuthCallback] Public email domain blocked from college_domain:',
              emailDomain
            );
          } else {
            updates.college_domain = collegeDomain;
            updates.email = userEmail;
            console.log(
              '[AuthCallback] Updating profile with academic domain:',
              emailDomain
            );
          }
        }

        // Sync OAuth metadata (full_name, avatar_url) if blank on profile
        if (!profileData.full_name && user.user_metadata?.full_name) {
          updates.full_name = user.user_metadata.full_name;
        }
        if (!profileData.avatar_url && user.user_metadata?.avatar_url) {
          updates.avatar_url = user.user_metadata.avatar_url;
        }

        const { error: updateError } = await supabase
          .from('profiles')
          // @ts-ignore — Generic Database type makes update param 'never'
          .update(updates)
          .eq('id', user.id);

        if (updateError) {
          console.warn(
            '[AuthCallback] Failed to update profile:',
            updateError
          );
        }
      } else {
        // Domain already set — still sync OAuth name/avatar if missing
        setPhase('syncing');
        const metaUpdates: Record<string, unknown> = {};

        if (!profileData.full_name && user.user_metadata?.full_name) {
          metaUpdates.full_name = user.user_metadata.full_name;
        }
        if (!profileData.avatar_url && user.user_metadata?.avatar_url) {
          metaUpdates.avatar_url = user.user_metadata.avatar_url;
        }

        if (Object.keys(metaUpdates).length > 0) {
          metaUpdates.updated_at = new Date().toISOString();
          await supabase
            .from('profiles')
            // @ts-ignore — Generic Database type makes update param 'never'
            .update(metaUpdates)
            .eq('id', user.id);
        }
      }

      // ── Step 7: Route based on onboarding status ──
      setPhase('redirecting');

      if (profileData.onboarding_complete === true) {
        router.replace('/');
        return;
      }
    }

    // No profile or onboarding incomplete → onboarding
    setPhase('redirecting');
    router.replace('/(auth)/onboarding');
  }

  // =========================================================================
  // Helper: check if email is a transitioned personal email
  // =========================================================================
  async function checkTransitionedPersonalEmail(
    email: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('personal_email', email.toLowerCase())
      .eq('email_transition_status', 'transitioned')
      .eq('personal_email_verified', true)
      .maybeSingle();

    if (error) {
      console.warn(
        '[AuthCallback] Failed to check transitioned email:',
        error.message
      );
      return false;
    }
    return !!data;
  }

  // =========================================================================
  // Helper: wait for auth state change when no URL available
  // =========================================================================
  async function waitForSession(): Promise<void> {
    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        resolve();
        router.replace('/');
      }, 5000);

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event: string) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          clearTimeout(timeout);
          subscription.unsubscribe();
          resolve();
          // Re-enter the full flow with the new session
          handleCallback();
        }
      });
    });
  }

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      {errorMsg ? (
        <>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Text style={styles.subText}>Redirecting to login…</Text>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color="rgba(255,255,255,0.60)" />
          <Text style={styles.loadingText}>{STATUS_TEXT[phase]}</Text>
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
    if (key && value)
      map.set(decodeURIComponent(key), decodeURIComponent(value));
  }
  return map;
}

function parseQueryString(url: string): Map<string, string> {
  const map = new Map<string, string>();
  const qIndex = url.indexOf('?');
  if (qIndex === -1) return map;
  const hash = url.indexOf('#', qIndex);
  const qs =
    hash === -1
      ? url.substring(qIndex + 1)
      : url.substring(qIndex + 1, hash);
  for (const pair of qs.split('&')) {
    const [key, value] = pair.split('=');
    if (key && value)
      map.set(decodeURIComponent(key), decodeURIComponent(value));
  }
  return map;
}

/**
 * Extract error information from OAuth redirect URL.
 * Handles both hash fragment (#error=...) and query string (?error=...)
 */
function extractError(
  url: string
): { error: string; description?: string; code?: string } | null {
  const hashParams = parseHashFragment(url);
  const queryParams = parseQueryString(url);

  const error = hashParams.get('error') || queryParams.get('error');
  if (!error) return null;

  return {
    error,
    description:
      hashParams.get('error_description') ||
      queryParams.get('error_description') ||
      undefined,
    code:
      hashParams.get('error_code') ||
      queryParams.get('error_code') ||
      undefined,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    marginTop: 8,
    color: 'rgba(255,255,255,0.60)',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#EF4444',
  },
  subText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.40)',
  },
});
