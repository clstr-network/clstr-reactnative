
import { useState, useEffect, useCallback } from "react";
import { Edit3, Plus, ThumbsUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SkillForm, { SkillItem } from "./SkillForm";
import { toast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { SkillData } from "@/types/profile";
import { getSkills, updateSkills, addSkill, updateSkill, deleteSkill } from "@/lib/profile-api";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProfileSkillsProps {
  profileId: string;
  isEditable: boolean;
}

const ProfileSkills = ({ profileId, isEditable }: ProfileSkillsProps) => {
  const [userSkills, setUserSkills] = useState<SkillData[]>([]);
  const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);
  const [isEditSkillOpen, setIsEditSkillOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [currentSkill, setCurrentSkill] = useState<SkillData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { refreshProfile } = useProfile();
  const queryClient = useQueryClient();

  const loadSkills = useCallback(async () => {
    try {
      const data = await getSkills(profileId);
      setUserSkills(data);
    } catch (error) {
      console.error('Failed to load skills:', error);
      toast({
        title: "Error",
        description: "Failed to load skills.",
        variant: "destructive",
      });
    }
  }, [profileId]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  // Realtime subscription for skills changes
  useEffect(() => {
    if (!profileId) return;

    const channel = supabase
      .channel(`profile-skills-${profileId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profile_skills', filter: `profile_id=eq.${profileId}` },
        () => {
          loadSkills();
          queryClient.invalidateQueries({ queryKey: ['profile', profileId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, loadSkills, queryClient]);

  const handleAddSkill = async (skillData: SkillItem) => {
    try {
      setIsLoading(true);
      await addSkill(profileId, {
        name: skillData.name,
        level: skillData.level,
      });
      await loadSkills();
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['portfolio-editor-profile'] });
      setIsAddSkillOpen(false);
      toast({
        title: "Skill added",
        description: "Your skill has been added successfully.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Error",
        description: errorMessage || "Failed to add skill.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSkill = async (updatedSkill: SkillItem) => {
    if (!updatedSkill.id) return;
    try {
      setIsLoading(true);
      await updateSkill(updatedSkill.id, {
        name: updatedSkill.name,
        level: updatedSkill.level,
      });
      await loadSkills();
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['portfolio-editor-profile'] });
      setIsEditSkillOpen(false);
      setCurrentSkill(null);
      toast({
        title: "Skill updated",
        description: "Your skill has been updated successfully.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Error",
        description: errorMessage || "Failed to update skill.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSkill = async (id: string) => {
    try {
      setIsLoading(true);
      await deleteSkill(id);
      await loadSkills();
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['portfolio-editor-profile'] });
      setIsDeleteAlertOpen(false);
      setCurrentSkill(null);
      toast({
        title: "Skill deleted",
        description: "Your skill has been removed.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Error",
        description: errorMessage || "Failed to delete skill.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndorse = (skillId: string) => {
    toast({
      title: "Skill endorsed",
      description: "You have endorsed this skill.",
    });
  };

  const getBadgeVariant = (level: string) => {
    switch (level) {
      case "Beginner": return "secondary";
      case "Intermediate": return "default";
      case "Expert": return "outline";
      case "Professional": return "default";
      default: return "default";
    }
  };

  return (
    <div className="space-y-4">
      {userSkills.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {userSkills.map((skill) => (
            <Card key={skill.id} className="group home-card-tier2 rounded-xl shadow-none hover:shadow-none transition-colors">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-base mb-1 text-white/80">{skill.name}</h4>
                    <Badge variant={getBadgeVariant(skill.level)} className="text-xs bg-white/[0.08] text-white/60 border border-white/10">
                      {skill.level}
                    </Badge>
                    {/* Network context - shows how skill is used */}
                    <p className="text-xs text-white/30 mt-2 italic">
                      Used in projects • Available for collaboration
                    </p>
                  </div>

                  {isEditable ? (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white/30 hover:text-white/60 hover:bg-white/[0.06]"
                        onClick={() => {
                          setCurrentSkill(skill);
                          setIsEditSkillOpen(true);
                        }}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white/30 hover:text-white/50 hover:bg-white/[0.06]"
                        onClick={() => {
                          setCurrentSkill(skill);
                          setIsDeleteAlertOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs text-white/40 hover:text-white/60 hover:bg-white/[0.06]"
                      onClick={() => handleEndorse(skill.id!)}
                    >
                      <ThumbsUp className="h-3 w-3 mr-1" />
                      Endorse
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 px-4">
          <p className="text-white/40 mb-1">No skills added yet.</p>
          {isEditable && (
            <>
              <p className="text-sm text-white/25 mb-4">Showcase your expertise to connect with opportunities</p>
              <Button
                variant="outline"
                className="mt-2 border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"
                onClick={() => setIsAddSkillOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your Skills
              </Button>
            </>
          )}
        </div>
      )}

      {isEditable && userSkills.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2 border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"
          onClick={() => setIsAddSkillOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Skill
        </Button>
      )}

      {/* Add Skill Modal */}
      <SkillForm
        isOpen={isAddSkillOpen}
        onClose={() => setIsAddSkillOpen(false)}
        onSave={handleAddSkill}
        isLoading={isLoading}
      />

      {/* Edit Skill Modal */}
      {currentSkill && (
        <SkillForm
          isOpen={isEditSkillOpen}
          onClose={() => {
            setIsEditSkillOpen(false);
            setCurrentSkill(null);
          }}
          onSave={handleEditSkill}
          initialData={{
            id: currentSkill.id,
            name: currentSkill.name,
            level: currentSkill.level,
          }}
          isEdit
          isLoading={isLoading}
        />
      )}

      {/* Delete Skill Confirmation */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this skill from your profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteAlertOpen(false);
              setCurrentSkill(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => currentSkill && handleDeleteSkill(currentSkill.id!)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfileSkills;
