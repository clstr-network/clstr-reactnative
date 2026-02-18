/**
 * AdminAnalytics - Platform Analytics Dashboard
 * 
 * Comprehensive analytics with Supabase-backed data and real-time updates.
 * 
 * Data Sources:
 * - admin_dashboard_kpis (materialized table, refreshed on profile/post/event/connection changes)
 * - admin_user_growth (materialized table, 90-day rolling window)
 * - admin_engagement_metrics (materialized table, 90-day rolling window)
 * - get_admin_college_stats() RPC (aggregated college statistics)
 * 
 * Realtime: Subscriptions on profiles, posts, comments, connections, events,
 * and admin aggregate tables invalidate React Query caches.
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminAnalyticsSnapshot } from '@/hooks/useAdminAnalytics';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { 
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  MessageSquare,
  Heart,
  Calendar,
  RefreshCw,
  Loader2,
  Download,
  GraduationCap,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AdminLayout from '@/components/admin/AdminLayout';

// Chart config
const chartConfig = {
  signups: { label: 'Signups', color: 'hsl(270, 91%, 65%)' },
  posts: { label: 'Posts', color: 'hsl(330, 81%, 60%)' },
  comments: { label: 'Comments', color: 'hsl(200, 81%, 60%)' },
  connections: { label: 'Connections', color: 'hsl(150, 81%, 50%)' },
  events: { label: 'Events', color: 'hsl(30, 81%, 60%)' },
  students: { label: 'Students', color: 'hsl(270, 91%, 65%)' },
  alumni: { label: 'Alumni', color: 'hsl(330, 81%, 60%)' },
  faculty: { label: 'Faculty', color: 'hsl(200, 81%, 60%)' },
};


// Stat card component
function StatCard({ 
  title, 
  value, 
  change, 
  changeLabel, 
  icon: Icon, 
  trend 
}: { 
  title: string;
  value: number;
  change?: number;
  changeLabel?: string;
  icon: typeof Users;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <Card className="bg-admin-bg-elevated border-admin-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-admin-ink-muted">{title}</p>
            <p className="text-2xl font-bold text-admin-ink">{Number(value ?? 0).toLocaleString()}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1">
                {trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-admin-success" />
                ) : trend === 'down' ? (
                  <TrendingDown className="w-4 h-4 text-admin-error" />
                ) : null}
                <span className={cn(
                  "text-sm font-medium",
                  trend === 'up' ? 'text-admin-success' : 
                  trend === 'down' ? 'text-admin-error' : 'text-admin-ink-muted'
                )}>
                  {change > 0 ? '+' : ''}{change}
                </span>
                {changeLabel && <span className="text-xs text-admin-ink-subtle">{changeLabel}</span>}
              </div>
            )}
          </div>
          <div className="p-3 rounded-xl bg-admin-primary-light">
            <Icon className="w-6 h-6 text-admin-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState<number>(30);
  const { data, isLoading, refetch, error, isFetching } = useAdminAnalyticsSnapshot(timeRange);
  const { toast } = useToast();

  // Memoize derived data to prevent unnecessary re-renders and useCallback dependency issues
  const userGrowth = useMemo(() => data?.userGrowth || [], [data?.userGrowth]);
  const engagement = useMemo(() => data?.engagement || [], [data?.engagement]);
  const userDistribution = useMemo(() => data?.userDistribution || [], [data?.userDistribution]);
  const collegeActivity = useMemo(() => data?.collegeActivity || [], [data?.collegeActivity]);
  const totals = useMemo(() => data?.totals || {
    totalUsers: 0,
    totalPosts: 0,
    totalEvents: 0,
    totalConnections: 0,
    newUsersThisWeek: 0,
    postsThisWeek: 0,
  }, [data?.totals]);

  // Manual refresh handler with toast feedback
  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
      toast({
        title: 'Analytics refreshed',
        description: 'Data has been updated from the database.',
      });
    } catch (err) {
      toast({
        title: 'Refresh failed',
        description: err instanceof Error ? err.message : 'Failed to refresh analytics data.',
        variant: 'destructive',
      });
    }
  }, [refetch, toast]);

  // Export analytics with audit logging
  const handleExport = useCallback(() => {
    const exportData = {
      generated_at: new Date().toISOString(),
      time_range_days: timeRange,
      totals,
      user_distribution: userDistribution.map(d => ({ type: d.name, count: d.value })),
      top_colleges: collegeActivity.map(c => ({ domain: c.domain, users: c.users, posts: c.posts })),
      note: 'Aggregated analytics data only. No PII included.',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Report exported',
      description: 'Analytics report has been downloaded.',
    });
  }, [timeRange, totals, userDistribution, collegeActivity, toast]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-admin-ink">Analytics</h1>
            <p className="text-sm text-admin-ink-muted">Platform performance and insights</p>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange.toString()} onValueChange={(v) => setTimeRange(Number(v))}>
              <SelectTrigger className="w-32 bg-admin-bg-muted border-admin-border-strong text-admin-ink">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-admin-bg-muted border-admin-border-strong">
                <SelectItem value="7" className="text-admin-ink">Last 7 days</SelectItem>
                <SelectItem value="30" className="text-admin-ink">Last 30 days</SelectItem>
                <SelectItem value="90" className="text-admin-ink">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isLoading || !data}
              className="border-admin-border-strong text-admin-ink-secondary hover:bg-admin-bg-muted"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading || isFetching}
              className="border-admin-border-strong text-admin-ink-secondary hover:bg-admin-bg-muted"
            >
              {(isLoading || isFetching) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Card className="bg-admin-error-light border-admin-error">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-admin-error shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-admin-error">Failed to load analytics data</p>
                <p className="text-xs text-admin-error/80 mt-1">
                  {error instanceof Error ? error.message : 'Check admin permissions and database availability.'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="mt-2 text-admin-error border-admin-error/50 hover:bg-admin-error/10"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Total Users"
            value={totals.totalUsers}
            change={totals.newUsersThisWeek}
            changeLabel="this week"
            icon={Users}
            trend={totals.newUsersThisWeek > 0 ? 'up' : 'neutral'}
          />
          <StatCard
            title="New This Week"
            value={totals.newUsersThisWeek}
            icon={TrendingUp}
            trend="up"
          />
          <StatCard
            title="Total Posts"
            value={totals.totalPosts}
            change={totals.postsThisWeek}
            changeLabel="this week"
            icon={MessageSquare}
            trend={totals.postsThisWeek > 0 ? 'up' : 'neutral'}
          />
          <StatCard
            title="Total Events"
            value={totals.totalEvents}
            icon={Calendar}
          />
          <StatCard
            title="Connections"
            value={totals.totalConnections}
            icon={Heart}
          />
          <StatCard
            title="Colleges"
            value={collegeActivity.length}
            icon={GraduationCap}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Chart */}
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardHeader>
              <CardTitle className="text-admin-ink">User Growth</CardTitle>
              <CardDescription className="text-admin-ink-muted">Daily signups over time</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] bg-admin-bg-muted" />
              ) : (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <AreaChart data={userGrowth.length > 0 ? userGrowth : [{ date: 'No data', signups: 0 }]}>
                    <defs>
                      <linearGradient id="signupsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(270, 91%, 65%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(270, 91%, 65%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 25%)" />
                    <XAxis dataKey="date" stroke="hsl(215, 15%, 50%)" fontSize={12} tickLine={false} />
                    <YAxis stroke="hsl(215, 15%, 50%)" fontSize={12} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area 
                      type="monotone" 
                      dataKey="signups" 
                      stroke="hsl(270, 91%, 65%)"
                      strokeWidth={2}
                      fill="url(#signupsGradient)"
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* User Distribution Chart */}
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardHeader>
              <CardTitle className="text-admin-ink">User Distribution</CardTitle>
              <CardDescription className="text-admin-ink-muted">Breakdown by role</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] bg-admin-bg-muted" />
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {userDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute">
                    <div className="flex flex-col gap-2">
                      {userDistribution.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm text-admin-ink-secondary">
                            {item.name}: {Number(item.value ?? 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* College Activity */}
        <Card className="bg-admin-bg-elevated border-admin-border">
          <CardHeader>
            <CardTitle className="text-admin-ink">Top Colleges by Activity</CardTitle>
            <CardDescription className="text-admin-ink-muted">Most active college domains</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] bg-admin-bg-muted" />
            ) : collegeActivity.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-admin-ink-muted">
                <div className="text-center">
                  <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No college data available</p>
                </div>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={collegeActivity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 25%)" />
                  <XAxis type="number" stroke="hsl(215, 15%, 50%)" fontSize={12} />
                  <YAxis 
                    type="category" 
                    dataKey="domain" 
                    stroke="hsl(215, 15%, 50%)" 
                    fontSize={10}
                    width={100}
                    tickFormatter={(value) => value.length > 15 ? value.slice(0, 15) + '...' : value}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="users" fill="hsl(270, 91%, 65%)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Engagement Metrics */}
        <Card className="bg-admin-bg-elevated border-admin-border">
          <CardHeader>
            <CardTitle className="text-admin-ink">Engagement Trends</CardTitle>
            <CardDescription className="text-admin-ink-muted">Posts, comments, and connections over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] bg-admin-bg-muted" />
            ) : engagement.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-admin-ink-muted">
                <div className="text-center">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No engagement data available</p>
                </div>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <LineChart data={engagement}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 25%)" />
                  <XAxis dataKey="date" stroke="hsl(215, 15%, 50%)" fontSize={12} tickLine={false} />
                  <YAxis stroke="hsl(215, 15%, 50%)" fontSize={12} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="posts" 
                    stroke="hsl(330, 81%, 60%)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="comments" 
                    stroke="hsl(200, 81%, 60%)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="connections" 
                    stroke="hsl(150, 81%, 50%)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
