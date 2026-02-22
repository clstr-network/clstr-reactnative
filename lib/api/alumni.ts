/**
 * Alumni Directory API adapter — Phase 9.4
 *
 * Uses the SECURITY DEFINER RPC `get_alumni_by_domain` to fetch alumni
 * profiles visible within the same college domain.
 * Also re-exports alumni identification helpers from @clstr/core.
 */

import { supabase } from '../adapters/core-client';
import { assertValidUuid } from '@clstr/shared/utils/uuid';

// Re-export alumni identification helpers
export {
  determineUserRoleFromGraduation,
  isAlumni,
} from '@clstr/core/api/alumni-identification';

// ── Types ─────────────────────────────────────────────────────────────

export interface AlumniUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  university: string | null;
  college_domain: string | null;
  bio: string | null;
  headline: string | null;
  location: string | null;
  branch: string | null;
  graduation_year: number | null;
  current_company: string | null;
  current_position: string | null;
  industry: string | null;
  willing_to_mentor: boolean;
  connection_status?: 'none' | 'pending' | 'accepted';
}

// ── Queries ───────────────────────────────────────────────────────────

/**
 * Fetch alumni from the same college domain.
 * Uses the `get_alumni_by_domain` RPC to bypass per-row RLS.
 */
export async function getAlumniByDomain(
  collegeDomain: string,
  currentUserId: string,
  options?: { limit?: number; offset?: number },
): Promise<AlumniUser[]> {
  assertValidUuid(currentUserId, 'profileId');

  const { data, error } = await (supabase as any).rpc('get_alumni_by_domain', {
    p_domain: collegeDomain,
    p_limit: options?.limit ?? 500,
    p_offset: options?.offset ?? 0,
  });

  if (error) throw error;

  const alumni = (Array.isArray(data) ? data : JSON.parse(data || '[]')) as Array<Record<string, unknown>>;

  return alumni
    .filter((user) => user.id !== currentUserId)
    .map((user) => ({
      id: user.id as string,
      full_name: (user.full_name as string) || 'Unknown',
      avatar_url: (user.avatar_url as string | null),
      role: (user.role as string) || 'Alumni',
      university: (user.university as string | null),
      college_domain: (user.college_domain as string | null),
      bio: (user.bio as string | null),
      headline: (user.headline as string | null),
      location: (user.location as string | null),
      branch: (user.branch as string | null),
      graduation_year: (user.graduation_year as number | null),
      current_company: (user.current_company as string | null) || null,
      current_position: (user.current_position as string | null) || null,
      industry: (user.industry as string | null) || null,
      willing_to_mentor: (user.willing_to_mentor as boolean) || false,
    }));
}
