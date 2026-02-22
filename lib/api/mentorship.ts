/**
 * Mentorship API adapter — Phase 9.2
 *
 * **No @clstr/core module exists** — this replicates the web hook
 * (`src/hooks/useMentorship.ts`) as standalone async functions that
 * accept the mobile Supabase client.
 *
 * Tables: `mentorship_offers`, `mentorship_requests`, `profiles`,
 *         `alumni_profiles` (joined).
 */

import { supabase } from '../adapters/core-client';
import { assertValidUuid } from '@clstr/shared/utils/uuid';
import type {
  Mentor,
  MentorshipOfferRow,
  MentorshipRequest,
  MentorshipRequestRow,
  MentorshipOfferFormData,
  MentorshipRequestFormData,
  ProfileSummary,
  AlumniProfileSummary,
  MentorHelpType,
  MentorCommitmentLevel,
} from '@clstr/shared/types/mentorship';
export { MENTORSHIP_QUERY_KEYS, computeMentorBadgeStatus, computeMentorHighlights } from '@clstr/shared/types/mentorship';

// Re-export types used by screens
export type {
  Mentor,
  MentorshipOfferRow,
  MentorshipRequest,
  MentorshipOfferFormData,
  MentorshipRequestFormData,
  MentorHelpType,
  MentorCommitmentLevel,
};

// ── Internal helpers ──────────────────────────────────────────────────

type MentorProfileRow = ProfileSummary & {
  alumni_profiles?: AlumniProfileSummary | AlumniProfileSummary[] | null;
};

type MentorshipOfferQueryRow = MentorshipOfferRow & {
  mentor?: MentorProfileRow | null;
};

type MentorshipRequestQueryRow = MentorshipRequestRow & {
  mentor?: unknown;
  mentee?: unknown;
  mentee_id?: string;
};

function normalizeProfileSummary(profileData: unknown): Mentor | undefined {
  if (
    profileData &&
    typeof profileData === 'object' &&
    !('error' in profileData) &&
    'id' in profileData
  ) {
    const { id, full_name, avatar_url, role, university, bio } = profileData as ProfileSummary;
    return {
      id,
      full_name: full_name ?? 'Unknown',
      avatar_url: avatar_url ?? null,
      role: role ?? 'Student',
      university: university ?? null,
      bio: bio ?? null,
      current_company: null,
      current_position: null,
      industry: null,
      years_of_experience: null,
    };
  }
  return undefined;
}

function mapRequestRows(rows: MentorshipRequestQueryRow[] = []): MentorshipRequest[] {
  return rows.map((row) => ({
    ...row,
    mentor: row.mentor ? normalizeProfileSummary(row.mentor) : undefined,
    mentee: row.mentee ? normalizeProfileSummary(row.mentee) : undefined,
  }));
}

// ── Queries ───────────────────────────────────────────────────────────

/** Fetch all active mentors in the same college domain (not paused). */
export async function getMentors(collegeDomain: string): Promise<Mentor[]> {
  if (!collegeDomain) return [];

  const { data, error } = await supabase
    .from('mentorship_offers')
    .select(`
      id, mentor_id, is_active, is_paused, help_type, commitment_level,
      availability_schedule, session_duration, mentorship_type,
      preferred_communication, available_slots, current_mentees,
      college_domain, expertise_areas, last_active_at,
      avg_response_hours, total_requests_received, total_requests_accepted,
      total_requests_ignored, total_mentees_helped,
      created_at, updated_at,
      mentor:profiles!mentorship_offers_mentor_id_fkey(
        id, full_name, avatar_url, role, university, bio, college_domain,
        alumni_profiles(current_company, current_position, industry, years_of_experience)
      )
    `)
    .eq('college_domain', collegeDomain)
    .eq('is_active', true)
    .eq('is_paused', false);

  if (error) throw error;

  const rows = (data ?? []) as unknown as MentorshipOfferQueryRow[];
  return rows.map((row) => {
    const mentorProfile = normalizeProfileSummary(row.mentor);
    const alumniRaw =
      row.mentor && typeof row.mentor === 'object' && 'alumni_profiles' in row.mentor
        ? (row.mentor as MentorProfileRow).alumni_profiles
        : null;
    const alumni = Array.isArray(alumniRaw) ? alumniRaw[0] : alumniRaw;

    return {
      ...(mentorProfile ?? {
        id: row.mentor_id,
        full_name: 'Unknown',
        avatar_url: null,
        role: 'Alumni',
        university: null,
        bio: null,
        current_company: null,
        current_position: null,
        industry: null,
        years_of_experience: null,
      }),
      current_company: alumni?.current_company ?? null,
      current_position: alumni?.current_position ?? null,
      industry: alumni?.industry ?? null,
      years_of_experience: alumni?.years_of_experience ?? null,
      offer: {
        id: row.id,
        mentor_id: row.mentor_id,
        is_active: row.is_active ?? true,
        is_paused: row.is_paused ?? false,
        help_type: (row.help_type ?? 'general') as MentorHelpType,
        commitment_level: (row.commitment_level ?? 'occasional') as MentorCommitmentLevel,
        availability_schedule: row.availability_schedule,
        session_duration: row.session_duration,
        mentorship_type: row.mentorship_type,
        preferred_communication: row.preferred_communication ?? [],
        available_slots: row.available_slots ?? 3,
        current_mentees: row.current_mentees ?? 0,
        college_domain: row.college_domain,
        expertise_areas: row.expertise_areas ?? [],
        last_active_at: row.last_active_at,
        avg_response_hours: (row as any).avg_response_hours ?? null,
        total_requests_received: (row as any).total_requests_received ?? 0,
        total_requests_accepted: (row as any).total_requests_accepted ?? 0,
        total_requests_ignored: (row as any).total_requests_ignored ?? 0,
        total_mentees_helped: (row as any).total_mentees_helped ?? 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    } as Mentor;
  });
}

/** Fetch mentee's own requests (with mentor profile). */
export async function getMyMentorshipRequests(userId: string): Promise<MentorshipRequest[]> {
  assertValidUuid(userId, 'menteeId');

  const { data, error } = await supabase
    .from('mentorship_requests')
    .select(`
      *,
      mentor:profiles!mentorship_requests_mentor_id_fkey(id, full_name, avatar_url, role, university, bio)
    `)
    .eq('mentee_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return mapRequestRows((data ?? []) as unknown as MentorshipRequestQueryRow[]);
}

/** Fetch pending incoming requests for the mentor. */
export async function getIncomingMentorshipRequests(userId: string): Promise<MentorshipRequest[]> {
  assertValidUuid(userId, 'mentorId');

  const { data: incomingData, error } = await supabase
    .from('mentorship_requests')
    .select('*')
    .eq('mentor_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (incomingData ?? []) as unknown as MentorshipRequestQueryRow[];
  const menteeIds = [...new Set(rows.map((r) => r.mentee_id).filter((id): id is string => !!id))];

  let menteeById = new Map<string, unknown>();
  if (menteeIds.length) {
    const { data: menteeProfiles, error: mErr } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, university, bio')
      .in('id', menteeIds);
    if (mErr) throw mErr;
    menteeById = new Map(((menteeProfiles ?? []) as any[]).map((p) => [p.id, p]));
  }

  const enriched = rows.map((row) => ({
    ...row,
    mentee: row.mentee_id ? menteeById.get(row.mentee_id) : undefined,
  }));
  return mapRequestRows(enriched as MentorshipRequestQueryRow[]);
}

/** Fetch active mentorship relationships for mentor. */
export async function getActiveRelationships(userId: string): Promise<MentorshipRequest[]> {
  assertValidUuid(userId, 'mentorId');

  const { data, error } = await supabase
    .from('mentorship_requests' as any)
    .select('*')
    .eq('mentor_id', userId)
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as MentorshipRequestQueryRow[];
  const menteeIds = [...new Set(rows.map((r) => r.mentee_id).filter((id): id is string => !!id))];

  let menteeById = new Map<string, unknown>();
  if (menteeIds.length) {
    const { data: menteeProfiles, error: mErr } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, university, bio')
      .in('id', menteeIds);
    if (mErr) throw mErr;
    menteeById = new Map(((menteeProfiles ?? []) as any[]).map((p) => [p.id, p]));
  }

  const enriched = rows.map((row) => ({
    ...row,
    mentee: row.mentee_id ? menteeById.get(row.mentee_id) : undefined,
  }));
  return mapRequestRows(enriched as MentorshipRequestQueryRow[]);
}

/** Fetch the mentor's own offer. */
export async function getMyMentorshipOffer(userId: string): Promise<MentorshipOfferRow | null> {
  assertValidUuid(userId, 'mentorId');

  const { data, error } = await supabase
    .from('mentorship_offers')
    .select('*')
    .eq('mentor_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as unknown as MentorshipOfferRow | null;
}

// ── Mutations ─────────────────────────────────────────────────────────

/** Upsert the mentor's offer. */
export async function saveMentorshipOffer(
  userId: string,
  collegeDomain: string,
  form: MentorshipOfferFormData,
  existingOfferId?: string | null,
): Promise<MentorshipOfferRow> {
  assertValidUuid(userId, 'mentorId');

  const normalizedComms = form.preferred_communication
    .split(',')
    .map((v: string) => v.trim())
    .filter(Boolean);

  const payload = {
    mentor_id: userId,
    college_domain: collegeDomain,
    is_active: form.is_active,
    is_paused: form.is_paused,
    mentorship_type: form.mentorship_type,
    session_duration: form.session_duration,
    available_slots: Number.isFinite(form.available_slots) ? form.available_slots : 5,
    preferred_communication: normalizedComms,
    availability_schedule: form.availability_schedule.trim() || null,
    help_type: form.help_type,
    commitment_level: form.commitment_level,
    last_active_at: new Date().toISOString(),
  };

  if (existingOfferId) {
    assertValidUuid(existingOfferId, 'offerId');
    const { data, error } = await (supabase
      .from('mentorship_offers') as any)
      .update(payload)
      .eq('id', existingOfferId)
      .select('*')
      .single();
    if (error) throw error;
    return data as unknown as MentorshipOfferRow;
  }

  const { data, error } = await (supabase
    .from('mentorship_offers') as any)
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as MentorshipOfferRow;
}

/** Student sends a mentorship request. */
export async function requestMentorship(
  userId: string,
  collegeDomain: string,
  form: MentorshipRequestFormData,
): Promise<boolean> {
  assertValidUuid(userId, 'menteeId');
  assertValidUuid(form.mentorId, 'mentorId');
  if (form.mentorId === userId) throw new Error('Cannot request mentorship from yourself.');

  const { error } = await (supabase.from('mentorship_requests') as any).insert({
    mentor_id: form.mentorId,
    mentee_id: userId,
    topics: [form.topic.trim()],
    message: form.message.trim(),
    status: 'pending',
    college_domain: collegeDomain,
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error('You already have a pending or active mentorship with this mentor.');
    }
    throw error;
  }
  return true;
}

/** Mentor accepts or rejects a request. */
export async function updateMentorshipRequestStatus(
  userId: string,
  requestId: string,
  status: 'accepted' | 'rejected',
): Promise<string> {
  assertValidUuid(requestId, 'requestId');

  const { error } = await (supabase
    .from('mentorship_requests') as any)
    .update({ status })
    .eq('id', requestId)
    .eq('mentor_id', userId)
    .eq('status', 'pending');
  if (error) throw error;
  return status;
}

/** Mark mentorship as completed. */
export async function completeMentorship(userId: string, requestId: string): Promise<boolean> {
  assertValidUuid(requestId, 'requestId');

  const { error } = await (supabase
    .from('mentorship_requests') as any)
    .update({ status: 'completed' })
    .eq('id', requestId)
    .eq('mentor_id', userId)
    .eq('status', 'accepted');
  if (error) throw error;
  return true;
}

/** Cancel a pending mentorship request (by mentee). */
export async function cancelMentorshipRequest(userId: string, requestId: string): Promise<boolean> {
  assertValidUuid(requestId, 'requestId');

  const { error } = await (supabase
    .from('mentorship_requests') as any)
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .eq('mentee_id', userId)
    .eq('status', 'pending');
  if (error) throw error;
  return true;
}

/** Submit feedback for a completed mentorship. */
export async function submitMentorshipFeedback(
  userId: string,
  requestId: string,
  helpful: boolean,
  asMentor: boolean,
): Promise<boolean> {
  assertValidUuid(requestId, 'requestId');

  const updateField = asMentor ? 'mentor_feedback' : 'mentee_feedback';
  const identityFilter = asMentor ? 'mentor_id' : 'mentee_id';

  const { error } = await (supabase
    .from('mentorship_requests') as any)
    .update({ [updateField]: helpful })
    .eq('id', requestId)
    .eq('status', 'completed')
    .eq(identityFilter, userId);
  if (error) throw error;
  return true;
}

/** Delete mentor's offer. */
export async function deleteMentorshipOffer(userId: string, offerId: string): Promise<boolean> {
  assertValidUuid(offerId, 'offerId');
  assertValidUuid(userId, 'mentorId');

  const { error } = await supabase
    .from('mentorship_offers')
    .delete()
    .eq('id', offerId)
    .eq('mentor_id', userId);
  if (error) throw error;
  return true;
}
