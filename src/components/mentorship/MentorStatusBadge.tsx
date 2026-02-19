// ============================================================================
// MentorStatusBadge — shows mentor availability status with colored dot
// ============================================================================

import { Badge } from '@/components/ui/badge';
import type { MentorshipOfferRow, MentorBadgeStatus } from '@clstr/shared/types/mentorship';
import { computeMentorBadgeStatus, getMentorBadgeConfig } from '@clstr/shared/types/mentorship';

interface MentorStatusBadgeProps {
  offer?: MentorshipOfferRow | null;
  status?: MentorBadgeStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function MentorStatusBadge({ offer, status: overrideStatus, size = 'sm', className = '' }: MentorStatusBadgeProps) {
  const badgeStatus = overrideStatus ?? computeMentorBadgeStatus(offer);
  const config = getMentorBadgeConfig(badgeStatus);

  if (badgeStatus === 'inactive') return null;

  return (
    <Badge
      variant="outline"
      className={`${config.color} border-white/10 bg-white/[0.04] ${
        size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'
      } ${className}`}
    >
      <span className="mr-1">{config.dot}</span>
      {config.label}
    </Badge>
  );
}

export default MentorStatusBadge;
