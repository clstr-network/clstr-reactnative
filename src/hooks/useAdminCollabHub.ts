import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/contexts/AdminContext';
import { assertValidUuid } from '@/lib/uuid';

export type ProjectStatus = 'draft' | 'open' | 'in_progress' | 'closed' | 'archived' | 'flagged';

export interface CollabProjectOwner {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface CollabProject {
  id: string;
  title: string;
  description: string | null;
  summary: string | null;
  status: ProjectStatus;
  db_status: string;
  tags: string[];
  created_at: string;
  updated_at: string | null;
  owner_id: string;
  college_domain: string | null;
  flagged: boolean;
  flagged_reason: string | null;
  flagged_at: string | null;
  owner?: CollabProjectOwner | null;
  team_count: number;
  comment_count: number;
}

export interface CollabStats {
  total: number;
  active: number;
  completed: number;
  flagged: number;
  archived: number;
  totalMembers: number;
}

async function fetchCollabProjects(): Promise<CollabProject[]> {
  const { data: projects, error } = await supabase
    .from('collab_projects')
    .select('id, title, description, summary, status, tags, owner_id, college_domain, created_at, updated_at, flagged, flagged_reason, flagged_at')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const ownerIds = (projects || []).map((p) => p.owner_id).filter(Boolean);
  const { data: owners } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', ownerIds);

  const ownerMap = new Map<string, CollabProjectOwner>();
  for (const owner of owners || []) {
    ownerMap.set(owner.id, owner as CollabProjectOwner);
  }

  const projectIds = (projects || []).map((p) => p.id);

  const { data: teamMembers } = await supabase
    .from('collab_team_members')
    .select('project_id')
    .in('project_id', projectIds);

  const teamCountMap = new Map<string, number>();
  for (const member of teamMembers || []) {
    teamCountMap.set(member.project_id, (teamCountMap.get(member.project_id) || 0) + 1);
  }

  const { data: updates } = await supabase
    .from('collab_project_updates')
    .select('project_id')
    .in('project_id', projectIds);

  const updateCountMap = new Map<string, number>();
  for (const update of updates || []) {
    updateCountMap.set(update.project_id, (updateCountMap.get(update.project_id) || 0) + 1);
  }

  return (projects || []).map((project: any) => {
    const flagged = Boolean(project.flagged);
    const status: ProjectStatus = flagged ? 'flagged' : (project.status as ProjectStatus);

    return {
      id: project.id,
      title: project.title,
      description: project.description,
      summary: project.summary,
      status,
      db_status: project.status,
      tags: project.tags || [],
      created_at: project.created_at,
      updated_at: project.updated_at || null,
      owner_id: project.owner_id,
      college_domain: project.college_domain || null,
      flagged,
      flagged_reason: project.flagged_reason || null,
      flagged_at: project.flagged_at || null,
      owner: ownerMap.get(project.owner_id) || null,
      team_count: teamCountMap.get(project.id) || 0,
      comment_count: updateCountMap.get(project.id) || 0,
    };
  });
}

async function updateProjectStatusFn({ projectId, status, adminRole }: { projectId: string; status: ProjectStatus; adminRole: string | null }): Promise<void> {
  assertValidUuid(projectId, 'projectId');
  if (!adminRole) throw new Error('Not authorized');
  if (adminRole === 'moderator') throw new Error('Insufficient permissions');

  if (status === 'flagged') {
    throw new Error('Use flagProject to flag a project');
  }

  // Use SECURITY DEFINER RPC to bypass RLS
  const { data, error } = await supabase.rpc('admin_update_project_status', {
    p_project_id: projectId,
    p_status: status,
    p_reason: null
  });

  if (error) throw new Error(error.message || 'Failed to update project status');
  if (data && typeof data === 'object' && 'success' in data && !data.success) {
    throw new Error('Failed to update project status');
  }
}

async function archiveProjectFn({ projectId, adminRole }: { projectId: string; adminRole: string | null }): Promise<void> {
  assertValidUuid(projectId, 'projectId');
  if (!adminRole) throw new Error('Not authorized');
  if (adminRole === 'moderator') throw new Error('Insufficient permissions');

  // Use SECURITY DEFINER RPC to bypass RLS
  const { data, error } = await supabase.rpc('admin_archive_project', {
    p_project_id: projectId,
    p_reason: null
  });

  if (error) throw new Error(error.message || 'Failed to archive project');
  if (data && typeof data === 'object' && 'success' in data && !data.success) {
    throw new Error('Failed to archive project');
  }
}

async function flagProjectFn({ projectId, reason, adminRole, unflag = false }: { projectId: string; reason: string; adminRole: string | null; unflag?: boolean }): Promise<void> {
  assertValidUuid(projectId, 'projectId');
  if (!adminRole) throw new Error('Not authorized');
  if (adminRole === 'moderator') throw new Error('Insufficient permissions');

  // Use SECURITY DEFINER RPC to bypass RLS
  const { data, error } = await supabase.rpc('admin_flag_project', {
    p_project_id: projectId,
    p_reason: reason,
    p_unflag: unflag
  });

  if (error) throw new Error(error.message || 'Failed to flag project');
  if (data && typeof data === 'object' && 'success' in data && !data.success) {
    throw new Error('Failed to flag project');
  }
}

export function useAdminCollabHub() {
  const { isAdmin, adminUser } = useAdmin();
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: ['admin-collab-projects'],
    queryFn: fetchCollabProjects,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 2,
  });

  const statsQuery = useQuery({
    queryKey: ['admin-collab-stats'],
    queryFn: async (): Promise<CollabStats> => {
      const projects = await fetchCollabProjects();
      const active = projects.filter((p) => ['open', 'in_progress'].includes(p.db_status)).length;
      const completed = projects.filter((p) => p.db_status === 'closed').length;
      const archived = projects.filter((p) => p.db_status === 'archived').length;
      const flagged = projects.filter((p) => p.status === 'flagged').length;
      const totalMembers = projects.reduce((sum, p) => sum + p.team_count, 0);

      return {
        total: projects.length,
        active,
        completed,
        flagged,
        archived,
        totalMembers,
      };
    },
    enabled: isAdmin,
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin_collab_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'collab_projects' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-collab-projects'] });
          queryClient.invalidateQueries({ queryKey: ['admin-collab-stats'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'collab_team_members' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-collab-projects'] });
          queryClient.invalidateQueries({ queryKey: ['admin-collab-stats'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'collab_project_updates' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-collab-projects'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ projectId, status }: { projectId: string; status: ProjectStatus }) =>
      updateProjectStatusFn({ projectId, status, adminRole: adminUser?.role || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-collab-projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-collab-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kpis'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (projectId: string) => archiveProjectFn({ projectId, adminRole: adminUser?.role || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-collab-projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-collab-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kpis'] });
    },
  });

  const flagMutation = useMutation({
    mutationFn: ({ projectId, reason }: { projectId: string; reason: string }) =>
      flagProjectFn({ projectId, reason, adminRole: adminUser?.role || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-collab-projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-collab-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kpis'] });
    },
  });

  return {
    projects: projectsQuery.data || [],
    projectsLoading: projectsQuery.isLoading,
    projectsError: projectsQuery.error,
    stats: statsQuery.data || { total: 0, active: 0, completed: 0, flagged: 0, archived: 0, totalMembers: 0 },
    statsLoading: statsQuery.isLoading,
    updateProjectStatus: updateStatusMutation.mutate,
    updateProjectStatusAsync: updateStatusMutation.mutateAsync,
    isUpdatingStatus: updateStatusMutation.isPending,
    updateStatusError: updateStatusMutation.error,
    archiveProject: archiveMutation.mutate,
    archiveProjectAsync: archiveMutation.mutateAsync,
    isArchiving: archiveMutation.isPending,
    archiveError: archiveMutation.error,
    flagProject: flagMutation.mutate,
    flagProjectAsync: flagMutation.mutateAsync,
    isFlagging: flagMutation.isPending,
    flagError: flagMutation.error,
    refetch: projectsQuery.refetch,
  };
}
