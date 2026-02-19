import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/contexts/AdminContext';
import { assertValidUuid } from '@clstr/shared/utils/uuid';
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { CHANNELS } from '@clstr/shared/realtime/channels';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Types
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type TeamUpStatus = 'active' | 'completed' | 'cancelled' | 'expired';

export interface TeamUpOwner {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  completed_team_ups_count: number;
}

export interface TeamUpAdminView {
  id: string;
  title: string;
  description: string | null;
  mode: 'teammates' | 'event-based';
  team_size: number;
  status: TeamUpStatus;
  created_at: string;
  updated_at: string | null;
  event_deadline: string | null;
  creator_id: string;
  college_domain: string | null;
  // Freshness metrics
  last_request_at: string | null;
  last_member_added_at: string | null;
  request_count: number;
  decline_count: number;
  // Computed
  member_count: number;
  pending_request_count: number;
  is_stale: boolean;
  is_high_rejection: boolean;
  staleness_reason: string | null;
  owner?: TeamUpOwner | null;
}

export interface StaleTeamUp {
  id: string;
  title: string;
  creator_id: string;
  created_at: string;
  last_request_at: string | null;
  last_member_added_at: string | null;
  request_count: number;
  decline_count: number;
  staleness_reason: string;
}

export interface HighRejectionUser {
  user_id: string;
  decline_count: number;
  request_count: number;
  rejection_rate: number;
}

export interface TeamUpAdminStats {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  expired: number;
  stale: number;
  highRejection: number;
  totalMembers: number;
  totalPendingRequests: number;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Fetch Functions
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function fetchTeamUps(): Promise<TeamUpAdminView[]> {
  const { data: teamUps, error } = await supabase
    .from('team_ups')
    .select(`
      id, title, description, mode, team_size, status, 
      created_at, updated_at, event_deadline, creator_id, college_domain,
      last_request_at, last_member_added_at, request_count, decline_count
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const creatorIds = (teamUps || []).map((t) => t.creator_id).filter(Boolean);
  
  // Fetch creator profiles with completed count
  const { data: creators } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, completed_team_ups_count')
    .in('id', creatorIds);

  const creatorMap = new Map<string, TeamUpOwner>();
  for (const creator of creators || []) {
    creatorMap.set(creator.id, {
      id: creator.id,
      full_name: creator.full_name,
      email: creator.email,
      avatar_url: creator.avatar_url,
      completed_team_ups_count: creator.completed_team_ups_count ?? 0
    });
  }

  const teamUpIds = (teamUps || []).map((t) => t.id);

  // Fetch member counts
  const { data: members } = await supabase
    .from('team_up_members')
    .select('team_up_id')
    .in('team_up_id', teamUpIds);

  const memberCountMap = new Map<string, number>();
  for (const member of members || []) {
    memberCountMap.set(member.team_up_id, (memberCountMap.get(member.team_up_id) || 0) + 1);
  }

  // Fetch pending request counts
  const { data: requests } = await supabase
    .from('team_up_requests')
    .select('team_up_id')
    .in('team_up_id', teamUpIds)
    .eq('status', 'pending');

  const pendingRequestMap = new Map<string, number>();
  for (const request of requests || []) {
    pendingRequestMap.set(request.team_up_id, (pendingRequestMap.get(request.team_up_id) || 0) + 1);
  }

  // Determine staleness (>7 days no activity, active status)
  const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  return (teamUps || []).map((teamUp: any) => {
    const lastActivity = teamUp.last_member_added_at || teamUp.last_request_at || teamUp.created_at;
    const lastActivityTime = new Date(lastActivity).getTime();
    const isStale = teamUp.status === 'active' && (now - lastActivityTime) > STALE_THRESHOLD_MS;
    
    // High rejection: >50% rejection rate with at least 3 requests
    const isHighRejection = teamUp.request_count >= 3 && 
      (teamUp.decline_count / teamUp.request_count) > 0.5;

    let stalenessReason: string | null = null;
    if (isStale) {
      const daysSinceActivity = Math.floor((now - lastActivityTime) / (24 * 60 * 60 * 1000));
      stalenessReason = `No activity for ${daysSinceActivity} days`;
    }

    return {
      id: teamUp.id,
      title: teamUp.title,
      description: teamUp.description,
      mode: teamUp.mode as 'teammates' | 'event-based',
      team_size: teamUp.team_size,
      status: teamUp.status as TeamUpStatus,
      created_at: teamUp.created_at,
      updated_at: teamUp.updated_at,
      event_deadline: teamUp.event_deadline,
      creator_id: teamUp.creator_id,
      college_domain: teamUp.college_domain,
      last_request_at: teamUp.last_request_at,
      last_member_added_at: teamUp.last_member_added_at,
      request_count: teamUp.request_count ?? 0,
      decline_count: teamUp.decline_count ?? 0,
      member_count: memberCountMap.get(teamUp.id) || 0,
      pending_request_count: pendingRequestMap.get(teamUp.id) || 0,
      is_stale: isStale,
      is_high_rejection: isHighRejection,
      staleness_reason: stalenessReason,
      owner: creatorMap.get(teamUp.creator_id) || null,
    };
  });
}

async function fetchStaleTeamUps(staleDays: number = 7): Promise<StaleTeamUp[]> {
  const { data, error } = await supabase.rpc('admin_get_stale_team_ups', {
    p_stale_days: staleDays
  });

  if (error) throw error;
  return (data || []) as StaleTeamUp[];
}

async function fetchHighRejectionUsers(minRequests: number = 3, minRejectionRate: number = 0.5): Promise<HighRejectionUser[]> {
  const { data, error } = await supabase.rpc('admin_get_high_rejection_team_ups', {
    p_min_requests: minRequests,
    p_min_rejection_rate: minRejectionRate
  });

  if (error) throw error;
  return (data || []) as HighRejectionUser[];
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Admin Actions
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function cancelTeamUpFn({ teamUpId, adminRole }: { teamUpId: string; adminRole: string | null }): Promise<void> {
  assertValidUuid(teamUpId, 'teamUpId');
  if (!adminRole) throw new Error('Not authorized');
  if (adminRole === 'moderator') throw new Error('Insufficient permissions');

  const { error } = await supabase
    .from('team_ups')
    .update({ status: 'cancelled' })
    .eq('id', teamUpId);

  if (error) throw new Error(error.message || 'Failed to cancel team-up');
}

async function expireTeamUpFn({ teamUpId, adminRole }: { teamUpId: string; adminRole: string | null }): Promise<void> {
  assertValidUuid(teamUpId, 'teamUpId');
  if (!adminRole) throw new Error('Not authorized');
  if (adminRole === 'moderator') throw new Error('Insufficient permissions');

  const { error } = await supabase
    .from('team_ups')
    .update({ status: 'expired' })
    .eq('id', teamUpId);

  if (error) throw new Error(error.message || 'Failed to expire team-up');
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Hook
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function useAdminTeamUps() {
  const { isAdmin, adminUser } = useAdmin();
  const queryClient = useQueryClient();

  // Main team-ups query
  const teamUpsQuery = useQuery({
    queryKey: QUERY_KEYS.admin.teamUps(),
    queryFn: fetchTeamUps,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Stale team-ups query
  const staleQuery = useQuery({
    queryKey: QUERY_KEYS.admin.teamUpsStale(),
    queryFn: () => fetchStaleTeamUps(7),
    enabled: isAdmin,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // High rejection users query
  const highRejectionQuery = useQuery({
    queryKey: QUERY_KEYS.admin.teamUpsHighRejection(),
    queryFn: () => fetchHighRejectionUsers(3, 0.5),
    enabled: isAdmin,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Computed stats
  const stats = useMemo<TeamUpAdminStats>(() => {
    const teamUps = teamUpsQuery.data || [];
    return {
      total: teamUps.length,
      active: teamUps.filter((t) => t.status === 'active').length,
      completed: teamUps.filter((t) => t.status === 'completed').length,
      cancelled: teamUps.filter((t) => t.status === 'cancelled').length,
      expired: teamUps.filter((t) => t.status === 'expired').length,
      stale: teamUps.filter((t) => t.is_stale).length,
      highRejection: teamUps.filter((t) => t.is_high_rejection).length,
      totalMembers: teamUps.reduce((sum, t) => sum + t.member_count, 0),
      totalPendingRequests: teamUps.reduce((sum, t) => sum + t.pending_request_count, 0),
    };
  }, [teamUpsQuery.data]);

  // Realtime subscription
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel(CHANNELS.admin.teamUps())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_ups' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.teamUps() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.teamUpsStale() });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_up_members' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.teamUps() });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_up_requests' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.teamUps() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.teamUpsHighRejection() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  // Mutations
  const cancelMutation = useMutation({
    mutationFn: (teamUpId: string) => cancelTeamUpFn({ teamUpId, adminRole: adminUser?.role || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.teamUps() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.teamUpsStale() });
    },
  });

  const expireMutation = useMutation({
    mutationFn: (teamUpId: string) => expireTeamUpFn({ teamUpId, adminRole: adminUser?.role || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.teamUps() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.teamUpsStale() });
    },
  });

  return {
    // Data
    teamUps: teamUpsQuery.data || [],
    teamUpsLoading: teamUpsQuery.isLoading,
    teamUpsError: teamUpsQuery.error,
    
    // Stats
    stats,
    
    // Stale team-ups (from RPC)
    staleTeamUps: staleQuery.data || [],
    staleTeamUpsLoading: staleQuery.isLoading,
    staleTeamUpsError: staleQuery.error,
    
    // High rejection users (from RPC)
    highRejectionUsers: highRejectionQuery.data || [],
    highRejectionUsersLoading: highRejectionQuery.isLoading,
    highRejectionUsersError: highRejectionQuery.error,
    
    // Actions
    cancelTeamUp: cancelMutation.mutate,
    cancelTeamUpAsync: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
    cancelError: cancelMutation.error,
    
    expireTeamUp: expireMutation.mutate,
    expireTeamUpAsync: expireMutation.mutateAsync,
    isExpiring: expireMutation.isPending,
    expireError: expireMutation.error,
    
    // Refetch
    refetch: () => {
      teamUpsQuery.refetch();
      staleQuery.refetch();
      highRejectionQuery.refetch();
    },
  };
}
