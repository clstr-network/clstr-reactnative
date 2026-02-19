/**
 * useAdminRecruiters - React Query hook for Admin Recruiters page
 * 
 * Provides Supabase-backed data fetching and mutations for recruiter management
 * with realtime subscriptions and proper cache invalidation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/contexts/AdminContext';
import { assertValidUuid } from '@clstr/shared/utils/uuid';
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { CHANNELS } from '@clstr/shared/realtime/channels';

// Types
export type RecruiterPlan = 'free' | 'basic' | 'pro' | 'enterprise';
export type RecruiterStatus = 'active' | 'suspended' | 'pending' | 'cancelled';

export interface RecruiterAccount {
  id: string;
  company_name: string;
  contact_email: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  plan_type: RecruiterPlan;
  status: RecruiterStatus;
  active_searches: number;
  messages_sent: number;
  conversion_rate: number;
  subscription_start: string | null;
  subscription_end: string | null;
  subscription_price: number | null;
  created_at: string;
  updated_at: string;
}

// Fetch recruiters from Supabase
async function fetchRecruiters(): Promise<RecruiterAccount[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('recruiter_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recruiter accounts:', error);
      throw error;
    }

    return (data || []).map((recruiter: any) => ({
      id: recruiter.id,
      company_name: recruiter.company_name,
      contact_email: recruiter.contact_email,
      contact_name: recruiter.contact_name,
      contact_phone: recruiter.contact_phone,
      plan_type: recruiter.plan_type as RecruiterPlan,
      status: recruiter.status as RecruiterStatus,
      active_searches: recruiter.active_searches || 0,
      messages_sent: recruiter.messages_sent || 0,
      conversion_rate: Number(recruiter.conversion_rate) || 0,
      subscription_start: recruiter.subscription_start_date,
      subscription_end: recruiter.subscription_end_date,
      subscription_price: recruiter.subscription_price ? Number(recruiter.subscription_price) : null,
      created_at: recruiter.created_at,
      updated_at: recruiter.updated_at,
    }));
  } catch (error) {
    console.error('Error fetching admin recruiters:', error);
    return [];
  }
}

// Create recruiter mutation
async function createRecruiterMutation(data: {
  company_name: string;
  contact_email?: string;
  contact_name?: string;
  plan_type?: RecruiterPlan;
  adminRole: string | null;
}): Promise<RecruiterAccount> {
  if (!data.adminRole) throw new Error('Not authorized');
  if (data.adminRole === 'moderator') throw new Error('Insufficient permissions');
  const { data: result, error } = await (supabase as any)
    .from('recruiter_accounts')
    .insert({
      company_name: data.company_name,
      contact_email: data.contact_email || null,
      contact_name: data.contact_name || null,
      plan_type: data.plan_type || 'free',
      status: 'pending',
      active_searches: 0,
      messages_sent: 0,
      conversion_rate: 0,
    })
    .select()
    .single();

  if (error) throw error;

  // Log the action
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.email) {
    await supabase.from('admin_activity_logs').insert({
      admin_email: session.user.email,
      action_type: 'create_recruiter',
      target_type: 'recruiter_account',
      target_id: result.id,
      details: { company_name: data.company_name },
    });
  }

  return result;
}

// Suspend recruiter mutation
async function suspendRecruiterMutation({ recruiterId, adminRole }: { recruiterId: string; adminRole: string | null }): Promise<void> {
  assertValidUuid(recruiterId, 'recruiterId');
  if (!adminRole) throw new Error('Not authorized');
  if (adminRole === 'moderator') throw new Error('Insufficient permissions');

  const { error } = await (supabase as any)
    .from('recruiter_accounts')
    .update({
      status: 'suspended',
      updated_at: new Date().toISOString(),
    })
    .eq('id', recruiterId);

  if (error) throw error;

  // Log the action
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.email) {
    await supabase.from('admin_activity_logs').insert({
      admin_email: session.user.email,
      action_type: 'suspend_recruiter',
      target_type: 'recruiter_account',
      target_id: recruiterId,
    });
  }
}

// Activate recruiter mutation
async function activateRecruiterMutation({ recruiterId, adminRole }: { recruiterId: string; adminRole: string | null }): Promise<void> {
  assertValidUuid(recruiterId, 'recruiterId');
  if (!adminRole) throw new Error('Not authorized');
  if (adminRole === 'moderator') throw new Error('Insufficient permissions');

  const { error } = await (supabase as any)
    .from('recruiter_accounts')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', recruiterId);

  if (error) throw error;

  // Log the action
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.email) {
    await supabase.from('admin_activity_logs').insert({
      admin_email: session.user.email,
      action_type: 'activate_recruiter',
      target_type: 'recruiter_account',
      target_id: recruiterId,
    });
  }
}

// Update recruiter plan mutation
async function updateRecruiterPlanMutation({ recruiterId, plan, adminRole }: { recruiterId: string; plan: RecruiterPlan; adminRole: string | null }): Promise<void> {
  assertValidUuid(recruiterId, 'recruiterId');
  if (!adminRole) throw new Error('Not authorized');
  if (adminRole === 'moderator') throw new Error('Insufficient permissions');

  // Validate plan
  const validPlans: RecruiterPlan[] = ['free', 'basic', 'pro', 'enterprise'];
  if (!validPlans.includes(plan)) {
    throw new Error(`Invalid plan: ${plan}`);
  }

  const { error } = await (supabase as any)
    .from('recruiter_accounts')
    .update({
      plan_type: plan,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recruiterId);

  if (error) throw error;

  // Log the action
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.email) {
    await supabase.from('admin_activity_logs').insert({
      admin_email: session.user.email,
      action_type: 'update_recruiter_plan',
      target_type: 'recruiter_account',
      target_id: recruiterId,
      details: { plan },
    });
  }
}

// Main hook
export function useAdminRecruiters() {
  const { isAdmin, adminUser } = useAdmin();
  const queryClient = useQueryClient();

  // Query for recruiters
  const query = useQuery({
    queryKey: QUERY_KEYS.admin.recruiters(),
    queryFn: fetchRecruiters,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel(CHANNELS.admin.recruiters())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recruiter_accounts' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.recruiters() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.kpis() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: { company_name: string; contact_email?: string; contact_name?: string; plan_type?: RecruiterPlan }) =>
      createRecruiterMutation({ ...data, adminRole: adminUser?.role || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.recruiters() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.kpis() });
    },
  });

  // Suspend mutation
  const suspendMutation = useMutation({
    mutationFn: (recruiterId: string) => suspendRecruiterMutation({ recruiterId, adminRole: adminUser?.role || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.recruiters() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.kpis() });
    },
  });

  // Activate mutation
  const activateMutation = useMutation({
    mutationFn: (recruiterId: string) => activateRecruiterMutation({ recruiterId, adminRole: adminUser?.role || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.recruiters() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.kpis() });
    },
  });

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: ({ recruiterId, plan }: { recruiterId: string; plan: RecruiterPlan }) =>
      updateRecruiterPlanMutation({ recruiterId, plan, adminRole: adminUser?.role || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.recruiters() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.kpis() });
    },
  });

  return {
    recruiters: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createRecruiter: createMutation.mutate,
    suspendRecruiter: suspendMutation.mutate,
    activateRecruiter: activateMutation.mutate,
    updateRecruiterPlan: updatePlanMutation.mutate,
    isUpdating: createMutation.isPending || suspendMutation.isPending || activateMutation.isPending || updatePlanMutation.isPending,
  };
}
