// ============================================================================
// MentorOfferSettings — the mentor's offer form (settings tab)
// Includes: help type selector, commitment level, pause toggle, availability
// ============================================================================

import { useState, useEffect, useRef, useMemo } from 'react';
import { Save, PauseCircle, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MentorStatusBadge } from '@/components/mentorship/MentorStatusBadge';
import {
  HELP_TYPE_OPTIONS,
  COMMITMENT_LEVEL_OPTIONS,
} from '@/types/mentorship';
import type {
  MentorshipOfferRow,
  MentorshipOfferFormData,
  MentorHelpType,
  MentorCommitmentLevel,
  MentorBadgeStatus,
} from '@/types/mentorship';

interface MentorOfferSettingsProps {
  myOffer: MentorshipOfferRow | null;
  myBadgeStatus: MentorBadgeStatus;
  onSave: (form: MentorshipOfferFormData) => void;
  onTogglePause: (paused: boolean) => void;
  isSaving: boolean;
  isPausing: boolean;
}

const DEFAULT_FORM: MentorshipOfferFormData = {
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

export function MentorOfferSettings({
  myOffer,
  myBadgeStatus,
  onSave,
  onTogglePause,
  isSaving,
  isPausing,
}: MentorOfferSettingsProps) {
  const lastOfferIdRef = useRef<string | null>(null);
  const [form, setForm] = useState<MentorshipOfferFormData>(DEFAULT_FORM);

  // Sync form from DB offer
  useEffect(() => {
    if (myOffer?.id && myOffer.id !== lastOfferIdRef.current) {
      lastOfferIdRef.current = myOffer.id;
      setForm({
        is_active: myOffer.is_active ?? true,
        is_paused: myOffer.is_paused ?? false,
        mentorship_type: myOffer.mentorship_type ?? 'One-on-One',
        session_duration: myOffer.session_duration ?? '30 minutes',
        available_slots: myOffer.available_slots ?? 5,
        preferred_communication: (myOffer.preferred_communication ?? []).join(', '),
        availability_schedule: myOffer.availability_schedule ?? '',
        help_type: (myOffer.help_type ?? 'general') as MentorHelpType,
        commitment_level: (myOffer.commitment_level ?? 'occasional') as MentorCommitmentLevel,
      });
    }

    if (!myOffer && lastOfferIdRef.current !== null) {
      lastOfferIdRef.current = null;
      setForm(DEFAULT_FORM);
    }
  }, [myOffer]);

  const handleSave = () => onSave(form);

  return (
    <div className="space-y-5">
      {/* Status + Pause toggle */}
      <div className="rounded-xl bg-white/[0.04] border border-white/10 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Your Mentorship Offer
            </h2>
            <p className="text-sm text-white/40 mt-1">
              Set your availability so students can request the right kind of session.
            </p>
            <div className="mt-3">
              <MentorStatusBadge status={myBadgeStatus} size="md" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-white/10 text-white/50 hover:bg-white/[0.06] bg-transparent gap-2"
              onClick={() => onTogglePause(!myOffer?.is_paused)}
              disabled={isPausing || !myOffer}
            >
              {myOffer?.is_paused ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
              {myOffer?.is_paused ? 'Resume' : 'Pause'}
            </Button>
            <Button
              size="sm"
              className="bg-white/10 hover:bg-white/15 text-white border border-white/15 gap-2"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>

        <div className="border-t border-white/10 my-4" />

        {/* Help Type Selector */}
        <div className="space-y-3 mb-6">
          <Label className="text-white/70">How would you like to help students?</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {HELP_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setForm((prev) => ({ ...prev, help_type: option.value }))}
                className={`text-left rounded-lg border p-3 transition-all ${
                  form.help_type === option.value
                    ? 'border-white/20 bg-white/[0.08] text-white'
                    : 'border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.05]'
                }`}
              >
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-xs text-white/40 mt-0.5">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Commitment Level */}
        <div className="space-y-3 mb-6">
          <Label className="text-white/70">Your commitment level</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {COMMITMENT_LEVEL_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setForm((prev) => ({ ...prev, commitment_level: option.value }))}
                className={`text-left rounded-lg border p-3 transition-all ${
                  form.commitment_level === option.value
                    ? 'border-white/20 bg-white/[0.08] text-white'
                    : 'border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.05]'
                }`}
              >
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-xs text-white/40 mt-0.5">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Availability Fields */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-white/70">Active</Label>
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <span className="text-sm text-white/60">Show me as available</span>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="session_duration" className="text-white/70">Session duration</Label>
            <Input
              id="session_duration"
              value={form.session_duration}
              onChange={(e) => setForm((prev) => ({ ...prev, session_duration: e.target.value }))}
              placeholder="e.g., 30 minutes, 1 hour"
              disabled={isSaving}
              className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mentorship_type" className="text-white/70">Mentorship type</Label>
            <Input
              id="mentorship_type"
              value={form.mentorship_type}
              onChange={(e) => setForm((prev) => ({ ...prev, mentorship_type: e.target.value }))}
              placeholder="One-on-One, Group, Both"
              disabled={isSaving}
              className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="available_slots" className="text-white/70">Available slots</Label>
            <Input
              id="available_slots"
              type="number"
              min={0}
              value={form.available_slots}
              onChange={(e) => setForm((prev) => ({ ...prev, available_slots: Number(e.target.value) }))}
              disabled={isSaving}
              className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="preferred_communication" className="text-white/70">Preferred communication (comma-separated)</Label>
            <Input
              id="preferred_communication"
              value={form.preferred_communication}
              onChange={(e) => setForm((prev) => ({ ...prev, preferred_communication: e.target.value }))}
              placeholder="Video Call, Chat, Email"
              disabled={isSaving}
              className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="availability_schedule" className="text-white/70">Availability schedule</Label>
            <Textarea
              id="availability_schedule"
              value={form.availability_schedule}
              onChange={(e) => setForm((prev) => ({ ...prev, availability_schedule: e.target.value }))}
              placeholder={'Example:\nMon/Wed 6–8pm IST\nSat 10am–12pm IST\nOr paste a booking link'}
              rows={5}
              disabled={isSaving}
              className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
            />
            <p className="text-xs text-white/35">Tip: You can paste a booking link (Calendly/Google appointment schedule).</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MentorOfferSettings;
