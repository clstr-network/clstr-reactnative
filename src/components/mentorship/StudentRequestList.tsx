// ============================================================================
// StudentRequestList — "My Requests" tab for students
// Shows all sent requests with status, mentor info, and feedback option
// ============================================================================

import { ThumbsUp, ThumbsDown, XCircle, UserPlus, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserBadge } from '@/components/ui/user-badge';
import type { MentorshipRequest, Mentor } from '@/types/mentorship';

interface StudentRequestListProps {
  requests: MentorshipRequest[];
  onFeedback: (requestId: string, helpful: boolean) => void;
  onCancel?: (requestId: string) => void;
  /** GAP-1: Allow mentee to cancel an accepted mentorship */
  onCancelAccepted?: (requestId: string) => void;
  onRequestSuggestedMentor?: (mentorId: string) => void;
  suggestedMentorLookup?: Map<string, Mentor>;
  /** Set of mentor IDs currently in the active mentors list (for EDGE-5 availability check) */
  availableMentorIds?: Set<string>;
  isFeedbackPending: boolean;
  isCancelPending?: boolean;
  isCancelAcceptedPending?: boolean;
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'accepted':
      return 'bg-white/[0.06] border-white/15 text-emerald-400';
    case 'rejected':
    case 'cancelled':
      return 'bg-white/[0.04] border-white/10 text-white/40';
    case 'completed':
      return 'bg-white/[0.06] border-white/15 text-blue-400';
    default:
      return 'bg-white/[0.06] border-white/10 text-white/50';
  }
}

export function StudentRequestList({ requests, onFeedback, onCancel, onCancelAccepted, onRequestSuggestedMentor, suggestedMentorLookup, availableMentorIds, isFeedbackPending, isCancelPending, isCancelAcceptedPending }: StudentRequestListProps) {
  const navigate = useNavigate();
  if (requests.length === 0) {
    return (
      <div className="rounded-xl bg-white/[0.04] border border-white/10 p-12 text-center">
        <p className="text-white/40">You haven't sent any mentorship requests yet</p>
        <p className="text-sm text-white/30 mt-2">Find a mentor and send your first request</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <div key={request.id} className="rounded-xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 hover:bg-white/[0.06] transition-colors">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16">
              <AvatarImage src={request.mentor?.avatar_url || undefined} />
              <AvatarFallback className="bg-white/10 text-white/70">
                {request.mentor?.full_name?.split(' ').map((n) => n[0]).join('') ?? '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate text-white">{request.mentor?.full_name ?? 'Unknown'}</h3>
              {request.mentor?.role && <UserBadge userType={request.mentor.role} size="sm" />}
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
              <div className="flex items-center gap-2 mt-4">
                <span className={`text-xs px-2 py-1 rounded-full border ${statusBadgeClass(request.status)}`}>
                  {request.auto_expired ? 'Expired (14 days)' : request.status}
                </span>
                {request.status === 'pending' && onCancel && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10 text-white/50 hover:bg-white/[0.06] bg-transparent gap-1"
                    onClick={() => onCancel(request.id)}
                    disabled={isCancelPending}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    {isCancelPending ? 'Cancelling…' : 'Cancel'}
                  </Button>
                )}
              </div>

              {/* UX-2 FIX: Go to Chat button for accepted AND completed mentorships */}
              {(request.status === 'accepted' || request.status === 'completed') && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="bg-white/10 hover:bg-white/15 text-white border border-white/15 gap-1"
                    onClick={() => navigate('/messages')}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Go to Chat
                  </Button>
                  {/* GAP-1 FIX: Allow mentee to leave an accepted mentorship */}
                  {request.status === 'accepted' && onCancelAccepted && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/10 text-white/50 hover:bg-white/[0.06] bg-transparent gap-1"
                      onClick={() => onCancelAccepted(request.id)}
                      disabled={isCancelAcceptedPending}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      {isCancelAcceptedPending ? 'Leaving…' : 'Leave Mentorship'}
                    </Button>
                  )}
                </div>
              )}

              {/* Suggested alternative mentor (shows when mentor rejected with suggestion) */}
              {request.status === 'rejected' && request.suggested_mentor_id && onRequestSuggestedMentor && (
                <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  {/* EDGE-5 FIX: Check if the suggested mentor is still available */}
                  {availableMentorIds && !availableMentorIds.has(request.suggested_mentor_id) ? (
                    <p className="text-xs text-white/40">
                      The suggested mentor is no longer available. Try browsing the Find Mentors tab for other options.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-white/50 mb-2">
                        {suggestedMentorLookup?.get(request.suggested_mentor_id)
                          ? `${suggestedMentorLookup.get(request.suggested_mentor_id)!.full_name} was suggested as an alternative mentor`
                          : 'An alternative mentor was suggested'}
                      </p>
                      <Button
                        size="sm"
                        className="bg-white/10 hover:bg-white/15 text-white border border-white/15 gap-1"
                        onClick={() => onRequestSuggestedMentor(request.suggested_mentor_id!)}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        View Suggested Mentor
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Auto-expired notice */}
              {request.auto_expired && (
                <p className="text-xs text-white/35 mt-2">
                  This request was automatically cancelled after 14 days without response. Try another mentor!
                </p>
              )}

              {/* Feedback for completed mentorships */}
              {request.status === 'completed' && request.mentee_feedback == null && (
                <div className="mt-4">
                  <p className="text-xs text-white/40 mb-2">Was this mentorship helpful?</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/10 text-white/50 hover:bg-white/[0.06] bg-transparent"
                      onClick={() => onFeedback(request.id, true)}
                      disabled={isFeedbackPending}
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" /> Yes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/10 text-white/50 hover:bg-white/[0.06] bg-transparent"
                      onClick={() => onFeedback(request.id, false)}
                      disabled={isFeedbackPending}
                    >
                      <ThumbsDown className="h-4 w-4 mr-1" /> No
                    </Button>
                  </div>
                </div>
              )}
              {request.status === 'completed' && request.mentee_feedback != null && (
                <p className="text-xs text-white/35 mt-4">
                  Your feedback: {request.mentee_feedback ? '👍 Helpful' : '👎 Not helpful'}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StudentRequestList;
