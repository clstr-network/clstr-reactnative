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
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './adapters/core-client';
import { createProfileRecord, mapUserTypeToRole, sanitizeSocialLinks } from './api/profile';
import { determineUserRoleFromGraduation, calculateGraduationYear } from '@clstr/core/api/alumni-identification';
import type { Session, User } from '@supabase/supabase-js';
import type { ProfileSignupPayload } from '@clstr/core/api/profile';

// Ensure any outstanding auth sessions are properly closed on web
if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

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
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  signInWithOtp: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  completeOnboarding: async () => {},
  login: async () => ({ error: null }),
  signup: async () => ({ error: null }),
  refresh: async () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate session on mount + subscribe to auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }: { data: { session: Session | null } }) => {
      setSession(s);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, s: Session | null) => {
      setSession(s);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Core auth methods ---

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const signInWithOtp = useCallback(async (email: string) => {
    const redirectTo = Linking.createURL('auth/callback');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw new Error(error.message);
    return { error: null };
  }, []);

  /**
   * Google OAuth — opens an in-app browser via expo-web-browser and
   * handles the redirect back to the app via the `clstr://` scheme.
   *
   * Matches the web's `supabase.auth.signInWithOAuth({ provider: 'google' })`
   * but uses the native OAuth flow via system browser.
   */
  const signInWithGoogle = useCallback(async () => {
    try {
      const redirectTo = Linking.createURL('auth/callback');

      // 1. Ask Supabase for the Google OAuth URL.
      //    skipBrowserRedirect prevents the JS client from navigating.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.url) throw new Error('No OAuth URL returned');

      // 2. Open the OAuth URL in a system browser / in-app browser.
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
        { showInRecents: true },
      );

      if (result.type === 'success' && result.url) {
        // 3. Extract tokens from the redirect URL and set the session.
        const url = result.url;

        // Try hash fragment first (implicit flow)
        const hashIndex = url.indexOf('#');
        if (hashIndex !== -1) {
          const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) throw new Error(sessionError.message);
            return { error: null };
          }
        }

        // Try query params (PKCE flow)
        const queryIndex = url.indexOf('?');
        if (queryIndex !== -1) {
          const queryParams = new URLSearchParams(url.substring(queryIndex + 1));
          const code = queryParams.get('code');
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw new Error(exchangeError.message);
            return { error: null };
          }
        }
      }

      if (result.type === 'cancel' || result.type === 'dismiss') {
        // User cancelled — not an error
        return { error: null };
      }

      return { error: null };
    } catch (e: any) {
      throw new Error(e.message || 'Google sign-in failed');
    }
  }, []);

  const completeOnboarding = useCallback(
    async (data: OnboardingPayload) => {
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
    },
    [session],
  );

  const refresh = useCallback(async () => {
    await supabase.auth.refreshSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        isAuthenticated: !!session?.user,
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
