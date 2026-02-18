// ============================================================================
// MentorCard — card displayed in the "Find Mentors" grid
// Shows: avatar, name, company, industry, help type, badge, availability, CTA
// ============================================================================

import { useState, useRef, useEffect } from 'react';
import { CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MentorStatusBadge } from '@/components/mentorship/MentorStatusBadge';
import { HELP_TYPE_OPTIONS, COMMITMENT_LEVEL_OPTIONS, computeMentorHighlights } from '@/types/mentorship';
import type { Mentor, MentorshipRequestFormData } from '@/types/mentorship';

interface MentorCardProps {
  mentor: Mentor;
  onRequest: (form: MentorshipRequestFormData) => void;
  isRequesting: boolean;
  /** UX-A: When true, the last request mutation succeeded — close dialog and reset */
  requestSucceeded?: boolean;
  /** When true, the request button is disabled (e.g., slots full) */
  slotsExhausted?: boolean;
  /** UX-1: When true, the student already has a pending/active request with this mentor */
  hasPendingRequest?: boolean;
  /** UX-B: When true, there's an ACCEPTED (active) mentorship, not just pending */
  hasActiveRequest?: boolean;
}

export function MentorCard({ mentor, onRequest, isRequesting, requestSucceeded, slotsExhausted, hasPendingRequest, hasActiveRequest }: MentorCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [requestTopic, setRequestTopic] = useState('');
  const [requestMessage, setRequestMessage] = useState('');

  const helpLabel = HELP_TYPE_OPTIONS.find((o) => o.value === mentor.offer?.help_type)?.label ?? 'General';
  const commitLabel = COMMITMENT_LEVEL_OPTIONS.find((o) => o.value === mentor.offer?.commitment_level)?.label ?? 'Occasional';
  const highlights = computeMentorHighlights(mentor.offer);

  const handleSubmit = () => {
    if (!requestTopic.trim() || !requestMessage.trim()) return;
    onRequest({
      mentorId: mentor.id,
      topic: requestTopic,
      message: requestMessage,
    });
    // UX-3 FIX: Don't close dialog or reset form here.
    // The parent component's mutation onSuccess/onError will handle this.
    // We keep the form state so the user can retry on failure.
  };

  // UX-A FIX: Only close dialog and reset form on SUCCESS, not on failure.
  // Previously, the ref-based approach closed on any isRequesting false→true→false
  // transition, losing the user's typed message if the mutation failed.
  const prevSucceededRef = useRef(requestSucceeded);
  useEffect(() => {
    if (requestSucceeded && !prevSucceededRef.current && isDialogOpen) {
      setIsDialogOpen(false);
      setRequestTopic('');
      setRequestMessage('');
    }
    prevSucceededRef.current = requestSucceeded;
  }, [requestSucceeded, isDialogOpen]);

  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 flex flex-col gap-4 h-full overflow-hidden hover:bg-white/[0.06] transition-colors">
      {/* Header */}
      <div className="flex items-start gap-3 sm:gap-4 min-w-0">
        <Avatar className="h-14 w-14 sm:h-16 sm:w-16">
          <AvatarImage src={mentor.avatar_url || undefined} />
          <AvatarFallback className="bg-white/10 text-white/70">
            {mentor.full_name.split(' ').map((n) => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate text-white">{mentor.full_name}</h3>
            <MentorStatusBadge offer={mentor.offer} size="sm" />
          </div>
          <p className="text-sm text-white/50 truncate">{mentor.current_position}</p>
          <p className="text-xs text-white/35 truncate">{mentor.current_company}</p>
          {mentor.years_of_experience && (
            <p className="text-xs text-white/35">{mentor.years_of_experience} years experience</p>
          )}
        </div>
      </div>

      {/* Bio */}
      {mentor.bio && <p className="text-sm text-white/50 line-clamp-2 break-words">{mentor.bio}</p>}

      {/* Tags row: industry + help type + commitment */}
      <div className="flex flex-wrap gap-1.5">
        {mentor.industry && (
          <span className="text-xs px-2 py-1 rounded-md bg-white/[0.06] border border-white/10 text-white/50">{mentor.industry}</span>
        )}
        <span className="text-xs px-2 py-1 rounded-md bg-white/[0.06] border border-white/10 text-white/50">{helpLabel}</span>
        <span className="text-xs px-2 py-1 rounded-md bg-white/[0.06] border border-white/10 text-white/40">{commitLabel}</span>
      </div>

      {/* Soft highlights (credibility signals, NOT ratings) */}
      {highlights.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {highlights.map((h, i) => (
            <span key={i} className="text-xs px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/45">
              {h.icon} {h.label}
            </span>
          ))}
        </div>
      )}

      {/* Availability block */}
      {mentor.offer && (
        <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-white/70">
            <CalendarClock className="h-4 w-4 text-white/40" />
            Availability
          </div>
          <div className="text-xs text-white/40">
            {mentor.offer.session_duration ? `Session: ${mentor.offer.session_duration}` : 'Session length not specified'}
          </div>
          {mentor.offer.available_slots != null && (
            <div className="text-xs text-white/40">
              Slots: {Math.max(0, mentor.offer.available_slots - mentor.offer.current_mentees)} of {mentor.offer.available_slots} available
            </div>
          )}
          {mentor.offer.preferred_communication?.length > 0 && (
            <div className="text-xs text-white/35">
              Preferred: {mentor.offer.preferred_communication.join(', ')}
            </div>
          )}
          {mentor.offer.availability_schedule && (
            <div className="text-xs text-white/35 whitespace-pre-wrap line-clamp-3">
              {mentor.offer.availability_schedule}
            </div>
          )}
        </div>
      )}

      {/* Request dialog */}
      {/* UX-1: Disable button when mentor's slots are full or request already pending */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            className="w-full mt-auto bg-white/10 hover:bg-white/15 text-white border border-white/15"
            disabled={slotsExhausted || hasPendingRequest}
          >
            {hasActiveRequest ? 'Active Mentorship' : hasPendingRequest ? 'Request Pending' : slotsExhausted ? 'No Slots Available' : 'Request Mentorship'}
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-[#0a0a0a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Request Mentorship
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Send a message to {mentor.full_name} explaining why you'd like them as a mentor
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Mentor info summary */}
            <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <div className="text-sm font-medium text-white/70">About this mentor</div>
              <div className="text-xs text-white/40">Offers: {helpLabel}</div>
              <div className="text-xs text-white/40">Commitment: {commitLabel}</div>
              {mentor.offer?.session_duration && (
                <div className="text-xs text-white/40">Session: {mentor.offer.session_duration}</div>
              )}
              {mentor.offer?.preferred_communication?.length ? (
                <div className="text-xs text-white/40">Preferred: {mentor.offer.preferred_communication.join(', ')}</div>
              ) : null}
              {mentor.offer?.availability_schedule ? (
                <div className="text-xs text-white/35 whitespace-pre-wrap">{mentor.offer.availability_schedule}</div>
              ) : (
                <div className="text-xs text-white/40">Availability not provided.</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic" className="text-white/70">Request Topic</Label>
              <Input
                id="topic"
                placeholder="e.g., Career guidance, Product design, Entrepreneurship"
                value={requestTopic}
                onChange={(e) => setRequestTopic(e.target.value)}
                className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message" className="text-white/70">Your Message</Label>
              <Textarea
                id="message"
                placeholder="Tell the mentor about yourself and what you hope to learn..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={5}
                className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
              />
            </div>
            <Button
              onClick={handleSubmit}
              className="w-full bg-white/10 hover:bg-white/15 text-white border border-white/15"
              disabled={isRequesting || !requestTopic.trim() || !requestMessage.trim()}
            >
              {isRequesting ? 'Sending…' : 'Send Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MentorCard;
