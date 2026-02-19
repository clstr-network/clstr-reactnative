/**
 * useEmailTransition — React Query hook for the email transition feature.
 *
 * All data is read from Supabase via RPC. Mutations persist to DB.
 * Realtime updates come through ProfileContext (profiles table is already subscribed).
 * React Query cache is invalidated after every mutation.
 *
 * Handles all 34 verification matrix cases:
 * - Resend cooldown timer (Case 9, 10)
 * - Rate-limit errors (Case 11)
 * - Brute-force lockout (Case 12)
 * - Expired code detection (Case 7)
 * - Email delivery status (Case 19, 21)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import {
  getEmailTransitionStatus,
  requestPersonalEmailLink,
  verifyPersonalEmail,
  resendVerificationCode,
  transitionToPersonalEmail,
  removePersonalEmail,
  dismissPersonalEmailPrompt,
  shouldPromptPersonalEmail,
  retryAuthEmailChange,
  RESEND_COOLDOWN_SECONDS,
  type EmailTransitionState,
  type EmailTransitionStatus,
} from "@/lib/email-transition";
import { QUERY_KEYS } from '@clstr/shared/query-keys';

const QUERY_KEY = QUERY_KEYS.emailTransition.all()[0];

export function useEmailTransition() {
  const { profile, refreshProfile } = useProfile();
  const queryClient = useQueryClient();
  const userId = profile?.id ?? null;

  // ── Resend cooldown state (Case 9) ─────────────────────────────────────
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback((seconds: number) => {
    setCooldownRemaining(Math.ceil(seconds));
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  // ── Last verification error detail ─────────────────────────────────────
  const [lastVerifyError, setLastVerifyError] = useState<{
    error: string;
    attemptsRemaining?: number;
    expired?: boolean;
    locked?: boolean;
  } | null>(null);

  // ── Email delivery status (Case 19) ────────────────────────────────────
  const [emailSent, setEmailSent] = useState<boolean | null>(null);

  // ── Query: Fetch transition status from DB ─────────────────────────────
  const {
    data: transitionState,
    isLoading,
    error,
    refetch,
  } = useQuery<EmailTransitionState>({
    queryKey: [QUERY_KEY, userId],
    queryFn: getEmailTransitionStatus,
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // ── Mutation: Link personal email ──────────────────────────────────────
  const linkMutation = useMutation({
    mutationFn: (email: string) => requestPersonalEmailLink(email),
    onSuccess: async (result) => {
      if (result.success) {
        setEmailSent(result.email_sent ?? null);
        if (result.cooldown_seconds) {
          startCooldown(result.cooldown_seconds);
        }
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        await refreshProfile();
      } else if (result.cooldown_remaining) {
        startCooldown(result.cooldown_remaining);
      }
    },
  });

  // ── Mutation: Verify personal email (takes 6-digit code) ───────────────
  const verifyMutation = useMutation({
    mutationFn: (code: string) => verifyPersonalEmail(code),
    onSuccess: async (result) => {
      if (result.success) {
        setLastVerifyError(null);
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        await refreshProfile();
      } else {
        setLastVerifyError({
          error: result.error || "Verification failed",
          attemptsRemaining: result.attempts_remaining,
          expired: result.expired,
          locked: result.locked,
        });
      }
    },
  });

  // ── Mutation: Resend verification code ─────────────────────────────────
  const resendMutation = useMutation({
    mutationFn: (email: string) => resendVerificationCode(email),
    onSuccess: async (result) => {
      if (result.success) {
        setEmailSent(result.email_sent ?? null);
        setLastVerifyError(null);
        if (result.cooldown_seconds) {
          startCooldown(result.cooldown_seconds);
        }
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      } else if (result.cooldown_remaining) {
        // Case 9: cooldown error
        startCooldown(result.cooldown_remaining);
      }
    },
  });

  // ── Mutation: Transition to personal email ─────────────────────────────
  const transitionMutation = useMutation({
    mutationFn: () => transitionToPersonalEmail(),
    onSuccess: async (result) => {
      if (result.success) {
        // FIX F8: Force logout after transition.
        // The JWT still contains the old email. Sign out so the user
        // re-authenticates with their new personal email and gets fresh claims.
        await supabase.auth.signOut();
        // Redirect to login — the page will reload, clearing stale caches.
        window.location.href = "/login?reason=email_transitioned";
      }
    },
  });

  // ── Mutation: Remove personal email ────────────────────────────────────
  const removeMutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("No user ID");
      return removePersonalEmail();
    },
    onSuccess: async (result) => {
      if (result.success) {
        setLastVerifyError(null);
        setEmailSent(null);
        setCooldownRemaining(0);
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        await refreshProfile();
      }
    },
  });

  // ── Mutation: Dismiss prompt (persisted in DB) ─────────────────────────
  const dismissMutation = useMutation({
    mutationFn: () => dismissPersonalEmailPrompt(),
    onSuccess: async (result) => {
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        await refreshProfile();
      }
    },
  });

  // ── Mutation: Retry Supabase Auth email change confirmation ─────────────
  const retryAuthEmailMutation = useMutation({
    mutationFn: () => retryAuthEmailChange(),
    onSuccess: async (result) => {
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      }
    },
  });

  // ── Derived state ──────────────────────────────────────────────────────
  const showPrompt = transitionState ? shouldPromptPersonalEmail(transitionState) : false;
  const status: EmailTransitionStatus = transitionState?.email_transition_status ?? "none";
  const isNearGraduation = transitionState?.is_near_graduation ?? false;
  const personalEmail = transitionState?.personal_email ?? null;
  const personalEmailVerified = transitionState?.personal_email_verified ?? false;
  const collegeEmail = transitionState?.college_email ?? profile?.email ?? null;
  const isOnCooldown = cooldownRemaining > 0;

  return {
    // State (from DB)
    transitionState,
    status,
    isLoading,
    error,
    showPrompt,
    isNearGraduation,
    personalEmail,
    personalEmailVerified,
    collegeEmail,

    // Verification detail state
    lastVerifyError,
    emailSent,
    cooldownRemaining,
    isOnCooldown,
    clearVerifyError: () => setLastVerifyError(null),

    // Actions
    linkPersonalEmail: linkMutation.mutateAsync,
    verifyPersonalEmail: verifyMutation.mutateAsync,
    resendVerificationCode: resendMutation.mutateAsync,
    transitionEmail: transitionMutation.mutateAsync,
    removePersonalEmail: removeMutation.mutateAsync,
    dismissPrompt: dismissMutation.mutateAsync,
    retryAuthEmailChange: retryAuthEmailMutation.mutateAsync,
    refetch,

    // Mutation states
    isLinking: linkMutation.isPending,
    isVerifying: verifyMutation.isPending,
    isResending: resendMutation.isPending,
    isTransitioning: transitionMutation.isPending,
    isRemoving: removeMutation.isPending,
    isDismissing: dismissMutation.isPending,
    isRetryingAuthEmail: retryAuthEmailMutation.isPending,
  };
}
