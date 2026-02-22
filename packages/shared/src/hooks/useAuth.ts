/**
 * useAuth — Reactive authentication hook for CLSTR mobile + web.
 *
 * Listens to Supabase auth state changes and exposes:
 * - session, user, isLoading, isAuthenticated
 * - signIn(), signUp(), signInWithGoogle(), signOut()
 *
 * R4: Module-level Supabase client import — never create a client
 * inside a component body.
 */
import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    return supabase.auth.signUp({ email, password });
  }, []);

  /**
   * Native Google Sign-In → Supabase signInWithIdToken.
   * Uses @react-native-google-signin/google-signin on mobile.
   */
  const signInWithGoogle = useCallback(async () => {
    if (Platform.OS === 'web') {
      // Web uses signInWithOAuth (handled in src/pages/Login.tsx)
      return { error: new Error('Use web OAuth flow on web') };
    }

    try {
      const { GoogleSignin } = await import(
        '@react-native-google-signin/google-signin'
      );

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (!response.data?.idToken) {
        return { error: new Error('Google Sign-In failed: no ID token returned') };
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.data.idToken,
      });

      return { data, error };
    } catch (err: any) {
      return { error: err };
    }
  }, []);

  const signOut = useCallback(async () => {
    return supabase.auth.signOut();
  }, []);

  return {
    session,
    user: session?.user ?? null,
    isLoading,
    isAuthenticated: !!session?.user,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  };
}
