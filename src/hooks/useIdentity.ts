/**
 * useIdentity â€” Authoritative identity resolution hook.
 *
 * Calls get_identity_context() RPC once after auth, caches via React Query.
 * All feature guards, permission checks, and domain-isolation filters
 * should read identity from this hook instead of `useProfile().profile.email`
 * or `supabase.auth.getUser().email`.
 *
 * This is a read-only, server-authoritative view of identity.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CHANNELS } from '@clstr/shared/realtime/channels';
import type { IdentityContext, IdentityResult, InviteOpsStats } from '@clstr/shared/types/identity';
import { isResolvedIdentity } from '@clstr/shared/types/identity';
import { useCallback, useEffect } from 'react';
import { QUERY_KEYS } from '@clstr/shared/query-keys';

const IDENTITY_QUERY_KEY = QUERY_KEYS.identity.context();
const OPS_STATS_QUERY_KEY = QUERY_KEYS.identity.inviteOpsStats();
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
    // User exists but has no profile yet â€” return a thin object
    // so consumers can react to onboarding state.
    if ('error' in result && result.error === 'no_profile') {
      return null;
    }
    console.warn('[useIdentity] Identity error:', (result as { error?: string }).error);
    return null;
  }

  return result;
}

/**
 * Primary hook â€” use everywhere instead of reading profile.email or auth.email.
 */
export function useIdentity() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: IDENTITY_QUERY_KEY,
    queryFn: fetchIdentity,
    staleTime: Infinity,            // Identity rarely changes; rely on realtime + manual invalidation
    gcTime: 1000 * 60 * 60 * 24,   // Keep in cache 24 hours for offline resilience
    refetchOnWindowFocus: false,    // don't spam RPC on tab switch
    refetchOnReconnect: true,       // Re-fetch when coming back online
    retry: false,                   // Don't retry on network failure â€” use cached data
  });

  // Invalidate identity when auth state changes (login/logout)
  useEffect(() => {
    if (AUTH_MODE === 'mock') return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          // Re-fetch identity on login or token refresh
          queryClient.invalidateQueries({ queryKey: IDENTITY_QUERY_KEY });
        } else {
          // Clear on logout
          queryClient.setQueryData(IDENTITY_QUERY_KEY, null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // LG-7 FIX: Invalidate identity cache when the user's profile row changes
  // in realtime (e.g., admin changes role from Student â†’ Alumni).
  // This closes the 5-minute stale window where useFeatureAccess could
  // return outdated permissions after a role change.
  useEffect(() => {
    if (AUTH_MODE === 'mock') return;

    const identity = query.data;
    if (!identity) return;

    const channel = supabase
      .channel(CHANNELS.identity.profileRealtime())
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${identity.user_id}`,
        },
        (payload) => {
          // Only invalidate if role or identity-critical fields changed
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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

    // â”€â”€ Convenience accessors â”€â”€

    /** Is the user authenticated and has a resolved identity? */
    isAuthenticated: AUTH_MODE === 'mock' ? true : identity !== null,

    /** Is onboarding still required? Only true when we have a definitive answer.
     *  null identity from network error should NOT trigger onboarding redirect. */
    needsOnboarding:
      AUTH_MODE === 'mock'
        ? false
        : !query.error && (identity === null || !identity.onboarding_complete),

    hasCompletedOnboarding:
      AUTH_MODE === 'mock'
        ? true
        : !!identity?.onboarding_complete,

    /** Canonical college domain for isolation */
    collegeDomain: identity?.college_domain ?? null,

    /** Identity source: student | alumni | faculty | club */
    source: identity?.source ?? null,

    /** Canonical role string */
    role: identity?.role ?? null,

    /** Is the user an alumni (including mid-onboarding)? */
    isAlumni: identity?.source === 'alumni' || identity?.source === 'alumni_invite_pending_onboarding',

    /** Is the user a student? */
    isStudent: identity?.source === 'student',

    /** Is the user faculty? */
    isFaculty: identity?.source === 'faculty',

    /** Is the user a club account? */
    isClub: identity?.source === 'club',
  };
}

// â”€â”€ Admin: Invite Ops Stats â”€â”€

async function fetchOpsStats(): Promise<InviteOpsStats> {
  const { data, error } = await supabase.rpc('get_invite_ops_stats');

  if (error) {
    throw new Error(error.message);
  }

  const result = data as unknown as InviteOpsStats | { error: string };
  if (result && typeof result === 'object' && 'error' in result) {
    throw new Error((result as { error: string }).error);
  }

  if (!result) {
    throw new Error('No data returned from get_invite_ops_stats');
  }

  return result as InviteOpsStats;
}

/**
 * Admin-only hook for the invite pipeline operational dashboard.
 */
export function useInviteOpsStats(enabled = true) {
  return useQuery({
    queryKey: OPS_STATS_QUERY_KEY,
    queryFn: fetchOpsStats,
    enabled,
    staleTime: 30 * 1000,          // 30 s â€” admins want near-realtime
    refetchInterval: 60 * 1000,    // auto-refresh every 60 s
    retry: 1,
  });
}
