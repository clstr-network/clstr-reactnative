import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search,
  Filter,
  Briefcase,
  Building2,
  MessageSquare,
  TrendingUp,
  ChevronRight,
  Users,
  CreditCard,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  Settings,
  RefreshCw,
  Loader2,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdminRecruiters, type RecruiterAccount, type RecruiterPlan } from '@/hooks/useAdminRecruiters';

// Plan badge component
function PlanBadge({ plan }: { plan: RecruiterPlan }) {
  const config: Record<RecruiterPlan, { color: string; label: string }> = {
    free: { color: 'bg-admin-bg-muted text-admin-ink-secondary border-admin-border-strong', label: 'Free' },
    basic: { color: 'bg-blue-500/10 text-admin-info border-blue-500/30', label: 'Basic' },
    pro: { color: 'bg-admin-primary-light text-admin-primary border-admin-primary-muted', label: 'Pro' },
    enterprise: { color: 'bg-amber-100 text-amber-600 border-amber-300', label: 'Enterprise' },
  };
  
  const { color, label } = config[plan] || config.free;
  
  return (
    <Badge variant="outline" className={cn(color)}>
      {label}
    </Badge>
  );
}

// Status badge component
function RecruiterStatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: typeof CheckCircle2; color: string }> = {
    active: { icon: CheckCircle2, color: 'bg-admin-success-light text-admin-success border-emerald-300' },
    suspended: { icon: Ban, color: 'bg-admin-error-light text-admin-error border-red-300' },
    pending: { icon: AlertTriangle, color: 'bg-admin-warning-light text-admin-warning border-yellow-300' },
  };
  
  const { icon: Icon, color } = config[status] || config.pending;
  
  return (
    <Badge variant="outline" className={cn("capitalize", color)}>
      <Icon className="w-3 h-3 mr-1" />
      {status}
    </Badge>
  );
}

// Recruiter detail sheet
function RecruiterDetailSheet({ 
  recruiter, 
  open, 
  onOpenChange,
  onSuspend,
  onActivate,
  onUpdatePlan,
  isUpdating,
}: { 
  recruiter: RecruiterAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuspend: (id: string) => void;
  onActivate: (id: string) => void;
  onUpdatePlan: (id: string, plan: RecruiterPlan) => void;
  isUpdating: boolean;
}) {
  if (!recruiter) return null;

  const subscriptionProgress = recruiter.subscription_end 
    ? Math.max(0, Math.min(100, 
        ((new Date().getTime() - new Date(recruiter.created_at).getTime()) / 
        (new Date(recruiter.subscription_end).getTime() - new Date(recruiter.created_at).getTime())) * 100
      ))
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-admin-bg-elevated border-admin-border w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-admin-ink">Recruiter Details</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
          <div className="space-y-6 pr-4">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-admin-bg-muted flex items-center justify-center">
                <Building2 className="w-6 h-6 text-admin-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-admin-ink">{recruiter.company_name}</h3>
                <p className="text-sm text-admin-ink-muted">{recruiter.contact_email || 'No email'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <RecruiterStatusBadge status={recruiter.status} />
                  <PlanBadge plan={recruiter.plan_type} />
                </div>
              </div>
            </div>

            <Separator className="bg-admin-bg-muted" />

            {/* Usage Stats */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-admin-ink">Usage Statistics</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-admin-bg-subtle">
                  <div className="flex items-center gap-2 text-admin-ink-muted mb-1">
                    <Search className="w-4 h-4" />
                    <span className="text-xs">Active Searches</span>
                  </div>
                  <p className="text-lg font-semibold text-admin-ink">{recruiter.active_searches}</p>
                </div>
                <div className="p-3 rounded-lg bg-admin-bg-subtle">
                  <div className="flex items-center gap-2 text-admin-ink-muted mb-1">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-xs">Messages Sent</span>
                  </div>
                  <p className="text-lg font-semibold text-admin-ink">{recruiter.messages_sent}</p>
                </div>
                <div className="p-3 rounded-lg bg-admin-bg-subtle">
                  <div className="flex items-center gap-2 text-admin-ink-muted mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs">Conversion Rate</span>
                  </div>
                  <p className="text-lg font-semibold text-admin-ink">{recruiter.conversion_rate.toFixed(1)}%</p>
                </div>
                <div className="p-3 rounded-lg bg-admin-bg-subtle">
                  <div className="flex items-center gap-2 text-admin-ink-muted mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">Joined</span>
                  </div>
                  <p className="text-lg font-semibold text-admin-ink">
                    {new Date(recruiter.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <Separator className="bg-admin-bg-muted" />

            {/* Subscription */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-admin-ink">Subscription</h4>
              <div className="p-4 rounded-lg bg-admin-bg-subtle">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-admin-ink-muted">Current Plan</span>
                  <PlanBadge plan={recruiter.plan_type} />
                </div>
                {recruiter.subscription_end && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-admin-ink-muted">Subscription Period</span>
                      <span className="text-xs text-admin-ink-secondary">
                        {subscriptionProgress.toFixed(0)}% elapsed
                      </span>
                    </div>
                    <Progress value={subscriptionProgress} className="h-2 bg-gray-200" />
                    <div className="flex items-center justify-between mt-2 text-xs text-admin-ink-muted">
                      <span>{new Date(recruiter.created_at).toLocaleDateString()}</span>
                      <span>{new Date(recruiter.subscription_end).toLocaleDateString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Separator className="bg-admin-bg-muted" />

            {/* Actions */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-admin-ink">Actions</h4>
              <div className="space-y-2">
                {recruiter.status === 'active' ? (
                  <Button 
                    variant="outline" 
                    className="w-full border-red-300 text-admin-error hover:bg-admin-error-light"
                    onClick={() => onSuspend(recruiter.id)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Ban className="w-4 h-4 mr-2" />
                    )}
                    Suspend Account
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => onActivate(recruiter.id)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Activate Account
                  </Button>
                )}
                
                <Select 
                  value={recruiter.plan_type} 
                  onValueChange={(value) => onUpdatePlan(recruiter.id, value as RecruiterPlan)}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="w-full bg-admin-bg-muted border-admin-border-strong text-admin-ink">
                    <CreditCard className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Change Plan" />
                  </SelectTrigger>
                  <SelectContent className="bg-admin-bg-muted border-admin-border-strong">
                    <SelectItem value="free" className="text-admin-ink">Free Plan</SelectItem>
                    <SelectItem value="basic" className="text-admin-ink">Basic Plan</SelectItem>
                    <SelectItem value="pro" className="text-admin-ink">Pro Plan</SelectItem>
                    <SelectItem value="enterprise" className="text-admin-ink">Enterprise Plan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// Loading skeleton
function RecruitersListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-100">
          <Skeleton className="w-10 h-10 rounded-lg bg-admin-bg-muted" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40 bg-admin-bg-muted" />
            <Skeleton className="h-3 w-24 bg-admin-bg-muted" />
          </div>
          <Skeleton className="h-6 w-16 bg-admin-bg-muted" />
          <Skeleton className="h-6 w-20 bg-admin-bg-muted" />
        </div>
      ))}
    </div>
  );
}

export default function AdminRecruiters() {
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecruiter, setSelectedRecruiter] = useState<RecruiterAccount | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const {
    recruiters,
    isLoading,
    error,
    refetch,
    suspendRecruiter,
    activateRecruiter,
    updateRecruiterPlan,
    isUpdating,
  } = useAdminRecruiters();

  // Filter recruiters
  const filteredRecruiters = useMemo(() => {
    return recruiters.filter((recruiter) => {
      const matchesSearch = 
        recruiter.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (recruiter.contact_email?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      const matchesPlan = planFilter === 'all' || recruiter.plan_type === planFilter;
      const matchesStatus = statusFilter === 'all' || recruiter.status === statusFilter;
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [recruiters, searchQuery, planFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const totalRevenue = recruiters.reduce((sum, r) => sum + (r.subscription_price || 0), 0);
    return {
      total: recruiters.length,
      enterprise: recruiters.filter(r => r.plan_type === 'enterprise').length,
      pro: recruiters.filter(r => r.plan_type === 'pro').length,
      basic: recruiters.filter(r => r.plan_type === 'basic').length,
      free: recruiters.filter(r => r.plan_type === 'free').length,
      active: recruiters.filter(r => r.status === 'active').length,
      totalRevenue,
    };
  }, [recruiters]);

  const handleRecruiterClick = (recruiter: RecruiterAccount) => {
    setSelectedRecruiter(recruiter);
    setDetailOpen(true);
  };

  const handleSuspend = (id: string) => {
    suspendRecruiter(id);
  };

  const handleActivate = (id: string) => {
    activateRecruiter(id);
  };

  const handleUpdatePlan = (id: string, plan: RecruiterPlan) => {
    updateRecruiterPlan({ recruiterId: id, plan });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Total Recruiters</p>
                  <p className="text-2xl font-bold text-admin-ink">{stats.total}</p>
                </div>
                <Building2 className="w-8 h-8 text-admin-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Active Accounts</p>
                  <p className="text-2xl font-bold text-admin-success">{stats.active}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-admin-success" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Enterprise</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.enterprise}</p>
                </div>
                <Briefcase className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Total Revenue</p>
                  <p className="text-2xl font-bold text-admin-ink">₹{(stats.totalRevenue / 1000).toFixed(0)}K</p>
                </div>
                <TrendingUp className="w-8 h-8 text-admin-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-admin-bg-elevated border-admin-border">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-ink-muted" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search recruiters..."
                  className="pl-10 bg-admin-bg-muted border-admin-border-strong text-admin-ink"
                />
              </div>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-36 bg-admin-bg-muted border-admin-border-strong text-admin-ink">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent className="bg-admin-bg-muted border-admin-border-strong">
                  <SelectItem value="all" className="text-admin-ink">All Plans</SelectItem>
                  <SelectItem value="enterprise" className="text-admin-ink">Enterprise</SelectItem>
                  <SelectItem value="pro" className="text-admin-ink">Pro</SelectItem>
                  <SelectItem value="basic" className="text-admin-ink">Basic</SelectItem>
                  <SelectItem value="free" className="text-admin-ink">Free</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 bg-admin-bg-muted border-admin-border-strong text-admin-ink">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-admin-bg-muted border-admin-border-strong">
                  <SelectItem value="all" className="text-admin-ink">All Status</SelectItem>
                  <SelectItem value="active" className="text-admin-ink">Active</SelectItem>
                  <SelectItem value="suspended" className="text-admin-ink">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                className="border-admin-border-strong text-admin-ink-muted hover:text-admin-ink"
                disabled={isLoading}
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error state */}
        {error && (
          <Card className="bg-red-900/20 border-red-800">
            <CardContent className="p-4 flex items-center gap-2 text-admin-error">
              <AlertTriangle className="w-4 h-4" />
              <span>Failed to load recruiters. Please try again.</span>
              <Button variant="link" onClick={() => refetch()} className="text-admin-error">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recruiters Table */}
        <Card className="bg-admin-bg-elevated border-admin-border">
          <ScrollArea className="h-[calc(100vh-22rem)]">
            {isLoading ? (
              <RecruitersListSkeleton />
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-admin-bg-elevated border-b border-admin-border">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-admin-ink-muted">Company</th>
                    <th className="text-left p-4 text-sm font-medium text-admin-ink-muted hidden md:table-cell">Plan</th>
                    <th className="text-left p-4 text-sm font-medium text-admin-ink-muted hidden lg:table-cell">Searches</th>
                    <th className="text-left p-4 text-sm font-medium text-admin-ink-muted hidden lg:table-cell">Messages</th>
                    <th className="text-left p-4 text-sm font-medium text-admin-ink-muted hidden xl:table-cell">Conversion</th>
                    <th className="text-left p-4 text-sm font-medium text-admin-ink-muted">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-admin-ink-muted w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecruiters.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-admin-ink-muted">
                        <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No recruiters found</p>
                        {searchQuery && (
                          <p className="text-sm mt-1">Try adjusting your search or filters</p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredRecruiters.map((recruiter) => (
                      <tr 
                        key={recruiter.id}
                        onClick={() => handleRecruiterClick(recruiter)}
                        className="border-b border-gray-100 cursor-pointer hover:bg-admin-bg-subtle transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-admin-bg-muted flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-admin-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-admin-ink">{recruiter.company_name}</p>
                              <p className="text-xs text-admin-ink-muted">{recruiter.contact_email || 'No email'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <PlanBadge plan={recruiter.plan_type} />
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          <span className="text-admin-ink">{recruiter.active_searches}</span>
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          <span className="text-admin-ink">{recruiter.messages_sent}</span>
                        </td>
                        <td className="p-4 hidden xl:table-cell">
                          <div className="flex items-center gap-1">
                            {recruiter.conversion_rate > 15 ? (
                              <ArrowUpRight className="w-4 h-4 text-admin-success" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4 text-admin-error" />
                            )}
                            <span className={cn(
                              "text-admin-ink",
                              recruiter.conversion_rate > 15 ? "text-admin-success" : "text-admin-error"
                            )}>
                              {recruiter.conversion_rate.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <RecruiterStatusBadge status={recruiter.status} />
                        </td>
                        <td className="p-4">
                          <ChevronRight className="w-5 h-5 text-admin-ink-muted" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </ScrollArea>
        </Card>

        {/* Recruiter Detail Sheet */}
        <RecruiterDetailSheet 
          recruiter={selectedRecruiter}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onSuspend={handleSuspend}
          onActivate={handleActivate}
          onUpdatePlan={handleUpdatePlan}
          isUpdating={isUpdating}
        />
      </div>
    </AdminLayout>
  );
}
