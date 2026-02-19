/**
 * useAdminUsers - React Query hook for Admin Users page
 * 
 * Provides Supabase-backed data fetching and mutations for user management
 * with realtime subscriptions and proper cache invalidation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/contexts/AdminContext';
import { assertValidUuid } from '@/lib/uuid';
import { toast } from '@/hooks/use-toast';
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { CHANNELS } from '@clstr/shared/realtime/channels';

// Types
export type UserStatus = 'active' | 'suspended' | 'pending';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  role: string;
  college_domain: string | null;
  graduation_year: number | null;
  status: UserStatus;
  activity_score: number;
  last_active: string | null;
  created_at: string;
  posts_count: number;
  connections_count: number;
  skills: string[] | null;
}

// Calculate activity score based on user activity
function calculateActivityScore(user: any): number {
  let score = 0;
  
  // Recent activity bonus
  const lastActiveValue = user.last_seen || user.updated_at;
  if (lastActiveValue) {
    const lastActive = new Date(lastActiveValue);
    const now = new Date();
    const daysSinceActive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceActive < 1) score += 40;
    else if (daysSinceActive < 7) score += 30;
    else if (daysSinceActive < 30) score += 20;
    else if (daysSinceActive < 90) score += 10;
  }
  
  // Profile completeness bonus
  if (user.full_name) score += 10;
  if (user.avatar_url) score += 10;
  if (user.headline) score += 10;
  if (user.bio) score += 10;
  if (user.is_verified) score += 20;
  
  return Math.min(100, score);
}

// Fetch users from Supabase
async function fetchUsers(): Promise<AdminUser[]> {
  try {
    // Try the RPC function first
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc('get_admin_users', {
      p_role: null,
      p_college_domain: null,
      p_status: null,
      p_limit: 500,
      p_offset: 0,
    });

    if (!rpcError && rpcData && Array.isArray(rpcData)) {
      // Get additional stats
      const userIds = rpcData.map((u: any) => u.id);

      if (userIds.length === 0) {
        return [];
      }

      const { data: profileMeta } = await supabase
        .from('profiles')
        .select('id, role_data, last_seen, updated_at, is_verified')
        .in('id', userIds);

      const metaMap = new Map<string, any>();
      for (const meta of (profileMeta || [])) {
        metaMap.set(meta.id, meta);
      }
      
      // Get posts counts
      const { data: postCounts } = await supabase
        .from('posts')
        .select('user_id')
        .in('user_id', userIds);

      const postCountMap = new Map<string, number>();
      for (const post of (postCounts || [])) {
        postCountMap.set(post.user_id, (postCountMap.get(post.user_id) || 0) + 1);
      }

      // Get connection counts
      const { data: connectionCounts } = await supabase
        .from('connections')
        .select('requester_id, receiver_id')
        .eq('status', 'accepted')
        .or(`requester_id.in.(${userIds.join(',')}),receiver_id.in.(${userIds.join(',')})`);

      const connectionCountMap = new Map<string, number>();
      for (const conn of (connectionCounts || [])) {
        connectionCountMap.set(conn.requester_id, (connectionCountMap.get(conn.requester_id) || 0) + 1);
        connectionCountMap.set(conn.receiver_id, (connectionCountMap.get(conn.receiver_id) || 0) + 1);
      }

      return rpcData.map((user: any) => {
        const meta = metaMap.get(user.id) || {};
        const roleData = meta.role_data || {};
        const isSuspended = roleData?.suspended === true;
        const isVerified = meta.is_verified ?? user.is_verified;
        const status: UserStatus = isSuspended ? 'suspended' : (isVerified ? 'active' : 'pending');

        return {
        id: user.id,
        email: user.email || '',
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        headline: null,
        role: user.role || 'Student',
        college_domain: user.college_domain,
        graduation_year: user.graduation_year,
        status,
        activity_score: calculateActivityScore({ ...user, last_seen: meta.last_seen }),
        last_active: meta.last_seen || user.updated_at,
        created_at: user.created_at,
        posts_count: postCountMap.get(user.id) || 0,
        connections_count: connectionCountMap.get(user.id) || 0,
        skills: user.skills || [],
      };
      });
    }

    // Fallback: query profiles directly
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        avatar_url,
        headline,
        bio,
        role,
        college_domain,
        is_verified,
        role_data,
        last_seen,
        created_at,
        updated_at
      `)
      .neq('role', 'Club')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error fetching profiles:', error);
      throw error;
    }

    // Get additional data
    const userIds = (profiles || []).map(p => p.id);

    if (userIds.length === 0) {
      return [];
    }

    // Get graduation years from student_profiles
    const { data: studentProfiles } = await supabase
      .from('student_profiles')
      .select('user_id, graduation_year')
      .in('user_id', userIds);

    const gradYearMap = new Map<string, number>();
    for (const sp of (studentProfiles || [])) {
      if (sp.graduation_year) gradYearMap.set(sp.user_id, sp.graduation_year);
    }

    // Get skills
    const { data: skills } = await supabase
      .from('profile_skills')
      .select('user_id, skill')
      .in('user_id', userIds);

    const skillsMap = new Map<string, string[]>();
    for (const s of (skills || [])) {
      const existing = skillsMap.get(s.user_id) || [];
      existing.push(s.skill);
      skillsMap.set(s.user_id, existing);
    }

    // Get posts counts
    const { data: postCounts } = await supabase
      .from('posts')
      .select('user_id')
      .in('user_id', userIds);

    const postCountMap = new Map<string, number>();
    for (const post of (postCounts || [])) {
      postCountMap.set(post.user_id, (postCountMap.get(post.user_id) || 0) + 1);
    }

    // Get connection counts
    const { data: connectionCounts } = await supabase
      .from('connections')
      .select('requester_id, receiver_id')
      .eq('status', 'accepted');

    const connectionCountMap = new Map<string, number>();
    for (const conn of (connectionCounts || [])) {
      if (userIds.includes(conn.requester_id)) {
        connectionCountMap.set(conn.requester_id, (connectionCountMap.get(conn.requester_id) || 0) + 1);
      }
      if (userIds.includes(conn.receiver_id)) {
        connectionCountMap.set(conn.receiver_id, (connectionCountMap.get(conn.receiver_id) || 0) + 1);
      }
    }

    return (profiles || []).map(profile => {
      const roleData = (profile as any).role_data || {};
      const isSuspended = roleData?.suspended === true;
      const status: UserStatus = isSuspended ? 'suspended' : (profile.is_verified ? 'active' : 'pending');

      return {
      id: profile.id,
      email: profile.email || '',
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      headline: profile.headline,
      role: profile.role || 'Student',
      college_domain: profile.college_domain,
      graduation_year: gradYearMap.get(profile.id) || null,
      status,
      activity_score: calculateActivityScore({ ...profile, last_seen: (profile as any).last_seen }),
      last_active: (profile as any).last_seen || profile.updated_at,
      created_at: profile.created_at,
      posts_count: postCountMap.get(profile.id) || 0,
      connections_count: connectionCountMap.get(profile.id) || 0,
      skills: skillsMap.get(profile.id) || null,
    };
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return [];
  }
}

// Suspend user mutation
async function suspendUserMutation({ userId, adminRole }: { userId: string; adminRole: string | null }): Promise<void> {
  assertValidUuid(userId, 'userId');
  if (!adminRole) throw new Error('Not authorized');
  if (adminRole === 'moderator') throw new Error('Insufficient permissions');

  const { error } = await supabase.rpc('admin_set_user_status', {
    p_user_id: userId,
    p_status: 'suspended',
    p_reason: 'Admin suspension',
  });

  if (error) throw error;

  // Log the action
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.email) {
    await supabase.from('admin_activity_logs').insert({
      admin_email: session.user.email,
      action_type: 'suspend_user',
      target_type: 'user',
      target_id: userId,
    });
  }
}

// Activate user mutation
async function activateUserMutation({ userId, adminRole }: { userId: string; adminRole: string | null }): Promise<void> {
  assertValidUuid(userId, 'userId');
  if (!adminRole) throw new Error('Not authorized');
  if (adminRole === 'moderator') throw new Error('Insufficient permissions');

  const { error } = await supabase.rpc('admin_set_user_status', {
    p_user_id: userId,
    p_status: 'active',
    p_reason: 'Admin activation',
  });

  if (error) throw error;

  // Log the action
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.email) {
    await supabase.from('admin_activity_logs').insert({
      admin_email: session.user.email,
      action_type: 'activate_user',
      target_type: 'user',
      target_id: userId,
    });
  }
}

// Update user role mutation
async function updateUserRoleMutation({ userId, role, adminRole }: { userId: string; role: string; adminRole: string | null }): Promise<void> {
  assertValidUuid(userId, 'userId');
  if (!adminRole) throw new Error('Not authorized');
  if (adminRole === 'moderator') throw new Error('Insufficient permissions');

  // Validate role
  const validRoles = ['Student', 'Alumni', 'Faculty'];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  const { error } = await supabase.rpc('admin_update_user_role', {
    p_user_id: userId,
    p_role: role,
    p_reason: 'Admin role update',
  });

  if (error) throw error;

  // Log the action
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.email) {
    await supabase.from('admin_activity_logs').insert({
      admin_email: session.user.email,
      action_type: 'update_user_role',
      target_type: 'user',
      target_id: userId,
      details: { role },
    });
  }
}

// Main hook
export function useAdminUsers() {
  const { isAdmin, adminUser } = useAdmin();
  const queryClient = useQueryClient();

  // Query for users
  const query = useQuery({
    queryKey: QUERY_KEYS.admin.users(),
    queryFn: fetchUsers,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel(CHANNELS.admin.users())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.users() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.kpis() });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.users() });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'connections' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.users() });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profile_skills' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.users() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  // Suspend mutation with proper error handling and toast feedback
  const suspendMutation = useMutation({
    mutationFn: (userId: string) => suspendUserMutation({ userId, adminRole: adminUser?.role || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.users() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.kpis() });
      toast({
        title: 'User suspended',
        description: 'The user account has been suspended successfully.',
      });
    },
    onError: (error: Error) => {
      console.error('Suspend user error:', error);
      toast({
        title: 'Failed to suspend user',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });

  // Activate mutation with proper error handling and toast feedback
  const activateMutation = useMutation({
    mutationFn: (userId: string) => activateUserMutation({ userId, adminRole: adminUser?.role || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.users() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.kpis() });
      toast({
        title: 'User activated',
        description: 'The user account has been activated successfully.',
      });
    },
    onError: (error: Error) => {
      console.error('Activate user error:', error);
      toast({
        title: 'Failed to activate user',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });

  // Update role mutation with proper error handling and toast feedback
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => updateUserRoleMutation({ userId, role, adminRole: adminUser?.role || null }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.users() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.kpis() });
      toast({
        title: 'Role updated',
        description: `User role has been changed to ${variables.role}.`,
      });
    },
    onError: (error: Error) => {
      console.error('Update role error:', error);
      toast({
        title: 'Failed to update role',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });

  // Wrapper functions that return promises for better control flow
  const suspendUser = useCallback(async (userId: string): Promise<boolean> => {
    try {
      await suspendMutation.mutateAsync(userId);
      return true;
    } catch {
      return false;
    }
  }, [suspendMutation]);

  const activateUser = useCallback(async (userId: string): Promise<boolean> => {
    try {
      await activateMutation.mutateAsync(userId);
      return true;
    } catch {
      return false;
    }
  }, [activateMutation]);

  const updateUserRole = useCallback(async (userId: string, role: string): Promise<boolean> => {
    try {
      await updateRoleMutation.mutateAsync({ userId, role });
      return true;
    } catch {
      return false;
    }
  }, [updateRoleMutation]);

  return {
    users: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    suspendUser,
    activateUser,
    updateUserRole,
    isUpdating: suspendMutation.isPending || activateMutation.isPending || updateRoleMutation.isPending,
  };
}
