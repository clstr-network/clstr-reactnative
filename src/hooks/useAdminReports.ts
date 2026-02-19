import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/contexts/AdminContext';
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { CHANNELS } from '@clstr/shared/realtime/channels';

// Types for admin reports
export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  metrics: string[];
  geography?: string;
  timeRange: '7d' | '30d' | '90d' | '1y' | 'all';
  aggregation: 'daily' | 'weekly' | 'monthly';
}

export interface ReportData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
  summary: {
    total: number;
    average: number;
    change: number;
  };
}

export interface SkillTrend {
  skill: string;
  count: number;
  change: number;
  top_colleges: string[];
}

export interface LeadershipMetric {
  college_domain: string;
  college_name: string;
  club_leaders: number;
  project_leads: number;
  mentors: number;
  leadership_density: number;
}

export interface AlumniEngagement {
  month: string;
  mentorship_sessions: number;
  posts: number;
  connections: number;
  events_attended: number;
}

export interface AdminReportEntry {
  id: string;
  type: string;
  title: string;
  description: string;
  generated_at: string;
  status: 'completed' | 'generating' | 'failed';
  file_url?: string;
  metadata?: Record<string, any>;
}

// Predefined report types
export const REPORT_TYPES = [
  {
    id: 'skill-trends',
    name: 'Skill Trends by Region',
    description: 'Most in-demand skills across different colleges and regions',
    metrics: ['skills'],
  },
  {
    id: 'leadership-density',
    name: 'Club Leadership Density',
    description: 'Leadership distribution across colleges',
    metrics: ['clubs', 'projects', 'mentorship'],
  },
  {
    id: 'alumni-engagement',
    name: 'Alumni Engagement Over Time',
    description: 'How alumni interact with the platform',
    metrics: ['posts', 'mentorship', 'connections'],
  },
  {
    id: 'college-growth',
    name: 'College Growth Report',
    description: 'User growth by college over time',
    metrics: ['users', 'posts', 'events'],
  },
  {
    id: 'project-outcomes',
    name: 'Project Outcomes Analysis',
    description: 'Success rates and conversion of collab projects',
    metrics: ['projects', 'applications', 'hires'],
  },
];

// Fetch saved reports from database
async function fetchAdminReports(): Promise<AdminReportEntry[]> {
  const { data, error } = await supabase
    .from('admin_reports')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching reports:', error);
    return [];
  }

  return (data || []).map((report: any) => ({
    id: report.id,
    type: report.report_type,
    title: report.title,
    description: report.description || '',
    generated_at: report.generated_at,
    status: report.status,
    file_url: report.file_url || undefined,
    metadata: report.metadata || {},
  }));
}

// Fetch skill trends
async function fetchSkillTrends(): Promise<SkillTrend[]> {
  try {
    const { data, error } = await supabase
      .from('profile_skills')
      .select(`
        skill,
        user_id,
        profile:profiles!profile_skills_user_id_fkey(college_domain)
      `);

    if (error) {
      console.error('Error fetching skill trends:', error);
      return [];
    }

    // Aggregate skills
    const skillMap = new Map<string, { count: number; colleges: Set<string> }>();
    
    for (const item of data || []) {
      const existing = skillMap.get(item.skill) || { count: 0, colleges: new Set() };
      existing.count++;
      const profile = item.profile as { college_domain?: string } | { college_domain?: string }[] | undefined;
      const profileCollegeDomain = Array.isArray(profile)
        ? profile[0]?.college_domain
        : profile?.college_domain;
      if (profileCollegeDomain) {
        existing.colleges.add(profileCollegeDomain);
      }
      skillMap.set(item.skill, existing);
    }

    return Array.from(skillMap.entries())
      .map(([skill, stats]) => ({
        skill,
        count: stats.count,
        change: 0,
        top_colleges: Array.from(stats.colleges).slice(0, 3),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  } catch (error) {
    console.error('Error fetching skill trends:', error);
    return [];
  }
}

// Fetch leadership metrics
async function fetchLeadershipMetrics(): Promise<LeadershipMetric[]> {
  try {
    // Get club leaders
    const { data: clubData } = await supabase
      .from('club_members')
      .select(`
        user_id,
        role,
        user:profiles!club_members_user_id_fkey(college_domain)
      `)
      .in('role', ['leader', 'president', 'admin', 'executive']);

    // Get project owners
    const { data: projectData } = await supabase
      .from('collab_team_members')
      .select(`
        user_id,
        is_owner,
        user:profiles!collab_team_members_user_id_fkey(college_domain)
      `)
      .eq('is_owner', true);

    // Get mentors
    const { data: mentorData } = await supabase
      .from('alumni_profiles')
      .select(`
        user_id,
        willing_to_mentor,
        user:profiles!alumni_profiles_user_id_fkey(college_domain)
      `)
      .eq('willing_to_mentor', true);

    // Aggregate by college
    const collegeMap = new Map<string, {
      club_leaders: number;
      project_leads: number;
      mentors: number;
      total_users: number;
    }>();

    // Get total users per college for density calculation
    const { data: usersData } = await supabase
      .from('profiles')
      .select('college_domain')
      .neq('role', 'Club');

    for (const user of usersData || []) {
      if (!user.college_domain) continue;
      const existing = collegeMap.get(user.college_domain) || {
        club_leaders: 0,
        project_leads: 0,
        mentors: 0,
        total_users: 0,
      };
      existing.total_users++;
      collegeMap.set(user.college_domain, existing);
    }

    // Add club leaders
    for (const item of clubData || []) {
      const user = item.user as { college_domain?: string } | { college_domain?: string }[] | undefined;
      const userCollegeDomain = Array.isArray(user)
        ? user[0]?.college_domain
        : user?.college_domain;
      if (!userCollegeDomain) continue;
      const existing = collegeMap.get(userCollegeDomain);
      if (existing) {
        existing.club_leaders++;
      }
    }

    // Add project leads
    for (const item of projectData || []) {
      const user = item.user as { college_domain?: string } | { college_domain?: string }[] | undefined;
      const userCollegeDomain = Array.isArray(user)
        ? user[0]?.college_domain
        : user?.college_domain;
      if (!userCollegeDomain) continue;
      const existing = collegeMap.get(userCollegeDomain);
      if (existing) {
        existing.project_leads++;
      }
    }

    // Add mentors
    for (const item of mentorData || []) {
      const user = item.user as { college_domain?: string } | { college_domain?: string }[] | undefined;
      const userCollegeDomain = Array.isArray(user)
        ? user[0]?.college_domain
        : user?.college_domain;
      if (!userCollegeDomain) continue;
      const existing = collegeMap.get(userCollegeDomain);
      if (existing) {
        existing.mentors++;
      }
    }

    return Array.from(collegeMap.entries())
      .map(([domain, stats]) => ({
        college_domain: domain,
        college_name: formatCollegeName(domain),
        club_leaders: stats.club_leaders,
        project_leads: stats.project_leads,
        mentors: stats.mentors,
        leadership_density: stats.total_users > 0
          ? Math.round(((stats.club_leaders + stats.project_leads + stats.mentors) / stats.total_users) * 100)
          : 0,
      }))
      .sort((a, b) => b.leadership_density - a.leadership_density)
      .slice(0, 20);
  } catch (error) {
    console.error('Error fetching leadership metrics:', error);
    return [];
  }
}

// Fetch alumni engagement
async function fetchAlumniEngagement(): Promise<AlumniEngagement[]> {
  try {
    const engagement: AlumniEngagement[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthStr = month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      // Get alumni IDs
      const { data: alumniData } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'Alumni');

      const alumniIds = (alumniData || []).map((alumnus: { id: string }) => alumnus.id);
      
      if (alumniIds.length === 0) {
        engagement.push({
          month: monthStr,
          mentorship_sessions: 0,
          posts: 0,
          connections: 0,
          events_attended: 0,
        });
        continue;
      }

      // Get mentorship sessions
      const { count: mentorshipCount } = await supabase
        .from('mentorship_requests')
        .select('*', { count: 'exact', head: true })
        .in('mentor_id', alumniIds)
        .eq('status', 'accepted')
        .gte('updated_at', month.toISOString())
        .lt('updated_at', nextMonth.toISOString());

      // Get posts by alumni
      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .in('user_id', alumniIds)
        .gte('created_at', month.toISOString())
        .lt('created_at', nextMonth.toISOString());

      // Get connections initiated by alumni
      const { count: connectionsCount } = await supabase
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .in('requester_id', alumniIds)
        .eq('status', 'accepted')
        .gte('created_at', month.toISOString())
        .lt('created_at', nextMonth.toISOString());

      engagement.push({
        month: monthStr,
        mentorship_sessions: mentorshipCount || 0,
        posts: postsCount || 0,
        connections: connectionsCount || 0,
        events_attended: 0,
      });
    }

    return engagement;
  } catch (error) {
    console.error('Error fetching alumni engagement:', error);
    return [];
  }
}

// Helper function
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

// Hook for skill trends
export function useSkillTrends() {
  const { isAdmin } = useAdmin();

  return useQuery({
    queryKey: QUERY_KEYS.admin.skillTrends(),
    queryFn: fetchSkillTrends,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Hook for leadership metrics
export function useLeadershipMetrics() {
  const { isAdmin } = useAdmin();

  return useQuery({
    queryKey: QUERY_KEYS.admin.leadershipMetrics(),
    queryFn: fetchLeadershipMetrics,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Hook for alumni engagement
export function useAlumniEngagement() {
  const { isAdmin } = useAdmin();

  return useQuery({
    queryKey: QUERY_KEYS.admin.alumniEngagement(),
    queryFn: fetchAlumniEngagement,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Combined hook for all reports data
export function useAdminReports() {
  const { isAdmin } = useAdmin();
  const [selectedReport, setSelectedReport] = useState<string>('skill-trends');
  
  const skillTrends = useSkillTrends();
  const leadershipMetrics = useLeadershipMetrics();
  const alumniEngagement = useAlumniEngagement();
  const queryClient = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel(CHANNELS.admin.reports())
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profile_skills' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.skillTrends() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  return {
    reportTypes: REPORT_TYPES,
    selectedReport,
    setSelectedReport,
    skillTrends: skillTrends.data || [],
    skillTrendsLoading: skillTrends.isLoading,
    leadershipMetrics: leadershipMetrics.data || [],
    leadershipMetricsLoading: leadershipMetrics.isLoading,
    alumniEngagement: alumniEngagement.data || [],
    alumniEngagementLoading: alumniEngagement.isLoading,
    isLoading: skillTrends.isLoading || leadershipMetrics.isLoading || alumniEngagement.isLoading,
    refetchAll: () => {
      skillTrends.refetch();
      leadershipMetrics.refetch();
      alumniEngagement.refetch();
    },
  };
}

export function useAdminReportHistory() {
  const { isAdmin } = useAdmin();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.admin.reports(),
    queryFn: fetchAdminReports,
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel(CHANNELS.admin.reports())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_reports' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.reports() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  return {
    reports: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
