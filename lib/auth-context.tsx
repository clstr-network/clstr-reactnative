/**
 * AuthProvider — Supabase-backed auth context for mobile.
 *
 * Exposes signIn / signUp / signOut / signInWithOtp / signInWithGoogle /
 * completeOnboarding.
 * Also provides backwards-compatible `login` and `signup` aliases so
 * existing (auth)/login.tsx and signup.tsx screens keep working.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from './adapters/core-client';
import { subscriptionManager } from './realtime/subscription-manager';
import { reset as resetDeepLinkQueue } from './deep-link-queue';
import { createProfileRecord, mapUserTypeToRole, sanitizeSocialLinks } from './api/profile';
import { determineUserRoleFromGraduation, calculateGraduationYear } from '@clstr/core/api/alumni-identification';
import type { Session, User } from '@supabase/supabase-js';
import type { ProfileSignupPayload } from '@clstr/core/api/profile';

const AUTH_MODE = process.env.EXPO_PUBLIC_AUTH_MODE;

// Required for expo-web-browser auth sessions to complete properly on web
WebBrowser.maybeCompleteAuthSession();

/**
 * Redirect URI for OAuth callbacks.
 *
 * Linking.createURL() produces the correct scheme for every environment:
 *   • Dev build  → clstr://auth/callback   (custom scheme registered in app.json)
 *   • Expo Go    → exp://192.168.x.x:8081/--/auth/callback
 *
 * The path "auth/callback" is important — Supabase's redirect-URL allowlist
 * must contain this exact URI (or a wildcard like clstr://**).
 */
const redirectTo = Linking.createURL('auth/callback');

/**
 * Extract session tokens from a Supabase OAuth callback URL.
 *
 * Supports BOTH OAuth flows:
 *   • Implicit → URL contains #access_token=…&refresh_token=…
 *   • PKCE     → URL contains ?code=… (exchanged server-side for tokens)
 *
 * expo-auth-session's getQueryParams reads both query-string and hash params.
 */
const createSessionFromUrl = async (url: string) => {
  console.log('[createSessionFromUrl] Processing URL:', url?.substring(0, 120));
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    console.error('[createSessionFromUrl] Error code:', errorCode);
    throw new Error(errorCode);
  }

  const { access_token, refresh_token, code } = params;

  // --- PKCE flow: exchange authorisation code for session ---
  if (code) {
    console.log('[createSessionFromUrl] Exchanging PKCE code for session…');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw new Error(error.message);
    console.log('[createSessionFromUrl] PKCE session set successfully');
    return data.session;
  }

  // --- Implicit flow: set session from tokens directly ---
  if (!access_token) {
    console.warn('[createSessionFromUrl] No access_token or code found in URL params');
    return;
  }

  console.log('[createSessionFromUrl] Setting session from implicit tokens…');
  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (error) throw new Error(error.message);
  console.log('[createSessionFromUrl] Implicit session set successfully');
  return data.session;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserRole = 'Student' | 'Alumni' | 'Faculty' | 'Club';

interface OnboardingPayload {
  fullName: string;
  role: string;
  // Existing
  department: string;
  graduationYear?: string;
  bio?: string;
  // NEW — matching web Onboarding.tsx
  university?: string;
  major?: string;
  enrollmentYear?: string;
  courseDurationYears?: string;
  interests?: string[];
  socialLinks?: {
    website?: string;
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
    googleScholar?: string;
  };
  avatarUrl?: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;

  // Core methods
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInWithOtp: (email: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  completeOnboarding: (data: OnboardingPayload) => Promise<void>;

  // Backwards-compatible aliases
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  signup: (email: string, password: string) => Promise<{ error: Error | null }>;

  // Legacy compat (settings.tsx uses `refresh`)
  refresh: () => Promise<void>;

  setMockSession: () => void;
  setHasCompletedOnboarding: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  signInWithOtp: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  completeOnboarding: async () => {},
  login: async () => ({ error: null }),
  signup: async () => ({ error: null }),
  refresh: async () => {},
  setMockSession: () => {},
  setHasCompletedOnboarding: () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  const setMockSession = useCallback(() => {
    const mockSession = {
      user: {
        id: 'mock-user-001',
        email: 'mockuser@example.com',
        name: 'Mock User',
        is_onboarded: true,
      },
      access_token: 'mock-token-xyz',
    };

    setSession(mockSession as unknown as Session);
    setIsAuthenticated(true);
    setHasCompletedOnboarding(true);
    setIsLoading(false);
  }, []);

  // Android: pre-warm the custom-tab browser so it opens faster on OAuth
  useEffect(() => {
    if (Platform.OS === 'android') {
      WebBrowser.warmUpAsync();
      return () => { WebBrowser.coolDownAsync(); };
    }
  }, []);

  // Hydrate session on mount + subscribe to auth state changes
  useEffect(() => {
    if (AUTH_MODE === 'mock') {
      setMockSession();
      return;
    }

    let isMounted = true;

    const hydrateSession = async () => {
      try {
        const { data: { session: hydratedSession } } = await supabase.auth.getSession();
        if (isMounted) {
          setSession(hydratedSession);
          setIsAuthenticated(!!hydratedSession?.user);
          setHasCompletedOnboarding(
            Boolean((hydratedSession?.user?.user_metadata as Record<string, unknown> | undefined)?.is_onboarded),
          );
        }
      } catch (error) {
        console.error('[AuthProvider] Failed to hydrate session:', error);
        if (isMounted) {
          setSession(null);
          setIsAuthenticated(false);
          setHasCompletedOnboarding(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    hydrateSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, s: Session | null) => {
      setSession(s);
      setIsAuthenticated(!!s?.user);
      setHasCompletedOnboarding(
        Boolean((s?.user?.user_metadata as Record<string, unknown> | undefined)?.is_onboarded),
      );
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setMockSession]);

  // --- Deep-link fallback for OAuth redirects ---
  // Catches redirects that bypass openAuthSessionAsync on some Android versions.
  // This follows the Supabase blog pattern exactly.
  const url = Linking.useURL();
  useEffect(() => {
    if (AUTH_MODE === 'mock') return;

    if (url && (url.includes('access_token') || url.includes('code='))) {
      console.log('[AuthProvider] useURL received auth redirect:', url.substring(0, 100));
      createSessionFromUrl(url).catch((e) =>
        console.error('[AuthProvider] useURL session error:', e.message),
      );
    }
  }, [url]);

  // --- Core auth methods ---

  const signIn = useCallback(async (email: string, password: string) => {
    if (AUTH_MODE === 'mock') {
      setMockSession();
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return { error: null };
  }, [setMockSession]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (AUTH_MODE === 'mock') {
      setMockSession();
      return { error: null };
    }

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    return { error: null };
  }, [setMockSession]);

  const signOut = useCallback(async () => {
    if (AUTH_MODE === 'mock') return setMockSession();

    // Tear down all realtime channels before signing out
    subscriptionManager.unsubscribeAll();
    // Reset deep link queue to prevent stale links from replaying
    resetDeepLinkQueue();
    await supabase.auth.signOut();
    setHasCompletedOnboarding(false);
  }, [setMockSession]);

  const signInWithOtp = useCallback(async (email: string) => {
    if (AUTH_MODE === 'mock') {
      setMockSession();
      return { error: null };
    }

    // Use web callback URL so Supabase recognises it from the redirect allowlist.
    // The user taps the magic link on their phone → opens the app via intent filter
    // or opens clstr.in/auth/callback in browser → app's auth/callback screen picks it up.
    const redirectTo = 'https://clstr.in/auth/callback';
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw new Error(error.message);
    return { error: null };
  }, [setMockSession]);

  /**
   * Google OAuth.
   *
   * Web:    Uses Supabase's built-in full-page redirect (no popup).
   *
   * Native: Opens a system browser via expo-web-browser.
   *         The redirect URI is built with Linking.createURL('auth/callback')
   *         which resolves to:
   *           • Dev build  → clstr://auth/callback
   *           • Expo Go    → exp://IP:PORT/--/auth/callback
   *
   *         IMPORTANT: This exact URI must be allow-listed in Supabase →
   *         Authentication → URL Configuration → Redirect URLs.
   *
   *         Flow: User taps button → browser opens Google consent screen →
   *         Google redirects to Supabase /auth/v1/callback →
   *         Supabase redirects to our app via the deep-link URI →
   *         WebBrowser.openAuthSessionAsync detects the redirect and closes →
   *         createSessionFromUrl() parses tokens → onAuthStateChange fires.
   */
  const signInWithGoogle = useCallback(async () => {
    if (AUTH_MODE === 'mock') {
      setMockSession();
      return { error: null };
    }

    try {
      if (Platform.OS === 'web') {
        // Web: full-page redirect — avoids popup-blocker blank screen
        const webCallbackUrl = Linking.createURL('auth/callback');
        console.log('[signInWithGoogle] Web redirect →', webCallbackUrl);

        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: webCallbackUrl,
          },
        });

        if (error) throw new Error(error.message);
        return { error: null };
      }

      // ----- Native (iOS / Android) -----
      console.log('[signInWithGoogle] Native redirect URI:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true, // we open the browser ourselves
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.url) throw new Error('No OAuth URL returned from Supabase');

      console.log('[signInWithGoogle] Opening system browser…');

      // openAuthSessionAsync opens a Custom Tab (Android) / ASWebAuthenticationSession (iOS).
      // It watches for any redirect whose URL starts with `redirectTo` and auto-closes.
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
        {
          // Show the share button on iOS for easier debugging in dev
          showInRecents: true,
          // Android: prefer Custom Tabs (default), fall back to browser
          createTask: false,
        },
      );

      console.log('[signInWithGoogle] Browser result:', result.type);

      if (result.type === 'success' && result.url) {
        console.log('[signInWithGoogle] Callback URL:', result.url.substring(0, 120));
        await createSessionFromUrl(result.url);
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        console.log('[signInWithGoogle] User cancelled/dismissed the browser');
        // Not an error — user simply closed the browser
      }

      return { error: null };
    } catch (e: any) {
      console.error('[signInWithGoogle] Error:', e.message);
      throw new Error(e.message || 'Google sign-in failed');
    }
  }, [setMockSession]);



  const completeOnboarding = useCallback(
    async (data: OnboardingPayload) => {
      if (AUTH_MODE === 'mock') {
        setHasCompletedOnboarding(true);
        return;
      }

      const user = session?.user;
      if (!user) throw new Error('Not authenticated');

      const email = user.email ?? '';
      const domain = email.split('@')[1] ?? null;
      const fullName = data.fullName.trim();

      // Determine role from graduation timeline (matching web logic)
      const isStaffRole = data.role === 'Faculty' || data.role === 'Principal' || data.role === 'Dean';
      let resolvedRole: string;
      let finalGraduationYear: string | null = null;

      if (isStaffRole) {
        resolvedRole = data.role;
        finalGraduationYear = data.graduationYear || null;
      } else {
        // Auto-calculate graduation year from enrollment + duration
        const enrollmentYear = data.enrollmentYear ? parseInt(data.enrollmentYear, 10) : null;
        const duration = data.courseDurationYears ? parseInt(data.courseDurationYears, 10) : 4;
        const calculatedGradYear = enrollmentYear
          ? calculateGraduationYear(enrollmentYear, duration)
          : null;
        finalGraduationYear = calculatedGradYear?.toString() || data.graduationYear || null;
        resolvedRole = determineUserRoleFromGraduation(finalGraduationYear, data.role);
      }

      const mappedRole = mapUserTypeToRole(resolvedRole) ?? 'Student';
      const university = data.university?.trim() || null;
      const major = data.major?.trim() || data.department?.trim() || null;
      const sanitizedSocialLinks = data.socialLinks
        ? sanitizeSocialLinks(data.socialLinks)
        : {};

      const enrollmentYearVal = data.enrollmentYear ? parseInt(data.enrollmentYear, 10) : null;
      const courseDurationVal = data.courseDurationYears ? parseInt(data.courseDurationYears, 10) : 4;

      const headline = `${major || 'Student'} · ${university || domain || 'University'}`;

      // Upsert main profile (matching web Onboarding.tsx directly)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email,
            full_name: fullName,
            role: mappedRole,
            college_domain: domain,
            university: university || null,
            major: major || null,
            branch: major || null,
            graduation_year: finalGraduationYear,
            year_of_completion: finalGraduationYear,
            enrollment_year: enrollmentYearVal,
            course_duration_years: courseDurationVal,
            bio: data.bio?.trim() || null,
            interests: data.interests || [],
            social_links: sanitizedSocialLinks,
            avatar_url: data.avatarUrl || null,
            headline,
            location: university || domain || null,
            onboarding_complete: true,
          } as any,
          { onConflict: 'id' },
        );

      if (profileError) {
        console.error('[completeOnboarding] Profile upsert error:', profileError);
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }

      // Create role-specific profile records (matching web)
      if (mappedRole === 'Student') {
        const { error: studentError } = await supabase
          .from('student_profiles')
          .upsert(
            {
              user_id: user.id,
              college_domain: domain,
              expected_graduation: finalGraduationYear
                ? `${finalGraduationYear}-06-01`
                : null,
            } as any,
            { onConflict: 'user_id' },
          );
        if (studentError) {
          console.warn('[completeOnboarding] Student profile error:', studentError);
        }
      }

      if (mappedRole === 'Alumni') {
        const gradYearNum = finalGraduationYear ? parseInt(finalGraduationYear, 10) : null;
        if (gradYearNum && !isNaN(gradYearNum)) {
          const { error: alumniError } = await supabase
            .from('alumni_profiles')
            .upsert(
              {
                user_id: user.id,
                college_domain: domain,
                graduation_year: gradYearNum,
                graduation_date: `${finalGraduationYear}-06-01`,
                linkedin_url: sanitizedSocialLinks.linkedin ?? null,
                company_website: sanitizedSocialLinks.website ?? null,
              } as any,
              { onConflict: 'user_id' },
            );
          if (alumniError) {
            console.warn('[completeOnboarding] Alumni profile error:', alumniError);
          }
        }
      }

      if (isStaffRole) {
        const { error: facultyError } = await supabase
          .from('faculty_profiles')
          .upsert(
            {
              user_id: user.id,
              college_domain: domain,
              department: major || 'Unknown',
              position: resolvedRole,
            } as any,
            { onConflict: 'user_id' },
          );
        if (facultyError) {
          console.warn('[completeOnboarding] Faculty profile error:', facultyError);
        }
      }

      setHasCompletedOnboarding(true);
    },
    [session],
  );

  const refresh = useCallback(async () => {
    if (AUTH_MODE === 'mock') return setMockSession();

    await supabase.auth.refreshSession();
  }, [setMockSession]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        isAuthenticated,
        hasCompletedOnboarding,
        signIn,
        signUp,
        signOut,
        signInWithOtp,
        signInWithGoogle,
        completeOnboarding,
        // Backwards-compatible aliases
        login: signIn,
        signup: signUp,
        refresh,
        setMockSession,
        setHasCompletedOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
