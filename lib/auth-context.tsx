/**
 * AuthProvider — Supabase-backed auth context for mobile.
 *
 * Exposes signIn / signUp / signOut / signInWithOtp / completeOnboarding.
 * Also provides backwards-compatible `login` and `signup` aliases so
 * existing (auth)/login.tsx and signup.tsx screens keep working.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from './adapters/core-client';
import { createProfileRecord, mapUserTypeToRole } from './api/profile';
import type { Session, User } from '@supabase/supabase-js';
import type { ProfileSignupPayload } from '@clstr/core/api/profile';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserRole = 'Student' | 'Alumni' | 'Faculty' | 'Club';

interface OnboardingPayload {
  fullName: string;
  department: string;
  graduationYear?: string;
  bio?: string;
  role: string;
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

  const completeOnboarding = useCallback(
    async (data: OnboardingPayload) => {
      const user = session?.user;
      if (!user) throw new Error('Not authenticated');

      const mappedRole = mapUserTypeToRole(data.role) ?? 'Student';
      const domain = user.email?.split('@')[1] ?? null;

      const payload: ProfileSignupPayload = {
        id: user.id,
        email: user.email ?? '',
        full_name: data.fullName,
        role: mappedRole,
        college_domain: domain,
        major: data.department || null,
        graduation_year: data.graduationYear || null,
        bio: data.bio || null,
        onboarding_complete: true,
      };

      await createProfileRecord(payload);
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
