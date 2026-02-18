
import { useState, useEffect, useCallback } from "react";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ExperienceForm, { ExperienceItem } from "./ExperienceForm";
import { toast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { ExperienceData } from "@/types/profile";
import { addExperience, updateExperience, deleteExperience, getExperiences } from "@/lib/profile-api";
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

interface ProfileExperienceProps {
  profileId: string;
  isEditable: boolean;
}

const ProfileExperience = ({ profileId, isEditable }: ProfileExperienceProps) => {
  const [experiences, setExperiences] = useState<ExperienceData[]>([]);
  const [isAddExperienceOpen, setIsAddExperienceOpen] = useState(false);
  const [isEditExperienceOpen, setIsEditExperienceOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [currentExperience, setCurrentExperience] = useState<ExperienceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { refreshProfile } = useProfile();
  const queryClient = useQueryClient();

  const loadExperiences = useCallback(async () => {
    try {
      const data = await getExperiences(profileId);
      setExperiences(data);
    } catch (error) {
      console.error('Failed to load experiences:', error);
      toast({
        title: "Error",
        description: "Failed to load experiences.",
        variant: "destructive",
      });
    }
  }, [profileId]);

  useEffect(() => {
    loadExperiences();
  }, [loadExperiences]);

  // Realtime subscription for experience changes
  useEffect(() => {
    if (!profileId) return;

    const channel = supabase
      .channel(`profile-experience-${profileId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profile_experience', filter: `profile_id=eq.${profileId}` },
        () => {
          loadExperiences();
          queryClient.invalidateQueries({ queryKey: ['profile', profileId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, loadExperiences, queryClient]);

  const handleAddExperience = async (experienceData: ExperienceItem) => {
    try {
      setIsLoading(true);
      await addExperience(profileId, {
        title: experienceData.title,
        company: experienceData.company,
        location: experienceData.location,
        start_date: experienceData.startDate,
        end_date: experienceData.endDate,
        description: experienceData.description,
      });
      await loadExperiences();
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['portfolio-editor-profile'] });
      setIsAddExperienceOpen(false);
      toast({
        title: "Experience added",
        description: "Your experience has been added successfully.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Error",
        description: errorMessage || "Failed to add experience.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditExperience = async (updatedExperience: ExperienceItem) => {
    if (!updatedExperience.id) return;
    try {
      setIsLoading(true);
      await updateExperience(updatedExperience.id, {
        title: updatedExperience.title,
        company: updatedExperience.company,
        location: updatedExperience.location,
        start_date: updatedExperience.startDate,
        end_date: updatedExperience.endDate,
        description: updatedExperience.description,
      });
      await loadExperiences();
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['portfolio-editor-profile'] });
      setIsEditExperienceOpen(false);
      setCurrentExperience(null);
      toast({
        title: "Experience updated",
        description: "Your experience has been updated successfully.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Error",
        description: errorMessage || "Failed to update experience.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteExperience = async (id: string) => {
    try {
      setIsLoading(true);
      await deleteExperience(id);
      await loadExperiences();
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['portfolio-editor-profile'] });
      setIsDeleteAlertOpen(false);
      setCurrentExperience(null);
      toast({
        title: "Experience deleted",
        description: "Your experience has been removed.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Error",
        description: errorMessage || "Failed to delete experience.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (exp: ExperienceData) => {
    setCurrentExperience(exp);
    setIsEditExperienceOpen(true);
  };

  const openDeleteAlert = (exp: ExperienceData) => {
    setCurrentExperience(exp);
    setIsDeleteAlertOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">Experience</h3>
        {isEditable && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white/80"
            onClick={() => setIsAddExperienceOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Experience
          </Button>
        )}
      </div>

      {experiences.length > 0 ? (
        <div className="space-y-4">
          {experiences.map((exp) => (
            <Card key={exp.id} className="home-card-tier2 rounded-xl shadow-none hover:shadow-none">
              <CardContent className="p-4">
                <div className="flex justify-between">
                  <div>
                    <h4 className="font-medium text-white/80">{exp.title}</h4>
                    <p className="text-sm text-white/50">{exp.company}{exp.location ? ` • ${exp.location}` : ''}</p>
                    <p className="text-xs text-white/30">{exp.start_date} - {exp.end_date || 'Present'}</p>
                    {exp.description && <p className="text-sm mt-2 text-white/60">{exp.description}</p>}
                  </div>

                  {isEditable && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white/30 hover:text-white/60 hover:bg-white/[0.06]"
                        onClick={() => openEditModal(exp)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white/30 hover:text-white/50 hover:bg-white/[0.06]"
                        onClick={() => openDeleteAlert(exp)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-white/40">No experience added yet.</p>
          {isEditable && (
            <Button
              variant="outline"
              className="mt-2 border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"
              onClick={() => setIsAddExperienceOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Experience
            </Button>
          )}
        </div>
      )}

      {/* Add Experience Modal */}
      <ExperienceForm
        isOpen={isAddExperienceOpen}
        onClose={() => setIsAddExperienceOpen(false)}
        onSave={handleAddExperience}
        isLoading={isLoading}
      />

      {/* Edit Experience Modal */}
      {currentExperience && (
        <ExperienceForm
          isOpen={isEditExperienceOpen}
          onClose={() => {
            setIsEditExperienceOpen(false);
            setCurrentExperience(null);
          }}
          onSave={handleEditExperience}
          initialData={{
            id: currentExperience.id,
            title: currentExperience.title,
            company: currentExperience.company,
            location: currentExperience.location || '',
            startDate: currentExperience.start_date,
            endDate: currentExperience.end_date || '',
            description: currentExperience.description || '',
          }}
          isEdit
          isLoading={isLoading}
        />
      )}

      {/* Delete Experience Confirmation */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="bg-[#0a0a0a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This will permanently delete this experience entry from your profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteAlertOpen(false);
              setCurrentExperience(null);
            }} className="border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => currentExperience && handleDeleteExperience(currentExperience.id!)}
              className="bg-white/[0.10] hover:bg-white/[0.15] text-white border border-white/10"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfileExperience;
