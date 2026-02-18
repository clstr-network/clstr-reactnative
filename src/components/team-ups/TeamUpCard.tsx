import { useMemo } from "react";
import { useProfile } from "@/contexts/ProfileContext";
// Card imports removed - using dark translucent divs
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Clock, 
  Users, 
  Puzzle, 
  MapPin, 
  Calendar,
  Briefcase,
  Target,
  User,
  MoreVertical,
  XCircle,
  Trash2,
} from "lucide-react";
import { format, formatDistanceToNow, isPast, isWithinInterval, addDays } from "date-fns";
import type { TeamUp } from "@/lib/team-ups-api";

interface TeamUpCardProps {
  teamUp: TeamUp;
  onRequestToJoin?: () => void;
  onInviteToTeam?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  hasRequested?: boolean;
  requestStatus?: string | null;
  isLoading?: boolean;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  hackathon: "Hackathon",
  college_event: "College Event",
  competition: "Competition",
  short_term_project: "Short-term Project",
};

const COMMITMENT_LABELS: Record<string, string> = {
  core_member: "Core (intensive)",
  part_time: "Part-time",
  flexible: "Flexible",
};

const WORK_MODE_LABELS: Record<string, string> = {
  on_campus: "On-campus",
  remote: "Remote",
  hybrid: "Hybrid",
};

const AVAILABILITY_LABELS: Record<string, string> = {
  weekdays: "Weekdays",
  weekends: "Weekends",
  evenings: "Evenings",
  flexible: "Flexible",
};

const TIME_COMMITMENT_LABELS: Record<string, string> = {
  under_5_hours: "≤5 hrs/week",
  "5_to_10_hours": "5-10 hrs/week",
  over_10_hours: "10+ hrs/week",
};

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const ROLE_TYPE_LABELS: Record<string, string> = {
  core_member: "Core member",
  support: "Support",
  advisor: "Advisor",
};

export function TeamUpCard({
  teamUp,
  onRequestToJoin,
  onInviteToTeam,
  onDelete,
  onClose,
  hasRequested,
  requestStatus,
  isLoading,
}: TeamUpCardProps) {
  const { profile } = useProfile();

  const isOwner = profile?.id === teamUp.creator_id;
  const isLookingForTeammates = teamUp.intent === "looking_for_teammates";
  const deadlineDate = new Date(teamUp.event_deadline);
  const isDeadlineSoon = isWithinInterval(deadlineDate, {
    start: new Date(),
    end: addDays(new Date(), 7),
  });
  const isExpired = isPast(deadlineDate);

  const spotsRemaining = useMemo(() => {
    if (!isLookingForTeammates || !teamUp.team_size_target) return null;
    return teamUp.team_size_target - (teamUp.team_size_current || 1);
  }, [teamUp.team_size_target, teamUp.team_size_current, isLookingForTeammates]);

  const canTakeAction = !isOwner && !hasRequested && !isExpired && teamUp.status === "active";

  const getActionButton = () => {
    if (isOwner) {
      return (
        <Button variant="outline" disabled className="w-full bg-white/[0.04] border-white/10 text-white/40">
          Your Team-Up
        </Button>
      );
    }

    if (hasRequested) {
      return (
        <Button variant="outline" disabled className="w-full bg-white/[0.04] border-white/10 text-white/40">
          {requestStatus === "accepted"
            ? "✓ Added to Team"
            : requestStatus === "declined"
            ? "✗ Not a Fit"
            : "Request Sent"}
        </Button>
      );
    }

    if (isExpired) {
      return (
        <Button variant="outline" disabled className="w-full bg-white/[0.04] border-white/10 text-white/40">
          Expired
        </Button>
      );
    }

    if (isLookingForTeammates) {
      return (
        <Button 
          onClick={onRequestToJoin} 
          disabled={isLoading || (spotsRemaining !== null && spotsRemaining <= 0)}
          className="w-full bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]"
        >
          {isLoading ? "Sending..." : "Request to Join Team"}
        </Button>
      );
    } else {
      return (
        <Button onClick={onInviteToTeam} disabled={isLoading} className="w-full bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]">
          {isLoading ? "Sending..." : "Invite to Team"}
        </Button>
      );
    }
  };

  return (
    <div className={`rounded-xl bg-white/[0.04] border border-white/10 h-full flex flex-col hover:bg-white/[0.06] transition-colors ${isExpired ? "opacity-60" : ""}`}>
      <div className="p-5 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={isLookingForTeammates ? "border-white/15 text-white/70" : "border-white/15 text-white/50"}>
                {isLookingForTeammates ? "Looking for Teammates" : "Looking to Join"}
              </Badge>
              {teamUp.status === "closed" && (
                <Badge variant="outline" className="text-amber-400 border-amber-400/30">
                  Closed
                </Badge>
              )}
              {isDeadlineSoon && !isExpired && teamUp.status !== "closed" && (
                <Badge variant="outline" className="animate-pulse text-red-400 border-red-400/30">
                  Urgent
                </Badge>
              )}
            </div>
            <h3 className="text-base font-semibold text-white line-clamp-1">
              {isLookingForTeammates ? teamUp.event_name : `Looking to Join — ${teamUp.event_name}`}
            </h3>
          </div>
          {/* Owner lifecycle menu */}
          {isOwner && teamUp.status === "active" && (onDelete || onClose) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-white/10">
                {onClose && (
                  <DropdownMenuItem onClick={onClose} className="text-white/70 hover:text-white focus:text-white focus:bg-white/10 cursor-pointer">
                    <XCircle className="h-4 w-4 mr-2" />
                    Close Team-Up
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={onDelete} className="text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-red-500/10 cursor-pointer">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="px-5 pb-5 space-y-3 flex-1 flex flex-col">
        {/* Event Type Badge */}
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Briefcase className="h-4 w-4" />
          <span>{EVENT_TYPE_LABELS[teamUp.event_type] || teamUp.event_type}</span>
        </div>

        {/* Deadline */}
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Clock className={`h-4 w-4 ${isDeadlineSoon ? "text-red-400" : "text-white/50"}`} />
          <span className={isDeadlineSoon ? "text-red-400 font-medium" : ""}>
            Deadline: {format(deadlineDate, "MMM d, yyyy")}
            {!isExpired && (
              <span className="text-white/40 ml-1">
                ({formatDistanceToNow(deadlineDate, { addSuffix: true })})
              </span>
            )}
          </span>
        </div>

        {/* Mode A: Looking for Teammates */}
        {isLookingForTeammates && (
          <>
            {/* Team Size */}
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Users className="h-4 w-4 text-white/50" />
              <span>
                Team: {teamUp.team_size_current || 1} / {teamUp.team_size_target}
                {spotsRemaining !== null && spotsRemaining > 0 && (
                  <span className="text-emerald-400 ml-1">({spotsRemaining} spots left)</span>
                )}
              </span>
            </div>

            {/* Roles Needed */}
            {teamUp.roles_needed && teamUp.roles_needed.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <Puzzle className="h-4 w-4" />
                  <span>Needed Roles:</span>
                </div>
                <div className="flex flex-wrap gap-1 ml-6">
                  {teamUp.roles_needed.slice(0, 4).map((role, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs border-white/15 text-white/70">
                      {role}
                    </Badge>
                  ))}
                  {teamUp.roles_needed.length > 4 && (
                    <Badge variant="outline" className="text-xs border-white/15 text-white/70">
                      +{teamUp.roles_needed.length - 4} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Work Mode */}
            {teamUp.work_mode && (
              <div className="flex items-center gap-2 text-sm text-white/70">
                <MapPin className="h-4 w-4 text-white/50" />
                <span>{WORK_MODE_LABELS[teamUp.work_mode]}</span>
              </div>
            )}

            {/* Commitment */}
            {teamUp.commitment && (
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Target className="h-4 w-4 text-white/50" />
                <span>{COMMITMENT_LABELS[teamUp.commitment]}</span>
              </div>
            )}
          </>
        )}

        {/* Mode B: Looking to Join */}
        {!isLookingForTeammates && (
          <>
            {/* Skills Offered */}
            {teamUp.skills_offered && teamUp.skills_offered.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <Puzzle className="h-4 w-4" />
                  <span>Skills:</span>
                </div>
                <div className="flex flex-wrap gap-1 ml-6">
                  {teamUp.skills_offered.slice(0, 4).map((skill, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs border-white/15 text-white/70">
                      {skill}
                    </Badge>
                  ))}
                  {teamUp.skills_offered.length > 4 && (
                    <Badge variant="outline" className="text-xs border-white/15 text-white/70">
                      +{teamUp.skills_offered.length - 4} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Experience Level */}
            {teamUp.experience_level && (
              <div className="flex items-center gap-2 text-sm text-white/70">
                <User className="h-4 w-4 text-white/50" />
                <span>Experience: {EXPERIENCE_LABELS[teamUp.experience_level]}</span>
              </div>
            )}

            {/* Availability */}
            {teamUp.availability && (
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Calendar className="h-4 w-4 text-white/50" />
                <span>
                  {AVAILABILITY_LABELS[teamUp.availability]}
                  {teamUp.time_commitment && ` · ${TIME_COMMITMENT_LABELS[teamUp.time_commitment]}`}
                </span>
              </div>
            )}

            {/* Preferred Role Type */}
            {teamUp.preferred_role_type && (
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Target className="h-4 w-4 text-white/50" />
                <span>Prefers: {ROLE_TYPE_LABELS[teamUp.preferred_role_type]}</span>
              </div>
            )}
          </>
        )}

        {/* Scope indicator */}
        <Badge variant="outline" className="w-fit text-xs border-white/15 text-white/50">
          <MapPin className="h-3 w-3 mr-1" />
          College-only
        </Badge>

        {/* Creator info with social proof */}
        <div className="flex items-center gap-2 pt-2 mt-auto border-t border-white/10">
          <Avatar className="h-7 w-7">
            <AvatarImage src={teamUp.creator?.avatar_url || undefined} />
            <AvatarFallback className="text-xs bg-white/10 text-white/70">
              {teamUp.creator?.full_name?.substring(0, 2).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="text-xs min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="font-medium truncate text-white">{teamUp.creator?.full_name || "Unknown"}</p>
              {/* Social proof badge */}
              {teamUp.creator?.completed_team_ups_count !== undefined && teamUp.creator.completed_team_ups_count > 0 ? (
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-emerald-400/70 border-emerald-400/20">
                  {teamUp.creator.completed_team_ups_count} completed
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-sky-400/70 border-sky-400/20">
                  First Team-Up
                </Badge>
              )}
            </div>
            <p className="text-white/40">
              {formatDistanceToNow(new Date(teamUp.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {getActionButton()}
        </div>
      </div>
    </div>
  );
}
