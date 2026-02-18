import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search,
  Filter,
  Globe,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  GraduationCap,
  ChevronRight,
  Ban,
  Link2,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdminDomains, type AdminDomain, type DomainStatus, type AdminDomainCollegeOption } from '@/hooks/useAdminDomains';

// Status badge component
function DomainStatusBadge({ status }: { status: DomainStatus }) {
  const config = {
    approved: { icon: CheckCircle2, color: 'bg-admin-success-light text-admin-success border-emerald-300', label: 'Approved' },
    pending: { icon: AlertTriangle, color: 'bg-admin-warning-light text-admin-warning border-yellow-300', label: 'Pending' },
    blocked: { icon: XCircle, color: 'bg-admin-error-light text-admin-error border-red-300', label: 'Blocked' },
  };
  
  const { icon: Icon, color, label } = config[status] || config.pending;
  
  return (
    <Badge variant="outline" className={cn(color)}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}

// Domain detail dialog
function DomainDetailDialog({ 
  domain, 
  open, 
  onOpenChange,
  onApprove,
  onBlock,
  isUpdating,
  colleges,
}: { 
  domain: AdminDomain | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (domainStr: string, params?: { collegeId?: string; createNewCollege?: boolean; collegeName?: string }) => void;
  onBlock: (domainStr: string) => void;
  isUpdating: boolean;
  colleges: AdminDomainCollegeOption[];
}) {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [newCollegeName, setNewCollegeName] = useState<string>('');
  
  useEffect(() => {
    if (!domain) return;
    // If already mapped to a college, show that
    setSelectedOption(domain.college_id || 'none');
    setNewCollegeName('');
  }, [domain]);

  if (!domain) return null;

  const handleApprove = () => {
    if (selectedOption === 'new') {
      // Create new college and map
      onApprove(domain.domain, { 
        createNewCollege: true, 
        collegeName: newCollegeName.trim() || undefined,
      });
    } else if (selectedOption && selectedOption !== 'none') {
      // Map to existing college
      onApprove(domain.domain, { collegeId: selectedOption });
    } else {
      // Just approve without mapping
      onApprove(domain.domain);
    }
    onOpenChange(false);
  };

  const handleBlock = () => {
    onBlock(domain.domain);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-admin-bg-elevated border-admin-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-admin-ink flex items-center gap-2">
            <Globe className="w-5 h-5 text-admin-primary" />
            {domain.domain}
          </DialogTitle>
          <DialogDescription className="text-admin-ink-muted">
            Manage email domain settings and college mapping
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-admin-ink-muted">Status</span>
            <DomainStatusBadge status={domain.status} />
          </div>

          <Separator className="bg-admin-bg-muted" />

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-admin-bg-subtle">
              <div className="flex items-center gap-2 text-admin-ink-muted mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs">Users</span>
              </div>
              <p className="text-lg font-semibold text-admin-ink">{domain.user_count}</p>
            </div>
            <div className="p-3 rounded-lg bg-admin-bg-subtle">
              <div className="flex items-center gap-2 text-admin-ink-muted mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs">First Seen</span>
              </div>
              <p className="text-lg font-semibold text-admin-ink">
                {domain.first_seen ? new Date(domain.first_seen).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>

          <Separator className="bg-admin-bg-muted" />

          {/* College Mapping */}
          <div>
            <Label className="text-admin-ink-secondary mb-2 block">Mapped College</Label>
            <div className="space-y-2">
              {domain.college_name ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-admin-bg-subtle">
                  <GraduationCap className="w-5 h-5 text-admin-primary" />
                  <span className="text-admin-ink">{domain.college_name}</span>
                </div>
              ) : (
                <p className="text-xs text-admin-ink-muted">
                  This domain is not mapped to any college yet.
                </p>
              )}
              <Select value={selectedOption} onValueChange={setSelectedOption}>
                <SelectTrigger className="bg-admin-bg-muted border-admin-border-strong text-admin-ink">
                  <SelectValue placeholder="Select or create a college..." />
                </SelectTrigger>
                <SelectContent className="bg-admin-bg-muted border-admin-border-strong">
                  <SelectItem value="none" className="text-admin-ink">No mapping (approve only)</SelectItem>
                  <SelectItem value="new" className="text-admin-ink">Create New College</SelectItem>
                  {colleges.map((college) => (
                    <SelectItem key={college.id} value={college.id} className="text-admin-ink">
                      {college.name} ({college.canonical_domain})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedOption === 'new' && (
                <div className="mt-3 space-y-2">
                  <Label className="text-admin-ink-secondary">College Name</Label>
                  <Input
                    value={newCollegeName}
                    onChange={(e) => setNewCollegeName(e.target.value)}
                    placeholder="e.g., Raghu Engineering College"
                    className="bg-admin-bg-muted border-admin-border-strong text-admin-ink"
                  />
                  <p className="text-xs text-admin-ink-subtle">
                    A new college will be created with this domain.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {domain.status === 'pending' && (
            <>
              <Button 
                variant="outline" 
                className="border-red-300 text-admin-error hover:bg-admin-error-light"
                onClick={handleBlock}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Ban className="w-4 h-4 mr-2" />}
                Block
              </Button>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleApprove}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Approve & Assign
              </Button>
            </>
          )}
          {domain.status === 'blocked' && (
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleApprove}
              disabled={isUpdating}
            >
              {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Unblock & Approve
            </Button>
          )}
          {domain.status === 'approved' && (
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleApprove}
              disabled={isUpdating}
            >
              {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
              Update Mapping
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Loading skeleton
function DomainsListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-100">
          <Skeleton className="w-10 h-10 rounded-lg bg-admin-bg-muted" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40 bg-admin-bg-muted" />
            <Skeleton className="h-3 w-24 bg-admin-bg-muted" />
          </div>
          <Skeleton className="h-6 w-20 bg-admin-bg-muted" />
        </div>
      ))}
    </div>
  );
}

export default function AdminDomains() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDomain, setSelectedDomain] = useState<AdminDomain | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const {
    domains,
    colleges,
    isLoading,
    error,
    refetch,
    approveDomain,
    blockDomain,
    isUpdating,
  } = useAdminDomains();

  // Filter domains
  const filteredDomains = useMemo(() => {
    return domains.filter((domain) => {
      const matchesSearch = domain.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (domain.college_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || domain.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [domains, searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: domains.length,
    approved: domains.filter(d => d.status === 'approved').length,
    pending: domains.filter(d => d.status === 'pending').length,
    blocked: domains.filter(d => d.status === 'blocked').length,
  }), [domains]);

  const handleDomainClick = (domain: AdminDomain) => {
    setSelectedDomain(domain);
    setDetailOpen(true);
  };

  const handleApprove = (
    domainValue: string, 
    params?: { collegeId?: string; createNewCollege?: boolean; collegeName?: string }
  ) => {
    approveDomain({ 
      domain: domainValue, 
      collegeId: params?.collegeId,
      createNewCollege: params?.createNewCollege,
      collegeName: params?.collegeName,
    });
  };

  const handleBlock = (domainValue: string) => {
    blockDomain(domainValue);
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
                  <p className="text-sm text-admin-ink-muted">Total Domains</p>
                  <p className="text-2xl font-bold text-admin-ink">{stats.total}</p>
                </div>
                <Globe className="w-8 h-8 text-admin-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Approved</p>
                  <p className="text-2xl font-bold text-admin-success">{stats.approved}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-admin-success" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Pending</p>
                  <p className="text-2xl font-bold text-admin-warning">{stats.pending}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-admin-warning" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Blocked</p>
                  <p className="text-2xl font-bold text-admin-error">{stats.blocked}</p>
                </div>
                <XCircle className="w-8 h-8 text-admin-error" />
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
                  placeholder="Search domains or colleges..."
                  className="pl-10 bg-admin-bg-muted border-admin-border-strong text-admin-ink"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-admin-bg-muted border-admin-border-strong text-admin-ink">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-admin-bg-muted border-admin-border-strong">
                  <SelectItem value="all" className="text-admin-ink">All Status</SelectItem>
                  <SelectItem value="approved" className="text-admin-ink">Approved</SelectItem>
                  <SelectItem value="pending" className="text-admin-ink">Pending</SelectItem>
                  <SelectItem value="blocked" className="text-admin-ink">Blocked</SelectItem>
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
              <span>Failed to load domains. Please try again.</span>
              <Button variant="link" onClick={() => refetch()} className="text-admin-error">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Domain Table */}
        <Card className="bg-admin-bg-elevated border-admin-border">
          <ScrollArea className="h-[calc(100vh-24rem)]">
            {isLoading ? (
              <DomainsListSkeleton />
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-admin-bg-elevated border-b border-admin-border">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-admin-ink-muted">Domain</th>
                    <th className="text-left p-4 text-sm font-medium text-admin-ink-muted hidden md:table-cell">Mapped College</th>
                    <th className="text-left p-4 text-sm font-medium text-admin-ink-muted hidden lg:table-cell">User Count</th>
                    <th className="text-left p-4 text-sm font-medium text-admin-ink-muted hidden lg:table-cell">First Seen</th>
                    <th className="text-left p-4 text-sm font-medium text-admin-ink-muted">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-admin-ink-muted w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDomains.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-admin-ink-muted">
                        <Globe className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No domains found</p>
                        {searchQuery && (
                          <p className="text-sm mt-1">Try adjusting your search or filters</p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredDomains.map((domain) => (
                      <tr 
                        key={domain.id}
                        onClick={() => handleDomainClick(domain)}
                        className="border-b border-gray-100 cursor-pointer hover:bg-admin-bg-subtle transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-admin-bg-muted flex items-center justify-center">
                              <Globe className="w-5 h-5 text-admin-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-admin-ink">{domain.domain}</p>
                              <p className="text-xs text-admin-ink-muted md:hidden">
                                {domain.college_name || 'Unmapped'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          {domain.college_name ? (
                            <div className="flex items-center gap-2 text-admin-ink-secondary">
                              <GraduationCap className="w-4 h-4 text-admin-ink-muted" />
                              {domain.college_name}
                            </div>
                          ) : (
                            <span className="text-admin-ink-subtle">— Unmapped</span>
                          )}
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          <div className="flex items-center gap-1 text-admin-ink">
                            <Users className="w-4 h-4 text-admin-ink-muted" />
                            {domain.user_count}
                          </div>
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          <span className="text-admin-ink-secondary">
                            {domain.first_seen ? new Date(domain.first_seen).toLocaleDateString() : '—'}
                          </span>
                        </td>
                        <td className="p-4">
                          <DomainStatusBadge status={domain.status} />
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

        {/* Detail Dialog */}
        <DomainDetailDialog 
          domain={selectedDomain}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onApprove={handleApprove}
          onBlock={handleBlock}
          isUpdating={isUpdating}
          colleges={colleges}
        />
      </div>
    </AdminLayout>
  );
}
