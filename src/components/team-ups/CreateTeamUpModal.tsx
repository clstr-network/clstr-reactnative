import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { useProfile } from "@/contexts/ProfileContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card"; // kept for step 4 preview only
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Users, User, Calendar, AlertCircle, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import {
  getTeamUpRoleDefinitions,
  createTeamUp,
  type TeamUpEventType,
  type TeamUpCommitment,
  type TeamUpWorkMode,
  type TeamUpAvailability,
  type TeamUpTimeCommitment,
  type TeamUpRoleType,
  type TeamUpExperience,
  type CreateTeamUpParams,
} from "@/lib/team-ups-api";

interface CreateTeamUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Intent = "looking_for_teammates" | "looking_to_join" | null;

const EVENT_TYPES: { label: string; value: TeamUpEventType }[] = [
  { label: "Hackathon", value: "hackathon" },
  { label: "College Event / Fest", value: "college_event" },
  { label: "Competition", value: "competition" },
  { label: "Short-term Project (â‰¤ 4 weeks)", value: "short_term_project" },
];

const COMMITMENTS: { label: string; value: TeamUpCommitment }[] = [
  { label: "Core member (daily / intensive)", value: "core_member" },
  { label: "Part-time contributor", value: "part_time" },
  { label: "Flexible", value: "flexible" },
];

const WORK_MODES: { label: string; value: TeamUpWorkMode }[] = [
  { label: "On-campus", value: "on_campus" },
  { label: "Remote", value: "remote" },
  { label: "Hybrid", value: "hybrid" },
];

const AVAILABILITIES: { label: string; value: TeamUpAvailability }[] = [
  { label: "Weekdays", value: "weekdays" },
  { label: "Weekends", value: "weekends" },
  { label: "Evenings", value: "evenings" },
  { label: "Flexible", value: "flexible" },
];

const TIME_COMMITMENTS: { label: string; value: TeamUpTimeCommitment }[] = [
  { label: "â‰¤ 5 hrs/week", value: "under_5_hours" },
  { label: "5â€“10 hrs/week", value: "5_to_10_hours" },
  { label: "10+ hrs/week", value: "over_10_hours" },
];

const ROLE_TYPES: { label: string; value: TeamUpRoleType }[] = [
  { label: "Core member", value: "core_member" },
  { label: "Support", value: "support" },
  { label: "Advisor (Alumni only)", value: "advisor" },
];

const EXPERIENCE_LEVELS: { label: string; value: TeamUpExperience }[] = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

export function CreateTeamUpModal({ open, onOpenChange }: CreateTeamUpModalProps) {
  const { profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Step management
  const [step, setStep] = useState(0);
  const [intent, setIntent] = useState<Intent>(null);

  // Mode A: Looking for teammates
  const [eventType, setEventType] = useState<TeamUpEventType | "">("");
  const [eventName, setEventName] = useState("");
  const [eventDeadline, setEventDeadline] = useState("");
  const [teamSizeTarget, setTeamSizeTarget] = useState(4);
  const [rolesNeeded, setRolesNeeded] = useState<string[]>([]);
  const [commitment, setCommitment] = useState<TeamUpCommitment | "">("");
  const [workMode, setWorkMode] = useState<TeamUpWorkMode | "">("");

  // Mode B: Looking to join
  const [skillsOffered, setSkillsOffered] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<TeamUpExperience | "">("");
  const [availability, setAvailability] = useState<TeamUpAvailability | "">("");
  const [timeCommitment, setTimeCommitment] = useState<TeamUpTimeCommitment | "">("");
  const [preferredRoleType, setPreferredRoleType] = useState<TeamUpRoleType | "">("");

  // Fetch role definitions
  const { data: roleDefinitionsData } = useQuery({
    queryKey: QUERY_KEYS.teamUps.roleDefinitions(),
    queryFn: getTeamUpRoleDefinitions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const roleDefinitions = useMemo(() => {
    return roleDefinitionsData?.data ?? [];
  }, [roleDefinitionsData]);

  const rolesByCategory = useMemo(() => {
    const grouped: Record<string, typeof roleDefinitions> = {};
    for (const role of roleDefinitions) {
      if (!grouped[role.category]) {
        grouped[role.category] = [];
      }
      grouped[role.category].push(role);
    }
    return grouped;
  }, [roleDefinitions]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createTeamUp,
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Team-Up Published!",
          description: intent === "looking_for_teammates"
            ? "Your team-up is now visible to others in your college."
            : "You're now listed as looking to join a team.",
        });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teamUps.all() });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teamUps.my() });
        resetAndClose();
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create team-up",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setStep(0);
    setIntent(null);
    setEventType("");
    setEventName("");
    setEventDeadline("");
    setTeamSizeTarget(4);
    setRolesNeeded([]);
    setCommitment("");
    setWorkMode("");
    setSkillsOffered([]);
    setExperienceLevel("");
    setAvailability("");
    setTimeCommitment("");
    setPreferredRoleType("");
  };

  const resetAndClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handlePublish = () => {
    if (!profile?.id || !profile.college_domain) return;

    let params: CreateTeamUpParams;

    if (intent === "looking_for_teammates") {
      params = {
        intent: "looking_for_teammates",
        event_type: eventType as TeamUpEventType,
        event_name: eventName,
        event_deadline: eventDeadline,
        team_size_target: teamSizeTarget,
        roles_needed: rolesNeeded,
        commitment: commitment as TeamUpCommitment,
        work_mode: workMode as TeamUpWorkMode,
        userId: profile.id,
        collegeDomain: profile.college_domain,
      };
    } else {
      params = {
        intent: "looking_to_join",
        event_type: eventType as TeamUpEventType,
        event_name: eventName,
        event_deadline: eventDeadline || undefined,
        skills_offered: skillsOffered,
        experience_level: experienceLevel as TeamUpExperience || undefined,
        availability: availability as TeamUpAvailability,
        time_commitment: timeCommitment as TeamUpTimeCommitment,
        preferred_role_type: preferredRoleType as TeamUpRoleType,
        userId: profile.id,
        collegeDomain: profile.college_domain,
      };
    }

    createMutation.mutate(params);
  };

  const toggleRole = (roleName: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes(roleName)) {
      setList(list.filter((r) => r !== roleName));
    } else {
      setList([...list, roleName]);
    }
  };

  // Step validation
  const canProceed = useMemo(() => {
    if (step === 0) return !!intent;

    if (intent === "looking_for_teammates") {
      if (step === 1) return !!eventType && !!eventName.trim() && !!eventDeadline;
      if (step === 2) return teamSizeTarget >= 2 && rolesNeeded.length >= 1;
      if (step === 3) return !!commitment && !!workMode;
      if (step === 4) return true; // Preview step - always can proceed to publish
    } else {
      if (step === 1) return !!eventType && !!eventName.trim();
      if (step === 2) return skillsOffered.length >= 1;
      if (step === 3) return !!availability && !!timeCommitment && !!preferredRoleType;
      if (step === 4) return true; // Preview step - always can proceed to publish
    }

    return false;
  }, [step, intent, eventType, eventName, eventDeadline, teamSizeTarget, rolesNeeded, commitment, workMode, skillsOffered, availability, timeCommitment, preferredRoleType]);

  const totalSteps = 5; // 0: Intent, 1: Event, 2: Requirements/Skills, 3: Commitment, 4: Preview
  const progress = ((step + 1) / totalSteps) * 100;

  const minDeadline = new Date().toISOString().split("T")[0];

  // Preview data for step 4
  const previewData = useMemo(() => {
    if (intent === "looking_for_teammates") {
      return {
        intent: "looking_for_teammates" as const,
        event_type: eventType,
        event_name: eventName,
        event_deadline: eventDeadline,
        team_size_target: teamSizeTarget,
        team_size_current: 1,
        roles_needed: rolesNeeded,
        commitment,
        work_mode: workMode,
      };
    }
    return {
      intent: "looking_to_join" as const,
      event_type: eventType,
      event_name: eventName,
      event_deadline: eventDeadline,
      skills_offered: skillsOffered,
      experience_level: experienceLevel,
      availability,
      time_commitment: timeCommitment,
      preferred_role_type: preferredRoleType,
    };
  }, [intent, eventType, eventName, eventDeadline, teamSizeTarget, rolesNeeded, commitment, workMode, skillsOffered, experienceLevel, availability, timeCommitment, preferredRoleType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto home-theme bg-[#0a0a0a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">
            {step === 0 && "What are you here to do?"}
            {step === 1 && "Tell us about the event"}
            {step === 2 && (intent === "looking_for_teammates" ? "What does your team need?" : "What do you bring?")}
            {step === 3 && (intent === "looking_for_teammates" ? "Set expectations" : "When can you contribute?")}
            {step === 4 && "Preview your Team-Up"}
          </DialogTitle>
          <DialogDescription className="text-white/50">
            {step === 0 && "Choose your intent to get started"}
            {step > 0 && step < 4 && `Step ${step} of ${totalSteps - 1}`}
            {step === 4 && "This is how your team-up will appear to others"}
          </DialogDescription>
        </DialogHeader>

        <Progress value={progress} className="mb-4 bg-white/10 [&>div]:bg-white/40" />

        {/* Step 0: Intent Selection */}
        {step === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className={`cursor-pointer transition-all rounded-xl border p-6 text-center space-y-3 ${
                intent === "looking_for_teammates"
                  ? "border-white/30 bg-white/[0.08]"
                  : "border-white/10 bg-white/[0.04] hover:bg-white/[0.06]"
              }`}
              onClick={() => setIntent("looking_for_teammates")}
            >
                <div className="w-12 h-12 mx-auto bg-white/10 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-white/70" />
                </div>
                <h3 className="font-semibold text-white">Looking for Teammates</h3>
                <p className="text-sm text-white/50">
                  I have an idea / registration and need people
                </p>
            </div>

            <div
              className={`cursor-pointer transition-all rounded-xl border p-6 text-center space-y-3 ${
                intent === "looking_to_join"
                  ? "border-white/30 bg-white/[0.08]"
                  : "border-white/10 bg-white/[0.04] hover:bg-white/[0.06]"
              }`}
              onClick={() => setIntent("looking_to_join")}
            >
                <div className="w-12 h-12 mx-auto bg-white/10 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-white/70" />
                </div>
                <h3 className="font-semibold text-white">Looking to Join a Team</h3>
                <p className="text-sm text-white/50">
                  I want to participate but don't have a team
                </p>
            </div>
          </div>
        )}

        {/* Step 1: Event Context */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="event-type" className="text-white/80">Event Type *</Label>
              <Select value={eventType} onValueChange={(v) => setEventType(v as TeamUpEventType)}>
                <SelectTrigger className="bg-white/[0.06] border-white/10 text-white">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="event-name" className="text-white/80">Event / Hackathon Name *</Label>
              <Input
                id="event-name"
                value={eventName}
                onChange={(e) => setEventName(e.target.value.slice(0, 60))}
                placeholder="e.g., Smart India Hackathon 2026"
                maxLength={60}
                className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
              />
              <p className="text-xs text-white/40 mt-1">{eventName.length}/60 characters</p>
            </div>

            <div>
              <Label htmlFor="event-deadline" className="text-white/80">
                {intent === "looking_for_teammates" ? "Deadline / Event Date *" : "Event Date (Recommended)"}
              </Label>
              <Input
                id="event-deadline"
                type="date"
                value={eventDeadline}
                onChange={(e) => setEventDeadline(e.target.value)}
                min={minDeadline}
                className="bg-white/[0.06] border-white/10 text-white"
              />
            </div>
          </div>
        )}

        {/* Step 2A: Team Requirements (Looking for Teammates) */}
        {step === 2 && intent === "looking_for_teammates" && (
          <div className="space-y-4">
            <div>
              <Label className="text-white/80">Team Size Target *</Label>
              <div className="flex items-center gap-4 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setTeamSizeTarget(Math.max(2, teamSizeTarget - 1))}
                  disabled={teamSizeTarget <= 2}
                  className="border-white/15 text-white/70 hover:bg-white/[0.06] bg-transparent"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-2xl font-semibold w-12 text-center text-white">{teamSizeTarget}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setTeamSizeTarget(Math.min(10, teamSizeTarget + 1))}
                  disabled={teamSizeTarget >= 10}
                  className="border-white/15 text-white/70 hover:bg-white/[0.06] bg-transparent"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="text-sm text-white/50">members (including you)</span>
              </div>
            </div>

            <div>
              <Label className="text-white/80">Roles Needed * (select at least 1)</Label>
              <div className="mt-2 space-y-3">
                {Object.entries(rolesByCategory).map(([category, roles]) => (
                  <div key={category}>
                    <p className="text-xs font-medium text-white/40 uppercase mb-2">
                      {category}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {roles.map((role) => (
                        <Badge
                          key={role.id}
                          variant="outline"
                          className={`cursor-pointer ${rolesNeeded.includes(role.name) ? "bg-white/[0.10] border-white/30 text-white" : "border-white/15 text-white/60 hover:bg-white/[0.06]"}`}
                          onClick={() => toggleRole(role.name, rolesNeeded, setRolesNeeded)}
                        >
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {rolesNeeded.length > 0 && (
                <p className="text-sm text-white/50 mt-2">
                  Selected: {rolesNeeded.join(", ")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 2B: Skills (Looking to Join) */}
        {step === 2 && intent === "looking_to_join" && (
          <div className="space-y-4">
            <div>
              <Label className="text-white/80">Skills Offered * (select at least 1)</Label>
              <div className="mt-2 space-y-3">
                {Object.entries(rolesByCategory).map(([category, roles]) => (
                  <div key={category}>
                    <p className="text-xs font-medium text-white/40 uppercase mb-2">
                      {category}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {roles.map((role) => (
                        <Badge
                          key={role.id}
                          variant="outline"
                          className={`cursor-pointer ${skillsOffered.includes(role.name) ? "bg-white/[0.10] border-white/30 text-white" : "border-white/15 text-white/60 hover:bg-white/[0.06]"}`}
                          onClick={() => toggleRole(role.name, skillsOffered, setSkillsOffered)}
                        >
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {skillsOffered.length > 0 && (
                <p className="text-sm text-white/50 mt-2">
                  Selected: {skillsOffered.join(", ")}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="experience-level" className="text-white/80">Experience Level (Optional)</Label>
              <Select value={experienceLevel} onValueChange={(v) => setExperienceLevel(v as TeamUpExperience)}>
                <SelectTrigger className="bg-white/[0.06] border-white/10 text-white">
                  <SelectValue placeholder="Select experience level" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                  {EXPERIENCE_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 3A: Commitment & Visibility (Looking for Teammates) */}
        {step === 3 && intent === "looking_for_teammates" && (
          <div className="space-y-4">
            <div>
              <Label className="text-white/80">Expected Commitment *</Label>
              <Select value={commitment} onValueChange={(v) => setCommitment(v as TeamUpCommitment)}>
                <SelectTrigger className="bg-white/[0.06] border-white/10 text-white">
                  <SelectValue placeholder="Select commitment level" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                  {COMMITMENTS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white/80">Work Mode *</Label>
              <Select value={workMode} onValueChange={(v) => setWorkMode(v as TeamUpWorkMode)}>
                <SelectTrigger className="bg-white/[0.06] border-white/10 text-white">
                  <SelectValue placeholder="Select work mode" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                  {WORK_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white/80">Visibility</Label>
              <div className="flex items-center gap-2 mt-2 p-3 bg-white/[0.06] border border-white/10 rounded-lg">
                <Badge variant="outline" className="border-white/15 text-white/70">College only</Badge>
                <span className="text-sm text-white/40">(default, cannot be changed)</span>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-white/[0.06] border border-white/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-white/50 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-white/60">
                Team-ups expire automatically after the deadline.
              </p>
            </div>
          </div>
        )}

        {/* Step 3B: Availability & Commitment (Looking to Join) */}
        {step === 3 && intent === "looking_to_join" && (
          <div className="space-y-4">
            <div>
              <Label className="text-white/80">Availability *</Label>
              <Select value={availability} onValueChange={(v) => setAvailability(v as TeamUpAvailability)}>
                <SelectTrigger className="bg-white/[0.06] border-white/10 text-white">
                  <SelectValue placeholder="When can you work?" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                  {AVAILABILITIES.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white/80">Time Commitment *</Label>
              <Select value={timeCommitment} onValueChange={(v) => setTimeCommitment(v as TeamUpTimeCommitment)}>
                <SelectTrigger className="bg-white/[0.06] border-white/10 text-white">
                  <SelectValue placeholder="Hours per week" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                  {TIME_COMMITMENTS.map((tc) => (
                    <SelectItem key={tc.value} value={tc.value}>
                      {tc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white/80">Preferred Role Type *</Label>
              <Select value={preferredRoleType} onValueChange={(v) => setPreferredRoleType(v as TeamUpRoleType)}>
                <SelectTrigger className="bg-white/[0.06] border-white/10 text-white">
                  <SelectValue placeholder="Select role type" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                  {ROLE_TYPES.map((rt) => (
                    <SelectItem key={rt.value} value={rt.value}>
                      {rt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-2 p-3 bg-white/[0.06] border border-white/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-white/50 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-white/60">
                Team-ups expire automatically after the event deadline.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-white/[0.06] border border-white/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-white/50 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-white/60">
                Review how your team-up will appear. Go back to make changes if needed.
              </p>
            </div>

            <div className="rounded-xl border-2 border-dashed border-white/15 p-6 space-y-3">
                {/* Intent Badge */}
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="border-white/15 text-white/70">
                    {intent === "looking_for_teammates" ? "Looking for Teammates" : "Looking to Join"}
                  </Badge>
                </div>

                {/* Event Info */}
                <h3 className="font-semibold text-lg text-white">
                  {intent === "looking_for_teammates" ? eventName : `Looking to Join â€” ${eventName}`}
                </h3>
                
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <Calendar className="h-4 w-4" />
                  <span>{EVENT_TYPES.find(t => t.value === eventType)?.label || eventType}</span>
                </div>

                {eventDeadline && (
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <AlertCircle className="h-4 w-4 text-white/50" />
                    <span>Deadline: {new Date(eventDeadline).toLocaleDateString()}</span>
                  </div>
                )}

                {/* Mode A Preview */}
                {intent === "looking_for_teammates" && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <Users className="h-4 w-4 text-white/50" />
                      <span>Team: 1 / {teamSizeTarget}</span>
                      <span className="text-emerald-400">({teamSizeTarget - 1} spots left)</span>
                    </div>

                    {rolesNeeded.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm text-white/50">Needed Roles:</p>
                        <div className="flex flex-wrap gap-1">
                          {rolesNeeded.map((role, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs border-white/15 text-white/70">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {workMode && (
                      <div className="text-sm text-white/70">
                        <span className="text-white/50">Work Mode: </span>
                        {WORK_MODES.find(m => m.value === workMode)?.label}
                      </div>
                    )}

                    {commitment && (
                      <div className="text-sm text-white/70">
                        <span className="text-white/50">Commitment: </span>
                        {COMMITMENTS.find(c => c.value === commitment)?.label}
                      </div>
                    )}
                  </>
                )}

                {/* Mode B Preview */}
                {intent === "looking_to_join" && (
                  <>
                    {skillsOffered.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm text-white/50">Skills:</p>
                        <div className="flex flex-wrap gap-1">
                          {skillsOffered.map((skill, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs border-white/15 text-white/70">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {experienceLevel && (
                      <div className="text-sm text-white/70">
                        <span className="text-white/50">Experience: </span>
                        {EXPERIENCE_LEVELS.find(e => e.value === experienceLevel)?.label}
                      </div>
                    )}

                    {availability && (
                      <div className="text-sm text-white/70">
                        <span className="text-white/50">Availability: </span>
                        {AVAILABILITIES.find(a => a.value === availability)?.label}
                        {timeCommitment && ` Â· ${TIME_COMMITMENTS.find(t => t.value === timeCommitment)?.label}`}
                      </div>
                    )}

                    {preferredRoleType && (
                      <div className="text-sm text-white/70">
                        <span className="text-white/50">Prefers: </span>
                        {ROLE_TYPES.find(r => r.value === preferredRoleType)?.label}
                      </div>
                    )}
                  </>
                )}

                {/* Creator Preview */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-white/70" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-white">{profile?.full_name || "You"}</p>
                    <p className="text-xs text-white/40">Just now</p>
                  </div>
                </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={() => (step === 0 ? onOpenChange(false) : setStep(step - 1))}
            disabled={createMutation.isPending}
            className="border-white/15 text-white/70 hover:bg-white/[0.06] bg-transparent"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {step === 0 ? "Cancel" : "Back"}
          </Button>

          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed} className="bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]">
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handlePublish} disabled={!canProceed || createMutation.isPending} className="bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]">
              {createMutation.isPending ? "Publishing..." : "Publish Team-Up"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
