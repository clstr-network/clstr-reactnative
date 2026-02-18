
import { useState, useEffect, useRef } from "react";
import { Edit3, Plus, Trash2, ExternalLink, Upload, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { addProject, updateProject, deleteProject, uploadProjectImage, ProjectData } from "@/lib/profile-api";
import { useProfile } from "@/contexts/ProfileContext";

const DEFAULT_PROJECT_IMAGE = "/placeholder-project.svg";

type ProjectItem = {
  id: string;
  title: string;
  description: string;
  link: string;
  imageUrl: string;
};

interface ProfileProjectsProps {
  projects: ProjectItem[];
  isEditable: boolean;
  onProjectsChange?: () => void;
}

const ProfileProjects = ({ projects, isEditable, onProjectsChange }: ProfileProjectsProps) => {
  const [userProjects, setUserProjects] = useState<ProjectItem[]>(projects);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useProfile();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    url: "",
    image_url: "",
    start_date: "",
    end_date: ""
  });

  useEffect(() => {
    setUserProjects(projects);
  }, [projects]);

  useEffect(() => {
    setUserProjects(projects);
  }, [projects]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

    if (file.size > maxSize) {
      toast({
        title: "Image too large",
        description: "Please select an image under 5MB",
        variant: "destructive"
      });
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a JPEG, PNG, WebP, or GIF image",
        variant: "destructive"
      });
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, image_url: "" }));
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleOpenDialog = (project?: ProjectItem) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.title,
        description: project.description,
        url: project.link,
        image_url: project.imageUrl !== DEFAULT_PROJECT_IMAGE ? project.imageUrl : "",
        start_date: "",
        end_date: ""
      });
      // Set preview for existing image
      if (project.imageUrl && project.imageUrl !== DEFAULT_PROJECT_IMAGE) {
        setImagePreview(project.imageUrl);
      }
    } else {
      setEditingProject(null);
      setFormData({
        name: "",
        description: "",
        url: "",
        image_url: "",
        start_date: "",
        end_date: ""
      });
    }
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProject(null);
    setImageFile(null);
    setImagePreview(null);
    setFormData({
      name: "",
      description: "",
      url: "",
      image_url: "",
      start_date: "",
      end_date: ""
    });
  };

  const handleSubmit = async () => {
    if (!profile?.id) return;
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Project name is required",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      let imageUrl = formData.image_url;

      // If editing an existing project
      if (editingProject) {
        // Upload new image if selected
        if (imageFile) {
          imageUrl = await uploadProjectImage(editingProject.id, imageFile);
        }

        await updateProject(editingProject.id, { ...formData, image_url: imageUrl || null });
        toast({
          title: "Success",
          description: "Project updated successfully"
        });
      } else {
        // Create project first to get ID, then upload image if needed
        const projectData: ProjectData = { ...formData, image_url: null };
        const newProject = await addProject(profile.id, projectData);

        // If we have an image file, upload it and update the project
        if (imageFile && newProject && 'id' in newProject && typeof newProject.id === 'string') {
          imageUrl = await uploadProjectImage(newProject.id, imageFile);
          await updateProject(newProject.id, { image_url: imageUrl });
        }

        toast({
          title: "Success",
          description: "Project added successfully"
        });
      }
      handleCloseDialog();
      onProjectsChange?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save project",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProjectId) return;

    setIsLoading(true);
    try {
      await deleteProject(deletingProjectId);
      toast({
        title: "Success",
        description: "Project deleted successfully"
      });
      setIsDeleteDialogOpen(false);
      setDeletingProjectId(null);
      onProjectsChange?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete project",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">Projects</h3>
        {isEditable && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => handleOpenDialog()}
          >
            <Plus className="h-4 w-4" />
            Add Project
          </Button>
        )}
      </div>

      {userProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userProjects.map((project) => (
            <Card key={project.id} className="home-card-tier2 rounded-xl shadow-none hover:shadow-none overflow-hidden">
              <div className="h-40 overflow-hidden">
                <img
                  src={project.imageUrl}
                  alt={project.title}
                  className="w-full h-full object-cover transition-transform hover:scale-105"
                />
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-white/80">{project.title}</h4>
                    <p className="text-sm text-white/50 mt-1">{project.description}</p>
                  </div>

                  {isEditable && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenDialog(project)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setDeletingProjectId(project.id);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-white/60 hover:text-white"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Project
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-white/40">No projects added yet.</p>
          {isEditable && (
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => handleOpenDialog()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Project
            </Button>
          )}
        </div>
      )}

      {/* Add/Edit Project Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "Add Project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Project Image Upload */}
            <div className="space-y-2">
              <Label>Project Image</Label>
              <div className="flex flex-col gap-3">
                {imagePreview ? (
                  <div className="relative w-full h-40 rounded-lg overflow-hidden border">
                    <img
                      src={imagePreview}
                      alt="Project preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-white/10 hover:bg-white/[0.04] transition-colors"
                  >
                    <ImageIcon className="h-8 w-8 text-white/40" />
                    <span className="text-sm text-white/60">Click to upload image</span>
                    <span className="text-xs text-white/40">JPEG, PNG, WebP or GIF (max 5MB)</span>
                  </div>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {imagePreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Change Image
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter project name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your project"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Project URL</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="month"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="month"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCloseDialog} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Saving..." : editingProject ? "Update" : "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/60">
            Are you sure you want to delete this project? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingProjectId(null);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileProjects;
