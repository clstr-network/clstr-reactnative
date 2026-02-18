import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search,
  Filter,
  Users,
  GraduationCap,
  Briefcase,
  Activity,
  ChevronRight,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  UserX,
  RefreshCw,
  Eye,
  Mail,
  Calendar,
  Star,
  Building2,
  Folder,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdminUsers, type AdminUser, type UserStatus } from '@/hooks/useAdminUsers';

// Status badge component
function UserStatusBadge({ status }: { status: UserStatus }) {
  const config = {
    active: { icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    suspended: { icon: XCircle, color: 'bg-red-500/10 text-red-400 border-red-500/30' },
    pending: { icon: AlertTriangle, color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  };
  
  const { icon: Icon, color } = config[status] || config.pending;
  
  return (
    <Badge variant="outline" className={cn("capitalize", color)}>
      <Icon className="w-3 h-3 mr-1" />
      {status}
    </Badge>
  );
}

// Activity score indicator
function ActivityScoreIndicator({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return 'text-emerald-400';
    if (s >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  return (
    <div className="flex items-center gap-2">
      <Activity className={cn("w-4 h-4", getColor(score))} />
      <span className={cn("font-medium", getColor(score))}>{score}</span>
    </div>
  );
}

// User detail sheet
function UserDetailSheet({ 
  user, 
  open, 
  onOpenChange,
  onSuspend,
  onActivate,
  onUpdateRole,
  isUpdating,
}: { 
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuspend: (id: string) => Promise<boolean>;
  onActivate: (id: string) => Promise<boolean>;
  onUpdateRole: (id: string, role: string) => Promise<boolean>;
  isUpdating: boolean;
}) {
  if (!user) return null;

  const handleSuspend = async () => {
    const success = await onSuspend(user.id);
    if (success) {
      onOpenChange(false);
    }
  };

  const handleActivate = async () => {
    const success = await onActivate(user.id);
    if (success) {
      onOpenChange(false);
    }
  };

  const handleRoleChange = async (newRole: string) => {
    if (newRole === user.role) return;
    await onUpdateRole(user.id, newRole);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-admin-bg-elevated border-admin-border w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-admin-ink">User Details</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
          <div className="space-y-6 pr-4">
            {/* Profile Header */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.avatar_url || ''} />
                <AvatarFallback className="bg-admin-primary text-admin-ink text-lg">
                  {user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-admin-ink">{user.full_name}</h3>
                <p className="text-sm text-admin-ink-muted">{user.headline || 'No headline'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <UserStatusBadge status={user.status} />
                  <Badge variant="outline" className="text-admin-primary border-admin-primary-muted">
                    {user.role}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator className="bg-gray-200" />

            {/* Contact Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-admin-ink">Contact</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-admin-ink-secondary">
                  <Mail className="w-4 h-4 text-admin-ink-muted" />
                  <span className="text-sm">{user.email}</span>
                </div>
                {user.college_domain && (
                  <div className="flex items-center gap-2 text-admin-ink-secondary">
                    <GraduationCap className="w-4 h-4 text-admin-ink-muted" />
                    <span className="text-sm">{user.college_domain}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator className="bg-gray-200" />

            {/* Activity Stats */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-admin-ink">Activity</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-admin-bg-subtle">
                  <p className="text-xs text-admin-ink-muted">Activity Score</p>
                  <div className="mt-1">
                    <ActivityScoreIndicator score={user.activity_score} />
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-admin-bg-subtle">
                  <p className="text-xs text-admin-ink-muted">Last Active</p>
                  <p className="text-sm font-medium text-admin-ink mt-1">
                    {user.last_active ? new Date(user.last_active).toLocaleDateString() : 'Never'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-admin-bg-subtle">
                  <p className="text-xs text-admin-ink-muted">Joined</p>
                  <p className="text-sm font-medium text-admin-ink mt-1">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-admin-bg-subtle">
                  <p className="text-xs text-admin-ink-muted">Posts</p>
                  <p className="text-sm font-medium text-admin-ink mt-1">{user.posts_count}</p>
                </div>
              </div>
            </div>

            <Separator className="bg-gray-200" />

            {/* Skills */}
            {user.skills && user.skills.length > 0 && (
              <>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-admin-ink">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {user.skills.slice(0, 10).map((skill, i) => (
                      <Badge key={i} variant="outline" className="text-admin-ink-secondary border-admin-border-strong">
                        {skill}
                      </Badge>
                    ))}
                    {user.skills.length > 10 && (
                      <Badge variant="outline" className="text-admin-ink-muted border-admin-border-strong">
                        +{user.skills.length - 10} more
                      </Badge>
                    )}
                  </div>
                </div>
                <Separator className="bg-gray-200" />
              </>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-admin-ink">Actions</h4>
              <div className="space-y-2">
                {user.status === 'active' ? (
                  <Button 
                    variant="outline" 
                    className="w-full border-red-300 text-admin-error hover:bg-red-50"
                    onClick={handleSuspend}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <UserX className="w-4 h-4 mr-2" />
                    )}
                    Suspend Account
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleActivate}
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
                
                <div className="flex gap-2">
                  <Select 
                    value={user.role} 
                    onValueChange={handleRoleChange}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="flex-1 bg-admin-bg-elevated border-admin-border-strong text-admin-ink">
                      <SelectValue placeholder="Change Role" />
                    </SelectTrigger>
                    <SelectContent className="bg-admin-bg-elevated border-admin-border">
                      <SelectItem value="Student" className="text-admin-ink">Student</SelectItem>
                      <SelectItem value="Alumni" className="text-admin-ink">Alumni</SelectItem>
                      <SelectItem value="Faculty" className="text-admin-ink">Faculty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// Loading skeleton
function UsersListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-100">
          <Skeleton className="w-10 h-10 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32 bg-gray-200" />
            <Skeleton className="h-3 w-48 bg-gray-200" />
          </div>
          <Skeleton className="h-6 w-16 bg-gray-200" />
          <Skeleton className="h-6 w-16 bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const {
    users,
    isLoading,
    error,
    refetch,
    suspendUser,
    activateUser,
    updateUserRole,
    isUpdating,
  } = useAdminUsers();

  // Keep selectedUser in sync with users data (for realtime updates)
  useEffect(() => {
    if (selectedUser && users.length > 0) {
      const updatedUser = users.find(u => u.id === selectedUser.id);
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(selectedUser)) {
        setSelectedUser(updatedUser);
      }
    }
  }, [users, selectedUser]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = 
        (user.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (user.college_domain?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: users.length,
    students: users.filter(u => u.role === 'Student').length,
    alumni: users.filter(u => u.role === 'Alumni').length,
    faculty: users.filter(u => u.role === 'Faculty').length,
    active: users.filter(u => u.status === 'active').length,
    suspended: users.filter(u => u.status === 'suspended').length,
  }), [users]);

  const handleUserClick = (user: AdminUser) => {
    setSelectedUser(user);
    setDetailOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Total Users</p>
                  <p className="text-2xl font-bold text-admin-ink">{stats.total}</p>
                </div>
                <Users className="w-6 h-6 text-admin-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Students</p>
                  <p className="text-2xl font-bold text-admin-info">{stats.students}</p>
                </div>
                <GraduationCap className="w-6 h-6 text-admin-info" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Alumni</p>
                  <p className="text-2xl font-bold text-admin-success">{stats.alumni}</p>
                </div>
                <Briefcase className="w-6 h-6 text-admin-success" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Faculty</p>
                  <p className="text-2xl font-bold text-admin-warning">{stats.faculty}</p>
                </div>
                <Building2 className="w-6 h-6 text-admin-warning" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Active</p>
                  <p className="text-2xl font-bold text-admin-success">{stats.active}</p>
                </div>
                <CheckCircle2 className="w-6 h-6 text-admin-success" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Suspended</p>
                  <p className="text-2xl font-bold text-admin-error">{stats.suspended}</p>
                </div>
                <XCircle className="w-6 h-6 text-admin-error" />
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
                  placeholder="Search users by name, email, or college..."
                  className="pl-10 bg-admin-bg-elevated border-admin-border-strong text-admin-ink"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-36 bg-admin-bg-elevated border-admin-border-strong text-admin-ink">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="bg-admin-bg-elevated border-admin-border">
                  <SelectItem value="all" className="text-admin-ink">All Roles</SelectItem>
                  <SelectItem value="Student" className="text-admin-ink">Student</SelectItem>
                  <SelectItem value="Alumni" className="text-admin-ink">Alumni</SelectItem>
                  <SelectItem value="Faculty" className="text-admin-ink">Faculty</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 bg-admin-bg-elevated border-admin-border-strong text-admin-ink">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-admin-bg-elevated border-admin-border">
                  <SelectItem value="all" className="text-admin-ink">All Status</SelectItem>
                  <SelectItem value="active" className="text-admin-ink">Active</SelectItem>
                  <SelectItem value="suspended" className="text-admin-ink">Suspended</SelectItem>
                  <SelectItem value="pending" className="text-admin-ink">Pending</SelectItem>
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
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 flex items-center gap-2 text-admin-error">
              <AlertTriangle className="w-4 h-4" />
              <span>Failed to load users. Please try again.</span>
              <Button variant="link" onClick={() => refetch()} className="text-admin-error">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Users Table */}
        <Card className="bg-admin-bg-elevated border-admin-border">
          <ScrollArea className="h-[calc(100vh-22rem)]">
            {isLoading ? (
              <UsersListSkeleton />
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-admin-bg-subtle border-b border-admin-border">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-admin-ink-secondary">User</th>
                    <th className="text-left p-4 text-sm font-medium text-admin-ink-secondary hidden md:table-cell">College</th>
                    <th className="text-left p-4 text-sm font-medium text-admin-ink-secondary hidden lg:table-cell">Role</th>
                    <th className="text-left p-4 text-sm font-medium text-admin-ink-secondary hidden lg:table-cell">Activity</th>
                    <th className="text-left p-4 text-sm font-medium text-admin-ink-secondary">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-admin-ink-secondary w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-admin-ink-muted">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No users found</p>
                        {searchQuery && (
                          <p className="text-sm mt-1">Try adjusting your search or filters</p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr 
                        key={user.id}
                        onClick={() => handleUserClick(user)}
                        className="border-b border-gray-100 cursor-pointer hover:bg-admin-bg-subtle transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatar_url || ''} />
                              <AvatarFallback className="bg-admin-primary text-admin-ink">
                                {user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-admin-ink">{user.full_name || 'Unknown User'}</p>
                              <p className="text-xs text-admin-ink-muted">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <span className="text-admin-ink-secondary">
                            {user.college_domain?.split('.')[0] || '—'}
                          </span>
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          <Badge variant="outline" className="text-admin-primary border-admin-primary-muted">
                            {user.role}
                          </Badge>
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          <ActivityScoreIndicator score={user.activity_score} />
                        </td>
                        <td className="p-4">
                          <UserStatusBadge status={user.status} />
                        </td>
                        <td className="p-4">
                          <ChevronRight className="w-5 h-5 text-admin-ink-subtle" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </ScrollArea>
        </Card>

        {/* User Detail Sheet */}
        <UserDetailSheet 
          user={selectedUser}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onSuspend={suspendUser}
          onActivate={activateUser}
          onUpdateRole={updateUserRole}
          isUpdating={isUpdating}
        />
      </div>
    </AdminLayout>
  );
}