/**
 * Canonical Identity Types
 *
 * The single source of truth for "who is this user?".
 * Backed by the get_identity_context() RPC — never derived from auth.users.email.
 */

export type IdentitySource = 'student' | 'alumni' | 'faculty' | 'club';

/**
 * The authoritative identity tuple returned by get_identity_context().
 * Every feature guard, permission check, and domain-isolation filter
 * should read from this object — not from `profile.email` or `auth.email`.
 */
export interface IdentityContext {
  user_id: string;
  role: string;
  college_email: string | null;
  college_domain: string | null;
  personal_email: string | null;
  source: IdentitySource | 'alumni_invite_pending_onboarding';
  full_name: string | null;
  avatar_url: string | null;
  university: string | null;
  major: string | null;
  graduation_year: string | null;
  onboarding_complete: boolean;
  has_profile: boolean;
  is_verified: boolean;
  profile_completion: number;
  email_transition_status: string | null;
  personal_email_verified: boolean;
}

/** Error shape returned when identity resolution fails */
export interface IdentityError {
  user_id?: string;
  error: string;
  has_profile: boolean;
  onboarding_complete: boolean;
}

/** Discriminated union for the RPC response */
export type IdentityResult = IdentityContext | IdentityError;

/** Type guard: is this a resolved identity (not an error)? */
export function isResolvedIdentity(result: IdentityResult): result is IdentityContext {
  return !('error' in result) || result.error === undefined;
}

/**
 * Operational stats for the invite pipeline (admin-only).
 */
export interface InviteOpsStats {
  total_invites: number;
  invited: number;
  accepted: number;
  expired: number;
  disputed: number;
  cancelled: number;
  accepted_today: number;
  invited_today: number;
  accepted_7d: number;
  invited_7d: number;
  avg_accept_hours: number | null;
  unique_domains: number;
  pending_expiring_24h: number;
}
