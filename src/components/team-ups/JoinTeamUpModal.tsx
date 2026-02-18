import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import {
  getTeamUpRoleDefinitions,
  createTeamUpRequest,
  type TeamUp,
  type TeamUpAvailability,
  type TeamUpRequestType,
} from "@/lib/team-ups-api";

interface JoinTeamUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamUp: TeamUp | null;
  requestType: TeamUpRequestType;
}

const AVAILABILITIES: { label: string; value: TeamUpAvailability }[] = [
  { label: "Weekdays", value: "weekdays" },
  { label: "Weekends", value: "weekends" },
  { label: "Evenings", value: "evenings" },
  { label: "Flexible", value: "flexible" },
];

export function JoinTeamUpModal({ open, onOpenChange, teamUp, requestType }: JoinTeamUpModalProps) {
  const { profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [availability, setAvailability] = useState<TeamUpAvailability | "">("");

  // Fetch role definitions for skill selection
  const { data: roleDefinitionsData } = useQuery({
    queryKey: ["team-up-role-definitions"],
    queryFn: getTeamUpRoleDefinitions,
    staleTime: 5 * 60 * 1000,
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

  // Create request mutation
  const createRequestMutation = useMutation({
    mutationFn: createTeamUpRequest,
    onSuccess: (result) => {
      if (!result.success || result.error) {
        toast({
          title: "Error",
          description: result.error ?? "Failed to send request",
          variant: "destructive",
        });
        return;
      } else {
        toast({
          title: requestType === "join_request" ? "Request Sent!" : "Invite Sent!",
          description: requestType === "join_request"
            ? "The team owner will review your request."
            : "The user will review your invitation.",
        });
        queryClient.invalidateQueries({ queryKey: ["team-up-requests"] });
        queryClient.invalidateQueries({ queryKey: ["my-team-up-requests"] });
        resetAndClose();
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send request",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedSkills([]);
    setAvailability("");
  };

  const resetAndClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const toggleSkill = (skillName: string) => {
    if (selectedSkills.includes(skillName)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skillName));
    } else {
      setSelectedSkills([...selectedSkills, skillName]);
    }
  };

  const handleSubmit = () => {
    if (!profile?.id || !profile.college_domain || !teamUp) return;

    createRequestMutation.mutate({
      teamUpId: teamUp.id,
      requesterId: profile.id,
      requestType,
      skills: selectedSkills,
      availability: availability as TeamUpAvailability || undefined,
      collegeDomain: profile.college_domain,
    });
  };

  const canSubmit = selectedSkills.length >= 1;

  const title = requestType === "join_request"
    ? "Request to Join Team"
    : "Invite to Your Team";

  const description = requestType === "join_request"
    ? `Tell ${teamUp?.creator?.full_name || "the team owner"} what skills you bring`
    : `Invite ${teamUp?.creator?.full_name || "this user"} to join your team`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto home-theme bg-[#0a0a0a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          <DialogDescription className="text-white/50">{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event info */}
          {teamUp && (
            <div className="p-3 bg-white/[0.06] border border-white/10 rounded-lg">
              <p className="font-medium text-white">{teamUp.event_name}</p>
              <p className="text-sm text-white/50">
                Deadline: {new Date(teamUp.event_deadline).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Skills selection */}
          <div>
            <Label className="text-white/80">Your Skills (select at least 1) *</Label>
            <div className="mt-2 space-y-3 max-h-48 overflow-y-auto">
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
                        className={`cursor-pointer ${selectedSkills.includes(role.name) ? "bg-white/[0.10] border-white/30 text-white" : "border-white/15 text-white/60 hover:bg-white/[0.06]"}`}
                        onClick={() => toggleSkill(role.name)}
                      >
                        {role.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {selectedSkills.length > 0 && (
              <p className="text-sm text-white/50 mt-2">
                Selected: {selectedSkills.join(", ")}
              </p>
            )}
          </div>

          {/* Availability */}
          <div>
            <Label className="text-white/80">Your Availability (optional)</Label>
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

          {/* No free text notice */}
          <div className="flex items-start gap-2 p-3 bg-white/[0.06] border border-white/10 rounded-lg">
            <AlertCircle className="h-5 w-5 text-white/50 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-white/60">
              Messaging is unlocked after acceptance. This keeps requests spam-free.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t border-white/10">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/15 text-white/70 hover:bg-white/[0.06] bg-transparent">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || createRequestMutation.isPending}
              className="bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]"
            >
              {createRequestMutation.isPending
                ? "Sending..."
                : requestType === "join_request"
                ? "Send Request"
                : "Send Invite"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
