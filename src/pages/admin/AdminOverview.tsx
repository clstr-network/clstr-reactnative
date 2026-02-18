import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminDashboard, type SystemAlert } from '@/hooks/useAdminDashboard';
import { 
  Users, 
  GraduationCap, 
  Globe, 
  Briefcase, 
  Folder,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  ArrowRight,
  Activity,
  RefreshCcw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AdminLayout from '@/components/admin/AdminLayout';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area } from 'recharts';

const chartConfig = {
  signups: {
    label: 'Signups',
    color: 'hsl(270, 91%, 65%)',
  },
  activeUsers: {
    label: 'Active Users',
    color: 'hsl(330, 81%, 60%)',
  },
};

// KPI Card Component
function KPICard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  route 
}: { 
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: React.ElementType;
  route?: string;
}) {
  const navigate = useNavigate();
  
  return (
    <Card 
      className={cn(
        "bg-admin-bg-elevated border-admin-border hover:border-admin-border-strong transition-all cursor-pointer",
        "hover:shadow-lg hover:shadow-violet-500/5"
      )}
      onClick={() => route && navigate(route)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-admin-ink-muted">{title}</p>
            <p className="text-3xl font-bold text-admin-ink">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1">
                {changeType === 'increase' ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : changeType === 'decrease' ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : null}
                <span className={cn(
                  "text-sm font-medium",
                  changeType === 'increase' ? 'text-emerald-500' : 
                  changeType === 'decrease' ? 'text-red-500' : 'text-admin-ink-muted'
                )}>
                  {change > 0 ? '+' : ''}{change}%
                </span>
                <span className="text-xs text-admin-ink-muted">vs last week</span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-xl bg-violet-100">
            <Icon className="w-6 h-6 text-violet-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Alert Item Component
function AlertItem({ 
  alert 
}: { 
  alert: SystemAlert;
}) {
  const navigate = useNavigate();
  
  const iconMap = {
    warning: AlertTriangle,
    error: AlertCircle,
    success: CheckCircle2,
    info: Info,
  };
  
  const colorMap = {
    warning: 'text-yellow-600 bg-yellow-100',
    error: 'text-red-600 bg-red-100',
    success: 'text-emerald-600 bg-emerald-100',
    info: 'text-blue-600 bg-blue-100',
  };
  
  const Icon = iconMap[alert.alert_type];
  
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className={cn("p-2 rounded-lg", colorMap[alert.alert_type])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{alert.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{alert.message}</p>
      </div>
      {alert.action_label && alert.action_route && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-violet-600 hover:text-violet-700 hover:bg-violet-100"
          onClick={() => navigate(alert.action_route!)}
        >
          {alert.action_label}
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      )}
    </div>
  );
}

export default function AdminOverview() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const navigate = useNavigate();
  const growthDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const { kpis, kpisLoading, alerts, alertsLoading, growth, distribution, refetchAll, isLoading } = useAdminDashboard(growthDays);

  // Build KPI cards from real data
  const kpiCards = [
    { id: 'total-users', title: 'Total Users', value: Number(kpis.total_users ?? 0).toLocaleString(), change: kpis.user_change_pct, changeType: kpis.user_change_pct >= 0 ? 'increase' as const : 'decrease' as const, route: '/admin/users', icon: Users },
    { id: 'active-users', title: 'Active Users (7d)', value: Number(kpis.active_users_7d ?? 0).toLocaleString(), change: 0, changeType: 'neutral' as const, route: '/admin/users?filter=active', icon: Activity },
    { id: 'total-colleges', title: 'Total Colleges', value: Number(kpis.total_colleges ?? 0).toLocaleString(), change: kpis.college_change_pct, changeType: kpis.college_change_pct >= 0 ? 'increase' as const : 'decrease' as const, route: '/admin/colleges', icon: GraduationCap },
    { id: 'verified-colleges', title: 'Verified Colleges', value: Number(kpis.verified_colleges ?? 0).toLocaleString(), change: 0, changeType: 'neutral' as const, route: '/admin/colleges?filter=verified', icon: CheckCircle2 },
    { id: 'recruiters', title: 'Recruiter Accounts', value: Number(kpis.total_recruiters ?? 0).toLocaleString(), change: 0, changeType: 'neutral' as const, route: '/admin/recruiters', icon: Briefcase },
    { id: 'active-projects', title: 'Active Projects', value: Number(kpis.active_projects ?? 0).toLocaleString(), change: 0, changeType: 'neutral' as const, route: '/admin/collabhub', icon: Folder },
  ];

  // Transform growth data for chart
  const chartData = growth.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    signups: item.signups,
    activeUsers: item.active_users,
  }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with refresh button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-admin-ink">Dashboard Overview</h1>
            <p className="text-sm text-admin-ink-muted">Real-time platform metrics</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetchAll}
            disabled={isLoading}
            className="border-admin-border-strong text-admin-ink-secondary hover:bg-admin-bg-muted"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCcw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpisLoading ? (
            // Loading skeletons
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="bg-admin-bg-elevated border-admin-border">
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2 bg-admin-bg-subtle" />
                  <Skeleton className="h-8 w-24 mb-2 bg-admin-bg-subtle" />
                  <Skeleton className="h-4 w-16 bg-admin-bg-subtle" />
                </CardContent>
              </Card>
            ))
          ) : (
            kpiCards.map((kpi) => (
              <KPICard
                key={kpi.id}
                title={kpi.title}
                value={kpi.value}
                change={kpi.change}
                changeType={kpi.changeType}
                icon={kpi.icon}
                route={kpi.route}
              />
            ))
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Growth Chart */}
          <Card className="lg:col-span-2 bg-admin-bg-elevated border-admin-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-admin-ink">Growth Overview</CardTitle>
                  <CardDescription className="text-admin-ink-muted">
                    Daily signups and active users
                  </CardDescription>
                </div>
                <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
                  <SelectTrigger className="w-24 bg-admin-bg-elevated border-admin-border-strong text-admin-ink">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-admin-bg-elevated border-admin-border">
                    <SelectItem value="7d" className="text-admin-ink">7 days</SelectItem>
                    <SelectItem value="30d" className="text-admin-ink">30 days</SelectItem>
                    <SelectItem value="90d" className="text-admin-ink">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <AreaChart data={chartData.length > 0 ? chartData : [{ date: 'No data', signups: 0, activeUsers: 0 }]}>
                  <defs>
                    <linearGradient id="signupsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(270, 91%, 65%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(270, 91%, 65%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(330, 81%, 60%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(330, 81%, 60%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 85%)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(215, 15%, 50%)"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="hsl(215, 15%, 50%)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="signups" 
                    stroke="hsl(270, 91%, 65%)"
                    strokeWidth={2}
                    fill="url(#signupsGradient)"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="activeUsers" 
                    stroke="hsl(330, 81%, 60%)"
                    strokeWidth={2}
                    fill="url(#activeGradient)"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Alerts Panel */}
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-admin-ink">System Alerts</CardTitle>
                <Badge variant="outline" className="bg-violet-100 text-violet-700 border-violet-200">
                  {alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[280px] pr-4">
                <div className="space-y-3">
                  {alertsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-admin-bg-muted">
                        <Skeleton className="w-8 h-8 rounded-lg bg-admin-bg-subtle" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-1 bg-admin-bg-subtle" />
                          <Skeleton className="h-3 w-48 bg-admin-bg-subtle" />
                        </div>
                      </div>
                    ))
                  ) : alerts.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-50" />
                      <p className="text-admin-ink-muted">No active alerts</p>
                      <p className="text-xs text-admin-ink-muted mt-1">All systems are running smoothly</p>
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <AlertItem key={alert.id} alert={alert} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* College Distribution */}
        <Card className="bg-admin-bg-elevated border-admin-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-admin-ink">College Distribution by Region</CardTitle>
                <CardDescription className="text-admin-ink-muted">
                  User count and college presence across India
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="border-admin-border-strong text-admin-ink-secondary hover:bg-admin-bg-muted"
                onClick={() => navigate('/admin/colleges')}
              >
                View All Colleges
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {distribution.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <Globe className="w-12 h-12 text-admin-ink-muted mx-auto mb-3" />
                  <p className="text-admin-ink-muted">No college data available</p>
                </div>
              ) : (
                distribution.map((region) => (
                  <div 
                    key={region.region}
                    className="p-4 rounded-lg bg-admin-bg-muted hover:bg-admin-bg-subtle transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/colleges?region=${region.region}`)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-violet-600" />
                      <span className="text-sm font-medium text-admin-ink truncate">{region.region}</span>
                    </div>
                    <p className="text-2xl font-bold text-admin-ink">{Number(region.user_count ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-admin-ink-muted">{region.college_count} colleges</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            className="bg-gradient-to-br from-violet-100 to-violet-50 border-violet-200 hover:border-violet-300 transition-all cursor-pointer"
            onClick={() => navigate('/admin/domains?filter=unknown')}
          >
            <CardContent className="p-6">
              <Globe className="w-8 h-8 text-violet-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Review Domains</h3>
              <p className="text-sm text-gray-600">12 unknown domains need attention</p>
            </CardContent>
          </Card>
          
          <Card 
            className="bg-gradient-to-br from-fuchsia-100 to-fuchsia-50 border-fuchsia-200 hover:border-fuchsia-300 transition-all cursor-pointer"
            onClick={() => navigate('/admin/colleges?filter=unverified')}
          >
            <CardContent className="p-6">
              <GraduationCap className="w-8 h-8 text-fuchsia-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Verify Colleges</h3>
              <p className="text-sm text-gray-600">128 colleges awaiting verification</p>
            </CardContent>
          </Card>
          
          <Card 
            className="bg-gradient-to-br from-emerald-100 to-emerald-50 border-emerald-200 hover:border-emerald-300 transition-all cursor-pointer"
            onClick={() => navigate('/admin/talent-graph')}
          >
            <CardContent className="p-6">
              <Users className="w-8 h-8 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Talent Graph</h3>
              <p className="text-sm text-gray-600">Explore network connections</p>
            </CardContent>
          </Card>
          
          <Card 
            className="bg-gradient-to-br from-amber-100 to-amber-50 border-amber-200 hover:border-amber-300 transition-all cursor-pointer"
            onClick={() => navigate('/admin/reports')}
          >
            <CardContent className="p-6">
              <Briefcase className="w-8 h-8 text-amber-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Generate Report</h3>
              <p className="text-sm text-gray-600">Create insights for stakeholders</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
