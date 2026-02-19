// ============================================================================
// useMentorship â€” single hook for all mentorship data, mutations, and realtime
// Reads ONLY from Supabase. No demo data, no local-only state.
// ============================================================================

import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CHANNELS } from '@clstr/shared/realtime/channels';
import { useProfile } from '@/contexts/ProfileContext';
import { useIdentityContext } from '@/contexts/IdentityContext';
import { useToast } from '@/hooks/use-toast';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
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
  MentorBadgeStatus,
  MentorHelpType,
  MentorCommitmentLevel,
  MentorHighlight,
  MENTORSHIP_QUERY_KEYS as QKType,
} from '@clstr/shared/types/mentorship';
import { MENTORSHIP_QUERY_KEYS, computeMentorBadgeStatus, computeMentorHighlights } from '@clstr/shared/types/mentorship';
import { QUERY_KEYS } from '@clstr/shared/query-keys';

// â”€â”€ Internal helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const getErrorMessage = (error: unknown, fallback = 'Something went wrong') =>
  error instanceof Error ? error.message : fallback;

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

// â”€â”€ Default offer form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DEFAULT_OFFER_FORM: MentorshipOfferFormData = {
  is_active: true,
  is_paused: false,
  mentorship_type: 'One-on-One',
  session_duration: '30 minutes',
  available_slots: 5,
  preferred_communication: 'Video Call, Chat',
  availability_schedule: '',
  help_type: 'general',
  commitment_level: 'occasional',
};

// â”€â”€ Hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function useMentorship() {
  const { profile } = useProfile();
  const { collegeDomain: identityDomain } = useIdentityContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const lastOfferIdRef = useRef<string | null>(null);

  const {
    canBrowseMentors,
    canRequestMentorship,
    canOfferMentorship,
    canManageMentorshipRequests,
    profileType,
    isLoading: permissionsLoading,
  } = useFeatureAccess();

  const collegeDomain = identityDomain ?? null;
  const userId = profile?.id ?? null;

  // â”€â”€ Queries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Fetch all active mentors in the same college domain (not paused) */
  const mentorsQuery = useQuery({
    queryKey: MENTORSHIP_QUERY_KEYS.mentors(collegeDomain),
    queryFn: async (): Promise<Mentor[]> => {
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
    },
    enabled: !!collegeDomain && canBrowseMentors,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });

  /**
   * Fetch the user's own requests AS MENTEE (with mentor profile).
   * Enabled for ANY authenticated user, not just canRequestMentorship,
   * because a user who transitions from Student â†’ Alumni must still see
   * and interact with their existing mentorship requests.
   * Spec rule: "Permissions apply at ACTION TIME, not HISTORICAL STATE TIME."
   */
  const myRequestsQuery = useQuery({
    queryKey: MENTORSHIP_QUERY_KEYS.myRequests(userId),
    queryFn: async (): Promise<MentorshipRequest[]> => {
      if (!userId) return [];
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
    },
    enabled: !!userId,
    staleTime: 15_000,
  });

  /** Fetch pending incoming requests for the mentor */
  const incomingRequestsQuery = useQuery({
    queryKey: MENTORSHIP_QUERY_KEYS.incomingRequests(userId),
    queryFn: async (): Promise<MentorshipRequest[]> => {
      if (!userId || !canOfferMentorship) return [];
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
        menteeById = new Map((menteeProfiles ?? []).map((p) => [p.id, p]));
      }

      const enriched = rows.map((row) => ({
        ...row,
        mentee: row.mentee_id ? menteeById.get(row.mentee_id) : undefined,
      }));

      return mapRequestRows(enriched as MentorshipRequestQueryRow[]);
    },
    enabled: !!userId && canOfferMentorship,
    staleTime: 15_000,
  });

  /** Fetch active mentorship relationships */
  const activeRelationshipsQuery = useQuery({
    queryKey: MENTORSHIP_QUERY_KEYS.activeRelationships(userId),
    queryFn: async (): Promise<MentorshipRequest[]> => {
      if (!userId || !canOfferMentorship) return [];
      assertValidUuid(userId, 'mentorId');

      const { data, error } = await supabase
        .from('mentorship_requests')
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
        menteeById = new Map((menteeProfiles ?? []).map((p) => [p.id, p]));
      }

      const enriched = rows.map((row) => ({
        ...row,
        mentee: row.mentee_id ? menteeById.get(row.mentee_id) : undefined,
      }));

      return mapRequestRows(enriched as MentorshipRequestQueryRow[]);
    },
    enabled: !!userId && canOfferMentorship,
    staleTime: 15_000,
  });

  /** Fetch completed mentorship relationships */
  const completedRelationshipsQuery = useQuery({
    queryKey: MENTORSHIP_QUERY_KEYS.completedRelationships(userId),
    queryFn: async (): Promise<MentorshipRequest[]> => {
      if (!userId || !canOfferMentorship) return [];
      assertValidUuid(userId, 'mentorId');

      const { data, error } = await supabase
        .from('mentorship_requests')
        .select('*')
        .eq('mentor_id', userId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

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
        menteeById = new Map((menteeProfiles ?? []).map((p) => [p.id, p]));
      }

      const enriched = rows.map((row) => ({
        ...row,
        mentee: row.mentee_id ? menteeById.get(row.mentee_id) : undefined,
      }));

      return mapRequestRows(enriched as MentorshipRequestQueryRow[]);
    },
    enabled: !!userId && canOfferMentorship,
    staleTime: 30_000,
  });

  /** Fetch mentor's own offer */
  const myOfferQuery = useQuery({
    queryKey: MENTORSHIP_QUERY_KEYS.myOffer(userId),
    queryFn: async (): Promise<MentorshipOfferRow | null> => {
      if (!userId || !canOfferMentorship) return null;
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
    },
    enabled: !!userId && canOfferMentorship,
    staleTime: 15_000,
  });

  // â”€â”€ Invalidation helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mentorship.all });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.network() });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.connectedUsers() });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.conversations() });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.notifications() });
  }, [queryClient]);

  // â”€â”€ Mutations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Upsert the mentor's offer */
  const saveOfferMutation = useMutation({
    mutationFn: async (form: MentorshipOfferFormData) => {
      if (!canOfferMentorship) throw new Error('Not allowed to manage mentorship offers.');
      if (!userId || !collegeDomain) throw new Error('Missing profile or college domain.');
      assertValidUuid(userId, 'mentorId');

      const normalizedComms = form.preferred_communication
        .split(',')
        .map((v) => v.trim())
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

      const myOffer = myOfferQuery.data;
      if (myOffer?.id) {
        assertValidUuid(myOffer.id, 'offerId');
        const { data, error } = await supabase
          .from('mentorship_offers')
          .update(payload)
          .eq('id', myOffer.id)
          .select('*')
          .single();
        if (error) throw error;
        return data as unknown as MentorshipOfferRow;
      }

      const { data, error } = await supabase
        .from('mentorship_offers')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as MentorshipOfferRow;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Availability saved', description: 'Students will see your updated mentorship offer.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save availability', description: getErrorMessage(error), variant: 'destructive' });
    },
  });

  /** Student sends a mentorship request */
  const requestMentorshipMutation = useMutation({
    mutationFn: async (form: MentorshipRequestFormData) => {
      if (!canRequestMentorship) throw new Error('Not allowed to request mentorship.');
      if (!userId || !collegeDomain) throw new Error('Missing profile or college domain.');
      assertValidUuid(userId, 'menteeId');
      assertValidUuid(form.mentorId, 'mentorId');
      if (form.mentorId === userId) throw new Error('Cannot request mentorship from yourself.');

      // COMPLEX-2 FIX: Removed redundant frontend duplicate check.
      // The DB partial unique index mentorship_requests_active_pair_uniq enforces
      // this atomically. We catch the constraint violation error below instead.
      const { error } = await supabase.from('mentorship_requests').insert({
        mentor_id: form.mentorId,
        mentee_id: userId,
        topics: [form.topic.trim()],
        message: form.message.trim(),
        status: 'pending',
        college_domain: collegeDomain,
      });
      if (error) {
        // COMPLEX-2: Surface friendly message for duplicate-pair constraint violation
        if (error.code === '23505') {
          throw new Error('You already have a pending or active mentorship with this mentor.');
        }
        throw error;
      }
      return true;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Request sent', description: 'Your mentorship request has been sent successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to send request', description: getErrorMessage(error), variant: 'destructive' });
    },
  });

  /** Mentor accepts or rejects a request */
  const updateRequestStatusMutation = useMutation({
    mutationFn: async (payload: { requestId: string; status: 'accepted' | 'rejected' }) => {
      if (!canOfferMentorship) throw new Error('Not allowed to manage mentorship requests.');
      if (!userId) throw new Error('Not authenticated.');
      assertValidUuid(payload.requestId, 'requestId');

      // BUG-2 FIX: Add .eq('mentor_id', userId) so only the mentor can accept/reject.
      // CRIT-2 FIX (defense-in-depth): Only allow transitions from 'pending'.
      // The DB trigger guard_mentorship_status_transition enforces this server-side too.
      const { error } = await supabase
        .from('mentorship_requests')
        .update({ status: payload.status })
        .eq('id', payload.requestId)
        .eq('mentor_id', userId)
        .eq('status', 'pending');
      if (error) throw error;
      return payload.status;
    },
    onSuccess: (status) => {
      invalidateAll();
      toast({
        title: status === 'accepted' ? 'Request accepted' : 'Request declined',
        description: status === 'accepted' ? 'A connection and chat have been created automatically.' : undefined,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update request', description: getErrorMessage(error), variant: 'destructive' });
    },
  });

  /** Mark a mentorship as completed */
  const completeMentorshipMutation = useMutation({
    mutationFn: async (requestId: string) => {
      if (!canOfferMentorship) throw new Error('Not allowed to manage mentorship requests.');
      if (!userId) throw new Error('Not authenticated.');
      assertValidUuid(requestId, 'requestId');

      // BUG-3 FIX: Add .eq('mentor_id', userId) + .eq('status', 'accepted')
      // Only the mentor can complete, and only accepted mentorships can be completed.
      const { error } = await supabase
        .from('mentorship_requests')
        .update({ status: 'completed' })
        .eq('id', requestId)
        .eq('mentor_id', userId)
        .eq('status', 'accepted');
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Mentorship completed', description: 'This mentorship has been marked as completed.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to complete mentorship', description: getErrorMessage(error), variant: 'destructive' });
    },
  });

  /** Submit feedback (mentee or mentor) */
  const submitFeedbackMutation = useMutation({
    mutationFn: async (payload: { requestId: string; helpful: boolean; asMentor: boolean }) => {
      if (!userId) throw new Error('Not authenticated.');
      assertValidUuid(payload.requestId, 'requestId');

      // CRIT-4 FIX: Add identity filter so a mentee can only write mentee_feedback
      // and a mentor can only write mentor_feedback. Without this, a mentee could
      // set asMentor: true and spoof mentor_feedback (or vice versa).
      const updateField = payload.asMentor ? 'mentor_feedback' : 'mentee_feedback';
      const identityFilter = payload.asMentor ? 'mentor_id' : 'mentee_id';
      const { error } = await supabase
        .from('mentorship_requests')
        .update({ [updateField]: payload.helpful })
        .eq('id', payload.requestId)
        .eq('status', 'completed')
        .eq(identityFilter, userId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Feedback submitted', description: 'Thank you for your feedback!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to submit feedback', description: getErrorMessage(error), variant: 'destructive' });
    },
  });

  /**
   * Cancel a pending mentorship request.
   * Edge Case #1/#3: NOT gated by canRequestMentorship.
   * A user who transitions from Student â†’ Alumni must still be able to cancel
   * their own pending requests. RLS ensures only the mentee can update their own row.
   */
  const cancelRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      if (!userId) throw new Error('Not authenticated.');
      assertValidUuid(requestId, 'requestId');

      const { error } = await supabase
        .from('mentorship_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .eq('mentee_id', userId)
        .eq('status', 'pending');
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Request cancelled', description: 'Your mentorship request has been withdrawn.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to cancel request', description: getErrorMessage(error), variant: 'destructive' });
    },
  });

  /**
   * GAP-1 FIX: Allow mentee to cancel an accepted mentorship.
   * This is a separate mutation from cancelRequestMutation because accepted
   * mentorships have a different source state (accepted â†’ cancelled).
   * The DB trigger guard_mentorship_status_transition allows accepted â†’ cancelled.
   */
  const cancelAcceptedMentorshipMutation = useMutation({
    mutationFn: async (requestId: string) => {
      if (!userId) throw new Error('Not authenticated.');
      assertValidUuid(requestId, 'requestId');

      const { error } = await supabase
        .from('mentorship_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .eq('mentee_id', userId)
        .eq('status', 'accepted');
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Mentorship ended', description: 'You have left this mentorship. The chat history is still available.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to end mentorship', description: getErrorMessage(error), variant: 'destructive' });
    },
  });

  /** Toggle pause status for the mentor's offer */
  const togglePauseMutation = useMutation({
    mutationFn: async (paused: boolean) => {
      if (!canOfferMentorship) throw new Error('Not allowed to manage mentorship offers.');
      const myOffer = myOfferQuery.data;
      if (!myOffer?.id) throw new Error('No mentorship offer found.');
      assertValidUuid(myOffer.id, 'offerId');

      const { error } = await supabase
        .from('mentorship_offers')
        .update({ is_paused: paused, updated_at: new Date().toISOString() })
        .eq('id', myOffer.id);
      if (error) throw error;
      return paused;
    },
    onSuccess: (paused) => {
      invalidateAll();
      toast({
        title: paused ? 'Mentorship paused' : 'Mentorship resumed',
        description: paused
          ? 'You are hidden from discovery. Existing chats still work.'
          : 'Students can now find you again.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update status', description: getErrorMessage(error), variant: 'destructive' });
    },
  });

  /** Mentor rejects a request and optionally suggests another mentor */
  const rejectWithSuggestionMutation = useMutation({
    mutationFn: async (payload: { requestId: string; suggestedMentorId?: string }) => {
      if (!canOfferMentorship) throw new Error('Not allowed to manage mentorship requests.');
      if (!userId) throw new Error('Not authenticated.');
      assertValidUuid(payload.requestId, 'requestId');
      if (payload.suggestedMentorId) {
        assertValidUuid(payload.suggestedMentorId, 'suggestedMentorId');
      }

      const updatePayload: Record<string, unknown> = { status: 'rejected' };
      if (payload.suggestedMentorId) {
        updatePayload.suggested_mentor_id = payload.suggestedMentorId;
      }

      // BUG-2 (also applies here): Add .eq('mentor_id', userId) for server-side auth
      // CRIT-C FIX: Add .eq('status', 'pending') â€” only pending requests can be rejected.
      // The DB trigger catches most invalid transitions, but this prevents unnecessary
      // trigger evaluation and confusing error messages.
      const { error } = await supabase
        .from('mentorship_requests')
        .update(updatePayload)
        .eq('id', payload.requestId)
        .eq('mentor_id', userId)
        .eq('status', 'pending');
      if (error) throw error;
      return payload.suggestedMentorId ?? null;
    },
    onSuccess: (suggestedId) => {
      invalidateAll();
      toast({
        title: 'Request declined',
        description: suggestedId
          ? 'Student has been notified with an alternative mentor suggestion.'
          : 'Student has been notified.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to decline request', description: getErrorMessage(error), variant: 'destructive' });
    },
  });

  /**
   * Find an alternative mentor for a rejected request.
   * Picks from same help_type + availability, excluding the rejecting mentor.
   * Returns null if no suitable mentor found.
   */
  const findAlternativeMentor = useCallback(
    (excludeMentorId: string, helpType?: string): Mentor | null => {
      const available = mentorsQuery.data ?? [];
      const candidates = available.filter(
        (m) =>
          m.id !== excludeMentorId &&
          m.offer &&
          m.offer.is_active &&
          !m.offer.is_paused &&
          m.offer.available_slots > m.offer.current_mentees &&
          (helpType ? m.offer.help_type === helpType : true)
      );
      if (candidates.length === 0) return null;
      // Sort by total_mentees_helped descending (prefer proven mentors)
      candidates.sort((a, b) => (b.offer?.total_mentees_helped ?? 0) - (a.offer?.total_mentees_helped ?? 0));
      return candidates[0];
    },
    [mentorsQuery.data]
  );

  // â”€â”€ Realtime subscriptions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // Domain-scoped channels (offers, profiles â€” NOT requests)
  // COMPLEX-A FIX: Removed domain-scoped mentorship-requests channel.
  // User-scoped channels (mentee/mentor) handle targeted invalidation.
  // The domain channel for offers is still useful for discovery updates.
  useEffect(() => {
    if (!collegeDomain) return;
    const channels: ReturnType<typeof supabase.channel>[] = [];

    channels.push(
      supabase
        .channel(CHANNELS.mentorship.offers(collegeDomain))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mentorship_offers', filter: `college_domain=eq.${collegeDomain}` }, () => invalidateAll())
        .subscribe()
    );

    channels.push(
      supabase
        .channel(CHANNELS.mentorship.profiles(collegeDomain))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `college_domain=eq.${collegeDomain}` }, () => {
          queryClient.invalidateQueries({ queryKey: MENTORSHIP_QUERY_KEYS.mentors(collegeDomain) });
        })
        .subscribe()
    );

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [collegeDomain, queryClient, invalidateAll]);

  // User-scoped channels (own requests as mentee and mentor)
  useEffect(() => {
    if (!userId) return;
    assertValidUuid(userId, 'profileId');
    const channels: ReturnType<typeof supabase.channel>[] = [];

    channels.push(
      supabase
        .channel(CHANNELS.mentorship.requestsMentee(userId))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mentorship_requests', filter: `mentee_id=eq.${userId}` }, () => {
          queryClient.invalidateQueries({ queryKey: MENTORSHIP_QUERY_KEYS.myRequests(userId) });
        })
        .subscribe()
    );

    channels.push(
      supabase
        .channel(CHANNELS.mentorship.requestsMentor(userId))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mentorship_requests', filter: `mentor_id=eq.${userId}` }, () => {
          queryClient.invalidateQueries({ queryKey: MENTORSHIP_QUERY_KEYS.incomingRequests(userId) });
          queryClient.invalidateQueries({ queryKey: MENTORSHIP_QUERY_KEYS.activeRelationships(userId) });
          queryClient.invalidateQueries({ queryKey: MENTORSHIP_QUERY_KEYS.completedRelationships(userId) });
        })
        .subscribe()
    );

    // Edge Case #6: Listen for connection status changes (block events).
    // When a connection is blocked, the DB trigger auto-cancels mentorships,
    // so we need to refresh mentorship queries to reflect the new state.
    channels.push(
      supabase
        .channel(CHANNELS.mentorship.connections(userId))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'connections', filter: `requester_id=eq.${userId}` }, () => invalidateAll())
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'connections', filter: `receiver_id=eq.${userId}` }, () => invalidateAll())
        .subscribe()
    );

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [userId, queryClient, invalidateAll]);

  // COMPLEX-B FIX: Removed alumni_profiles realtime channel.
  // Alumni profile changes are rare; staleTime-based refetching is sufficient.
  // The previous channel used a filter string that could exceed Supabase realtime
  // filter limits for large mentor lists, causing silent subscription failures.

  // â”€â”€ Error toasts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    if (mentorsQuery.error)
      toast({ title: 'Error loading mentors', description: getErrorMessage(mentorsQuery.error), variant: 'destructive' });
  }, [mentorsQuery.error, toast]);

  useEffect(() => {
    if (myRequestsQuery.error)
      toast({ title: 'Error loading requests', description: getErrorMessage(myRequestsQuery.error), variant: 'destructive' });
  }, [myRequestsQuery.error, toast]);

  useEffect(() => {
    if (incomingRequestsQuery.error)
      toast({ title: 'Error loading incoming requests', description: getErrorMessage(incomingRequestsQuery.error), variant: 'destructive' });
  }, [incomingRequestsQuery.error, toast]);

  useEffect(() => {
    if (myOfferQuery.error)
      toast({ title: 'Error loading offer', description: getErrorMessage(myOfferQuery.error), variant: 'destructive' });
  }, [myOfferQuery.error, toast]);

  // â”€â”€ Derived state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const mentors = useMemo(() => mentorsQuery.data ?? [], [mentorsQuery.data]);
  const myRequests = useMemo(() => myRequestsQuery.data ?? [], [myRequestsQuery.data]);
  const incomingRequests = useMemo(() => incomingRequestsQuery.data ?? [], [incomingRequestsQuery.data]);
  const activeRelationships = useMemo(() => activeRelationshipsQuery.data ?? [], [activeRelationshipsQuery.data]);
  const completedRelationships = useMemo(() => completedRelationshipsQuery.data ?? [], [completedRelationshipsQuery.data]);
  const myOffer = myOfferQuery.data ?? null;

  const myBadgeStatus: MentorBadgeStatus = useMemo(
    () => computeMentorBadgeStatus(myOffer),
    [myOffer]
  );

  /** Soft mentor highlights for display (DB-backed, not ratings) */
  const myHighlights: MentorHighlight[] = useMemo(
    () => computeMentorHighlights(myOffer),
    [myOffer]
  );

  /** Pending request count the mentor hasn't responded to */
  const pendingRequestCount = incomingRequests.length;

  /** Auto-expired request count for student dashboard awareness */
  const autoExpiredRequests = useMemo(
    () => myRequests.filter((r) => r.auto_expired),
    [myRequests]
  );

  /** Requests with a suggested alternative mentor */
  const requestsWithSuggestion = useMemo(
    () => myRequests.filter((r) => r.status === 'rejected' && r.suggested_mentor_id),
    [myRequests]
  );

  /**
   * Edge Case #1 (Studentâ†’Alumni): Does this user have ANY existing requests as mentee?
   * Used to show the "My Requests" tab even if they can no longer create new requests.
   * This enables role-transitioned users to see, cancel, and provide feedback on
   * their historical mentorship requests â€” spec: "Permissions apply at ACTION TIME."
   */
  const hasExistingMenteeRequests = myRequests.length > 0;

  /**
   * Edge Case #1: Does the user have any active (pending/accepted) requests as mentee?
   * Active requests can still be interacted with after role transition.
   */
  const hasActiveMenteeRequests = useMemo(
    () => myRequests.some((r) => r.status === 'pending' || r.status === 'accepted'),
    [myRequests]
  );

  const isLoading =
    mentorsQuery.isLoading ||
    myRequestsQuery.isLoading ||
    (canOfferMentorship && (incomingRequestsQuery.isLoading || myOfferQuery.isLoading));

  return {
    // Auth / context
    profile,
    userId,
    collegeDomain,
    permissionsLoading,
    canBrowseMentors,
    canRequestMentorship,
    canOfferMentorship,
    canManageMentorshipRequests,
    profileType,

    // Data
    mentors,
    myRequests,
    incomingRequests,
    activeRelationships,
    completedRelationships,
    myOffer,
    myBadgeStatus,
    myHighlights,
    pendingRequestCount,
    autoExpiredRequests,
    requestsWithSuggestion,
    hasExistingMenteeRequests,
    hasActiveMenteeRequests,
    isLoading,

    // Mutations
    saveOfferMutation,
    requestMentorshipMutation,
    cancelRequestMutation,
    cancelAcceptedMentorshipMutation,
    updateRequestStatusMutation,
    completeMentorshipMutation,
    submitFeedbackMutation,
    togglePauseMutation,
    rejectWithSuggestionMutation,

    // Helpers
    findAlternativeMentor,

    // Offer form sync helper
    lastOfferIdRef,
    DEFAULT_OFFER_FORM,
  };
}
