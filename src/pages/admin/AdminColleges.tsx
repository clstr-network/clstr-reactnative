/**
 * AdminColleges - College Management Page
 * 
 * Central control of college entities with real-time Supabase data.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminColleges, type AdminCollege, type CollegeStatus } from '@/hooks/useAdminColleges';
import { 
  Search,
  Filter,
  GraduationCap,
  Users,
  Building2,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Flag,
  ChevronRight,
  RefreshCw,
  Loader2,
  MapPin,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AdminLayout from '@/components/admin/AdminLayout';

// Types
type College = AdminCollege;

// Status badge component
function CollegeStatusBadge({ status }: { status: CollegeStatus }) {
  const config = {
    verified: { icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', label: 'Verified' },
    unverified: { icon: AlertTriangle, color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', label: 'Unverified' },
    flagged: { icon: Flag, color: 'bg-red-500/10 text-red-400 border-red-500/30', label: 'Flagged' },
  };
  
  const { icon: Icon, color, label } = config[status] || config.unverified;
  
  return (
    <Badge variant="outline" className={cn(color)}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}


// College detail sheet
function CollegeDetailSheet({ 
  college, 
  open, 
  onOpenChange,
  onVerify,
  onFlag,
  isUpdating,
}: { 
  college: College | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: (id: string) => void;
  onFlag: (id: string) => void;
  isUpdating: boolean;
}) {
  if (!college) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-admin-bg-elevated border-admin-border w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-admin-ink">College Details</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
          <div className="space-y-6 pr-4">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-admin-bg-muted flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-admin-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-admin-ink">{college.name}</h3>
                <p className="text-sm text-admin-ink-muted">{college.canonical_domain}</p>
                <div className="flex items-center gap-2 mt-2">
                  <CollegeStatusBadge status={college.status} />
                  {college.confidence_score > 0 && (
                    <Badge variant="outline" className="text-admin-primary border-admin-primary-muted">
                      {college.confidence_score}% confidence
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator className="bg-gray-200" />

            {/* Location */}
            {(college.city || college.country) && (
              <>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-admin-ink">Location</h4>
                  <div className="flex items-center gap-2 text-admin-ink-secondary">
                    <MapPin className="w-4 h-4 text-admin-ink-muted" />
                    <span>{[college.city, college.country].filter(Boolean).join(', ')}</span>
                  </div>
                </div>
                <Separator className="bg-gray-200" />
              </>
            )}

            {/* User Stats */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-admin-ink">Users</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-admin-bg-subtle">
                  <p className="text-xs text-admin-ink-muted">Total Users</p>
                  <p className="text-lg font-semibold text-admin-ink">{college.users_count}</p>
                </div>
                <div className="p-3 rounded-lg bg-admin-bg-subtle">
                  <p className="text-xs text-admin-ink-muted">Active (7d)</p>
                  <p className="text-lg font-semibold text-admin-success">{college.active_users_7d}</p>
                </div>
                <div className="p-3 rounded-lg bg-admin-bg-subtle">
                  <p className="text-xs text-admin-ink-muted">Students</p>
                  <p className="text-lg font-semibold text-admin-ink">{college.student_count}</p>
                </div>
                <div className="p-3 rounded-lg bg-admin-bg-subtle">
                  <p className="text-xs text-admin-ink-muted">Alumni</p>
                  <p className="text-lg font-semibold text-admin-ink">{college.alumni_count}</p>
                </div>
                <div className="p-3 rounded-lg bg-admin-bg-subtle">
                  <p className="text-xs text-admin-ink-muted">Faculty</p>
                  <p className="text-lg font-semibold text-admin-ink">{college.faculty_count}</p>
                </div>
                <div className="p-3 rounded-lg bg-admin-bg-subtle">
                  <p className="text-xs text-admin-ink-muted">Domains</p>
                  <p className="text-lg font-semibold text-admin-ink">{college.domains_count}</p>
                </div>
            </div>
            </div>

            <Separator className="bg-gray-200" />

            {/* Engagement */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-admin-ink">Engagement</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-admin-bg-subtle">
                  <p className="text-xs text-admin-ink-muted">Posts</p>
                  <p className="text-lg font-semibold text-admin-ink">{college.posts_count}</p>
                </div>
                <div className="p-3 rounded-lg bg-admin-bg-subtle">
                  <p className="text-xs text-admin-ink-muted">Events</p>
                  <p className="text-lg font-semibold text-admin-ink">{college.events_count}</p>
                </div>
              </div>
            </div>

            <Separator className="bg-gray-200" />

            {/* Timeline */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-admin-ink">Timeline</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-admin-ink-muted">First User</span>
                  <span className="text-admin-ink">
                    {college.first_user_at ? new Date(college.first_user_at).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-admin-ink-muted">Latest User</span>
                  <span className="text-admin-ink">
                    {college.latest_user_at ? new Date(college.latest_user_at).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            <Separator className="bg-gray-200" />

            {/* Actions */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-admin-ink">Actions</h4>
              <div className="space-y-2">
                {college.status !== 'verified' && (
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => onVerify(college.id)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Verify College
                  </Button>
                )}
                {college.status !== 'flagged' && (
                  <Button 
                    variant="outline" 
                    className="w-full border-red-300 text-admin-error hover:bg-red-50"
                    onClick={() => onFlag(college.id)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Flag className="w-4 h-4 mr-2" />
                    )}
                    Flag College
                  </Button>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// Loading skeleton
function CollegesListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-100">
          <Skeleton className="w-10 h-10 rounded-lg bg-gray-200" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40 bg-gray-200" />
            <Skeleton className="h-3 w-24 bg-gray-200" />
          </div>
          <Skeleton className="h-6 w-16 bg-gray-200" />
          <Skeleton className="h-6 w-20 bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

export default function AdminColleges() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  const {
    colleges,
    isLoading,
    error,
    refetch,
    verifyCollege,
    flagCollege,
    isUpdating,
  } = useAdminColleges();

  // Filter colleges
  const filteredColleges = useMemo(() => {
    return colleges.filter((college) => {
      const matchesSearch = 
        college.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        college.canonical_domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (college.city?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || college.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [colleges, searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: colleges.length,
    verified: colleges.filter(c => c.status === 'verified').length,
    unverified: colleges.filter(c => c.status === 'unverified').length,
    flagged: colleges.filter(c => c.status === 'flagged').length,
    totalUsers: colleges.reduce((sum, c) => sum + c.users_count, 0),
  }), [colleges]);

  const handleCollegeClick = (college: College) => {
    setSelectedCollege(college);
    setDetailOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Total Colleges</p>
                  <p className="text-2xl font-bold text-admin-ink">{stats.total}</p>
                </div>
                <GraduationCap className="w-8 h-8 text-admin-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Verified</p>
                  <p className="text-2xl font-bold text-admin-success">{stats.verified}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-admin-success" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Unverified</p>
                  <p className="text-2xl font-bold text-admin-warning">{stats.unverified}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-admin-warning" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Flagged</p>
                  <p className="text-2xl font-bold text-admin-error">{stats.flagged}</p>
                </div>
                <Flag className="w-8 h-8 text-admin-error" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Total Users</p>
                  <p className="text-2xl font-bold text-admin-ink">{stats.totalUsers}</p>
                </div>
                <Users className="w-8 h-8 text-admin-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-admin-bg-elevated border-admin-border">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-ink-subtle" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search colleges..."
                  className="pl-10 bg-admin-bg-elevated border-admin-border-strong text-admin-ink"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 bg-admin-bg-elevated border-admin-border-strong text-admin-ink">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-admin-bg-elevated border-admin-border">
                  <SelectItem value="all" className="text-admin-ink">All Status</SelectItem>
                  <SelectItem value="verified" className="text-admin-ink">Verified</SelectItem>
                  <SelectItem value="unverified" className="text-admin-ink">Unverified</SelectItem>
                  <SelectItem value="flagged" className="text-admin-ink">Flagged</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
                className="border-admin-border-strong text-admin-ink-secondary hover:bg-admin-bg-muted"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Colleges List */}
        <Card className="bg-admin-bg-elevated border-admin-border">
          <CardContent className="p-0">
            {isLoading ? (
              <CollegesListSkeleton />
            ) : error ? (
              <div className="p-8 text-center text-admin-error">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                <p className="font-medium">Error loading colleges</p>
                <p className="text-sm text-admin-ink-muted mt-2 max-w-md mx-auto">
                  {error instanceof Error ? error.message : 'An unexpected error occurred'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="mt-4 border-admin-border-strong text-admin-ink-secondary hover:bg-admin-bg-muted"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : filteredColleges.length === 0 ? (
              <div className="p-8 text-center text-admin-ink-muted">
                <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No colleges found</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                {filteredColleges.map((college) => (
                  <div
                    key={college.id}
                    className="flex items-center gap-4 p-4 hover:bg-admin-bg-subtle cursor-pointer transition-colors border-b border-gray-100 last:border-0"
                    onClick={() => handleCollegeClick(college)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-admin-bg-muted flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-admin-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-admin-ink truncate">{college.name}</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-admin-ink-muted">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {college.canonical_domain}
                        </span>
                        {college.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {college.city}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="text-right">
                        <p className="text-admin-ink font-medium">{college.users_count}</p>
                        <p className="text-admin-ink-muted text-xs">users</p>
                      </div>
                      <CollegeStatusBadge status={college.status} />
                      <ChevronRight className="w-4 h-4 text-admin-ink-subtle" />
                    </div>
                  </div>
                ))}
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* College Detail Sheet */}
        <CollegeDetailSheet
          college={selectedCollege}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onVerify={verifyCollege}
          onFlag={flagCollege}
          isUpdating={isUpdating}
        />
      </div>
    </AdminLayout>
  );
}
