/**
 * Email Transition Service
 *
 * Handles the college-to-personal email transition flow:
 * 1. Student signs up with college email (identity)
 * 2. Before graduation, adds personal email (lifetime access)
 * 3. Personal email gets verified via DB-generated verification code (hashed)
 * 4. After graduation, personal email becomes primary login
 *
 * All state is persisted in Supabase `profiles` table.
 * Verification codes stored in `email_verification_codes` table (bcrypt hashed).
 * No local state, no demo data, no JSON blobs.
 *
 * Complete verification matrix (34 cases):
 * - Happy path (Cases 1-3)
 * - User error (Cases 4-8): wrong code, partial, empty, expired, reuse
 * - Resend (Cases 9-11): cooldown, rate-limit, max per 24h
 * - Security (Cases 12-18): brute-force, reuse, cross-user, cross-email, replay
 * - System failure (Cases 19-21): email fail, RPC fail, edge function fail
 * - UX (Cases 22-25): dismiss, reopen, remove, change email
 * - Consistency (Cases 26-27): concurrent verify, concurrent resend+verify
 * - Privacy (Cases 28-30): hashed codes, no plaintext logs, data retention
 */

import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────

export type EmailTransitionStatus = "none" | "pending" | "verified" | "transitioned";

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

// ── Email Sending ────────────────────────────────────────────────────────────

/**
 * Request the Edge Function to generate a verification code server-side and email it.
 * SECURITY FIX (CB-1): The OTP is generated inside the Edge Function via service_role RPC.
 * The client NEVER receives the plaintext code — it only gets success/failure + metadata.
 */
async function requestVerificationEmail(
  to: string,
  type: "verification" | "resend" = "verification"
): Promise<{ success: boolean; error?: string; expires_in_seconds?: number; cooldown_seconds?: number; cooldown_remaining?: number; retry_after_hours?: number }> {
  try {
    const { data, error } = await supabase.functions.invoke("send-verification-email", {
      body: { to, type, appUrl: window.location.origin },
    });

    if (error) {
      console.error("[email-transition] Edge Function error:", error.message);
      return { success: false, error: "Failed to send verification email. Please try again." };
    }

    if (!data?.success) {
      return {
        success: false,
        error: data?.error || "Failed to send verification email",
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
    console.error("[email-transition] Edge function unreachable:", (err as Error).message);
    return { success: false, error: "Email service temporarily unavailable. Please retry shortly." };
  }
}

// ── Service Functions ────────────────────────────────────────────────────────

/**
 * Get the current email transition status from Supabase.
 * Reads exclusively from DB via RPC — no local state.
 */
export async function getEmailTransitionStatus(): Promise<EmailTransitionState> {
  const { data, error } = await supabase.rpc("get_email_transition_status");

  if (error) {
    throw new Error(`Failed to get email transition status: ${error.message}`);
  }

  const result = data as Record<string, unknown>;

  if (!result?.success) {
    throw new Error((result?.error as string) || "Failed to get email transition status");
  }

  return {
    college_email: (result.college_email as string) ?? null,
    personal_email: (result.personal_email as string) ?? null,
    personal_email_verified: Boolean(result.personal_email_verified),
    personal_email_verified_at: (result.personal_email_verified_at as string) ?? null,
    email_transition_status: (result.email_transition_status as EmailTransitionStatus) ?? "none",
    graduation_year: (result.graduation_year as string) ?? null,
    role: (result.role as string) ?? null,
    is_near_graduation: Boolean(result.is_near_graduation),
    prompt_dismissed_at: (result.prompt_dismissed_at as string) ?? null,
  };
}

/**
 * Request to link a personal email.
 * Stores it in pending state in DB, then generates a DB-backed verification code,
 * then sends email with the code.
 * Case 1: Happy path — full flow
 * Case 25: If email changed, old codes invalidated by RPC
 */
export async function requestPersonalEmailLink(personalEmail: string): Promise<EmailTransitionResult> {
  // Validate email format client-side first
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(personalEmail)) {
    return { success: false, error: "Invalid email format" };
  }

  const normalizedEmail = personalEmail.toLowerCase().trim();

  // Store in DB (pending state) via RPC — also invalidates old codes if email changed (Case 25)
  const { data, error } = await supabase.rpc("request_personal_email_link", {
    p_personal_email: normalizedEmail,
  });

  if (error) {
    return { success: false, error: `Database error: ${error.message}` };
  }

  const result = data as Record<string, unknown>;

  if (!result?.success) {
    return { success: false, error: (result?.error as string) || "Failed to link email" };
  }

  // SECURITY FIX (CB-1): Code generation + emailing happens entirely server-side.
  // The Edge Function calls generate_and_send_verification_code via service_role.
  // The client NEVER receives the plaintext OTP.
  const emailResult = await requestVerificationEmail(normalizedEmail, "verification");

  if (!emailResult.success) {
    // Cooldown/rate-limit from server
    if (emailResult.cooldown_remaining) {
      return {
        success: false,
        error: emailResult.error || "Please wait before requesting a new code",
        cooldown_remaining: emailResult.cooldown_remaining,
      };
    }
    if (emailResult.retry_after_hours) {
      return {
        success: false,
        error: emailResult.error || "Too many attempts. Please try again later.",
      };
    }
    return {
      success: false,
      error: emailResult.error || "Failed to send verification email. Email saved — please try again.",
    };
  }

  return {
    success: true,
    status: "pending",
    expires_in_seconds: emailResult.expires_in_seconds,
    cooldown_seconds: emailResult.cooldown_seconds,
    email_sent: true,
  };
}

/**
 * Resend the verification code for a pending personal email.
 * Generates a new code (hashed), invalidating previous ones.
 * Sends email with new code.
 * Case 2: Happy resend path
 * Case 9: Cooldown enforced server-side
 * Case 10: After cooldown, new code generated
 * Case 11: Max resends in 24h enforced server-side
 */
export async function resendVerificationCode(personalEmail: string): Promise<EmailTransitionResult> {
  const normalizedEmail = personalEmail.toLowerCase().trim();

  // SECURITY FIX (CB-1): Code generation + emailing happens entirely server-side.
  // The Edge Function calls generate_and_send_verification_code via service_role.
  const emailResult = await requestVerificationEmail(normalizedEmail, "resend");

  if (!emailResult.success) {
    // Cooldown/rate-limit from server
    if (emailResult.cooldown_remaining) {
      return {
        success: false,
        error: emailResult.error || "Please wait before requesting a new code",
        cooldown_remaining: emailResult.cooldown_remaining,
      };
    }
    if (emailResult.retry_after_hours) {
      return {
        success: false,
        error: emailResult.error || "Too many attempts. Please try again later.",
        retry_after_hours: emailResult.retry_after_hours,
      };
    }
    return { success: false, error: emailResult.error || "Failed to resend code" };
  }

  return {
    success: true,
    status: "pending",
    expires_in_seconds: emailResult.expires_in_seconds,
    cooldown_seconds: emailResult.cooldown_seconds,
    email_sent: true,
  };
}

/**
 * Verify the personal email using the 6-digit DB-backed code.
 * Code is checked against `email_verification_codes` hash — not Supabase Auth OTP.
 *
 * Case 4: Wrong code → attempts tracked, clear error
 * Case 5: Partial code → client-side rejection, no RPC call
 * Case 6: Empty code → client-side rejection, no RPC call
 * Case 7: Expired code → specific "expired" error
 * Case 8: Already-used code → "invalid" error
 * Case 12: Brute-force → lockout after 5 attempts
 * Case 14: Cross-user → RPC checks auth.uid()
 * Case 15: Cross-email → RPC compares code email vs pending email
 * Case 16: Expired session → RPC rejects, auth.uid() is null
 * Case 17: Direct RPC abuse → hash mismatch, attempts tracked
 * Case 18: Replay → atomically marks code used, second call fails
 */
export async function verifyPersonalEmail(code: string): Promise<EmailTransitionResult> {
  // Case 5, 6: Client-side validation — NO RPC call
  if (!code || code.trim().length === 0) {
    return { success: false, error: "Please enter your verification code" };
  }

  if (code.trim().length !== CODE_LENGTH) {
    return { success: false, error: `Please enter all ${CODE_LENGTH} digits` };
  }

  // Only digits allowed
  if (!/^\d{6}$/.test(code.trim())) {
    return { success: false, error: "Verification code must be 6 digits" };
  }

  const { data, error } = await supabase.rpc("verify_personal_email_code", {
    p_code: code.trim(),
  });

  // Case 16, 20: RPC failure / session expired
  if (error) {
    if (error.message?.includes("JWT") || error.message?.includes("auth")) {
      return { success: false, error: "Your session has expired. Please sign in again." };
    }
    return { success: false, error: `Verification failed: ${error.message}` };
  }

  const result = data as Record<string, unknown>;

  if (!result?.success) {
    return {
      success: false,
      error: (result?.error as string) || "Verification failed",
      attempts_remaining: result?.attempts_remaining as number | undefined,
      expired: result?.expired as boolean | undefined,
      locked: result?.locked as boolean | undefined,
    };
  }

  return {
    success: true,
    status: (result.status as EmailTransitionStatus) ?? "verified",
    message: (result.message as string) ?? undefined,
  };
}

/**
 * Transition the login email from college to personal.
 * Only callable when personal email is already verified.
 *
 * This performs TWO operations:
 * 1. Updates profiles.email_transition_status to 'transitioned' via RPC
 * 2. Updates auth.users.email via Supabase Auth API so login actually works
 *    with the personal email going forward.
 *
 * NOTE: Migration 084 updated the RPC to directly set auth.users.email
 * (SECURITY DEFINER), bypassing Supabase's email confirmation flow.
 * This is safe because we already verified the email via our own 6-digit
 * code flow (bcrypt-hashed, brute-force protected).
 */
export async function transitionToPersonalEmail(): Promise<EmailTransitionResult> {
  // Step 1: Get the personal email we're transitioning to
  const statusResult = await getEmailTransitionStatus();
  if (!statusResult.personal_email || !statusResult.personal_email_verified) {
    return { success: false, error: "Personal email must be verified before transitioning" };
  }

  const personalEmail = statusResult.personal_email;

  // Step 2: Update profiles + auth.users.email via RPC (migration 084)
  // The RPC directly sets auth.users.email — no Supabase confirmation needed.
  const { data, error } = await supabase.rpc("transition_to_personal_email");

  if (error) {
    return { success: false, error: `Transition failed: ${error.message}` };
  }

  const result = data as Record<string, unknown>;

  if (!result?.success) {
    return { success: false, error: (result?.error as string) || "Transition failed" };
  }

  const authEmailUpdated = result.auth_email_updated as boolean;

  if (!authEmailUpdated && result.auth_error) {
    console.error(
      "[email-transition] Profile transitioned but auth email update failed:",
      result.auth_error
    );
    return {
      success: true,
      status: "transitioned",
      college_email: (result.college_email as string) ?? undefined,
      new_primary_email: personalEmail,
      error: `Transition saved but login email update failed. Go to Settings and click "Finalize login email" to retry.`,
    };
  }

  return {
    success: true,
    status: "transitioned",
    college_email: (result.college_email as string) ?? undefined,
    new_primary_email: personalEmail,
    message: `Your login email has been changed to ${personalEmail}. You can now sign in with Google using this email.`,
  };
}

/**
 * Remove the linked personal email (only if not yet transitioned).
 * Uses an RPC to bypass column-level RLS restrictions on transition fields.
 * The RPC uses auth.uid() — no user ID parameter needed.
 */
export async function removePersonalEmail(): Promise<EmailTransitionResult> {
  const { data, error } = await supabase.rpc("remove_personal_email");

  if (error) {
    return { success: false, error: `Failed to remove: ${error.message}` };
  }

  const result = data as Record<string, unknown>;

  if (!result?.success) {
    return { success: false, error: (result?.error as string) || "Failed to remove personal email" };
  }

  return { success: true, status: "none" };
}

/**
 * Dismiss the personal email prompt (persisted in DB).
 * The prompt will re-appear after 30 days.
 */
export async function dismissPersonalEmailPrompt(): Promise<EmailTransitionResult> {
  const { data, error } = await supabase.rpc("dismiss_personal_email_prompt");

  if (error) {
    return { success: false, error: `Failed to dismiss: ${error.message}` };
  }

  const result = data as Record<string, unknown>;

  if (!result?.success) {
    return { success: false, error: (result?.error as string) || "Failed to dismiss" };
  }

  return { success: true };
}

/**
 * Check if user should be prompted to add a personal email.
 * Shows prompt when:
 * - User role is Student (near graduation) or Alumni (may have missed it)
 * - No personal email linked yet
 * - User hasn't dismissed the prompt in the last 30 days
 * - For Students: graduation year is within 1 year
 * - For Alumni: always prompt (their college email may already be dead)
 */
export function shouldPromptPersonalEmail(state: EmailTransitionState): boolean {
  // Already has personal email flow in progress or complete
  if (state.email_transition_status !== "none") return false;

  // Only prompt Students and Alumni
  if (state.role !== "Student" && state.role !== "Alumni") return false;

  // User has dismissed the prompt — respect for 30 days
  if (state.prompt_dismissed_at) {
    const dismissedAt = new Date(state.prompt_dismissed_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (dismissedAt > thirtyDaysAgo) return false;
  }

  // Alumni always get prompted (they already graduated — college email may be dead)
  if (state.role === "Alumni") return true;

  // Students: only prompt when near graduation
  return state.is_near_graduation;
}

/**
 * Finalize the auth-level email change for an already transitioned account.
 *
 * Uses the finalize_auth_email_change RPC (SECURITY DEFINER) to directly
 * set auth.users.email in the database. This bypasses Supabase's email
 * confirmation flow — safe because we already verified the email.
 *
 * Call this when the user's profile shows 'transitioned' but Google sign-in
 * with their personal email isn't working yet.
 */
export async function retryAuthEmailChange(): Promise<EmailTransitionResult> {
  const { data, error } = await supabase.rpc("finalize_auth_email_change");

  if (error) {
    return { success: false, error: `Failed to finalize email change: ${error.message}` };
  }

  const result = data as Record<string, unknown>;

  if (!result?.success) {
    return { success: false, error: (result?.error as string) || "Failed to finalize email change" };
  }

  return {
    success: true,
    message: (result.message as string) || "Login email updated successfully.",
  };
}

/**
 * Merge a duplicate auth user (created when a transitioned user logs in
 * with their personal email via Google) into the original profile.
 *
 * This calls the merge_transitioned_account RPC which:
 * 1. Finds the original profile whose personal_email matches
 * 2. Transfers the Google identity from the new user to the old user
 * 3. Updates the old user's auth email to the personal email
 * 4. Deletes the duplicate profile and auth user
 *
 * After this call succeeds, the caller's JWT is INVALID (the auth user was
 * deleted). The client MUST sign out and redirect to login. On the next
 * Google sign-in, the identity now points to the old user.
 */
export async function mergeTransitionedAccount(): Promise<{
  success: boolean;
  error?: string;
  merged_into_user_id?: string;
  message?: string;
}> {
  const { data, error } = await supabase.rpc("merge_transitioned_account");

  if (error) {
    return { success: false, error: `Merge failed: ${error.message}` };
  }

  const result = data as Record<string, unknown>;

  if (!result?.success) {
    return { success: false, error: (result?.error as string) || "Merge failed" };
  }

  return {
    success: true,
    merged_into_user_id: result.merged_into_user_id as string,
    message: (result.message as string) || "Account merged successfully",
  };
}

/**
 * Check if a given email belongs to an existing transitioned profile
 * that is different from the specified user ID — i.e., a merge is needed.
 *
 * Used by AuthCallback to detect the duplicate-account scenario.
 */
export async function findTransitionedProfileForEmail(
  email: string,
  excludeUserId: string
): Promise<{ id: string; college_email: string; email_transition_status: string } | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, email_transition_status")
    .eq("personal_email", email.toLowerCase())
    .eq("email_transition_status", "transitioned")
    .eq("personal_email_verified", true)
    .eq("onboarding_complete", true)
    .neq("id", excludeUserId)
    .maybeSingle();

  if (error || !data) return null;
  return { id: data.id, college_email: data.email, email_transition_status: data.email_transition_status ?? 'transitioned' };
}

/**
 * Determine the display status for the UI badge.
 */
export function getTransitionDisplayStatus(
  status: EmailTransitionStatus
): { label: string; variant: "default" | "warning" | "success" | "info" } {
  switch (status) {
    case "none":
      return { label: "Not linked", variant: "default" };
    case "pending":
      return { label: "Verification pending", variant: "warning" };
    case "verified":
      return { label: "Verified", variant: "success" };
    case "transitioned":
      return { label: "Active (Primary)", variant: "info" };
    default:
      return { label: "Unknown", variant: "default" };
  }
}
