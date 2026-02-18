// ============================================================================
// Mentorship Page — fully refactored
// All data from Supabase via useMentorship hook. No local-only state.
// No demo data. Realtime-correct. Production-safe.
// ============================================================================

import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Award, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SEO } from '@/components/SEO';
import { useRouteGuard } from '@/hooks/useFeatureAccess';
import { useMentorship } from '@/hooks/useMentorship';
import {
  MentorCard,
  MentorDashboard,
  MentorOfferSettings,
  StudentRequestList,
} from '@/components/mentorship';
import type { MentorshipStudentTab, MentorshipMentorTab, Mentor } from '@/types/mentorship';

const Mentorship = () => {
  const navigate = useNavigate();
  const m = useMentorship();

  // Route guard — redirects Club profiles
  useRouteGuard(m.canBrowseMentors, '/home');

  // Local UI state only (tab selection, search query — ephemeral, not persisted)
  const [searchQuery, setSearchQuery] = useState('');
  const [studentTab, setStudentTab] = useState<MentorshipStudentTab>('find');
  const [mentorTab, setMentorTab] = useState<MentorshipMentorTab>('dashboard');

  const filteredMentors = useMemo(() => {
    // UX-4 FIX: Filter out the current user from the mentor discovery list
    const mentors = m.mentors.filter((mentor) => mentor.id !== m.userId);
    if (!searchQuery.trim()) return mentors;
    const q = searchQuery.toLowerCase();
    return mentors.filter(
      (mentor) =>
        mentor.full_name.toLowerCase().includes(q) ||
        mentor.current_company?.toLowerCase().includes(q) ||
        mentor.industry?.toLowerCase().includes(q)
    );
  }, [m.mentors, m.userId, searchQuery]);

  /** Build a lookup map of mentors by ID for suggested-mentor display */
  const mentorById = useMemo(() => {
    const map = new Map<string, Mentor>();
    m.mentors.forEach((mentor) => map.set(mentor.id, mentor));
    return map;
  }, [m.mentors]);

  /** EDGE-5: Set of available mentor IDs for suggested-mentor availability check */
  const availableMentorIds = useMemo(() => {
    return new Set(m.mentors.map((mentor) => mentor.id));
  }, [m.mentors]);

  /** UX-1: Set of mentor IDs the student already has pending/active requests with */
  const pendingOrActiveMentorIds = useMemo(() => {
    return new Set(
      m.myRequests
        .filter((r) => r.status === 'pending' || r.status === 'accepted')
        .map((r) => r.mentor?.id)
        .filter((id): id is string => !!id)
    );
  }, [m.myRequests]);

  /** UX-B: Set of mentor IDs with ACCEPTED (active) mentorships */
  const activeMentorIds = useMemo(() => {
    return new Set(
      m.myRequests
        .filter((r) => r.status === 'accepted')
        .map((r) => r.mentor?.id)
        .filter((id): id is string => !!id)
    );
  }, [m.myRequests]);

  /** UX-4: Track the specific mentor ID being requested for per-card loading */
  const requestingMentorIdRef = useRef<string | null>(null);

  /** Navigate to find-mentors tab scrolled to a specific mentor */
  const handleViewSuggestedMentor = (mentorId: string) => {
    setStudentTab('find');
    setSearchQuery(mentorById.get(mentorId)?.full_name ?? '');
  };

  // ── Access denied screen ────────────────────────────────────────────────

  if (!m.permissionsLoading && !m.canBrowseMentors) {
    return (
      <div className="home-theme bg-[#000000] min-h-screen text-white">
        <div className="container max-w-2xl py-12 px-4">
          <div className="rounded-xl bg-white/[0.04] border border-white/10 p-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-white/50 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Access Restricted
                </h3>
                <p className="text-white/50 text-sm mt-2 mb-4">
                  Mentorship features are not available for {m.profileType} profiles.
                  This feature is available for Students, Alumni, and Faculty.
                </p>
                <Button onClick={() => navigate('/home')} size="sm" className="bg-white/10 hover:bg-white/15 text-white border border-white/15">
                  Go to Home
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main page ───────────────────────────────────────────────────────────

  return (
    <>
      <SEO
        title="Alumni Mentorship Program"
        description="Connect with experienced alumni mentors for career guidance, skill development, and professional growth. Join our campus mentorship program."
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'EducationalOccupationalProgram',
          name: 'Campus Alumni Mentorship Program',
          description: 'Connect students with alumni for career guidance and mentorship.',
          programType: 'Mentorship',
          provider: { '@type': 'Organization', name: 'Clstr' },
        }}
      />
      <div className="home-theme bg-[#000000] min-h-screen text-white">
        <div className="container py-6 px-4 md:px-6">
          <div className="space-y-5">
            {/* Header */}
            <div className="space-y-1">
              <h1
                className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Mentorship
              </h1>
              <p className="text-white/50 text-sm">
                {m.canRequestMentorship
                  ? 'Connect with experienced alumni mentors'
                  : 'Mentor students and help them grow'}
              </p>
            </div>

            {/* ── Student View ─────────────────────────────────────────── */}
            {m.canRequestMentorship && (
              <>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    placeholder="Search mentors by name, company, or industry..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10 h-10"
                  />
                </div>

                {/* Tabs */}
                <div className="rounded-xl bg-white/[0.04] border border-white/10 p-1 flex gap-1">
                  {([
                    { key: 'find' as const, label: 'Find Mentors' },
                    { key: 'my-requests' as const, label: 'My Requests', count: m.myRequests.length },
                  ]).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setStudentTab(tab.key)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        studentTab === tab.key
                          ? 'bg-white/[0.10] text-white border border-white/15'
                          : 'text-white/45 hover:text-white/70 hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.count !== undefined && tab.count > 0 && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full ${
                            studentTab === tab.key ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-white/40'
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Find Mentors tab */}
                {studentTab === 'find' && (
                  <div className="space-y-4">
                    {m.isLoading && (
                      <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
                      </div>
                    )}

                    {!m.isLoading && filteredMentors.length === 0 && (
                      <div className="rounded-xl bg-white/[0.04] border border-white/10 p-12 text-center">
                        <Award className="h-12 w-12 mx-auto text-white/20 mb-4" />
                        <p className="text-white/40">No mentors available at the moment</p>
                        <p className="text-sm text-white/30 mt-2">Check back later as alumni register their availability</p>
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filteredMentors.map((mentor) => {
                        const hasPendingRequest = pendingOrActiveMentorIds.has(mentor.id);
                        return (
                          <MentorCard
                            key={mentor.id}
                            mentor={mentor}
                            onRequest={(form) => {
                              requestingMentorIdRef.current = form.mentorId;
                              m.requestMentorshipMutation.mutate(form);
                            }}
                            isRequesting={
                              m.requestMentorshipMutation.isPending &&
                              requestingMentorIdRef.current === mentor.id
                            }
                            requestSucceeded={
                              m.requestMentorshipMutation.isSuccess &&
                              requestingMentorIdRef.current === mentor.id
                            }
                            slotsExhausted={
                              mentor.offer != null &&
                              mentor.offer.current_mentees >= mentor.offer.available_slots
                            }
                            hasPendingRequest={hasPendingRequest}
                            hasActiveRequest={activeMentorIds.has(mentor.id)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* My Requests tab */}
                {studentTab === 'my-requests' && (
                  <StudentRequestList
                    requests={m.myRequests}
                    onFeedback={(id, helpful) =>
                      m.submitFeedbackMutation.mutate({ requestId: id, helpful, asMentor: false })
                    }
                    onCancel={(id) => m.cancelRequestMutation.mutate(id)}
                    onCancelAccepted={(id) => m.cancelAcceptedMentorshipMutation.mutate(id)}
                    onRequestSuggestedMentor={handleViewSuggestedMentor}
                    suggestedMentorLookup={mentorById}
                    availableMentorIds={availableMentorIds}
                    isFeedbackPending={m.submitFeedbackMutation.isPending}
                    isCancelPending={m.cancelRequestMutation.isPending}
                    isCancelAcceptedPending={m.cancelAcceptedMentorshipMutation.isPending}
                  />
                )}
              </>
            )}

            {/* ── Role-Transitioned User: Past Mentee Requests ─────────── */}
            {/* Edge Case #1/#3: Alumni/Faculty who were previously students */}
            {/* They can no longer REQUEST new mentorships but must see/interact with existing ones */}
            {!m.canRequestMentorship && m.hasExistingMenteeRequests && (
              <div className="space-y-5">
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm text-white/60">
                    📝 You have past mentorship requests from when you were a student.
                    You can still give feedback and view history below.
                  </p>
                </div>
                <StudentRequestList
                  requests={m.myRequests}
                  onFeedback={(id, helpful) =>
                    m.submitFeedbackMutation.mutate({ requestId: id, helpful, asMentor: false })
                  }
                  onCancel={(id) => m.cancelRequestMutation.mutate(id)}
                  onCancelAccepted={(id) => m.cancelAcceptedMentorshipMutation.mutate(id)}
                  onRequestSuggestedMentor={handleViewSuggestedMentor}
                  suggestedMentorLookup={mentorById}
                  availableMentorIds={availableMentorIds}
                  isFeedbackPending={m.submitFeedbackMutation.isPending}
                  isCancelPending={m.cancelRequestMutation.isPending}
                  isCancelAcceptedPending={m.cancelAcceptedMentorshipMutation.isPending}
                />
              </div>
            )}

            {/* ── Mentor/Alumni View ───────────────────────────────────── */}
            {m.canOfferMentorship && (
              <div className="space-y-5">
                {/* Mentor tabs */}
                <div className="rounded-xl bg-white/[0.04] border border-white/10 p-1 flex gap-1">
                  {([
                    { key: 'dashboard' as const, label: 'My Mentorship', count: m.pendingRequestCount },
                    { key: 'settings' as const, label: 'Settings' },
                  ]).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setMentorTab(tab.key)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        mentorTab === tab.key
                          ? 'bg-white/[0.10] text-white border border-white/15'
                          : 'text-white/45 hover:text-white/70 hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.count !== undefined && tab.count > 0 && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full ${
                            mentorTab === tab.key ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-white/40'
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Dashboard tab */}
                {mentorTab === 'dashboard' && (
                  <MentorDashboard
                    incomingRequests={m.incomingRequests}
                    activeRelationships={m.activeRelationships}
                    completedRelationships={m.completedRelationships}
                    highlights={m.myHighlights}
                    onAccept={(id) => m.updateRequestStatusMutation.mutate({ requestId: id, status: 'accepted' })}
                    onReject={(id) => m.updateRequestStatusMutation.mutate({ requestId: id, status: 'rejected' })}
                    onRejectWithSuggestion={(id, suggestedId) =>
                      m.rejectWithSuggestionMutation.mutate({ requestId: id, suggestedMentorId: suggestedId })
                    }
                    onComplete={(id) => m.completeMentorshipMutation.mutate(id)}
                    onFeedback={(id, helpful) =>
                      m.submitFeedbackMutation.mutate({ requestId: id, helpful, asMentor: true })
                    }
                    findAlternativeMentor={m.findAlternativeMentor}
                    isUpdating={
                      m.updateRequestStatusMutation.isPending ||
                      m.completeMentorshipMutation.isPending ||
                      m.submitFeedbackMutation.isPending ||
                      m.rejectWithSuggestionMutation.isPending
                    }
                  />
                )}

                {/* Settings tab */}
                {mentorTab === 'settings' && (
                  <MentorOfferSettings
                    myOffer={m.myOffer}
                    myBadgeStatus={m.myBadgeStatus}
                    onSave={(form) => m.saveOfferMutation.mutate(form)}
                    onTogglePause={(paused) => m.togglePauseMutation.mutate(paused)}
                    isSaving={m.saveOfferMutation.isPending}
                    isPausing={m.togglePauseMutation.isPending}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Mentorship;
