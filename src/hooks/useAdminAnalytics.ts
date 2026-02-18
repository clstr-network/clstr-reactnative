import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/contexts/AdminContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Types for admin analytics data
export interface AnalyticsOverview {
  total_users: number;
  users_growth: number;
  total_posts: number;
  posts_growth: number;
  total_events: number;
  events_growth: number;
  total_connections: number;
  connections_growth: number;
  alumni_ratio: number;
  student_ratio: number;
  faculty_ratio: number;
}

export interface DailyMetric {
  date: string;
  users: number;
  posts: number;
  events: number;
  connections: number;
}

export interface EngagementMetric {
  feature: string;
  count: number;
  change: number;
}

export interface CollegeActivity {
  college_domain: string;
  college_name: string;
  users: number;
  posts: number;
  events: number;
  engagement_score: number;
}

export interface RetentionCohort {
  cohort: string;
  week_0: number;
  week_1: number;
  week_2: number;
  week_3: number;
  week_4: number;
}

export interface AnalyticsSnapshot {
  userGrowth: Array<{ date: string; signups: number }>;
  engagement: Array<{ date: string; posts: number; comments: number; connections: number; events: number }>;
  userDistribution: Array<{ name: string; value: number; color: string }>;
  collegeActivity: Array<{ domain: string; users: number; posts: number; events: number; activity_score: number }>;
  totals: {
    totalUsers: number;
    totalPosts: number;
    totalEvents: number;
    totalConnections: number;
    newUsersThisWeek: number;
    postsThisWeek: number;
  };
}

// Fetch analytics overview
async function fetchAnalyticsOverview(): Promise<AnalyticsOverview> {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const { data: kpis, error: kpiError } = await supabase
      .from('admin_dashboard_kpis')
      .select('*')
      .eq('id', 1)
      .single();

    if (kpiError) {
      throw kpiError;
    }

    const { data: userGrowthRows, error: userGrowthError } = await supabase
      .from('admin_user_growth')
      .select('date, signups')
      .gte('date', sixtyDaysAgo.toISOString().split('T')[0]);

    if (userGrowthError) {
      throw userGrowthError;
    }

    const { data: engagementRows, error: engagementError } = await supabase
      .from('admin_engagement_metrics')
      .select('date, metric_type, count')
      .gte('date', sixtyDaysAgo.toISOString().split('T')[0])
      .in('metric_type', ['posts', 'events', 'connections']);

    if (engagementError) {
      throw engagementError;
    }

    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const usersLast30 = (userGrowthRows || [])
      .filter(row => row.date >= thirtyDaysAgo.toISOString().split('T')[0])
      .reduce((sum, row) => sum + Number(row.signups || 0), 0);
    const usersPrev30 = (userGrowthRows || [])
      .filter(row => row.date < thirtyDaysAgo.toISOString().split('T')[0])
      .reduce((sum, row) => sum + Number(row.signups || 0), 0);

    const engagementTotals = (engagementRows || []).reduce((acc, row) => {
      const bucket = row.date >= thirtyDaysAgo.toISOString().split('T')[0] ? 'current' : 'previous';
      const key = `${row.metric_type}_${bucket}` as const;
      acc[key] = (acc[key] || 0) + Number(row.count || 0);
      return acc;
    }, {} as Record<string, number>);

    const totalUsers = Number(kpis?.total_users || 0);
    const total = totalUsers || 1;

    return {
      total_users: totalUsers,
      users_growth: calculateGrowth(usersLast30, usersPrev30),
      total_posts: Number(kpis?.total_posts || 0),
      posts_growth: calculateGrowth(
        engagementTotals.posts_current || 0,
        engagementTotals.posts_previous || 0
      ),
      total_events: Number(kpis?.total_events || 0),
      events_growth: calculateGrowth(
        engagementTotals.events_current || 0,
        engagementTotals.events_previous || 0
      ),
      total_connections: Number(kpis?.total_connections || 0),
      connections_growth: calculateGrowth(
        engagementTotals.connections_current || 0,
        engagementTotals.connections_previous || 0
      ),
      alumni_ratio: Math.round((Number(kpis?.total_alumni || 0) / total) * 100),
      student_ratio: Math.round((Number(kpis?.total_students || 0) / total) * 100),
      faculty_ratio: Math.round((Number(kpis?.total_faculty || 0) / total) * 100),
    };
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    return {
      total_users: 0,
      users_growth: 0,
      total_posts: 0,
      posts_growth: 0,
      total_events: 0,
      events_growth: 0,
      total_connections: 0,
      connections_growth: 0,
      alumni_ratio: 0,
      student_ratio: 0,
      faculty_ratio: 0,
    };
  }
}

// Fetch daily metrics
async function fetchDailyMetrics(days: number = 30): Promise<DailyMetric[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));

    const { data: growth, error: growthError } = await supabase
      .from('admin_user_growth')
      .select('date, signups')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (growthError) {
      throw growthError;
    }

    const { data: engagement, error: engagementError } = await supabase
      .from('admin_engagement_metrics')
      .select('date, metric_type, count')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (engagementError) {
      throw engagementError;
    }

    const metricsMap = new Map<string, DailyMetric>();
    for (const row of engagement || []) {
      const dateKey = row.date;
      const existing = metricsMap.get(dateKey) || {
        date: dateKey,
        users: 0,
        posts: 0,
        events: 0,
        connections: 0,
      };

      if (row.metric_type === 'posts') existing.posts = Number(row.count) || 0;
      if (row.metric_type === 'events') existing.events = Number(row.count) || 0;
      if (row.metric_type === 'connections') existing.connections = Number(row.count) || 0;

      metricsMap.set(dateKey, existing);
    }

    const metrics: DailyMetric[] = (growth || []).map((item: any) => {
      const existing = metricsMap.get(item.date) || {
        date: item.date,
        users: 0,
        posts: 0,
        events: 0,
        connections: 0,
      };

      return {
        ...existing,
        users: Number(item.signups) || 0,
      };
    });

    return metrics;
  } catch (error) {
    console.error('Error fetching daily metrics:', error);
    return [];
  }
}

// Fetch engagement metrics
async function fetchEngagementMetrics(): Promise<EngagementMetric[]> {
  try {
    const { data: engagement, error } = await supabase
      .from('admin_engagement_metrics')
      .select('metric_type, count');

    if (error) {
      throw error;
    }

    const totals = new Map<string, number>();
    for (const row of engagement || []) {
      totals.set(row.metric_type, (totals.get(row.metric_type) || 0) + Number(row.count || 0));
    }

    const map = (feature: string) => ({
      feature,
      count: totals.get(feature.toLowerCase()) || 0,
      change: 0,
    });

    return [
      map('posts'),
      map('comments'),
      map('connections'),
      map('events'),
    ];
  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    return [];
  }
}

// Fetch college activity
async function fetchCollegeActivity(): Promise<CollegeActivity[]> {
  try {
    // Use RPC function that validates admin access
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_college_stats');
    
    if (rpcError) {
      console.error('Error fetching college stats via RPC:', rpcError.message);
      throw rpcError;
    }
    
    if (!rpcData || !Array.isArray(rpcData)) {
      return [];
    }

    const { data: colleges } = await supabase
      .from('colleges')
      .select('canonical_domain, name');

    const collegeMap = new Map<string, string>();
    for (const college of colleges || []) {
      collegeMap.set(college.canonical_domain, college.name || college.canonical_domain);
    }

    return rpcData.map((item: { 
      college_domain: string | null; 
      total_users: number | string | null; 
      post_count: number | string | null; 
      event_count: number | string | null;
      active_users_7d: number | string | null;
    }) => ({
      college_domain: item.college_domain || '',
      college_name: collegeMap.get(item.college_domain || '') || formatCollegeName(item.college_domain || ''),
      users: Number(item.total_users) || 0,
      posts: Number(item.post_count) || 0,
      events: Number(item.event_count) || 0,
      engagement_score: calculateEngagementScore(
        Number(item.total_users) || 0,
        Number(item.post_count) || 0,
        Number(item.active_users_7d) || 0
      ),
    })).slice(0, 20);
  } catch (error) {
    console.error('Error fetching college activity:', error);
    return [];
  }
}

// Helper functions
function formatCollegeName(domain: string): string {
  if (!domain) return 'Unknown';
  return domain
    .replace(/\.edu\.in$/, '')
    .replace(/\.ac\.in$/, '')
    .replace(/\.edu$/, '')
    .replace(/\.in$/, '')
    .split(/[.\-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function calculateEngagementScore(users: number, posts: number, activeUsers: number): number {
  if (users === 0) return 0;
  const postsPerUser = posts / users;
  const activeRatio = activeUsers / users;
  return Math.min(Math.round((postsPerUser * 30 + activeRatio * 70)), 100);
}

// Fetch analytics snapshot data used by the admin analytics page
async function fetchAnalyticsSnapshot(timeRange: number): Promise<AnalyticsSnapshot> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);

    const startDateStr = startDate.toISOString().split('T')[0];

    // Get user growth from persisted table
    const { data: growthData, error: growthError } = await supabase
      .from('admin_user_growth')
      .select('date, signups')
      .gte('date', startDateStr)
      .order('date', { ascending: true });

    if (growthError) {
      throw growthError;
    }

    const userGrowth = (growthData || []).map((d: any) => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      signups: Number(d.signups) || 0,
    }));

    // Get engagement metrics from admin_engagement_metrics table
    const { data: engagementRaw, error: engagementError } = await supabase
      .from('admin_engagement_metrics' as any)
      .select('*')
      .gte('date', startDateStr)
      .order('date', { ascending: true });

    if (engagementError) {
      throw engagementError;
    }

    const engagementMap = new Map<string, { date: string; posts: number; comments: number; connections: number; events: number }>();
    for (const row of (engagementRaw || [])) {
      const date = new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const existing = engagementMap.get(date) || { date, posts: 0, comments: 0, connections: 0, events: 0 };

      switch (row.metric_type) {
        case 'posts':
          existing.posts = Number(row.count) || 0;
          break;
        case 'comments':
          existing.comments = Number(row.count) || 0;
          break;
        case 'connections':
          existing.connections = Number(row.count) || 0;
          break;
        case 'events':
          existing.events = Number(row.count) || 0;
          break;
      }
      engagementMap.set(date, existing);
    }
    const engagement = Array.from(engagementMap.values());

    const { data: kpis, error: kpiError } = await supabase
      .from('admin_dashboard_kpis')
      .select('*')
      .eq('id', 1)
      .single();

    if (kpiError) {
      throw kpiError;
    }

    const userDistribution = [
      { name: 'Students', value: Number(kpis?.total_students || 0), color: 'hsl(270, 91%, 65%)' },
      { name: 'Alumni', value: Number(kpis?.total_alumni || 0), color: 'hsl(330, 81%, 60%)' },
      { name: 'Faculty', value: Number(kpis?.total_faculty || 0), color: 'hsl(200, 81%, 60%)' },
    ];

    // Get college activity via RPC
    const { data: collegeStats, error: collegeError } = await supabase.rpc('get_admin_college_stats');
    if (collegeError) {
      console.error('Error fetching college stats:', collegeError.message);
      // Non-fatal - continue with empty college data
    }
    const collegeActivity = (collegeStats || []).slice(0, 10).map((c: { 
      college_domain: string | null; 
      total_users: number | string | null; 
      post_count: number | string | null; 
      event_count: number | string | null;
      active_users_7d: number | string | null;
    }) => ({
      domain: c.college_domain || 'Unknown',
      users: Number(c.total_users) || 0,
      posts: Number(c.post_count) || 0,
      events: Number(c.event_count) || 0,
      activity_score: Number(c.active_users_7d) || 0,
    }));

    // Get totals
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const { data: weeklyGrowth, error: weeklyGrowthError } = await supabase
      .from('admin_user_growth')
      .select('signups, date')
      .gte('date', weekAgoStr);

    if (weeklyGrowthError) {
      throw weeklyGrowthError;
    }

    const { data: weeklyPosts, error: weeklyPostsError } = await supabase
      .from('admin_engagement_metrics')
      .select('count, date')
      .eq('metric_type', 'posts')
      .gte('date', weekAgoStr);

    if (weeklyPostsError) {
      throw weeklyPostsError;
    }

    const newUsersThisWeek = (weeklyGrowth || []).reduce((sum, row) => sum + Number(row.signups || 0), 0);
    const postsThisWeek = (weeklyPosts || []).reduce((sum, row) => sum + Number(row.count || 0), 0);

    return {
      userGrowth,
      engagement,
      userDistribution,
      collegeActivity,
      totals: {
        totalUsers: Number(kpis?.total_users || 0),
        totalPosts: Number(kpis?.total_posts || 0),
        totalEvents: Number(kpis?.total_events || 0),
        totalConnections: Number(kpis?.total_connections || 0),
        newUsersThisWeek,
        postsThisWeek,
      },
    };
  } catch (error) {
    console.error('Error fetching analytics snapshot:', error);
    throw error;
  }
}

// Hook for analytics overview
export function useAnalyticsOverview() {
  const { isAdmin } = useAdmin();

  return useQuery({
    queryKey: ['admin-analytics-overview'],
    queryFn: fetchAnalyticsOverview,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 10, // Refetch every 10 minutes
  });
}

// Hook for daily metrics
export function useDailyMetrics(days: number = 30) {
  const { isAdmin } = useAdmin();

  return useQuery({
    queryKey: ['admin-daily-metrics', days],
    queryFn: () => fetchDailyMetrics(days),
    enabled: isAdmin,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Hook for engagement metrics
export function useEngagementMetrics() {
  const { isAdmin } = useAdmin();

  return useQuery({
    queryKey: ['admin-engagement-metrics'],
    queryFn: fetchEngagementMetrics,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Hook for college activity
export function useCollegeActivity() {
  const { isAdmin } = useAdmin();

  return useQuery({
    queryKey: ['admin-college-activity'],
    queryFn: fetchCollegeActivity,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

// Combined hook for all analytics data
export function useAdminAnalytics() {
  const overview = useAnalyticsOverview();
  const dailyMetrics = useDailyMetrics(30);
  const engagement = useEngagementMetrics();
  const collegeActivity = useCollegeActivity();
  const queryClient = useQueryClient();
  const { isAdmin } = useAdmin();

  // Realtime subscription for key tables
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin_analytics_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-analytics-overview'] });
          queryClient.invalidateQueries({ queryKey: ['admin-daily-metrics'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-engagement-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['admin-daily-metrics'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'connections' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-engagement-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['admin-daily-metrics'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-engagement-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['admin-daily-metrics'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_user_growth' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-daily-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['admin-analytics-overview'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_engagement_metrics' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-engagement-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['admin-daily-metrics'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_dashboard_kpis' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-analytics-overview'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  return {
    overview: overview.data,
    overviewLoading: overview.isLoading,
    dailyMetrics: dailyMetrics.data || [],
    dailyMetricsLoading: dailyMetrics.isLoading,
    engagement: engagement.data || [],
    engagementLoading: engagement.isLoading,
    collegeActivity: collegeActivity.data || [],
    collegeActivityLoading: collegeActivity.isLoading,
    isLoading: overview.isLoading || dailyMetrics.isLoading,
    refetchAll: () => {
      overview.refetch();
      dailyMetrics.refetch();
      engagement.refetch();
      collegeActivity.refetch();
    },
  };
}

export function useAdminAnalyticsSnapshot(timeRange: number) {
  const { isAdmin } = useAdmin();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const query = useQuery({
    queryKey: ['admin-analytics', timeRange],
    queryFn: () => fetchAnalyticsSnapshot(timeRange),
    enabled: isAdmin,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false, // Prevent excessive refetches
  });

  useEffect(() => {
    if (!isAdmin) return;

    // Cleanup any existing channel before creating new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Debounce invalidations to prevent excessive refetches
    let invalidationTimeout: ReturnType<typeof setTimeout> | null = null;
    const debouncedInvalidate = () => {
      if (invalidationTimeout) clearTimeout(invalidationTimeout);
      invalidationTimeout = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      }, 500);
    };

    const channel = supabase
      .channel('admin_analytics_snapshot_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_user_growth' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_engagement_metrics' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_dashboard_kpis' }, debouncedInvalidate)
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (invalidationTimeout) clearTimeout(invalidationTimeout);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isAdmin, queryClient]);

  return query;
}
