import { useState, useEffect, useMemo } from "react";
import { CHANNELS } from '@clstr/shared/realtime/channels';
import { Link, Navigate } from "react-router-dom";
import { useProfile } from "@/contexts/ProfileContext";
import { useIdentityContext } from "@/contexts/IdentityContext";
import { useFeatureAccess, useRouteGuard } from "@/hooks/useFeatureAccess";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { Button } from "@/components/ui/button";
// Card imports removed - using dark translucent divs
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserBadge } from "@/components/ui/user-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
// RadioGroup removed - using custom toggle buttons
import {
  Briefcase,
  Calendar,
  MapPin,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Bookmark,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { CreateTeamUpModal, TeamUpCard, JoinTeamUpModal } from "@/components/team-ups";
import {
  getTeamUps,
  getMyTeamUps,
  getMyTeamUpRequests,
  getIncomingTeamUpRequests,
  respondToTeamUpRequest,
  deleteTeamUp,
  closeTeamUp,
  cancelTeamUpRequest,
  type TeamUp,
  type TeamUpIntent,
  type TeamUpEventType,
} from "@/lib/team-ups-api";
import { formatDistanceToNow, format } from "date-fns";
import { SEO } from "@/components/SEO";
import {
  getProjects,
  getMyProjects,
  getMyApplications,
  getOwnerApplications,
  getProjectRoles,
  createProject,
  deleteProject,
  applyForRole,
  updateProjectApplicationStatus,
  type Project,
  type ProjectRole,
  type ProjectApplication,
  type ProjectApplicationWithProject,
  type CreateProjectParams,
} from "@/lib/projects-api";
import { getSavedProjectIds, toggleSaveItem } from "@/lib/saved-api";
import { isValidUuid } from "@clstr/shared/utils/uuid";

export default function Projects() {
  const { profile, isLoading: profileLoading } = useProfile();
  // UC-2 FIX: Use IdentityContext as authoritative source for college_domain
  const { collegeDomain } = useIdentityContext();
  const { 
    canViewProjects, 
    canCreateProjects, 
    canApplyToProjects, 
    canManageProjectTeam,
    isLoading: permissionsLoading 
  } = useFeatureAccess();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Route guard: redirect if user cannot view projects
  // Note: useRouteGuard handles the redirect via useEffect, not early return
  useRouteGuard(canViewProjects, '/home');

  // PRIMARY MODE TOGGLE: Team-Ups (default) vs Long-Term Projects
  const [viewMode, setViewMode] = useState<"team-ups" | "projects">("team-ups");

  // Team-Up specific state
  const [createTeamUpOpen, setCreateTeamUpOpen] = useState(false);
  const [joinTeamUpModalOpen, setJoinTeamUpModalOpen] = useState(false);
  const [selectedTeamUp, setSelectedTeamUp] = useState<TeamUp | null>(null);
  const [joinRequestType, setJoinRequestType] = useState<"join_request" | "invite">("join_request");
  const [teamUpIntentFilter, setTeamUpIntentFilter] = useState<TeamUpIntent | "all">("all");
  const [teamUpEventFilter, setTeamUpEventFilter] = useState<TeamUpEventType | "all">("all");
  const [teamUpSearchQuery, setTeamUpSearchQuery] = useState("");
  const [activeTeamUpRequestId, setActiveTeamUpRequestId] = useState<string | null>(null);

  // Project specific state (existing)
  // Note: useRouteGuard handles the redirect via useEffect, not early return
  useRouteGuard(canViewProjects, '/home');

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"latest" | "trending">("latest");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Dialog states
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<ProjectRole | null>(null);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [applicationSkills, setApplicationSkills] = useState("");
  const [applicationAvailability, setApplicationAvailability] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [deleteProjectDialogOpen, setDeleteProjectDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleteTeamUpDialogOpen, setDeleteTeamUpDialogOpen] = useState(false);
  const [teamUpToDelete, setTeamUpToDelete] = useState<TeamUp | null>(null);

  // Create project form data
  const projectTypeOptions = useMemo(
    () => [
      { label: "Startup", value: "startup" },
      { label: "Hackathon", value: "hackathon" },
      { label: "Research", value: "research" },
      { label: "App / Product", value: "app" },
      { label: "Club / Campus", value: "club" },
      { label: "Other", value: "other" },
    ],
    []
  );

  const [newProjectData, setNewProjectData] = useState({
    title: "",
    summary: "",
    description: "",
    project_type: "startup",
    skills: "",
    tags: "",
    is_remote: true,
    location: "",
    starts_on: "",
    ends_on: "",
    team_size_target: 5,
  });

  // Fetch projects with filters
  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
  } = useQuery({
    queryKey: QUERY_KEYS.projects.list(collegeDomain, searchQuery, categoryFilter, sortBy),
    queryFn: async () => {
      if (!collegeDomain) throw new Error("College domain not found");
      return await getProjects({
        collegeDomain,
        limit: 50,
        filters: {
          searchQuery,
          category: categoryFilter,
          sortBy,
          status: ["open", "in_progress"],
        },
      });
    },
    enabled: !!collegeDomain,
    staleTime: 30000, // 30 seconds
  });

  // Fetch user's own projects
  const {
    data: myProjectsData,
    isLoading: myProjectsLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.projects.my(profile?.id),
    queryFn: async () => {
      if (!profile?.id) throw new Error("User ID not found");
      return await getMyProjects(profile.id);
    },
    enabled: !!profile?.id,
    staleTime: 30000,
  });

  // Fetch user's applications
  const {
    data: myApplicationsData,
    isLoading: myApplicationsLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.projects.myApplications(profile?.id),
    queryFn: async () => {
      if (!profile?.id) throw new Error("User ID not found");
      return await getMyApplications(profile.id);
    },
    enabled: !!profile?.id,
    staleTime: 30000,
  });

  const {
    data: ownerApplicationsData,
    isLoading: ownerApplicationsLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.projects.ownerApplications(profile?.id),
    queryFn: async () => {
      if (!profile?.id) throw new Error("User ID not found");
      return await getOwnerApplications(profile.id);
    },
    enabled: !!profile?.id,
    staleTime: 20000,
  });

  const { data: savedProjectIdsResult } = useQuery({
    queryKey: QUERY_KEYS.projects.savedIds(profile?.id),
    queryFn: async () => {
      if (!profile?.id) throw new Error("User ID not found");
      return await getSavedProjectIds(profile.id);
    },
    enabled: !!profile?.id,
    staleTime: 15000,
  });

  // ============================================================================
  // TEAM-UP QUERIES
  // ============================================================================
  
  // Fetch team-ups with filters
  const {
    data: teamUpsData,
    isLoading: teamUpsLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.teamUps.list(collegeDomain, teamUpIntentFilter, teamUpEventFilter, teamUpSearchQuery),
    queryFn: async () => {
      if (!collegeDomain) throw new Error("College domain not found");
      return await getTeamUps({
        collegeDomain,
        intent: teamUpIntentFilter === "all" ? undefined : teamUpIntentFilter,
        eventType: teamUpEventFilter === "all" ? undefined : teamUpEventFilter,
        searchQuery: teamUpSearchQuery || undefined,
      });
    },
    enabled: !!collegeDomain && viewMode === "team-ups",
    staleTime: 30000,
  });

  // Fetch user's team-ups
  const {
    data: myTeamUpsData,
    isLoading: myTeamUpsLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.teamUps.my(profile?.id),
    queryFn: async () => {
      if (!profile?.id) throw new Error("User ID not found");
      return await getMyTeamUps(profile.id);
    },
    enabled: !!profile?.id && viewMode === "team-ups",
    staleTime: 30000,
  });

  // Fetch user's team-up requests
  const {
    data: myTeamUpRequestsData,
    isLoading: myTeamUpRequestsLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.teamUps.myRequests(profile?.id),
    queryFn: async () => {
      if (!profile?.id) throw new Error("User ID not found");
      return await getMyTeamUpRequests(profile.id);
    },
    enabled: !!profile?.id && viewMode === "team-ups",
    staleTime: 30000,
  });

  // Fetch incoming requests to user's team-ups (as creator)
  const {
    data: incomingTeamUpRequestsData,
    isLoading: incomingTeamUpRequestsLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.teamUps.requests(profile?.id),
    queryFn: async () => {
      if (!profile?.id) throw new Error("User ID not found");
      return await getIncomingTeamUpRequests(profile.id);
    },
    enabled: !!profile?.id && viewMode === "team-ups",
    staleTime: 30000,
  });

  // Track which team-ups user has requested
  const userTeamUpRequestMap = useMemo(() => {
    const map = new Map<string, string>();
    if (myTeamUpRequestsData?.data) {
      for (const req of myTeamUpRequestsData.data) {
        map.set(req.team_up_id, req.status);
      }
    }
    return map;
  }, [myTeamUpRequestsData?.data]);

  const respondToRequestMutation = useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: "accepted" | "declined" }) => {
      if (!profile?.id) throw new Error("User ID not found");
      return respondToTeamUpRequest(requestId, profile.id, status);
    },
    onSuccess: (result) => {
      if (!result.success || result.error) {
        toast({
          title: "Request update failed",
          description: result.error ?? "Unable to update request",
          variant: "destructive",
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teamUps.requests() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teamUps.myRequests() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teamUps.all() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teamUps.my() });
      toast({
        title: "Request updated",
        description: "Your response has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Request update failed",
        description: error instanceof Error ? error.message : "Unable to update request",
        variant: "destructive",
      });
    },
  });

  // Delete TeamUp mutation
  const deleteTeamUpMutation = useMutation({
    mutationFn: (teamUpId: string) => {
      if (!profile?.id) throw new Error("User ID not found");
      return deleteTeamUp(teamUpId, profile.id);
    },
    onSuccess: (result) => {
      setDeleteTeamUpDialogOpen(false);
      setTeamUpToDelete(null);
      if (!result.success || result.error) {
        toast({ title: "Delete failed", description: result.error ?? "Unable to delete team-up", variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teamUps.all() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teamUps.my() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teamUps.requests() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teamUps.myRequests() });
      toast({ title: "Team-Up deleted", description: "Your team-up has been removed." });
    },
    onError: (error) => {
      toast({ title: "Delete failed", description: error instanceof Error ? error.message : "Unable to delete team-up", variant: "destructive" });
    },
  });

  // Close TeamUp mutation
  const closeTeamUpMutation = useMutation({
    mutationFn: (teamUpId: string) => {
      if (!profile?.id) throw new Error("User ID not found");
      return closeTeamUp(teamUpId, profile.id);
    },
    onSuccess: (result) => {
      if (!result.success || result.error) {
        toast({ title: "Close failed", description: result.error ?? "Unable to close team-up", variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teamUps.all() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teamUps.my() });
      toast({ title: "Team-Up closed", description: "Your team-up is now closed. No new requests will be accepted." });
    },
    onError: (error) => {
      toast({ title: "Close failed", description: error instanceof Error ? error.message : "Unable to close team-up", variant: "destructive" });
    },
  });

  // Cancel TeamUp request mutation
  const cancelTeamUpRequestMutation = useMutation({
    mutationFn: (requestId: string) => {
      if (!profile?.id) throw new Error("User ID not found");
      return cancelTeamUpRequest(requestId, profile.id);
    },
    onSuccess: (result) => {
      if (!result.success || result.error) {
        toast({ title: "Cancel failed", description: result.error ?? "Unable to cancel request", variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teamUps.myRequests() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teamUps.requests() });
      toast({ title: "Request cancelled", description: "Your request has been withdrawn." });
    },
    onError: (error) => {
      toast({ title: "Cancel failed", description: error instanceof Error ? error.message : "Unable to cancel request", variant: "destructive" });
    },
  });

  // Team-Up realtime subscription
  useEffect(() => {
    if (!profile?.id || !collegeDomain || viewMode !== "team-ups") return;

    const channel = supabase
      .channel(CHANNELS.projects.teamUps(collegeDomain, profile.id))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_ups",
          filter: `college_domain=eq.${collegeDomain}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teamUps.all() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teamUps.my() });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_up_requests",
          filter: `college_domain=eq.${collegeDomain}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teamUps.requests() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teamUps.myRequests() });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_up_members",
          filter: `college_domain=eq.${collegeDomain}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teamUps.all() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teamUps.my() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, collegeDomain, viewMode, queryClient]);

  // Project realtime subscription (existing)
  useEffect(() => {
    if (!profile?.id || !collegeDomain) return;

    const channel = supabase
      .channel(CHANNELS.projects.projects(collegeDomain, profile.id))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collab_projects",
          filter: `college_domain=eq.${collegeDomain}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.all() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.my() });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collab_project_roles",
          filter: `college_domain=eq.${collegeDomain}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.roles() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.all() });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collab_team_members",
          filter: `college_domain=eq.${collegeDomain}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.all() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.my() });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collab_project_applications",
          filter: `college_domain=eq.${collegeDomain}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.myApplications() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.ownerApplications() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, collegeDomain, queryClient]);

  // Fetch project roles when a project is selected
  const { data: projectRolesData } = useQuery({
    queryKey: QUERY_KEYS.projects.roles(selectedProject?.id),
    queryFn: async () => {
      if (!selectedProject?.id) throw new Error("Project ID not found");
      return await getProjectRoles(selectedProject.id);
    },
    enabled: !!selectedProject?.id,
    staleTime: 60000,
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (params: CreateProjectParams & { imageFile?: File }) => {
      const { imageFile: file, ...projectParams } = params;
      return await createProject(projectParams, file);
    },
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Project Created",
          description: "Your project has been created successfully!",
        });
        setCreateProjectDialogOpen(false);
        setNewProjectData({
          title: "",
          summary: "",
          description: "",
          project_type: "startup",
          skills: "",
          tags: "",
          is_remote: true,
          location: "",
          starts_on: "",
          ends_on: "",
          team_size_target: 5,
        });
        setImageFile(null);
        // Invalidate queries to refetch data
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.all() });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.my() });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create project",
        variant: "destructive",
      });
    },
  });

  // Apply for role mutation
  const applyForRoleMutation = useMutation({
    mutationFn: applyForRole,
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Application Submitted",
          description: "Your application has been sent to the project owner.",
        });
        setApplyDialogOpen(false);
        setApplicationMessage("");
        setApplicationSkills("");
        setApplicationAvailability("");
        setSelectedRole(null);
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.myApplications() });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit application",
        variant: "destructive",
      });
    },
  });

  const updateApplicationStatusMutation = useMutation({
    mutationFn: updateProjectApplicationStatus,
    onSuccess: (result, variables) => {
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        const statusLabel = variables.status.replace("_", " ");
        toast({
          title: "Application Updated",
          description: `Application marked as ${statusLabel}.`,
        });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.ownerApplications() });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.myApplications() });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.all() });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.my() });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.roles() });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update application",
        variant: "destructive",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      if (!profile?.id) throw new Error("User ID not found");
      return await deleteProject({ projectId, ownerId: profile.id });
    },
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Project Deleted",
          description: "Your project was deleted successfully.",
        });
        setDeleteProjectDialogOpen(false);
        setProjectToDelete(null);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.all() });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.my() });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.ownerApplications() });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.myApplications() });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.roles() });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.savedIds() });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.savedItems() });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  const handleCreateProject = () => {
    if (!profile || !canCreateProjects) return;
    if (!collegeDomain) {
      toast({
        title: "College email required",
        description: "Add your college domain to create or join projects.",
        variant: "destructive",
      });
      return;
    }

    const skillsArray = newProjectData.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const tagsArray = newProjectData.tags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const normalizedProjectType = newProjectData.project_type.toLowerCase();

    createProjectMutation.mutate({
      title: newProjectData.title,
      summary: newProjectData.summary,
      description: newProjectData.description,
      project_type: normalizedProjectType as CreateProjectParams["project_type"],
      skills: skillsArray,
      tags: tagsArray,
      is_remote: newProjectData.is_remote,
      location: newProjectData.location || undefined,
      starts_on: newProjectData.starts_on || undefined,
      ends_on: newProjectData.ends_on || undefined,
      team_size_target: newProjectData.team_size_target,
      userId: profile.id,
      collegeDomain: collegeDomain!,
      imageFile,
    });
  };

  const handleApplyToProject = () => {
    if (!profile || !selectedProject) return;
    if (!collegeDomain) {
      toast({
        title: "College email required",
        description: "Add your college domain before applying to projects.",
        variant: "destructive",
      });
      return;
    }

    const skillsArray = applicationSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    applyForRoleMutation.mutate({
      projectId: selectedProject.id,
      roleId: selectedRole?.id || null,
      applicantId: profile.id,
      message: applicationMessage,
      skills: skillsArray,
      availability: applicationAvailability || undefined,
      collegeDomain: collegeDomain!,
    });
  };

  const handleUpdateApplicationStatus = (
    applicationId: string,
    status: ProjectApplication["status"]
  ) => {
    if (!profile?.id) return;
    updateApplicationStatusMutation.mutate({
      applicationId,
      ownerId: profile.id,
      status,
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Image size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setImageFile(file);
    }
  };

  // Show error toast if projects failed to load
  useEffect(() => {
    if (projectsError) {
      toast({
        title: "Error",
        description: projectsData?.error || "Failed to load projects",
        variant: "destructive",
      });
    }
  }, [projectsError, projectsData?.error, toast]);

  useEffect(() => {
    if (savedProjectIdsResult?.error) {
      toast({
        title: "Error",
        description: savedProjectIdsResult.error,
        variant: "destructive",
      });
    }
  }, [savedProjectIdsResult?.error, toast]);

  useEffect(() => {
    if (ownerApplicationsData?.error) {
      toast({
        title: "Error",
        description: ownerApplicationsData.error,
        variant: "destructive",
      });
    }
  }, [ownerApplicationsData?.error, toast]);

  const savedProjectIds = useMemo(
    () => new Set(savedProjectIdsResult?.ids ?? []),
    [savedProjectIdsResult?.ids]
  );

  const ProjectCard = ({
    project,
    showOwnerActions = false,
  }: {
    project: Project;
    showOwnerActions?: boolean;
  }) => {
    const [isSaved, setIsSaved] = useState(savedProjectIds.has(project.id));
    const [isSaving, setIsSaving] = useState(false);

    const isSavedFromServer = savedProjectIds.has(project.id);
    const canDeleteProject = showOwnerActions && project.owner_id === profile?.id;

    const projectTypeLabel = project.project_type
      ? project.project_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "Project";
    const projectStatusLabel = project.status.replace("_", " ");

    const progressPercentage = project.team_size_target
      ? ((project.team_size_current || 0) / project.team_size_target) * 100
      : 0;

    const hasApplied = myApplicationsData?.data?.some(
      (app) => app.project_id === project.id
    );

    useEffect(() => {
      setIsSaved(isSavedFromServer);
    }, [project.id, isSavedFromServer]);

    const handleSaveProject = async () => {
      if (isSaving || !profile?.id) return;
      
      setIsSaving(true);
      const wasSaved = isSaved;
      
      // Optimistic update
      setIsSaved(!wasSaved);
      
      try {
        const result = await toggleSaveItem(profile.id, 'project', project.id);
        
        if (result.error) {
          throw new Error(result.error);
        }

        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.savedIds() });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.savedItems() });
        
        toast({
          title: result.saved ? 'Project saved' : 'Project unsaved',
          description: result.saved 
            ? 'You can find this project in your saved items'
            : 'Project removed from saved items',
        });
      } catch (error) {
        // Revert on error
        setIsSaved(wasSaved);
        toast({
          title: 'Action failed',
          description: error instanceof Error ? error.message : 'Please try again',
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div className="rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.06] transition-colors h-full flex flex-col">
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-base md:text-lg font-semibold text-white line-clamp-2">{project.title}</h3>
              <p className="text-xs md:text-sm text-white/50 line-clamp-2 mt-1">{project.summary}</p>
            </div>
            <div className="flex items-center gap-2">
              {canDeleteProject && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setProjectToDelete(project);
                    setDeleteProjectDialogOpen(true);
                  }}
                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-white/[0.06]"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSaveProject}
                disabled={isSaving}
                className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/[0.06]"
              >
                <Bookmark
                  className={`h-4 w-4 ${isSaved ? 'fill-current text-white' : ''}`}
                />
              </Button>
              <Badge
                variant="outline"
                className={`border-white/15 ${
                  project.status === "open" || project.status === "in_progress"
                    ? "text-emerald-400 border-emerald-400/30"
                    : "text-white/50"
                }`}
              >
                {projectStatusLabel}
              </Badge>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4 space-y-3 md:space-y-4 flex-1 flex flex-col">
          {project.hero_image_url && (
            <img
              src={project.hero_image_url}
              alt={project.title}
              className="w-full h-28 md:h-32 object-cover rounded-md"
            />
          )}

          <p className="text-xs md:text-sm text-white/50 line-clamp-3">
            {project.description}
          </p>

          <div className="flex flex-wrap gap-1.5 md:gap-2">
            {project.skills?.slice(0, 3).map((skill, idx) => (
              <Badge key={idx} variant="outline" className="text-xs border-white/15 text-white/70">
                {skill}
              </Badge>
            ))}
            {project.skills && project.skills.length > 3 && (
              <Badge variant="outline" className="text-xs border-white/15 text-white/70">+{project.skills.length - 3} more</Badge>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50">Team Progress</span>
              <span className="font-medium text-white">
                {project.team_size_current || 0}/{project.team_size_target || 0}
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-white/40 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 md:gap-4 text-xs md:text-sm text-white/50">
            <div className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="truncate">{projectTypeLabel}</span>
            </div>
            {project.is_remote ? (
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>Remote</span>
              </div>
            ) : project.location ? (
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="truncate">{project.location}</span>
              </div>
            ) : null}
            {project.starts_on && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>{format(new Date(project.starts_on), "MMM yyyy")}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 mt-auto">
            <Avatar className="h-7 w-7 md:h-8 md:w-8">
              <AvatarImage src={project.owner?.avatar_url || undefined} />
              <AvatarFallback className="text-xs bg-white/10 text-white/70">
                {project.owner?.full_name
                  ? project.owner.full_name.substring(0, 2).toUpperCase()
                  : "O"}
              </AvatarFallback>
            </Avatar>
            <div className="text-xs md:text-sm min-w-0 flex-1">
              <p className="font-medium truncate text-white">{project.owner?.full_name || "Unknown"}</p>
              {project.owner?.role ? (
                <UserBadge userType={project.owner.role} size="sm" />
              ) : (
                <p className="text-white/40 text-xs truncate">Creator</p>
              )}
            </div>
          </div>

          <Button
            onClick={() => {
              setSelectedProject(project);
              setApplyDialogOpen(true);
            }}
            className={`w-full ${
              project.owner_id === profile?.id || hasApplied
                ? "bg-white/[0.06] border border-white/10 text-white/40"
                : "bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]"
            }`}
            disabled={
              project.owner_id === profile?.id ||
              hasApplied ||
              applyForRoleMutation.isPending
            }
          >
            {project.owner_id === profile?.id
              ? "Your Project"
              : hasApplied
              ? "Already Applied"
              : "Apply to Join"}
          </Button>
        </div>
      </div>
    );
  };

  const ApplicationCard = ({ application }: { application: ProjectApplication }) => (
    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-5 hover:bg-white/[0.06] transition-colors">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-white">Application to Project</h3>
            <p className="text-sm text-white/50">
              {application.role?.title || "General Application"}
            </p>
            <p className="text-xs text-white/40 mt-1">
              Applied{" "}
              {formatDistanceToNow(new Date(application.created_at || ""), {
                addSuffix: true,
              })}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`border-white/15 ${
              application.status === "accepted"
                ? "text-emerald-400 border-emerald-400/30"
                : application.status === "rejected" || application.status === "withdrawn"
                ? "text-red-400 border-red-400/30"
                : "text-white/60"
            }`}
          >
            {application.status === "accepted" && (
              <CheckCircle className="h-3 w-3 mr-1" />
            )}
            {(application.status === "rejected" || application.status === "withdrawn") && (
              <XCircle className="h-3 w-3 mr-1" />
            )}
            {(application.status === "applied" ||
              application.status === "reviewing" ||
              application.status === "interview") && <Clock className="h-3 w-3 mr-1" />}
            {application.status.replace("_", " ")}
          </Badge>
        </div>

        {application.message && (
          <div className="bg-white/[0.06] p-3 rounded-lg mb-3">
            <p className="text-sm text-white/80">{application.message}</p>
          </div>
        )}

        {application.skills && application.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {application.skills.map((skill, idx) => (
              <Badge key={idx} variant="outline" className="border-white/15 text-white/70">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        {application.availability && (
          <p className="text-sm text-white/50">
            <strong className="text-white/70">Availability:</strong> {application.availability}
          </p>
        )}
    </div>
  );

  const OwnerApplicationCard = ({
    application,
  }: {
    application: ProjectApplicationWithProject;
  }) => {
    const applicantName = application.applicant?.full_name || "Unknown";
    const applicantRole = application.applicant?.role || "Member";
    const projectTitle = application.project?.title || "Project";
    const roleTitle = application.role?.title || "General Application";
    const isActionable =
      application.status === "applied" ||
      application.status === "reviewing" ||
      application.status === "interview";

    return (
      <div className="rounded-xl bg-white/[0.04] border border-white/10 p-5 space-y-4 hover:bg-white/[0.06] transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-white">{projectTitle}</h3>
              <p className="text-sm text-white/50">{roleTitle}</p>
              <p className="text-xs text-white/40 mt-1">
                Applied {" "}
                {formatDistanceToNow(new Date(application.created_at || ""), {
                  addSuffix: true,
                })}
              </p>
            </div>
            <Badge
              variant="outline"
              className={`border-white/15 ${
                application.status === "accepted"
                  ? "text-emerald-400 border-emerald-400/30"
                  : application.status === "rejected"
                  ? "text-red-400 border-red-400/30"
                  : "text-white/60"
              }`}
            >
              {application.status.replace("_", " ")}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={application.applicant?.avatar_url || undefined} />
              <AvatarFallback className="bg-white/10 text-white/70">{applicantName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <p className="font-medium text-white">{applicantName}</p>
              <p className="text-xs text-white/40">{applicantRole}</p>
            </div>
          </div>

          {application.message && (
            <div className="bg-white/[0.06] p-3 rounded-lg">
              <p className="text-sm text-white/80">{application.message}</p>
            </div>
          )}

          {application.skills && application.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {application.skills.map((skill, idx) => (
                <Badge key={idx} variant="outline" className="border-white/15 text-white/70">
                  {skill}
                </Badge>
              ))}
            </div>
          )}

          {application.availability && (
            <p className="text-sm text-white/50">
              <strong className="text-white/70">Availability:</strong> {application.availability}
            </p>
          )}

          {isActionable && (
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => handleUpdateApplicationStatus(application.id, "rejected")}
                disabled={updateApplicationStatusMutation.isPending}
                className="border-white/15 text-white/70 hover:bg-white/[0.06] bg-transparent"
              >
                Reject
              </Button>
              <Button
                onClick={() => handleUpdateApplicationStatus(application.id, "accepted")}
                disabled={updateApplicationStatusMutation.isPending}
                className="bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]"
              >
                Accept
              </Button>
            </div>
          )}
      </div>
    );
  };

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-xl bg-white/[0.04] border border-white/10 p-5 space-y-4">
            <Skeleton className="h-6 w-3/4 bg-white/10" />
            <Skeleton className="h-4 w-full bg-white/10" />
            <Skeleton className="h-20 w-full bg-white/10" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 bg-white/10" />
              <Skeleton className="h-6 w-16 bg-white/10" />
              <Skeleton className="h-6 w-16 bg-white/10" />
            </div>
            <Skeleton className="h-2 w-full bg-white/10" />
            <Skeleton className="h-10 w-full bg-white/10" />
        </div>
      ))}
    </div>
  );

  const projects = projectsData?.data || [];
  const myProjects = myProjectsData?.data || [];
  const myApplications = myApplicationsData?.data || [];
  const ownerApplications = ownerApplicationsData?.data || [];
  const projectRoles = projectRolesData?.data || [];

  // Team-Up data
  const teamUps = teamUpsData?.data || [];
  const myTeamUps = myTeamUpsData?.data || [];
  const myTeamUpRequests = myTeamUpRequestsData?.data || [];
  const incomingTeamUpRequests = incomingTeamUpRequestsData?.data || [];

  const missingCollegeDomain = !profileLoading && profile && !collegeDomain;

  // Handler for opening join team-up modal
  const handleRequestToJoinTeamUp = (teamUp: TeamUp) => {
    if (!isValidUuid(teamUp.id)) {
      toast({
        title: "Invalid team-up",
        description: "This team-up link is malformed.",
        variant: "destructive",
      });
      return;
    }
    setSelectedTeamUp(teamUp);
    setJoinRequestType("join_request");
    setJoinTeamUpModalOpen(true);
  };

  const handleInviteToTeam = (teamUp: TeamUp) => {
    if (!isValidUuid(teamUp.id)) {
      toast({
        title: "Invalid team-up",
        description: "This team-up link is malformed.",
        variant: "destructive",
      });
      return;
    }
    setSelectedTeamUp(teamUp);
    setJoinRequestType("invite");
    setJoinTeamUpModalOpen(true);
  };

  const handleRespondToRequest = (requestId: string, status: "accepted" | "declined") => {
    if (!isValidUuid(requestId)) {
      toast({
        title: "Invalid request",
        description: "This request is malformed.",
        variant: "destructive",
      });
      return;
    }
    setActiveTeamUpRequestId(requestId);
    respondToRequestMutation.mutate(
      { requestId, status },
      {
        onSettled: () => setActiveTeamUpRequestId(null),
      }
    );
  };

  if (missingCollegeDomain) {
    return (
      <div className="home-theme bg-[#000000] min-h-screen text-white">
      <div className="container mx-auto py-10 max-w-3xl px-3 sm:px-4 md:px-6">
        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Complete your profile to access Projects</h2>
            <p className="text-sm text-white/60 mt-1">
              Add your academic email so we can scope projects to your college community.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-white/60">
              Projects are domain-scoped. Update your profile with a verified college email to view and create projects.
            </p>
            <Button asChild className="bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]">
              <Link to="/profile">Go to Profile</Link>
            </Button>
          </div>
        </div>
      </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="CollabHub - Student Project Collaboration"
        description="Find teammates, join student projects, and build something amazing together. Connect with students working on startups, research, and creative projects."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "CollabHub - Student Projects",
          description: "Campus project collaboration platform for finding teammates and joining student projects.",
          about: {
            "@type": "CreativeWork",
            name: "Student Project Directory",
          },
        }}
      />
      <div className="home-theme bg-[#000000] min-h-screen text-white">
      <div className="container mx-auto py-4 md:py-6 max-w-6xl px-3 sm:px-4 md:px-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 md:mb-6">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-white">CollabHub</h1>
            <p className="text-sm md:text-base text-white/60">
              {viewMode === "team-ups" 
                ? "Find teammates for hackathons, events, and short-term builds"
                : "Build long-term projects and recruit collaborators"
              }
            </p>
          </div>
        </div>

        {/* PRIMARY MODE TOGGLE: Team-Ups vs Projects */}
        <div className="mb-4 md:mb-6">
          <div className="rounded-xl bg-white/[0.04] border border-white/10 p-1 flex gap-1 w-fit">
            <button
              onClick={() => setViewMode("team-ups")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === "team-ups"
                  ? "bg-white/[0.10] border border-white/15 text-white"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              <Zap className="h-4 w-4" />
              Team-Ups
            </button>
            <button
              onClick={() => setViewMode("projects")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === "projects"
                  ? "bg-white/[0.10] border border-white/15 text-white"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              <Briefcase className="h-4 w-4" />
              Projects
            </button>
          </div>
          {viewMode === "team-ups" ? (
            <p className="text-xs text-white/40 mt-2 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Team-Ups automatically expire after the event
            </p>
          ) : (
            <p className="text-xs text-white/40 mt-2 flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              Projects stay active until the owner closes them
            </p>
          )}
        </div>

        {/* CONTEXTUAL CTA: Changes based on mode */}
        {canCreateProjects && (
          <div className="mb-4 md:mb-6">
            <Button 
              onClick={() => {
                if (viewMode === "team-ups") {
                  setCreateTeamUpOpen(true);
                } else {
                  setCreateProjectDialogOpen(true);
                }
              }}
              className="w-full sm:w-auto bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]"
            >
              {viewMode === "team-ups" ? (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Create Team-Up
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Start Project
                </>
              )}
            </Button>
          </div>
        )}

        {/* ============================================================ */}
        {/* TEAM-UPS VIEW */}
        {/* ============================================================ */}
        {viewMode === "team-ups" && (
          <>
            {/* Team-Up Filters - Only show if there are team-ups to filter */}
            {teamUps.length > 0 && (
              <div className="mb-4 md:mb-6 space-y-3 md:space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    type="search"
                    placeholder="Search by event name..."
                    className="pl-10 w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/20"
                    value={teamUpSearchQuery}
                    onChange={(e) => setTeamUpSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 md:gap-4 items-center flex-wrap">
                  <Select 
                    value={teamUpIntentFilter} 
                    onValueChange={(v) => setTeamUpIntentFilter(v as TeamUpIntent | "all")}
                  >
                    <SelectTrigger className="w-full sm:w-[200px] bg-white/[0.06] border-white/10 text-white">
                      <SelectValue placeholder="Intent" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                      <SelectItem value="all">All Team-Ups</SelectItem>
                      <SelectItem value="looking_for_teammates">Looking for Teammates</SelectItem>
                      <SelectItem value="looking_to_join">Looking to Join</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select 
                    value={teamUpEventFilter} 
                    onValueChange={(v) => setTeamUpEventFilter(v as TeamUpEventType | "all")}
                  >
                    <SelectTrigger className="w-full sm:w-[180px] bg-white/[0.06] border-white/10 text-white">
                      <SelectValue placeholder="Event Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                      <SelectItem value="all">All Events</SelectItem>
                      <SelectItem value="hackathon">Hackathon</SelectItem>
                      <SelectItem value="college_event">College Event</SelectItem>
                      <SelectItem value="competition">Competition</SelectItem>
                      <SelectItem value="short_term_project">Short-term Project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Team-Up Tabs */}
            <Tabs defaultValue="discover" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4 md:mb-6 rounded-xl bg-white/[0.04] border border-white/10 p-1 h-auto">
                <TabsTrigger value="discover" className="text-xs sm:text-sm rounded-lg text-white/50 data-[state=active]:bg-white/[0.10] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/15 data-[state=active]:shadow-none">Discover</TabsTrigger>
                <TabsTrigger value="incoming-requests" className="text-xs sm:text-sm rounded-lg text-white/50 data-[state=active]:bg-white/[0.10] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/15 data-[state=active]:shadow-none">
                  <span className="hidden sm:inline">Incoming ({incomingTeamUpRequests.length})</span>
                  <span className="sm:hidden">Incoming ({incomingTeamUpRequests.length})</span>
                </TabsTrigger>
                <TabsTrigger value="my-requests" className="text-xs sm:text-sm rounded-lg text-white/50 data-[state=active]:bg-white/[0.10] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/15 data-[state=active]:shadow-none">
                  <span className="hidden sm:inline">My Requests ({myTeamUpRequests.length})</span>
                  <span className="sm:hidden">Requests ({myTeamUpRequests.length})</span>
                </TabsTrigger>
                <TabsTrigger value="my-team-ups" className="text-xs sm:text-sm rounded-lg text-white/50 data-[state=active]:bg-white/[0.10] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/15 data-[state=active]:shadow-none">
                  <span className="hidden sm:inline">My Team-Ups ({myTeamUps.length})</span>
                  <span className="sm:hidden">Mine ({myTeamUps.length})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="discover" className="space-y-4">
                {teamUpsLoading ? (
                  <LoadingSkeleton />
                ) : teamUps.length === 0 ? (
                  <div className="rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="py-12 text-center">
                      <Users className="h-12 w-12 mx-auto mb-4 text-white/30" />
                      <p className="text-white/50 mb-2">
                        {teamUpSearchQuery
                          ? "No team-ups found matching your search."
                          : "No active team-ups yet."}
                      </p>
                      {canCreateProjects && (
                        <Button className="mt-4 bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]" onClick={() => setCreateTeamUpOpen(true)}>
                          Create First Team-Up
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {teamUps.map((teamUp) => (
                      <TeamUpCard
                        key={teamUp.id}
                        teamUp={teamUp}
                        onRequestToJoin={() => handleRequestToJoinTeamUp(teamUp)}
                        onInviteToTeam={() => handleInviteToTeam(teamUp)}
                        hasRequested={userTeamUpRequestMap.has(teamUp.id)}
                        requestStatus={userTeamUpRequestMap.get(teamUp.id) || null}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="incoming-requests" className="space-y-4">
                {incomingTeamUpRequestsLoading ? (
                  <LoadingSkeleton />
                ) : incomingTeamUpRequests.length === 0 ? (
                  <div className="rounded-xl bg-white/[0.04] border border-white/10 py-12 text-center">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-white/30" />
                      <p className="text-white/50">
                        No incoming requests yet.
                      </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    {incomingTeamUpRequests.map((request) => {
                      const isPending = request.status === "pending";
                      const isBusy = respondToRequestMutation.isPending && activeTeamUpRequestId === request.id;

                      return (
                        <div key={request.id} className="rounded-xl bg-white/[0.04] border border-white/10 p-5 space-y-3 hover:bg-white/[0.06] transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-semibold text-white">
                                  {request.team_up?.event_name || "Team-Up"}
                                </h3>
                                <p className="text-sm text-white/50">
                                  From {request.requester?.full_name || "Unknown"}
                                </p>
                                <p className="text-xs text-white/40 mt-1">
                                  Received {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className={`border-white/15 ${
                                  request.status === "accepted"
                                    ? "text-emerald-400 border-emerald-400/30"
                                    : request.status === "declined"
                                    ? "text-red-400 border-red-400/30"
                                    : "text-white/60"
                                }`}
                              >
                                {request.status === "accepted" && <CheckCircle className="h-3 w-3 mr-1" />}
                                {request.status === "declined" && <XCircle className="h-3 w-3 mr-1" />}
                                {request.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                                {request.status}
                              </Badge>
                            </div>

                            {request.skills && request.skills.length > 0 && (
                              <div>
                                <p className="text-xs text-white/40 uppercase mb-1">Skills</p>
                                <div className="flex flex-wrap gap-1">
                                  {request.skills.map((skill, idx) => (
                                    <Badge key={`${request.id}-skill-${idx}`} variant="outline" className="text-xs border-white/15 text-white/70">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {request.availability && (
                              <p className="text-sm text-white/50">
                                Availability: {request.availability}
                              </p>
                            )}

                            {isPending && (
                              <div className="flex gap-2 justify-end pt-2 border-t border-white/10">
                                <Button
                                  variant="outline"
                                  disabled={isBusy}
                                  onClick={() => handleRespondToRequest(request.id, "declined")}
                                  className="border-white/15 text-white/70 hover:bg-white/[0.06]"
                                >
                                  {isBusy ? "Updating..." : "Decline"}
                                </Button>
                                <Button
                                  disabled={isBusy}
                                  onClick={() => handleRespondToRequest(request.id, "accepted")}
                                  className="bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]"
                                >
                                  {isBusy ? "Updating..." : "Accept"}
                                </Button>
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="my-team-ups" className="space-y-4">
                {myTeamUpsLoading ? (
                  <LoadingSkeleton />
                ) : myTeamUps.length === 0 ? (
                  <div className="rounded-xl bg-white/[0.04] border border-white/10 py-12 text-center">
                      <Users className="h-12 w-12 mx-auto mb-4 text-white/30" />
                      <p className="text-white/50">
                        You haven't created any team-ups yet.
                      </p>
                      {canCreateProjects && (
                        <Button className="mt-4 bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]" onClick={() => setCreateTeamUpOpen(true)}>
                          Create Team-Up
                        </Button>
                      )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {myTeamUps.map((teamUp) => (
                      <TeamUpCard
                        key={teamUp.id}
                        teamUp={teamUp}
                        onDelete={() => {
                          setTeamUpToDelete(teamUp);
                          setDeleteTeamUpDialogOpen(true);
                        }}
                        onClose={() => closeTeamUpMutation.mutate(teamUp.id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="my-requests" className="space-y-4">
                {myTeamUpRequestsLoading ? (
                  <LoadingSkeleton />
                ) : myTeamUpRequests.length === 0 ? (
                  <div className="rounded-xl bg-white/[0.04] border border-white/10 py-12 text-center">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-white/30" />
                      <p className="text-white/50">
                        You haven't sent any team requests yet.
                      </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    {myTeamUpRequests.map((request) => (
                      <div key={request.id} className="rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.06] transition-colors p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-white">{request.team_up?.event_name || "Team-Up"}</h3>
                              <p className="text-sm text-white/50">
                                {request.request_type === "join_request" ? "Join Request" : "Invite"}
                              </p>
                              <p className="text-xs text-white/40 mt-1">
                                Sent {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`border-white/15 ${
                                request.status === "accepted"
                                  ? "text-emerald-400 border-emerald-400/30"
                                  : request.status === "declined"
                                  ? "text-red-400 border-red-400/30"
                                  : "text-white/60"
                              }`}
                            >
                              {request.status === "accepted" && <CheckCircle className="h-3 w-3 mr-1" />}
                              {request.status === "declined" && <XCircle className="h-3 w-3 mr-1" />}
                              {request.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                              {request.status === "accepted" ? "Added to Team" : 
                               request.status === "declined" ? "Not a Fit" : "Pending"}
                            </Badge>
                          </div>
                          {request.skills && request.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {request.skills.map((skill, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs border-white/15 text-white/70">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {request.status === "pending" && (
                            <div className="mt-3 pt-3 border-t border-white/10">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelTeamUpRequestMutation.mutate(request.id)}
                                disabled={cancelTeamUpRequestMutation.isPending}
                                className="text-red-400 border-red-400/30 hover:bg-red-500/10 hover:text-red-300 bg-transparent"
                              >
                                {cancelTeamUpRequestMutation.isPending ? "Cancelling..." : "Cancel Request"}
                              </Button>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* ============================================================ */}
        {/* LONG-TERM PROJECTS VIEW (Existing UI) */}
        {/* ============================================================ */}
        {viewMode === "projects" && (
          <>
            {/* Project Create Dialog moved here */}
        {canCreateProjects && (
          <Dialog
            open={createProjectDialogOpen}
            onOpenChange={setCreateProjectDialogOpen}
          >
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto home-theme bg-[#0a0a0a] border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Project</DialogTitle>
                <DialogDescription className="text-white/60">
                  Start a new collaborative project and recruit team members
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="project-title" className="text-white/80">Project Title *</Label>
                  <Input
                    id="project-title"
                    value={newProjectData.title}
                    onChange={(e) =>
                      setNewProjectData({ ...newProjectData, title: e.target.value })
                    }
                    placeholder="e.g., AI-powered Study Assistant"
                    className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
                <div>
                  <Label htmlFor="project-summary" className="text-white/80">Short Summary *</Label>
                  <Input
                    id="project-summary"
                    value={newProjectData.summary}
                    onChange={(e) =>
                      setNewProjectData({ ...newProjectData, summary: e.target.value })
                    }
                    placeholder="One-line description of your project"
                    className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
                <div>
                  <Label htmlFor="project-desc" className="text-white/80">Full Description *</Label>
                  <Textarea
                    id="project-desc"
                    value={newProjectData.description}
                    onChange={(e) =>
                      setNewProjectData({
                        ...newProjectData,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe your project in detail..."
                    rows={4}
                    className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
                <div>
                  <Label htmlFor="project-image" className="text-white/80">Cover Image (optional, max 5MB)</Label>
                  <Input
                    id="project-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="bg-white/[0.06] border-white/10 text-white file:text-white/60"
                  />
                  {imageFile && (
                    <p className="text-sm text-white/50 mt-1">
                      Selected: {imageFile.name}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="project-type" className="text-white/80">Project Type</Label>
                  <Select
                    value={newProjectData.project_type}
                    onValueChange={(value) =>
                      setNewProjectData({ ...newProjectData, project_type: value })
                    }
                  >
                    <SelectTrigger className="bg-white/[0.06] border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                      {projectTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="project-skills" className="text-white/80">
                    Required Skills (comma-separated)
                  </Label>
                  <Input
                    id="project-skills"
                    value={newProjectData.skills}
                    onChange={(e) =>
                      setNewProjectData({ ...newProjectData, skills: e.target.value })
                    }
                    placeholder="e.g., React, Python, UI/UX Design"
                    className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
                <div>
                  <Label htmlFor="project-tags" className="text-white/80">Tags (comma-separated)</Label>
                  <Input
                    id="project-tags"
                    value={newProjectData.tags}
                    onChange={(e) =>
                      setNewProjectData({ ...newProjectData, tags: e.target.value })
                    }
                    placeholder="e.g., AI, Education, Mobile"
                    className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
                <div>
                  <Label htmlFor="team-size" className="text-white/80">Target Team Size</Label>
                  <Input
                    id="team-size"
                    type="number"
                    min="1"
                    value={newProjectData.team_size_target}
                    onChange={(e) =>
                      setNewProjectData({
                        ...newProjectData,
                        team_size_target: parseInt(e.target.value) || 5,
                      })
                    }
                    className="bg-white/[0.06] border-white/10 text-white"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is-remote"
                    checked={newProjectData.is_remote}
                    onChange={(e) =>
                      setNewProjectData({
                        ...newProjectData,
                        is_remote: e.target.checked,
                      })
                    }
                    className="rounded border-white/20 bg-white/[0.06]"
                  />
                  <Label htmlFor="is-remote" className="text-white/80">Remote project</Label>
                </div>
                {!newProjectData.is_remote && (
                  <div>
                    <Label htmlFor="location" className="text-white/80">Location</Label>
                    <Input
                      id="location"
                      value={newProjectData.location}
                      onChange={(e) =>
                        setNewProjectData({
                          ...newProjectData,
                          location: e.target.value,
                        })
                      }
                      placeholder="Project location"
                      className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="starts-on" className="text-white/80">Start Date</Label>
                    <Input
                      id="starts-on"
                      type="date"
                      value={newProjectData.starts_on}
                      onChange={(e) =>
                        setNewProjectData({
                          ...newProjectData,
                          starts_on: e.target.value,
                        })
                      }
                      className="bg-white/[0.06] border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ends-on" className="text-white/80">End Date (Optional)</Label>
                    <Input
                      id="ends-on"
                      type="date"
                      value={newProjectData.ends_on}
                      onChange={(e) =>
                        setNewProjectData({
                          ...newProjectData,
                          ends_on: e.target.value,
                        })
                      }
                      className="bg-white/[0.06] border-white/10 text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setCreateProjectDialogOpen(false)}
                    className="border-white/15 text-white/70 hover:bg-white/[0.06] bg-transparent"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateProject}
                    disabled={
                      !newProjectData.title ||
                      !newProjectData.summary ||
                      !newProjectData.description ||
                      createProjectMutation.isPending
                    }
                    className="bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]"
                  >
                    {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

      {/* Search and Filters */}
      <div className="mb-4 md:mb-6 space-y-3 md:space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            type="search"
            placeholder="Search projects..."
            className="pl-10 w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 md:gap-4 items-center flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[140px]">
            <Filter className="h-4 w-4 text-white/40 hidden sm:block" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full bg-white/[0.06] border-white/10 text-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                <SelectItem value="all">All Categories</SelectItem>
                {projectTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "latest" | "trending")}>
            <SelectTrigger className="w-full sm:w-[180px] flex-1 sm:flex-none min-w-[140px] bg-white/[0.06] border-white/10 text-white">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
              <SelectItem value="latest">Latest</SelectItem>
              <SelectItem value="trending">Trending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="discover" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4 md:mb-6 rounded-xl bg-white/[0.04] border border-white/10 p-1 h-auto">
          <TabsTrigger value="discover" className="text-xs sm:text-sm rounded-lg text-white/50 data-[state=active]:bg-white/[0.10] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/15 data-[state=active]:shadow-none">Discover</TabsTrigger>
          <TabsTrigger value="my-projects" className="text-xs sm:text-sm rounded-lg text-white/50 data-[state=active]:bg-white/[0.10] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/15 data-[state=active]:shadow-none">
            <span className="hidden sm:inline">My Projects ({myProjects.length})</span>
            <span className="sm:hidden">Mine ({myProjects.length})</span>
          </TabsTrigger>
          <TabsTrigger value="applications" className="text-xs sm:text-sm rounded-lg text-white/50 data-[state=active]:bg-white/[0.10] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/15 data-[state=active]:shadow-none">
            <span className="hidden sm:inline">My Applications ({myApplications.length})</span>
            <span className="sm:hidden">Apps ({myApplications.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="space-y-4">
          {projectsLoading ? (
            <LoadingSkeleton />
          ) : projects.length === 0 ? (
            <div className="rounded-xl bg-white/[0.04] border border-white/10 py-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto mb-4 text-white/30" />
                <p className="text-white/50 mb-2">
                  {searchQuery
                    ? "No projects found matching your search."
                    : "No projects available yet."}
                </p>
                {canCreateProjects && (
                  <Button
                    className="mt-4 bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]"
                    onClick={() => setCreateProjectDialogOpen(true)}
                  >
                    Create First Project
                  </Button>
                )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-projects" className="space-y-4">
          {myProjectsLoading ? (
            <LoadingSkeleton />
          ) : myProjects.length === 0 ? (
            <div className="rounded-xl bg-white/[0.04] border border-white/10 py-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto mb-4 text-white/30" />
                <p className="text-white/50">
                  You haven't created any projects yet.
                </p>
                {canCreateProjects && (
                  <Button
                    className="mt-4 bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]"
                    onClick={() => setCreateProjectDialogOpen(true)}
                  >
                    Create Project
                  </Button>
                )}
            </div>
          ) : (
            <div className="space-y-6 md:space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {myProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} showOwnerActions />
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Applications to Your Projects</h2>
                  <Badge variant="outline" className="border-white/15 text-white/60">{ownerApplications.length}</Badge>
                </div>

                {ownerApplicationsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="rounded-xl bg-white/[0.04] border border-white/10 p-6 space-y-3">
                          <Skeleton className="h-6 w-1/2 bg-white/10" />
                          <Skeleton className="h-4 w-3/4 bg-white/10" />
                          <Skeleton className="h-20 w-full bg-white/10" />
                      </div>
                    ))}
                  </div>
                ) : ownerApplications.length === 0 ? (
                  <div className="rounded-xl bg-white/[0.04] border border-white/10 py-8 text-center">
                      <p className="text-sm md:text-base text-white/50">
                        No applications yet. We will show them here as they arrive.
                      </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    {ownerApplications.map((application) => (
                      <OwnerApplicationCard
                        key={application.id}
                        application={application}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          {myApplicationsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-xl bg-white/[0.04] border border-white/10 p-6 space-y-3">
                    <Skeleton className="h-6 w-3/4 bg-white/10" />
                    <Skeleton className="h-4 w-full bg-white/10" />
                    <Skeleton className="h-20 w-full bg-white/10" />
                </div>
              ))}
            </div>
          ) : myApplications.length === 0 ? (
            <div className="rounded-xl bg-white/[0.04] border border-white/10 py-12 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-white/30" />
                <p className="text-sm md:text-base text-white/50">
                  You haven't applied to any projects yet.
                </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {myApplications.map((application) => (
                <ApplicationCard key={application.id} application={application} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={deleteProjectDialogOpen}
        onOpenChange={(open) => {
          setDeleteProjectDialogOpen(open);
          if (!open) setProjectToDelete(null);
        }}
      >
        <AlertDialogContent className="home-theme bg-[#0a0a0a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete project</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              {projectToDelete
                ? `This will permanently delete "${projectToDelete.title}" and all associated roles, applications, and team members.`
                : "This will permanently delete the selected project."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProjectMutation.isPending} className="border-white/15 text-white/70 hover:bg-white/[0.06] bg-transparent">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (projectToDelete) {
                  deleteProjectMutation.mutate(projectToDelete.id);
                }
              }}
              disabled={!projectToDelete || deleteProjectMutation.isPending}
              className="bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
            >
              {deleteProjectMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete TeamUp confirmation */}
      <AlertDialog
        open={deleteTeamUpDialogOpen}
        onOpenChange={(open) => {
          setDeleteTeamUpDialogOpen(open);
          if (!open) setTeamUpToDelete(null);
        }}
      >
        <AlertDialogContent className="home-theme bg-[#0a0a0a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Team-Up</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              {teamUpToDelete
                ? `This will permanently delete "${teamUpToDelete.event_name}" and all associated requests and members. Accepted members will be notified.`
                : "This will permanently delete the selected team-up."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTeamUpMutation.isPending} className="border-white/15 text-white/70 hover:bg-white/[0.06] bg-transparent">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (teamUpToDelete) {
                  deleteTeamUpMutation.mutate(teamUpToDelete.id);
                }
              }}
              disabled={!teamUpToDelete || deleteTeamUpMutation.isPending}
              className="bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
            >
              {deleteTeamUpMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Apply to Project Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent className="max-w-2xl home-theme bg-[#0a0a0a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Apply to {selectedProject?.title}</DialogTitle>
            <DialogDescription className="text-white/60">{selectedProject?.summary}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {projectRoles.length > 0 && (
              <div>
                <Label className="text-white/80">Select a Role (Optional)</Label>
                <div className="space-y-2 mt-2">
                  {projectRoles.map((role) => (
                    <div
                      key={role.id}
                      className={`cursor-pointer transition-colors rounded-xl p-3 border ${
                        selectedRole?.id === role.id
                          ? "border-white/30 bg-white/[0.10]"
                          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.06]"
                      }`}
                      onClick={() => setSelectedRole(role)}
                    >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-white">{role.title}</p>
                            <p className="text-sm text-white/50 line-clamp-1">
                              {role.description}
                            </p>
                          </div>
                          <Badge variant="outline" className="border-white/15 text-white/60">
                            {role.spots_filled ?? 0}/{role.spots_total ?? 0} filled
                          </Badge>
                        </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="application-message" className="text-white/80">Why do you want to join? *</Label>
              <Textarea
                id="application-message"
                value={applicationMessage}
                onChange={(e) => setApplicationMessage(e.target.value)}
                placeholder="Tell the project owner why you're interested and what you can contribute..."
                rows={4}
                className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div>
              <Label htmlFor="application-skills" className="text-white/80">
                Your Relevant Skills (comma-separated)
              </Label>
              <Input
                id="application-skills"
                value={applicationSkills}
                onChange={(e) => setApplicationSkills(e.target.value)}
                placeholder="e.g., React, Python, Project Management"
                className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div>
              <Label htmlFor="application-availability" className="text-white/80">Your Availability</Label>
              <Input
                id="application-availability"
                value={applicationAvailability}
                onChange={(e) => setApplicationAvailability(e.target.value)}
                placeholder="e.g., 10 hours/week, Weekends only"
                className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setApplyDialogOpen(false)} className="border-white/15 text-white/70 hover:bg-white/[0.06] bg-transparent">
                Cancel
              </Button>
              <Button
                onClick={handleApplyToProject}
                disabled={
                  !applicationMessage.trim() || applyForRoleMutation.isPending
                }
                className="bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]"
              >
                {applyForRoleMutation.isPending
                  ? "Submitting..."
                  : "Submit Application"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
          </>
        )}

        {/* Team-Up Modals */}
        <CreateTeamUpModal
          open={createTeamUpOpen}
          onOpenChange={setCreateTeamUpOpen}
        />
        <JoinTeamUpModal
          open={joinTeamUpModalOpen}
          onOpenChange={setJoinTeamUpModalOpen}
          teamUp={selectedTeamUp}
          requestType={joinRequestType}
        />
    </div>
    </div>
    </>
  );
}
