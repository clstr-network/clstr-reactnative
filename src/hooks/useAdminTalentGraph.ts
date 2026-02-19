import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/contexts/AdminContext';
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { CHANNELS } from '@clstr/shared/realtime/channels';

export interface TalentNode {
  id: string;
  type: 'user' | 'club' | 'project' | 'company';
  label: string;
  role?: string;
  college?: string | null;
  skills?: string[];
  avatar?: string | null;
}

export interface TalentEdge {
  source_id: string;
  target_id: string;
  type: 'mentorship' | 'leadership' | 'collaboration' | 'connection';
  weight: number;
}

export interface TalentGraph {
  nodes: TalentNode[];
  edges: TalentEdge[];
}

export interface TalentQuery {
  type: 'mentors' | 'leaders' | 'collaborators' | 'custom';
  filters?: {
    college?: string;
    role?: string;
    skill?: string;
  };
}

async function fetchTalentGraph(): Promise<TalentGraph> {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role, college_domain, avatar_url')
    .neq('role', 'Club')
    .limit(500);

  const userIds = (profiles || []).map((p) => p.id);

  const { data: skills } = await supabase
    .from('profile_skills')
    .select('user_id, skill')
    .in('user_id', userIds);

  const skillMap = new Map<string, string[]>();
  for (const skill of skills || []) {
    const existing = skillMap.get(skill.user_id) || [];
    existing.push(skill.skill);
    skillMap.set(skill.user_id, existing);
  }

  const { data: clubs } = await supabase
    .from('clubs')
    .select('id, name, college_domain')
    .limit(200);

  const { data: projects } = await supabase
    .from('collab_projects')
    .select('id, title, college_domain')
    .limit(200);

  const { data: companies } = await supabase
    .from('recruiter_accounts')
    .select('id, company_name')
    .limit(200);

  const { data: edgeRows } = await supabase
    .from('admin_talent_edges')
    .select('source_id, target_id, edge_type, weight');

  const { data: connections } = await supabase
    .from('connections')
    .select('requester_id, receiver_id')
    .eq('status', 'accepted')
    .limit(500);

  const nodes: TalentNode[] = [];

  for (const profile of profiles || []) {
    nodes.push({
      id: profile.id,
      type: 'user',
      label: profile.full_name || 'Unknown',
      role: profile.role || 'Student',
      college: profile.college_domain,
      skills: skillMap.get(profile.id) || [],
      avatar: profile.avatar_url,
    });
  }

  for (const club of clubs || []) {
    nodes.push({
      id: club.id,
      type: 'club',
      label: club.name,
      college: club.college_domain,
    });
  }

  for (const project of projects || []) {
    nodes.push({
      id: project.id,
      type: 'project',
      label: project.title,
      college: project.college_domain,
    });
  }

  for (const company of companies || []) {
    nodes.push({
      id: company.id,
      type: 'company',
      label: company.company_name,
    });
  }

  const edges: TalentEdge[] = [];
  for (const edge of edgeRows || []) {
    edges.push({
      source_id: edge.source_id,
      target_id: edge.target_id,
      type: edge.edge_type,
      weight: Number(edge.weight) || 1,
    });
  }

  for (const connection of connections || []) {
    edges.push({
      source_id: connection.requester_id,
      target_id: connection.receiver_id,
      type: 'connection',
      weight: 1,
    });
  }

  return { nodes, edges };
}

async function executeTalentQuery(query: TalentQuery, graph: TalentGraph): Promise<{ users: TalentNode[] }> {
  const baseUsers = graph.nodes.filter((node) => node.type === 'user');

  if (query.type === 'custom') {
    return {
      users: baseUsers.filter((node) => {
        if (query.filters?.college && node.college !== query.filters.college) return false;
        if (query.filters?.role && node.role !== query.filters.role) return false;
        if (query.filters?.skill && !(node.skills || []).some((s) => s.toLowerCase().includes(query.filters?.skill?.toLowerCase() || ''))) {
          return false;
        }
        return true;
      }),
    };
  }

  if (query.type === 'mentors') {
    const { data: mentors } = await supabase
      .from('mentorship_offers')
      .select('mentor_id')
      .eq('is_active', true);

    const mentorIds = new Set((mentors || []).map((m) => m.mentor_id));
    return { users: baseUsers.filter((node) => mentorIds.has(node.id)) };
  }

  if (query.type === 'leaders') {
    const { data: leaders } = await supabase
      .from('club_members')
      .select('user_id, role')
      .in('role', ['leader', 'president', 'admin'])
      .eq('status', 'active');

    const leaderIds = new Set((leaders || []).map((l) => l.user_id));
    return { users: baseUsers.filter((node) => leaderIds.has(node.id)) };
  }

  const { data: collaborators } = await supabase
    .from('collab_team_members')
    .select('user_id')
    .eq('status', 'active');

  const collaboratorIds = new Set((collaborators || []).map((c) => c.user_id));
  return { users: baseUsers.filter((node) => collaboratorIds.has(node.id)) };
}

export function useAdminTalentGraph() {
  const { isAdmin } = useAdmin();
  const queryClient = useQueryClient();

  const graphQuery = useQuery({
    queryKey: QUERY_KEYS.admin.talentGraph(),
    queryFn: fetchTalentGraph,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 5,
  });

  const collegesQuery = useQuery({
    queryKey: QUERY_KEYS.admin.talentColleges(),
    queryFn: async (): Promise<string[]> => {
      const { data } = await supabase
        .from('colleges')
        .select('canonical_domain')
        .order('canonical_domain', { ascending: true });

      return (data || []).map((row) => row.canonical_domain);
    },
    enabled: isAdmin,
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel(CHANNELS.admin.talentGraph())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.talentGraph() });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profile_skills' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.talentGraph() });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clubs' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.talentGraph() });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'collab_projects' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.talentGraph() });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recruiter_accounts' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.talentGraph() });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mentorship_requests' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.talentGraph() });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'club_members' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.talentGraph() });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'collab_team_members' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.talentGraph() });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'connections' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.talentGraph() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  const executeQuery = async (query: TalentQuery) => {
    const graph = graphQuery.data || { nodes: [], edges: [] };
    return executeTalentQuery(query, graph);
  };

  return {
    graph: graphQuery.data || { nodes: [], edges: [] },
    graphLoading: graphQuery.isLoading,
    graphError: graphQuery.error,
    colleges: collegesQuery.data || [],
    executeQuery,
    refetch: graphQuery.refetch,
  };
}
