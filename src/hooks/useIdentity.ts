/**
 * useIdentity — Authoritative identity resolution hook.
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
import type { IdentityContext, IdentityResult, InviteOpsStats } from '@/types/identity';
import { isResolvedIdentity } from '@/types/identity';
import { useCallback, useEffect } from 'react';

const IDENTITY_QUERY_KEY = ['identity-context'] as const;
const OPS_STATS_QUERY_KEY = ['invite-ops-stats'] as const;

/**
 * Fetch the canonical identity from the server.
 * Never touches auth.users.email.
 */
async function fetchIdentity(): Promise<IdentityContext | null> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user) return null;

  const { data, error } = await supabase.rpc('get_identity_context');

  if (error) {
    console.error('[useIdentity] RPC error:', error.message);
    return null;
  }

  const result = data as unknown as IdentityResult;

  if (!isResolvedIdentity(result)) {
    // User exists but has no profile yet — return a thin object
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
 * Primary hook — use everywhere instead of reading profile.email or auth.email.
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
    retry: false,                   // Don't retry on network failure — use cached data
  });

  // Invalidate identity when auth state changes (login/logout)
  useEffect(() => {
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
  // in realtime (e.g., admin changes role from Student → Alumni).
  // This closes the 5-minute stale window where useFeatureAccess could
  // return outdated permissions after a role change.
  useEffect(() => {
    const identity = query.data;
    if (!identity) return;

    const channel = supabase
      .channel('identity-profile-realtime')
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

    // ── Convenience accessors ──

    /** Is the user authenticated and has a resolved identity? */
    isAuthenticated: identity !== null,

    /** Is onboarding still required? Only true when we have a definitive answer.
     *  null identity from network error should NOT trigger onboarding redirect. */
    needsOnboarding: !query.error && (identity === null || !identity.onboarding_complete),

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

// ── Admin: Invite Ops Stats ──

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
    staleTime: 30 * 1000,          // 30 s — admins want near-realtime
    refetchInterval: 60 * 1000,    // auto-refresh every 60 s
    retry: 1,
  });
}
