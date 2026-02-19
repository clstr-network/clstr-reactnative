// ============================================================================
// MentorDashboard — Alumni's "My Mentorship" panel
// Sections: pending requests, active mentees, completed mentorships
// ============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Users, CheckCircle2, ThumbsUp, ThumbsDown, UserPlus, Rocket, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserBadge } from '@/components/ui/user-badge';
import type { MentorshipRequest, MentorDashboardSection, Mentor, MentorHighlight } from '@clstr/shared/types/mentorship';

interface MentorDashboardProps {
  incomingRequests: MentorshipRequest[];
  activeRelationships: MentorshipRequest[];
  completedRelationships: MentorshipRequest[];
  highlights: MentorHighlight[];
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onRejectWithSuggestion: (requestId: string, suggestedMentorId: string) => void;
  onComplete: (requestId: string) => void;
  onFeedback: (requestId: string, helpful: boolean) => void;
  findAlternativeMentor: (excludeId: string, helpType?: string) => Mentor | null;
  isUpdating: boolean;
}

export function MentorDashboard({
  incomingRequests,
  activeRelationships,
  completedRelationships,
  highlights,
  onAccept,
  onReject,
  onRejectWithSuggestion,
  onComplete,
  onFeedback,
  findAlternativeMentor,
  isUpdating,
}: MentorDashboardProps) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<MentorDashboardSection>('pending');

  const sections: { key: MentorDashboardSection; label: string; icon: typeof Bell; count: number }[] = [
    { key: 'pending', label: 'New Requests', icon: Bell, count: incomingRequests.length },
    { key: 'active', label: 'Active Mentees', icon: Users, count: activeRelationships.length },
    { key: 'completed', label: 'Completed', icon: CheckCircle2, count: completedRelationships.length },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          My Mentorship
        </h2>
        <p className="text-sm text-white/40 mt-1">Manage your mentorship relationships</p>
        {/* Soft mentor highlights (credibility signals, NOT ratings) */}
        {highlights.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {highlights.map((h, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/45">
                {h.icon} {h.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Section tabs */}
      <div className="rounded-xl bg-white/[0.04] border border-white/10 p-1 flex gap-1">
        {sections.map((section) => (
          <button
            key={section.key}
            onClick={() => setActiveSection(section.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSection === section.key
                ? 'bg-white/[0.10] text-white border border-white/15'
                : 'text-white/45 hover:text-white/70 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <section.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{section.label}</span>
            {section.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeSection === section.key ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-white/40'
              }`}>
                {section.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Gentle reminder nudge */}
      {incomingRequests.length > 0 && activeSection !== 'pending' && (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <p className="text-sm text-white/60">
            🔔 You have <span className="font-semibold text-white">{incomingRequests.length}</span> pending mentorship
            {incomingRequests.length === 1 ? ' request' : ' requests'}. Students are waiting for your response.
          </p>
        </div>
      )}

      {/* Pending Requests */}
      {activeSection === 'pending' && (
        <div className="space-y-3">
          {incomingRequests.length === 0 ? (
            <div className="rounded-xl bg-white/[0.04] border border-white/10 p-12 text-center">
              <Bell className="h-10 w-10 mx-auto text-white/20 mb-3" />
              <p className="text-white/40">No pending requests</p>
              <p className="text-sm text-white/30 mt-2">Requests from students will appear here</p>
            </div>
          ) : (
            incomingRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                person={request.mentee}
                actions={
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button
                      size="sm"
                      className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-white border border-white/15"
                      onClick={() => onAccept(request.id)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? 'Accepting...' : 'Accept'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto border-white/10 text-white/50 hover:bg-white/[0.06] bg-transparent"
                      onClick={() => onReject(request.id)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? 'Declining...' : 'Decline'}
                    </Button>
                    {(() => {
                      const alt = findAlternativeMentor(request.mentor_id, request.topics?.[0]);
                      if (!alt) return null;
                      return (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto border-white/10 text-white/50 hover:bg-white/[0.06] bg-transparent gap-1"
                          onClick={() => onRejectWithSuggestion(request.id, alt.id)}
                          disabled={isUpdating}
                          title={`Suggest ${alt.full_name}`}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Suggest {alt.full_name.split(' ')[0]}
                        </Button>
                      );
                    })()}
                  </div>
                }
              />
            ))
          )}
        </div>
      )}

      {/* Active Mentees */}
      {activeSection === 'active' && (
        <div className="space-y-3">
          {activeRelationships.length === 0 ? (
            <div className="rounded-xl bg-white/[0.04] border border-white/10 p-12 text-center">
              <Users className="h-10 w-10 mx-auto text-white/20 mb-3" />
              <p className="text-white/40">No active mentees</p>
              <p className="text-sm text-white/30 mt-2">Accept requests to start mentoring</p>
            </div>
          ) : (
            activeRelationships.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                person={request.mentee}
                showDate={request.accepted_at}
                dateLabel="Started"
                actions={
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      className="bg-white/10 hover:bg-white/15 text-white border border-white/15 gap-1"
                      onClick={() => navigate('/messages')}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Go to Chat
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/10 text-white/50 hover:bg-white/[0.06] bg-transparent"
                      onClick={() => onComplete(request.id)}
                      disabled={isUpdating}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Mark Completed
                    </Button>
                  </div>
                }
              />
            ))
          )}
        </div>
      )}

      {/* Completed Mentorships */}
      {activeSection === 'completed' && (
        <div className="space-y-3">
          {completedRelationships.length === 0 ? (
            <div className="rounded-xl bg-white/[0.04] border border-white/10 p-12 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto text-white/20 mb-3" />
              <p className="text-white/40">No completed mentorships yet</p>
            </div>
          ) : (
            completedRelationships.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                person={request.mentee}
                showDate={request.completed_at}
                dateLabel="Completed"
                actions={
                  request.mentor_feedback == null ? (
                    <div className="mt-4">
                      <p className="text-xs text-white/40 mb-2">Was this mentorship helpful?</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/10 text-white/50 hover:bg-white/[0.06] bg-transparent"
                          onClick={() => onFeedback(request.id, true)}
                          disabled={isUpdating}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" /> Yes
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/10 text-white/50 hover:bg-white/[0.06] bg-transparent"
                          onClick={() => onFeedback(request.id, false)}
                          disabled={isUpdating}
                        >
                          <ThumbsDown className="h-4 w-4 mr-1" /> No
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-white/35 mt-4">
                      Feedback: {request.mentor_feedback ? '👍 Helpful' : '👎 Not helpful'}
                    </p>
                  )
                }
                projectBridge={
                  request.status === 'completed' ? (
                    <div className="mt-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                      <div className="flex items-center gap-2">
                        <Rocket className="h-4 w-4 text-white/30" />
                        <p className="text-xs text-white/40">
                          Had a great mentorship? Continue collaborating!
                        </p>
                      </div>
                      <a
                        href="/projects"
                        className="inline-flex items-center gap-1 mt-2 text-xs px-2.5 py-1.5 rounded-md bg-white/[0.06] border border-white/10 text-white/50 hover:bg-white/[0.10] hover:text-white/70 transition-colors"
                      >
                        <Rocket className="h-3 w-3" />
                        Start a project together
                      </a>
                    </div>
                  ) : undefined
                }
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared request card sub-component ────────────────────────────────────

function RequestCard({
  request,
  person,
  actions,
  projectBridge,
  showDate,
  dateLabel = 'Date',
}: {
  request: MentorshipRequest;
  person?: { full_name: string; avatar_url: string | null; role: string };
  actions?: React.ReactNode;
  projectBridge?: React.ReactNode;
  showDate?: string | null;
  dateLabel?: string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 hover:bg-white/[0.06] transition-colors">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar className="h-14 w-14 sm:h-16 sm:w-16">
          <AvatarImage src={person?.avatar_url || undefined} />
          <AvatarFallback className="bg-white/10 text-white/70">
            {person?.full_name?.split(' ').map((n) => n[0]).join('') ?? '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate text-white">{person?.full_name ?? 'Unknown'}</h3>
          {person?.role && <UserBadge userType={person.role} size="sm" />}
          {request.message && <p className="text-sm mt-2 text-white/60 italic">"{request.message}"</p>}
          {request.topics?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {request.topics.map((topic, i) => (
                <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-white/40">
                  {topic}
                </span>
              ))}
            </div>
          )}
          {showDate && (
            <p className="text-xs text-white/30 mt-2">
              {dateLabel}: {new Date(showDate).toLocaleDateString()}
            </p>
          )}
          {actions}
          {projectBridge}
        </div>
      </div>
    </div>
  );
}

export default MentorDashboard;
