// ============================================================================
// Mentorship Types — single source of truth for all mentorship data shapes
// ============================================================================

/** Status values for a mentorship request row */
export type MentorshipStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';

/** How the mentor wants to help students */
export type MentorHelpType =
  | 'occasional_guidance'
  | 'career_advice'
  | 'project_guidance'
  | 'exam_guidance'
  | 'general';

/** Commitment level — expectation setting */
export type MentorCommitmentLevel = 'occasional' | 'moderate' | 'dedicated';

/** Display status badge for a mentor */
export type MentorBadgeStatus = 'available' | 'slots_full' | 'paused' | 'inactive';

// ── Row types (match DB columns) ──────────────────────────────────────────

export interface MentorshipOfferRow {
  id: string;
  mentor_id: string;
  college_domain: string | null;
  expertise_areas: string[];
  mentorship_type: string | null;
  available_slots: number;
  current_mentees: number;
  is_active: boolean;
  is_paused: boolean;
  help_type: MentorHelpType;
  commitment_level: MentorCommitmentLevel;
  availability_schedule: string | null;
  session_duration: string | null;
  preferred_communication: string[];
  last_active_at: string | null;
  // SLA tracking (internal — not shown publicly)
  avg_response_hours: number | null;
  total_requests_received: number;
  total_requests_accepted: number;
  total_requests_ignored: number;
  total_mentees_helped: number;
  created_at: string;
  updated_at: string;
}

export interface MentorshipRequestRow {
  id: string;
  mentee_id: string;
  mentor_id: string;
  college_domain: string | null;
  message: string | null;
  topics: string[];
  status: MentorshipStatus;
  accepted_at: string | null;
  completed_at: string | null;
  responded_at: string | null;
  auto_expired: boolean;
  suggested_mentor_id: string | null;
  mentee_feedback: boolean | null;
  mentor_feedback: boolean | null;
  created_at: string;
  updated_at: string;
}

// ── Joined / enriched types ───────────────────────────────────────────────

export interface ProfileSummary {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  university: string | null;
  bio: string | null;
}

export interface AlumniProfileSummary {
  current_company: string | null;
  current_position: string | null;
  industry: string | null;
  years_of_experience: number | null;
}

/** A fully-enriched mentor for display */
export interface Mentor {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  university: string | null;
  bio: string | null;
  current_company: string | null;
  current_position: string | null;
  industry: string | null;
  years_of_experience: number | null;
  offer?: MentorshipOfferRow;
}

/** A mentorship request with optional mentor/mentee profile data */
export interface MentorshipRequest extends MentorshipRequestRow {
  mentor?: Mentor;
  mentee?: Mentor;
}

// ── Form types ────────────────────────────────────────────────────────────

export interface MentorshipOfferFormData {
  is_active: boolean;
  is_paused: boolean;
  mentorship_type: string;
  session_duration: string;
  available_slots: number;
  preferred_communication: string;
  availability_schedule: string;
  help_type: MentorHelpType;
  commitment_level: MentorCommitmentLevel;
}

export interface MentorshipRequestFormData {
  mentorId: string;
  topic: string;
  message: string;
}

// ── Tab / view types ──────────────────────────────────────────────────────

export type MentorshipStudentTab = 'find' | 'my-requests';
export type MentorshipMentorTab = 'dashboard' | 'settings';
export type MentorDashboardSection = 'pending' | 'active' | 'completed';

// ── Query Key Factory ─────────────────────────────────────────────────────

export const MENTORSHIP_QUERY_KEYS = {
  all: ['mentorship'] as const,
  mentors: (domain: string | null) => ['mentorship', 'mentors', domain] as const,
  myRequests: (menteeId: string | null) => ['mentorship', 'my-requests', menteeId] as const,
  incomingRequests: (mentorId: string | null) => ['mentorship', 'incoming-requests', mentorId] as const,
  activeRelationships: (mentorId: string | null) => ['mentorship', 'active-relationships', mentorId] as const,
  completedRelationships: (mentorId: string | null) => ['mentorship', 'completed', mentorId] as const,
  myOffer: (mentorId: string | null) => ['mentorship', 'my-offer', mentorId] as const,
} as const;

// ── Help type display labels ──────────────────────────────────────────────

export const HELP_TYPE_OPTIONS: { value: MentorHelpType; label: string; description: string }[] = [
  { value: 'occasional_guidance', label: 'Occasional Guidance', description: 'Chat-based advice when needed' },
  { value: 'career_advice', label: 'Career Advice', description: 'Resume reviews, interview prep, career planning' },
  { value: 'project_guidance', label: 'Project / Startup Guidance', description: 'Hands-on project or startup mentoring' },
  { value: 'exam_guidance', label: 'Exam / Higher Studies', description: 'Exam prep, grad school guidance' },
  { value: 'general', label: 'General', description: 'Open to any kind of mentorship' },
];

export const COMMITMENT_LEVEL_OPTIONS: { value: MentorCommitmentLevel; label: string; description: string }[] = [
  { value: 'occasional', label: 'Occasional', description: 'Reply when you can — no fixed schedule' },
  { value: 'moderate', label: 'Moderate', description: 'A few hours per week' },
  { value: 'dedicated', label: 'Dedicated', description: 'Regular sessions, active involvement' },
];

// ── Utility: compute badge status from offer data ─────────────────────────

export function computeMentorBadgeStatus(offer: MentorshipOfferRow | undefined | null): MentorBadgeStatus {
  if (!offer || !offer.is_active) return 'inactive';
  if (offer.is_paused) return 'paused';
  if (offer.available_slots <= offer.current_mentees) return 'slots_full';
  return 'available';
}

export function getMentorBadgeConfig(status: MentorBadgeStatus): { label: string; color: string; dot: string } {
  switch (status) {
    case 'available':
      return { label: 'Available for Mentorship', color: 'text-emerald-400', dot: '🟢' };
    case 'slots_full':
      return { label: 'Mentoring (Slots Full)', color: 'text-yellow-400', dot: '🟡' };
    case 'paused':
      return { label: 'Mentorship Paused', color: 'text-white/40', dot: '⏸️' };
    case 'inactive':
      return { label: 'Not Available', color: 'text-white/30', dot: '⚪' };
  }
}

// ── Soft mentor highlight helpers (NOT ratings — credibility signals) ──────

export interface MentorHighlight {
  label: string;
  icon: string;
}

export function computeMentorHighlights(offer: MentorshipOfferRow | undefined | null): MentorHighlight[] {
  if (!offer) return [];
  const highlights: MentorHighlight[] = [];

  if (offer.total_mentees_helped > 0) {
    highlights.push({
      label: `Helped ${offer.total_mentees_helped} student${offer.total_mentees_helped === 1 ? '' : 's'}`,
      icon: '🎓',
    });
  }

  if (offer.last_active_at) {
    const lastActive = new Date(offer.last_active_at);
    const now = new Date();
    const daysSinceActive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActive <= 30) {
      highlights.push({ label: 'Active this month', icon: '✨' });
    }
  }

  if (offer.total_requests_received > 0) {
    const acceptRate = offer.total_requests_accepted / offer.total_requests_received;
    if (acceptRate >= 0.7 && offer.total_requests_received >= 3) {
      highlights.push({ label: 'Frequently mentors students', icon: '🤝' });
    }
  }

  return highlights;
}
