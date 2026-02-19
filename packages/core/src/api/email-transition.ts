/**
 * Email Transition Service — Cross-Platform
 *
 * Handles the college-to-personal email transition flow.
 * All functions accept a `client: SupabaseClient` parameter.
 *
 * `requestVerificationEmail` uses `appUrl` parameter instead of
 * `window.location.origin` so it works on both web and React Native.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ── Types ────────────────────────────────────────────────────────────────────

export type EmailTransitionStatus = 'none' | 'pending' | 'verified' | 'transitioned';

export interface EmailTransitionState {
  college_email: string | null;
  personal_email: string | null;
  personal_email_verified: boolean;
  personal_email_verified_at: string | null;
  email_transition_status: EmailTransitionStatus;
  graduation_year: string | null;
  role: string | null;
  is_near_graduation: boolean;
  prompt_dismissed_at: string | null;
}

export interface EmailTransitionResult {
  success: boolean;
  error?: string;
  status?: EmailTransitionStatus;
  message?: string;
  college_email?: string;
  new_primary_email?: string;
  /** @deprecated OTP code is never returned to the client (CB-1 fix). */
  code?: never;
  expires_in_seconds?: number;
  cooldown_remaining?: number;
  cooldown_seconds?: number;
  attempts_remaining?: number;
  expired?: boolean;
  locked?: boolean;
  email_sent?: boolean;
  retry_after_hours?: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Resend cooldown in seconds (matches DB-side constant) */
export const RESEND_COOLDOWN_SECONDS = 60;

/** Max code length */
export const CODE_LENGTH = 6;

// ── Email Sending (internal) ─────────────────────────────────────────────────

/**
 * Request the Edge Function to generate a verification code server-side
 * and email it.
 *
 * @param client - Supabase client
 * @param to     - Destination email address
 * @param appUrl - Application base URL (replaces `window.location.origin`)
 * @param type   - 'verification' | 'resend'
 */
async function requestVerificationEmail(
  client: SupabaseClient,
  to: string,
  appUrl: string,
  type: 'verification' | 'resend' = 'verification',
): Promise<{
  success: boolean;
  error?: string;
  expires_in_seconds?: number;
  cooldown_seconds?: number;
  cooldown_remaining?: number;
  retry_after_hours?: number;
}> {
  try {
    const { data, error } = await client.functions.invoke(
      'send-verification-email',
      {
        body: { to, type, appUrl },
      },
    );

    if (error) {
      console.error('[email-transition] Edge Function error:', error.message);
      return {
        success: false,
        error: 'Failed to send verification email. Please try again.',
      };
    }

    if (!data?.success) {
      return {
        success: false,
        error: data?.error || 'Failed to send verification email',
        cooldown_remaining: data?.cooldown_remaining,
        retry_after_hours: data?.retry_after_hours,
      };
    }

    return {
      success: true,
      expires_in_seconds: data?.expires_in_seconds,
      cooldown_seconds: data?.cooldown_seconds,
    };
  } catch (err) {
    console.error(
      '[email-transition] Edge function unreachable:',
      (err as Error).message,
    );
    return {
      success: false,
      error: 'Email service temporarily unavailable. Please retry shortly.',
    };
  }
}

// ── Service Functions ────────────────────────────────────────────────────────

/**
 * Get the current email transition status from Supabase.
 * Reads exclusively from DB via RPC — no local state.
 */
export async function getEmailTransitionStatus(
  client: SupabaseClient,
): Promise<EmailTransitionState> {
  const { data, error } = await client.rpc('get_email_transition_status');

  if (error) {
    throw new Error(`Failed to get email transition status: ${error.message}`);
  }

  const result = data as Record<string, unknown>;

  if (!result?.success) {
    throw new Error(
      (result?.error as string) || 'Failed to get email transition status',
    );
  }

  return {
    college_email: (result.college_email as string) ?? null,
    personal_email: (result.personal_email as string) ?? null,
    personal_email_verified: Boolean(result.personal_email_verified),
    personal_email_verified_at:
      (result.personal_email_verified_at as string) ?? null,
    email_transition_status:
      (result.email_transition_status as EmailTransitionStatus) ?? 'none',
    graduation_year: (result.graduation_year as string) ?? null,
    role: (result.role as string) ?? null,
    is_near_graduation: Boolean(result.is_near_graduation),
    prompt_dismissed_at: (result.prompt_dismissed_at as string) ?? null,
  };
}

/**
 * Request to link a personal email.
 * Stores it in pending state in DB, then generates a DB-backed verification
 * code, then sends email with the code.
 *
 * @param client        - Supabase client
 * @param personalEmail - The personal email to link
 * @param appUrl        - Application base URL (for the verification email link)
 */
export async function requestPersonalEmailLink(
  client: SupabaseClient,
  personalEmail: string,
  appUrl: string,
): Promise<EmailTransitionResult> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(personalEmail)) {
    return { success: false, error: 'Invalid email format' };
  }

  const normalizedEmail = personalEmail.toLowerCase().trim();

  const { data, error } = await client.rpc('request_personal_email_link', {
    p_personal_email: normalizedEmail,
  });

  if (error) {
    return { success: false, error: `Database error: ${error.message}` };
  }

  const result = data as Record<string, unknown>;

  if (!result?.success) {
    return {
      success: false,
      error: (result?.error as string) || 'Failed to link email',
    };
  }

  const emailResult = await requestVerificationEmail(
    client,
    normalizedEmail,
    appUrl,
    'verification',
  );

  if (!emailResult.success) {
    if (emailResult.cooldown_remaining) {
      return {
        success: false,
        error:
          emailResult.error || 'Please wait before requesting a new code',
        cooldown_remaining: emailResult.cooldown_remaining,
      };
    }
    if (emailResult.retry_after_hours) {
      return {
        success: false,
        error:
          emailResult.error || 'Too many attempts. Please try again later.',
      };
    }
    return {
      success: false,
      error:
        emailResult.error ||
        'Failed to send verification email. Email saved — please try again.',
    };
  }

  return {
    success: true,
    status: 'pending',
    expires_in_seconds: emailResult.expires_in_seconds,
    cooldown_seconds: emailResult.cooldown_seconds,
    email_sent: true,
  };
}

/**
 * Resend the verification code for a pending personal email.
 *
 * @param client        - Supabase client
 * @param personalEmail - The personal email to resend code to
 * @param appUrl        - Application base URL
 */
export async function resendVerificationCode(
  client: SupabaseClient,
  personalEmail: string,
  appUrl: string,
): Promise<EmailTransitionResult> {
  const normalizedEmail = personalEmail.toLowerCase().trim();

  const emailResult = await requestVerificationEmail(
    client,
    normalizedEmail,
    appUrl,
    'resend',
  );

  if (!emailResult.success) {
    if (emailResult.cooldown_remaining) {
      return {
        success: false,
        error:
          emailResult.error || 'Please wait before requesting a new code',
        cooldown_remaining: emailResult.cooldown_remaining,
      };
    }
    if (emailResult.retry_after_hours) {
      return {
        success: false,
        error:
          emailResult.error || 'Too many attempts. Please try again later.',
        retry_after_hours: emailResult.retry_after_hours,
      };
    }
    return {
      success: false,
      error: emailResult.error || 'Failed to resend code',
    };
  }

  return {
    success: true,
    status: 'pending',
    expires_in_seconds: emailResult.expires_in_seconds,
    cooldown_seconds: emailResult.cooldown_seconds,
    email_sent: true,
  };
}

/**
 * Verify the personal email using the 6-digit DB-backed code.
 */
export async function verifyPersonalEmail(
  client: SupabaseClient,
  code: string,
): Promise<EmailTransitionResult> {
  if (!code || code.trim().length === 0) {
    return { success: false, error: 'Please enter your verification code' };
  }

  if (code.trim().length !== CODE_LENGTH) {
    return {
      success: false,
      error: `Please enter all ${CODE_LENGTH} digits`,
    };
  }

  if (!/^\d{6}$/.test(code.trim())) {
    return {
      success: false,
      error: 'Verification code must be 6 digits',
    };
  }

  const { data, error } = await client.rpc('verify_personal_email_code', {
    p_code: code.trim(),
  });

  if (error) {
    if (error.message?.includes('JWT') || error.message?.includes('auth')) {
      return {
        success: false,
        error: 'Your session has expired. Please sign in again.',
      };
    }
    return { success: false, error: `Verification failed: ${error.message}` };
  }

  const result = data as Record<string, unknown>;

  if (!result?.success) {
    return {
      success: false,
      error: (result?.error as string) || 'Verification failed',
      attempts_remaining: result?.attempts_remaining as number | undefined,
      expired: result?.expired as boolean | undefined,
      locked: result?.locked as boolean | undefined,
    };
  }

  return {
    success: true,
    status: (result.status as EmailTransitionStatus) ?? 'verified',
    message: (result.message as string) ?? undefined,
  };
}

/**
 * Transition the login email from college to personal.
 * Only callable when personal email is already verified.
 */
export async function transitionToPersonalEmail(
  client: SupabaseClient,
): Promise<EmailTransitionResult> {
  const statusResult = await getEmailTransitionStatus(client);
  if (!statusResult.personal_email || !statusResult.personal_email_verified) {
    return {
      success: false,
      error: 'Personal email must be verified before transitioning',
    };
  }

  const personalEmail = statusResult.personal_email;

  const { data, error } = await client.rpc('transition_to_personal_email');

  if (error) {
    return { success: false, error: `Transition failed: ${error.message}` };
  }

  const result = data as Record<string, unknown>;

  if (!result?.success) {
    return {
      success: false,
      error: (result?.error as string) || 'Transition failed',
    };
  }

  const authEmailUpdated = result.auth_email_updated as boolean;

  if (!authEmailUpdated && result.auth_error) {
    console.error(
      '[email-transition] Profile transitioned but auth email update failed:',
      result.auth_error,
    );
    return {
      success: true,
      status: 'transitioned',
      college_email: (result.college_email as string) ?? undefined,
      new_primary_email: personalEmail,
      error:
        'Transition saved but login email update failed. Go to Settings and click "Finalize login email" to retry.',
    };
  }

  return {
    success: true,
    status: 'transitioned',
    college_email: (result.college_email as string) ?? undefined,
    new_primary_email: personalEmail,
    message: `Your login email has been changed to ${personalEmail}. You can now sign in with Google using this email.`,
  };
}

/**
 * Remove the linked personal email (only if not yet transitioned).
 */
export async function removePersonalEmail(
  client: SupabaseClient,
): Promise<EmailTransitionResult> {
  const { data, error } = await client.rpc('remove_personal_email');

  if (error) {
    return { success: false, error: `Failed to remove: ${error.message}` };
  }

  const result = data as Record<string, unknown>;

  if (!result?.success) {
    return {
      success: false,
      error: (result?.error as string) || 'Failed to remove personal email',
    };
  }

  return { success: true, status: 'none' };
}

/**
 * Dismiss the personal email prompt (persisted in DB).
 * The prompt will re-appear after 30 days.
 */
export async function dismissPersonalEmailPrompt(
  client: SupabaseClient,
): Promise<EmailTransitionResult> {
  const { data, error } = await client.rpc('dismiss_personal_email_prompt');

  if (error) {
    return { success: false, error: `Failed to dismiss: ${error.message}` };
  }

  const result = data as Record<string, unknown>;

  if (!result?.success) {
    return {
      success: false,
      error: (result?.error as string) || 'Failed to dismiss',
    };
  }

  return { success: true };
}

/**
 * Check if user should be prompted to add a personal email.
 * Pure function — no Supabase dependency.
 */
export function shouldPromptPersonalEmail(
  state: EmailTransitionState,
): boolean {
  if (state.email_transition_status !== 'none') return false;
  if (state.role !== 'Student' && state.role !== 'Alumni') return false;

  if (state.prompt_dismissed_at) {
    const dismissedAt = new Date(state.prompt_dismissed_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (dismissedAt > thirtyDaysAgo) return false;
  }

  if (state.role === 'Alumni') return true;

  return state.is_near_graduation;
}

/**
 * Finalize the auth-level email change for an already transitioned account.
 */
export async function retryAuthEmailChange(
  client: SupabaseClient,
): Promise<EmailTransitionResult> {
  const { data, error } = await client.rpc('finalize_auth_email_change');

  if (error) {
    return {
      success: false,
      error: `Failed to finalize email change: ${error.message}`,
    };
  }

  const result = data as Record<string, unknown>;

  if (!result?.success) {
    return {
      success: false,
      error: (result?.error as string) || 'Failed to finalize email change',
    };
  }

  return {
    success: true,
    message:
      (result.message as string) || 'Login email updated successfully.',
  };
}

/**
 * Merge a duplicate auth user into the original profile.
 *
 * After this call succeeds, the caller's JWT is INVALID (the auth user was
 * deleted). The client MUST sign out and redirect to login.
 */
export async function mergeTransitionedAccount(
  client: SupabaseClient,
): Promise<{
  success: boolean;
  error?: string;
  merged_into_user_id?: string;
  message?: string;
}> {
  const { data, error } = await client.rpc('merge_transitioned_account');

  if (error) {
    return { success: false, error: `Merge failed: ${error.message}` };
  }

  const result = data as Record<string, unknown>;

  if (!result?.success) {
    return {
      success: false,
      error: (result?.error as string) || 'Merge failed',
    };
  }

  return {
    success: true,
    merged_into_user_id: result.merged_into_user_id as string,
    message: (result.message as string) || 'Account merged successfully',
  };
}

/**
 * Check if a given email belongs to an existing transitioned profile
 * that is different from the specified user ID.
 */
export async function findTransitionedProfileForEmail(
  client: SupabaseClient,
  email: string,
  excludeUserId: string,
): Promise<{
  id: string;
  college_email: string;
  email_transition_status: string;
} | null> {
  const { data, error } = await client
    .from('profiles')
    .select('id, email, email_transition_status')
    .eq('personal_email', email.toLowerCase())
    .eq('email_transition_status', 'transitioned')
    .eq('personal_email_verified', true)
    .eq('onboarding_complete', true)
    .neq('id', excludeUserId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    college_email: data.email,
    email_transition_status: data.email_transition_status ?? 'transitioned',
  };
}

/**
 * Determine the display status for the UI badge.
 * Pure function — no Supabase dependency.
 */
export function getTransitionDisplayStatus(
  status: EmailTransitionStatus,
): { label: string; variant: 'default' | 'warning' | 'success' | 'info' } {
  switch (status) {
    case 'none':
      return { label: 'Not linked', variant: 'default' };
    case 'pending':
      return { label: 'Verification pending', variant: 'warning' };
    case 'verified':
      return { label: 'Verified', variant: 'success' };
    case 'transitioned':
      return { label: 'Active (Primary)', variant: 'info' };
    default:
      return { label: 'Unknown', variant: 'default' };
  }
}
