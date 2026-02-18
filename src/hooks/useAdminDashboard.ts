import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/contexts/AdminContext';

// Types for admin dashboard data
export interface AdminKPIs {
  total_users: number;
  active_users_7d: number;
  total_colleges: number;
  verified_colleges: number;
  total_recruiters: number;
  active_projects: number;
  user_change_pct: number;
  college_change_pct: number;
}

export interface SystemAlert {
  id: string;
  alert_type: 'warning' | 'error' | 'success' | 'info';
  title: string;
  message: string;
  action_label: string | null;
  action_route: string | null;
  is_read: boolean;
  created_at: string;
}

export interface UserGrowthData {
  date: string;
  signups: number;
  active_users: number;
}

export interface CollegeDistribution {
  region: string;
  user_count: number;
  college_count: number;
}

// Default KPIs when no data is available
const defaultKPIs: AdminKPIs = {
  total_users: 0,
  active_users_7d: 0,
  total_colleges: 0,
  verified_colleges: 0,
  total_recruiters: 0,
  active_projects: 0,
  user_change_pct: 0,
  college_change_pct: 0,
};

// Fetch admin KPIs from database
async function fetchAdminKPIs(): Promise<AdminKPIs> {
  try {
    const { data, error } = await supabase
      .from('admin_dashboard_kpis')
      .select('total_users, active_users_7d, total_colleges, verified_colleges, total_recruiters, active_projects')
      .eq('id', 1)
      .single();

    if (error || !data) {
      throw error || new Error('Missing admin_dashboard_kpis row');
    }

    return {
      total_users: Number(data.total_users || 0),
      active_users_7d: Number(data.active_users_7d || 0),
      total_colleges: Number(data.total_colleges || 0),
      verified_colleges: Number(data.verified_colleges || 0),
      total_recruiters: Number(data.total_recruiters || 0),
      active_projects: Number(data.active_projects || 0),
      user_change_pct: 0,
      college_change_pct: 0,
    };
  } catch (error) {
    console.error('Error fetching admin KPIs:', error);
    return defaultKPIs;
  }
}

// Fetch system alerts
async function fetchSystemAlerts(): Promise<SystemAlert[]> {
  try {
    // Use any to bypass type checking until types are regenerated
    const { data, error } = await supabase
      .from('system_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching system alerts:', error);
      return [];
    }

    return (data || []) as SystemAlert[];
  } catch {
    return [];
  }
}

// Fetch user growth data for charts
async function fetchUserGrowth(days: number = 14): Promise<UserGrowthData[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));

    const { data: growthRows, error: growthError } = await supabase
      .from('admin_user_growth')
      .select('date, signups')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (growthError) {
      throw growthError;
    }

    const { data: activeData } = await supabase
      .from('profiles')
      .select('last_seen')
      .gte('last_seen', startDate.toISOString());

    const activeMap = new Map<string, number>();
    for (const row of activeData || []) {
      if (!row.last_seen) continue;
      const dateKey = new Date(row.last_seen).toISOString().split('T')[0];
      activeMap.set(dateKey, (activeMap.get(dateKey) || 0) + 1);
    }

    return (growthRows || []).map((item) => ({
      date: item.date,
      signups: Number(item.signups || 0),
      active_users: activeMap.get(item.date) || 0,
    }));
  } catch {
    return [];
  }
}

// Fetch college distribution by region
async function fetchCollegeDistribution(): Promise<CollegeDistribution[]> {
  try {
    const { data: statsData, error: statsError } = await supabase.rpc('get_admin_college_stats');
    const hasStatsData = !statsError && Array.isArray(statsData) && statsData.length > 0;

    if (hasStatsData) {
      const { data: colleges } = await supabase
        .from('colleges')
        .select('canonical_domain, country');

      const collegeMap = new Map<string, { country: string | null }>();
      for (const college of colleges || []) {
        collegeMap.set(college.canonical_domain, {
          country: college.country || null,
        });
      }

      const regionMap = new Map<string, { user_count: number; college_count: number }>();
      for (const stat of statsData || []) {
        const collegeInfo = collegeMap.get(stat.college_domain) || { country: null };
        const region = collegeInfo.country || 'Unknown';
        const existing = regionMap.get(region) || { user_count: 0, college_count: 0 };
        existing.user_count += Number(stat.total_users) || 0;
        existing.college_count += 1;
        regionMap.set(region, existing);
      }

      return Array.from(regionMap.entries())
        .map(([region, data]) => ({
          region,
          user_count: data.user_count,
          college_count: data.college_count,
        }))
        .sort((a, b) => b.user_count - a.user_count)
        .slice(0, 6);
    }

    const { data: fallbackData, error: fallbackError } = await supabase
      .from('admin_college_stats_v2' as any)
      .select('canonical_domain, country, total_users');

    if (fallbackError || !fallbackData) return [];

    const regionMap = new Map<string, { user_count: number; college_count: number }>();
    for (const row of fallbackData || []) {
      const region = row.country || 'Unknown';
      const existing = regionMap.get(region) || { user_count: 0, college_count: 0 };
      existing.user_count += Number(row.total_users) || 0;
      existing.college_count += 1;
      regionMap.set(region, existing);
    }

    return Array.from(regionMap.entries())
      .map(([region, data]) => ({
        region,
        user_count: data.user_count,
        college_count: data.college_count,
      }))
      .sort((a, b) => b.user_count - a.user_count)
      .slice(0, 6);
  } catch {
    return [];
  }
}

// Hook for admin KPIs
export function useAdminKPIs() {
  const { isAdmin } = useAdmin();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin-kpis'],
    queryFn: fetchAdminKPIs,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin_kpis_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-kpis'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'colleges' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-kpis'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recruiter_accounts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-kpis'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collab_projects' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-kpis'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_dashboard_kpis' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-kpis'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  return query;
}

// Hook for system alerts with realtime updates
export function useSystemAlerts() {
  const { isAdmin } = useAdmin();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['system-alerts'],
    queryFn: fetchSystemAlerts,
    enabled: isAdmin,
    staleTime: 1000 * 60, // 1 minute
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('system_alerts_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_alerts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['system-alerts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  return query;
}

// Hook for user growth data
export function useUserGrowth(days: number = 14) {
  const { isAdmin } = useAdmin();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin-user-growth', days],
    queryFn: () => fetchUserGrowth(days),
    enabled: isAdmin,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel(`admin_user_growth_${days}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-user-growth', days] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_user_growth' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-user-growth', days] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, days, queryClient]);

  return query;
}

// Hook for college distribution
export function useCollegeDistribution() {
  const { isAdmin } = useAdmin();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin-college-distribution'],
    queryFn: fetchCollegeDistribution,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin_college_distribution_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_college_stats' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-college-distribution'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-college-distribution'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'colleges' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-college-distribution'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  return query;
}

// Combined hook for all dashboard data
export function useAdminDashboard(growthDays: number = 14) {
  const kpis = useAdminKPIs();
  const alerts = useSystemAlerts();
  const growth = useUserGrowth(growthDays);
  const distribution = useCollegeDistribution();

  return {
    kpis: kpis.data || defaultKPIs,
    kpisLoading: kpis.isLoading,
    kpisError: kpis.error,
    alerts: alerts.data || [],
    alertsLoading: alerts.isLoading,
    growth: growth.data || [],
    growthLoading: growth.isLoading,
    distribution: distribution.data || [],
    distributionLoading: distribution.isLoading,
    isLoading: kpis.isLoading || alerts.isLoading,
    refetchAll: () => {
      kpis.refetch();
      alerts.refetch();
      growth.refetch();
      distribution.refetch();
    },
  };
}
