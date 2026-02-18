
import { useState, useEffect, useCallback } from "react";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import EducationForm, { EducationItem } from "./EducationForm";
import { toast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { EducationData } from "@/types/profile";
import { addEducation, updateEducation, deleteEducation, getEducation } from "@/lib/profile-api";
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

interface ProfileEducationProps {
  profileId: string;
  isEditable: boolean;
}

const ProfileEducation = ({ profileId, isEditable }: ProfileEducationProps) => {
  const [educations, setEducations] = useState<EducationData[]>([]);
  const [isAddEducationOpen, setIsAddEducationOpen] = useState(false);
  const [isEditEducationOpen, setIsEditEducationOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [currentEducation, setCurrentEducation] = useState<EducationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { refreshProfile } = useProfile();
  const queryClient = useQueryClient();

  const loadEducation = useCallback(async () => {
    try {
      const data = await getEducation(profileId);
      setEducations(data);
    } catch (error) {
      console.error('Failed to load education:', error);
      toast({
        title: "Error",
        description: "Failed to load education.",
        variant: "destructive",
      });
    }
  }, [profileId]);

  useEffect(() => {
    loadEducation();
  }, [loadEducation]);

  // Realtime subscription for education changes
  useEffect(() => {
    if (!profileId) return;

    const channel = supabase
      .channel(`profile-education-${profileId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profile_education', filter: `profile_id=eq.${profileId}` },
        () => {
          loadEducation();
          queryClient.invalidateQueries({ queryKey: ['profile', profileId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, loadEducation, queryClient]);

  const handleAddEducation = async (educationData: EducationItem) => {
    try {
      setIsLoading(true);
      await addEducation(profileId, {
        degree: educationData.degree,
        school: educationData.school,
        location: educationData.location,
        start_date: educationData.startDate,
        end_date: educationData.endDate,
        description: educationData.description,
      });
      await loadEducation();
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['portfolio-editor-profile'] });
      setIsAddEducationOpen(false);
      toast({
        title: "Education added",
        description: "Your education has been added successfully.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Error",
        description: errorMessage || "Failed to add education.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditEducation = async (updatedEducation: EducationItem) => {
    if (!updatedEducation.id) return;
    try {
      setIsLoading(true);
      await updateEducation(updatedEducation.id, {
        degree: updatedEducation.degree,
        school: updatedEducation.school,
        location: updatedEducation.location,
        start_date: updatedEducation.startDate,
        end_date: updatedEducation.endDate,
        description: updatedEducation.description,
      });
      await loadEducation();
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['portfolio-editor-profile'] });
      setIsEditEducationOpen(false);
      setCurrentEducation(null);
      toast({
        title: "Education updated",
        description: "Your education has been updated successfully.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Error",
        description: errorMessage || "Failed to update education.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEducation = async (id: string) => {
    try {
      setIsLoading(true);
      await deleteEducation(id);
      await loadEducation();
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['portfolio-editor-profile'] });
      setIsDeleteAlertOpen(false);
      setCurrentEducation(null);
      toast({
        title: "Education deleted",
        description: "Your education has been removed.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Error",
        description: errorMessage || "Failed to delete education.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (edu: EducationData) => {
    setCurrentEducation(edu);
    setIsEditEducationOpen(true);
  };

  const openDeleteAlert = (edu: EducationData) => {
    setCurrentEducation(edu);
    setIsDeleteAlertOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">Education</h3>
        {isEditable && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white/80"
            onClick={() => setIsAddEducationOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Education
          </Button>
        )}
      </div>

      {educations.length > 0 ? (
        <div className="space-y-4">
          {educations.map((edu) => (
            <Card key={edu.id} className="border border-white/10 bg-white/[0.04] shadow-none rounded-xl">
              <CardContent className="p-4">
                <div className="flex justify-between">
                  <div>
                    <h4 className="font-medium text-white/80">{edu.degree}</h4>
                    <p className="text-sm text-white/50">{edu.school}{edu.location ? ` • ${edu.location}` : ''}</p>
                    <p className="text-xs text-white/30">{edu.start_date} - {edu.end_date || 'Present'}</p>
                    {edu.description && <p className="text-sm mt-2 text-white/60">{edu.description}</p>}
                  </div>

                  {isEditable && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white/30 hover:text-white/60 hover:bg-white/[0.06]"
                        onClick={() => openEditModal(edu)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white/30 hover:text-white/50 hover:bg-white/[0.06]"
                        onClick={() => openDeleteAlert(edu)}
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
          <p className="text-white/40">No education added yet.</p>
          {isEditable && (
            <Button
              variant="outline"
              className="mt-2 border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"
              onClick={() => setIsAddEducationOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your Education
            </Button>
          )}
        </div>
      )}

      {/* Add Education Modal */}
      <EducationForm
        isOpen={isAddEducationOpen}
        onClose={() => setIsAddEducationOpen(false)}
        onSave={handleAddEducation}
        isLoading={isLoading}
      />

      {/* Edit Education Modal */}
      {currentEducation && (
        <EducationForm
          isOpen={isEditEducationOpen}
          onClose={() => {
            setIsEditEducationOpen(false);
            setCurrentEducation(null);
          }}
          onSave={handleEditEducation}
          initialData={{
            id: currentEducation.id,
            degree: currentEducation.degree,
            school: currentEducation.school,
            location: currentEducation.location || '',
            startDate: currentEducation.start_date,
            endDate: currentEducation.end_date || '',
            description: currentEducation.description || '',
          }}
          isEdit
          isLoading={isLoading}
        />
      )}

      {/* Delete Education Confirmation */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="bg-[#0a0a0a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This will permanently delete this education entry from your profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteAlertOpen(false);
              setCurrentEducation(null);
            }} className="border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => currentEducation && handleDeleteEducation(currentEducation.id!)}
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

export default ProfileEducation;

