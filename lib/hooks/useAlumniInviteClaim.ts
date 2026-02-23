/**
 * useAlumniInviteClaim — Hook for the public invite-claim flow (mobile).
 *
 * Token validation → auth signup → accept invite → redirect to onboarding.
 * Direct Supabase RPC calls (no core module for this).
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/adapters/core-client';
import type {
  AlumniInviteTokenResult,
  AlumniInviteAcceptResult,
} from '@clstr/shared/types/alumni-invite';

export function useAlumniInviteClaim(token: string | null) {
  const [isValidating, setIsValidating] = useState(false);
  const [inviteData, setInviteData] = useState<AlumniInviteTokenResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setError('No invite token provided');
      return;
    }

    let cancelled = false;

    const validate = async () => {
      setIsValidating(true);
      setError(null);

      try {
        const { data, error: rpcError } = await (supabase.rpc as any)('validate_alumni_invite_token', {
          p_token: token,
        });

        if (cancelled) return;

        if (rpcError) {
          setError(rpcError.message);
          return;
        }

        const result = data as unknown as AlumniInviteTokenResult;

        if (!result.valid) {
          setError(result.error ?? 'Invalid invite');
          return;
        }

        setInviteData(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Validation failed');
        }
      } finally {
        if (!cancelled) setIsValidating(false);
      }
    };

    validate();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Accept the invite (after auth user is created)
  const acceptInvite = useCallback(async (): Promise<AlumniInviteAcceptResult> => {
    if (!token) return { success: false, error: 'No token' };

    const { data, error: rpcError } = await (supabase.rpc as any)('accept_alumni_invite', {
      p_token: token,
    });

    if (rpcError) return { success: false, error: rpcError.message };
    return data as unknown as AlumniInviteAcceptResult;
  }, [token]);

  // Dispute the invite ("this isn't me")
  const disputeInvite = useCallback(
    async (reason?: string): Promise<boolean> => {
      if (!token) return false;

      const { data, error: rpcError } = await (supabase.rpc as any)('dispute_alumni_invite', {
        p_token: token,
        p_reason: reason ?? null,
      });

      if (rpcError) {
        setError(rpcError.message);
        return false;
      }

      const result = data as unknown as { success: boolean };
      return result.success;
    },
    [token],
  );

  return {
    isValidating,
    inviteData,
    error,
    acceptInvite,
    disputeInvite,
  };
}
