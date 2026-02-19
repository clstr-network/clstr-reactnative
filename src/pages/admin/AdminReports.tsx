/**
 * AdminReports - Platform Reports Management
 * 
 * Generate, view and export reports with Supabase-backed data.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { supabase } from '@/integrations/supabase/client';
import { useAdminReportHistory, type AdminReportEntry } from '@/hooks/useAdminReports';
import { assertValidUuid } from '@clstr/shared/utils/uuid';
import { 
  FileText,
  Download,
  Loader2,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileJson,
  FileSpreadsheet,
  GraduationCap,
  Briefcase,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';

// Types
type ReportType = 'user-summary' | 'college-summary' | 'engagement' | 'recruiter-summary' | 'growth-trends' | 'flagged-content';

type Report = Omit<AdminReportEntry, 'type'> & { type: ReportType };

interface ReportTemplate {
  type: ReportType;
  title: string;
  description: string;
  icon: typeof FileText;
  category: 'users' | 'colleges' | 'engagement' | 'business';
}

// Report templates
const reportTemplates: ReportTemplate[] = [
  {
    type: 'user-summary',
    title: 'User Summary Report',
    description: 'Overview of all platform users with registration dates, roles, and activity levels',
    icon: Users,
    category: 'users',
  },
  {
    type: 'college-summary',
    title: 'College Summary Report',
    description: 'Breakdown of registered colleges with user counts and verification status',
    icon: GraduationCap,
    category: 'colleges',
  },
  {
    type: 'engagement',
    title: 'Engagement Report',
    description: 'Platform engagement metrics including posts, comments, connections, and events',
    icon: TrendingUp,
    category: 'engagement',
  },
  {
    type: 'recruiter-summary',
    title: 'Recruiter Summary Report',
    description: 'Summary of recruiter accounts, their plans, and activity levels',
    icon: Briefcase,
    category: 'business',
  },
  {
    type: 'growth-trends',
    title: 'Growth Trends Report',
    description: 'User growth, retention, and churn metrics over time',
    icon: BarChart3,
    category: 'engagement',
  },
  {
    type: 'flagged-content',
    title: 'Flagged Content Report',
    description: 'List of flagged posts, comments, and users requiring moderation',
    icon: AlertTriangle,
    category: 'users',
  },
];


// Generate report data
async function generateReportData(type: ReportType, timeRange: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);

  switch (type) {
    case 'user-summary': {
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .neq('role', 'Club');

      const { data: roles } = await supabase
        .from('profiles')
        .select('role')
        .neq('role', 'Club');

      const byRole = (roles || []).reduce((acc, user) => {
        const role = user.role || 'Unknown';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen', startDate.toISOString());

      return {
        title: 'User Summary Report',
        generated_at: new Date().toISOString(),
        time_range_days: timeRange,
        total_users: totalUsers || 0,
        active_users: activeUsers || 0,
        summary: {
          by_role: byRole,
        },
      };
    }

    case 'college-summary': {
      const { data: colleges, error } = await supabase
        .from('colleges' as any)
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      return {
        title: 'College Summary Report',
        generated_at: new Date().toISOString(),
        total_colleges: colleges?.length || 0,
        colleges: (colleges || []).map(c => ({
          id: c.id,
          name: c.name,
          domain: c.canonical_domain,
          city: c.city,
          country: c.country,
          status: c.status,
          confidence_score: c.confidence_score,
        })),
        summary: {
          by_status: colleges?.reduce((acc, c) => {
            acc[c.status || 'unknown'] = (acc[c.status || 'unknown'] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
      };
    }

    case 'engagement': {
      const { data: metrics } = await supabase
        .from('admin_engagement_metrics')
        .select('metric_type, count')
        .gte('date', startDate.toISOString().split('T')[0]);

      const totals = (metrics || []).reduce((acc, row) => {
        acc[row.metric_type] = (acc[row.metric_type] || 0) + Number(row.count || 0);
        return acc;
      }, {} as Record<string, number>);

      return {
        title: 'Engagement Report',
        generated_at: new Date().toISOString(),
        time_range_days: timeRange,
        metrics: totals,
      };
    }

    case 'recruiter-summary': {
      const { data: recruiters } = await supabase
        .from('recruiter_accounts' as any)
        .select('plan_type, status');

      const byPlan = (recruiters || []).reduce((acc, r) => {
        acc[r.plan_type || 'free'] = (acc[r.plan_type || 'free'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const byStatus = (recruiters || []).reduce((acc, r) => {
        acc[r.status || 'unknown'] = (acc[r.status || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        title: 'Recruiter Summary Report',
        generated_at: new Date().toISOString(),
        total_recruiters: recruiters?.length || 0,
        summary: {
          by_plan: byPlan,
          by_status: byStatus,
        },
      };
    }

    case 'growth-trends': {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (timeRange - 1));

      const { data: growthData, error } = await supabase
        .from('admin_user_growth')
        .select('date, signups, student_signups, alumni_signups, faculty_signups')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) {
        throw error;
      }

      return {
        title: 'Growth Trends Report',
        generated_at: new Date().toISOString(),
        time_range_days: timeRange,
        daily_signups: growthData || [],
        total_new_users: (growthData || []).reduce((sum: number, d: any) => sum + (Number(d.signups) || 0), 0),
      };
    }

    case 'flagged-content': {
      const { data: flaggedColleges } = await supabase
        .from('colleges' as any)
        .select('id')
        .eq('status', 'flagged');

      const { data: blockedDomains } = await supabase
        .from('college_domain_aliases' as any)
        .select('domain')
        .eq('status', 'blocked');

      const { data: flaggedProjects } = await supabase
        .from('collab_projects')
        .select('id')
        .eq('flagged', true);

      return {
        title: 'Flagged Content Report',
        generated_at: new Date().toISOString(),
        summary: {
          total_flagged_colleges: flaggedColleges?.length || 0,
          total_blocked_domains: blockedDomains?.length || 0,
          total_flagged_projects: flaggedProjects?.length || 0,
        },
      };
    }

    default:
      throw new Error(`Unknown report type: ${type}`);
  }
}

// Status badge component
function StatusBadge({ status }: { status: Report['status'] }) {
  const variants = {
    completed: { icon: CheckCircle2, color: 'bg-admin-success-light text-admin-success' },
    generating: { icon: Clock, color: 'bg-amber-100 text-amber-500' },
    failed: { icon: AlertTriangle, color: 'bg-admin-error-light text-admin-error' },
  };

  const { icon: Icon, color } = variants[status];

  return (
    <Badge className={cn('gap-1', color)}>
      <Icon className="w-3 h-3" />
      {status}
    </Badge>
  );
}

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState('generate');
  const [selectedType, setSelectedType] = useState<ReportType>('user-summary');
  const [timeRange, setTimeRange] = useState(30);
  const [generating, setGenerating] = useState(false);
  
  const queryClient = useQueryClient();

  const { reports, isLoading } = useAdminReportHistory();

  // Create report entry
  const createReportMutation = useMutation({
    mutationFn: async ({
      type,
      title,
      description,
      metadata,
      generatedBy,
    }: {
      type: ReportType;
      title: string;
      description: string;
      metadata: Record<string, any>;
      generatedBy: string;
    }) => {
      const { data, error } = await supabase
        .from('admin_reports')
        .insert({
          report_type: type,
          title,
          description,
          status: 'generating',
          metadata,
          generated_by: generatedBy,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.reports() });
    },
  });

  // Update report entry
  const updateReportMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      metadata,
      reportData,
    }: {
      id: string;
      status: Report['status'];
      metadata: Record<string, any>;
      reportData?: Record<string, any>;
    }) => {
      assertValidUuid(id, 'reportId');
      const updates: Record<string, any> = {
        status,
        metadata,
      };

      if (reportData) {
        updates.report_data = reportData;
      }

      const { error } = await supabase
        .from('admin_reports')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.reports() });
    },
  });

  const reportRows = (reports as Report[]) || [];

  // Generate report
  const handleGenerateReport = async (format: 'json' | 'csv') => {
    setGenerating(true);
    let reportId: string | null = null;
    const selectedTemplate = reportTemplates.find(t => t.type === selectedType);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email?.toLowerCase();
      if (!email) throw new Error('Not authenticated');

      const created = await createReportMutation.mutateAsync({
        type: selectedType,
        title: selectedTemplate?.title || 'Report',
        description: `${selectedTemplate?.description || ''} (Last ${timeRange} days)`,
        metadata: {
          format,
          time_range_days: timeRange,
        },
        generatedBy: email,
      });
      reportId = created.id;

      const data = await generateReportData(selectedType, timeRange);

      await updateReportMutation.mutateAsync({
        id: reportId,
        status: 'completed',
        metadata: {
          format,
          time_range_days: timeRange,
        },
        reportData: data,
      });

      // Download file
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedType}-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Convert to CSV (basic implementation)
        const csvContent = convertToCSV(data);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedType}-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      if (reportId) {
        try {
          await updateReportMutation.mutateAsync({
            id: reportId,
            status: 'failed',
            metadata: {
              format,
              time_range_days: timeRange,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        } catch (updateError) {
          console.error('Error updating report status:', updateError);
        }
      }
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  // Convert data to CSV
  function convertToCSV(data: any): string {
    if (data.users) {
      const headers = ['ID', 'Name', 'Domain', 'Role', 'Registered At', 'Last Seen'];
      const rows = data.users.map((u: any) => [
        u.id,
        u.name,
        u.domain || '',
        u.role || '',
        u.registered_at || '',
        u.last_seen || '',
      ]);
      return [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    }
    if (data.total_users !== undefined && data.summary?.by_role) {
      const headers = ['Metric', 'Value'];
      const rows = [
        ['total_users', data.total_users ?? 0],
        ['active_users', data.active_users ?? 0],
        ...Object.entries(data.summary.by_role).map(([role, count]) => [`role_${role}`, count]),
      ];
      return [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    }
    if (data.colleges) {
      const headers = ['ID', 'Name', 'Domain', 'City', 'Country', 'Status', 'Confidence'];
      const rows = data.colleges.map((c: any) => [
        c.id,
        c.name,
        c.domain || '',
        c.city || '',
        c.country || '',
        c.status || '',
        c.confidence_score || '',
      ]);
      return [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    }
    if (data.recruiters) {
      const headers = ['ID', 'Company', 'Email', 'Plan', 'Status', 'Active Searches', 'Messages Sent'];
      const rows = data.recruiters.map((r: any) => [
        r.id,
        r.company_name || '',
        r.contact_email || '',
        r.plan_type || '',
        r.status || '',
        r.active_searches || 0,
        r.messages_sent || 0,
      ]);
      return [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    }
    if (data.summary?.by_plan || data.summary?.by_status) {
      const headers = ['Metric', 'Value'];
      const rows = [
        ['total_recruiters', data.total_recruiters ?? 0],
        ...Object.entries(data.summary.by_plan || {}).map(([plan, count]) => [`plan_${plan}`, count]),
        ...Object.entries(data.summary.by_status || {}).map(([status, count]) => [`status_${status}`, count]),
      ];
      return [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    }
    if (data.daily_signups) {
      const headers = ['Date', 'Signups'];
      const rows = data.daily_signups.map((d: any) => [d.date, d.signups || 0]);
      return [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    }
    if (data.metrics) {
      const headers = ['Metric', 'Value'];
      const rows = Object.entries(data.metrics).map(([k, v]) => [k, v]);
      return [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    }
    if (data.summary?.total_flagged_colleges !== undefined) {
      const headers = ['Metric', 'Value'];
      const rows = Object.entries(data.summary).map(([k, v]) => [k, v]);
      return [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    }
    return JSON.stringify(data);
  }

  const selectedTemplate = reportTemplates.find(t => t.type === selectedType);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-admin-ink">Reports</h1>
          <p className="text-sm text-admin-ink-muted">Generate and manage platform reports</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-admin-bg-muted border border-admin-border-strong">
            <TabsTrigger value="generate" className="data-[state=active]:bg-admin-primary text-admin-ink-secondary">
              Generate Report
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-admin-primary text-admin-ink-secondary">
              Report History
            </TabsTrigger>
          </TabsList>

          {/* Generate Tab */}
          <TabsContent value="generate" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Report Templates */}
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-lg font-semibold text-admin-ink">Select Report Type</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportTemplates.map((template) => {
                    const Icon = template.icon;
                    const isSelected = selectedType === template.type;
                    
                    return (
                      <Card
                        key={template.type}
                        className={cn(
                          'cursor-pointer transition-all duration-200',
                          isSelected
                            ? 'bg-admin-primary/20 border-admin-primary'
                            : 'bg-admin-bg-elevated border-admin-border hover:border-admin-border-strong'
                        )}
                        onClick={() => setSelectedType(template.type)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'p-2 rounded-lg',
                              isSelected ? 'bg-admin-primary/20' : 'bg-admin-bg-muted'
                            )}>
                              <Icon className={cn(
                                'w-5 h-5',
                                isSelected ? 'text-admin-primary' : 'text-admin-ink-muted'
                              )} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-admin-ink truncate">{template.title}</h3>
                              <p className="text-xs text-admin-ink-muted line-clamp-2 mt-1">
                                {template.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Report Options */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-admin-ink">Report Options</h2>
                <Card className="bg-admin-bg-elevated border-admin-border">
                  <CardContent className="p-4 space-y-4">
                    {selectedTemplate && (
                      <>
                        <div className="flex items-center gap-2">
                          <selectedTemplate.icon className="w-5 h-5 text-admin-primary" />
                          <span className="font-medium text-admin-ink">{selectedTemplate.title}</span>
                        </div>
                        <p className="text-sm text-admin-ink-muted">{selectedTemplate.description}</p>
                      </>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm text-admin-ink-muted">Time Range</label>
                      <Select value={timeRange.toString()} onValueChange={(v) => setTimeRange(Number(v))}>
                        <SelectTrigger className="bg-admin-bg-muted border-admin-border-strong text-admin-ink">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-admin-bg-muted border-admin-border-strong">
                          <SelectItem value="7" className="text-admin-ink">Last 7 days</SelectItem>
                          <SelectItem value="30" className="text-admin-ink">Last 30 days</SelectItem>
                          <SelectItem value="90" className="text-admin-ink">Last 90 days</SelectItem>
                          <SelectItem value="365" className="text-admin-ink">Last year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-admin-border">
                      <label className="text-sm text-admin-ink-muted">Export Format</label>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleGenerateReport('json')}
                          disabled={generating}
                          className="flex-1 bg-admin-primary hover:bg-admin-primary-hover text-admin-ink"
                        >
                          {generating ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <FileJson className="w-4 h-4 mr-2" />
                          )}
                          JSON
                        </Button>
                        <Button
                          onClick={() => handleGenerateReport('csv')}
                          disabled={generating}
                          variant="outline"
                          className="flex-1 border-admin-border-strong text-admin-ink-secondary hover:bg-admin-bg-muted"
                        >
                          {generating ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                          )}
                          CSV
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="bg-admin-bg-elevated border-admin-border">
              <CardHeader>
                <CardTitle className="text-admin-ink">Report History</CardTitle>
                <CardDescription className="text-admin-ink-muted">
                  Previously generated reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 bg-admin-bg-muted" />
                    ))}
                  </div>
                ) : reportRows.length === 0 ? (
                  <div className="py-12 text-center text-admin-ink-muted">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No reports generated yet</p>
                    <p className="text-sm mt-1">Generate a report to see it here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-admin-border">
                        <TableHead className="text-admin-ink-muted">Report</TableHead>
                        <TableHead className="text-admin-ink-muted">Generated</TableHead>
                        <TableHead className="text-admin-ink-muted">Status</TableHead>
                        <TableHead className="text-admin-ink-muted text-right">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportRows.map((report) => {
                        const template = reportTemplates.find(t => t.type === report.type);
                        const Icon = template?.icon || FileText;
                        
                        return (
                          <TableRow key={report.id} className="border-admin-border">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-admin-bg-muted">
                                  <Icon className="w-4 h-4 text-admin-ink-muted" />
                                </div>
                                <div>
                                  <div className="font-medium text-admin-ink">{report.title}</div>
                                  <div className="text-xs text-admin-ink-muted">{report.description}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-admin-ink-secondary">
                              {new Date(report.generated_at).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={report.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-sm text-admin-ink-muted">
                                {report.metadata?.format?.toUpperCase() || 'JSON'}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
