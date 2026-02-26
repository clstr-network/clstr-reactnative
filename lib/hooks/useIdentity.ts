/**
 * useIdentity — Authoritative identity resolution hook (mobile port).
 *
 * Calls get_identity_context() RPC once after auth, caches via React Query.
 * All feature guards, permission checks, and domain-isolation filters
 * should read identity from this hook instead of reading profile or auth email.
 *
 * This is a read-only, server-authoritative view of identity.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { supabase } from '@/lib/adapters/core-client';
import { subscriptionManager } from '@/lib/realtime/subscription-manager';
import type { Session } from '@supabase/supabase-js';
import { QUERY_KEYS } from '@/lib/query-keys';
import { CHANNELS } from '@/lib/channels';
import type { IdentityContext, IdentityResult } from '@clstr/core/types/identity';
import { isResolvedIdentity } from '@clstr/core/types/identity';

const IDENTITY_QUERY_KEY = QUERY_KEYS.identity;
const AUTH_MODE = process.env.EXPO_PUBLIC_AUTH_MODE;

/**
 * Fetch the canonical identity from the server.
 * Never touches auth.users.email.
 */
async function fetchIdentity(): Promise<IdentityContext | null> {
  if (AUTH_MODE === 'mock') {
    return {
      user_id: 'mock-user-001',
      role: 'Student',
      college_email: 'mockuser@example.com',
      college_domain: 'mock.dev',
      personal_email: null,
      source: 'student',
      full_name: 'Mock User',
      avatar_url: null,
      university: 'Mock University',
      major: 'UI Development',
      graduation_year: null,
      onboarding_complete: true,
      has_profile: true,
      is_verified: true,
      profile_completion: 100,
      email_transition_status: null,
      personal_email_verified: false,
    };
  }

  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user) return null;

  const { data, error } = await supabase.rpc('get_identity_context');

  if (error) {
    console.error('[useIdentity] RPC error:', error.message);
    return null;
  }

  const result = data as unknown as IdentityResult;

  if (!isResolvedIdentity(result)) {
    if ('error' in result && result.error === 'no_profile') {
      return null;
    }
    console.warn('[useIdentity] Identity error:', (result as { error?: string }).error);
    return null;
  }

  return result;
}

/**
 * Primary hook — use everywhere instead of reading profile.email or auth.email.
 */
export function useIdentity() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: IDENTITY_QUERY_KEY,
    queryFn: fetchIdentity,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24, // 24 hours — offline resilience
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: false,
  });

  // Invalidate identity when auth state changes (login/logout)
  useEffect(() => {
    if (AUTH_MODE === 'mock') return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      if (session?.user) {
        queryClient.invalidateQueries({ queryKey: IDENTITY_QUERY_KEY });
      } else {
        queryClient.setQueryData(IDENTITY_QUERY_KEY, null);
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // Invalidate identity cache when the user's profile row changes in realtime
  useEffect(() => {
    if (AUTH_MODE === 'mock') return;

    const identity = query.data;
    if (!identity) return;

    const channelName = CHANNELS.profileIdentity();

    const createChannel = () =>
      supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${identity.user_id}`,
          },
          (payload: Record<string, any>) => {
            const newRow = payload.new as Record<string, unknown>;
            const oldRow = payload.old as Record<string, unknown>;
            if (
              newRow.role !== oldRow.role ||
              newRow.email !== oldRow.email ||
              newRow.college_domain !== oldRow.college_domain ||
              newRow.is_verified !== oldRow.is_verified
            ) {
              queryClient.invalidateQueries({ queryKey: IDENTITY_QUERY_KEY });
            }
          },
        )
        .subscribe();

    const channel = createChannel();
    subscriptionManager.subscribe(channelName, channel, createChannel);

    return () => {
      subscriptionManager.unsubscribe(channelName);
    };
  }, [query.data, queryClient]);

  const refreshIdentity = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: IDENTITY_QUERY_KEY });
  }, [queryClient]);

  const identity = query.data ?? null;

  return {
    /** The authoritative identity tuple, or null if not authenticated / no profile */
    identity,

    /** True while the first fetch is in flight */
    isLoading: query.isLoading,

    /** Query error (network/RPC failure) */
    error: query.error,

    /** Force re-fetch from server */
    refreshIdentity,

    // — Convenience accessors —

    /** Is the user authenticated and has a resolved identity? */
    isAuthenticated: AUTH_MODE === 'mock' ? true : identity !== null,

    /** Lightweight mock user accessor for UI mode. */
    user:
      AUTH_MODE === 'mock'
        ? { id: 'mock-user-001', is_onboarded: true }
        : identity
          ? { id: identity.user_id, is_onboarded: identity.onboarding_complete }
          : null,

    /** Explicit onboarding completion flag. */
    hasCompletedOnboarding:
      AUTH_MODE === 'mock'
        ? true
        : !!identity?.onboarding_complete,

    /** Is onboarding still required? */
    needsOnboarding:
      AUTH_MODE === 'mock'
        ? false
        : !query.error && (identity === null || !identity.onboarding_complete),

    /** Canonical college domain for isolation */
    collegeDomain: identity?.college_domain ?? null,

    /** Identity source: student | alumni | faculty | club */
    source: identity?.source ?? null,

    /** Canonical role string */
    role: identity?.role ?? null,

    /** Is the user an alumni (including mid-onboarding)? */
    isAlumni:
      identity?.source === 'alumni' ||
      identity?.source === 'alumni_invite_pending_onboarding',

    /** Is the user a student? */
    isStudent: identity?.source === 'student',

    /** Is the user faculty? */
    isFaculty: identity?.source === 'faculty',

    /** Is the user a club account? */
    isClub: identity?.source === 'club',
  };
}
