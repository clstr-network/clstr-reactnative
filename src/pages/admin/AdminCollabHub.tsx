/**
 * AdminCollabHub - Micro-Projects / Collaboration Management
 * 
 * Monetized collaboration layer management with Supabase-backed data.
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminCollabHub, type CollabProject, type ProjectStatus } from '@/hooks/useAdminCollabHub';
import { useToast } from '@/hooks/use-toast';
import { 
  Search,
  Filter,
  Folder,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  RefreshCw,
  Loader2,
  Flag,
  Archive,
  TrendingUp,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AdminLayout from '@/components/admin/AdminLayout';

// Types
type CollabProjectRow = CollabProject;

// Status badge component
function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const config: Record<ProjectStatus, { icon: typeof Clock; color: string; label: string }> = {
    open: { icon: Clock, color: 'bg-admin-success-light text-admin-success border-emerald-300', label: 'Open' },
    in_progress: { icon: TrendingUp, color: 'bg-blue-500/10 text-admin-info border-blue-500/30', label: 'In Progress' },
    closed: { icon: CheckCircle2, color: 'bg-admin-bg-muted text-admin-ink-secondary border-admin-border-strong', label: 'Closed' },
    archived: { icon: Archive, color: 'bg-admin-bg-muted text-admin-ink-muted border-admin-border-strong', label: 'Archived' },
    flagged: { icon: Flag, color: 'bg-admin-error-light text-admin-error border-red-300', label: 'Flagged' },
    draft: { icon: Archive, color: 'bg-admin-bg-muted text-admin-ink-muted border-admin-border-strong', label: 'Draft' },
  };

  const { icon: Icon, color, label } = config[status] || config.draft;
  
  return (
    <Badge variant="outline" className={cn(color)}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}


// Project detail sheet
function ProjectDetailSheet({ 
  project, 
  open, 
  onOpenChange,
  onArchive,
  onMarkComplete,
  isUpdating,
}: { 
  project: CollabProjectRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onArchive: (id: string) => void;
  onMarkComplete: (id: string) => void;
  isUpdating: boolean;
}) {
  if (!project) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-admin-bg-elevated border-admin-border w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-admin-ink">Project Details</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
          <div className="space-y-6 pr-4">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-admin-bg-muted flex items-center justify-center">
                <Folder className="w-6 h-6 text-admin-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-admin-ink">{project.title}</h3>
                <p className="text-sm text-admin-ink-muted">by {project.owner?.full_name || 'Unknown'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <ProjectStatusBadge status={project.status} />
                </div>
              </div>
            </div>

            <Separator className="bg-admin-bg-muted" />

            {/* Description */}
            {project.description && (
              <>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-admin-ink">Description</h4>
                  <p className="text-sm text-admin-ink-secondary">{project.description}</p>
                </div>
                <Separator className="bg-admin-bg-muted" />
              </>
            )}

            {/* Team Stats */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-admin-ink">Team</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-admin-bg-subtle">
                  <p className="text-xs text-admin-ink-muted">Members</p>
                  <p className="text-lg font-semibold text-admin-ink">{project.team_count}</p>
                </div>
                <div className="p-3 rounded-lg bg-admin-bg-subtle">
                  <p className="text-xs text-admin-ink-muted">Updates</p>
                  <p className="text-lg font-semibold text-admin-success">{project.comment_count}</p>
                </div>
              </div>
            </div>

            <Separator className="bg-admin-bg-muted" />

            {/* Tags */}
            {project.tags.length > 0 && (
              <>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-admin-ink">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-admin-ink-secondary border-admin-border-strong">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator className="bg-admin-bg-muted" />
              </>
            )}

            {/* Timeline */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-admin-ink">Timeline</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-admin-ink-muted">Created</span>
                  <span className="text-admin-ink">
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-admin-ink-muted">Last Updated</span>
                  <span className="text-admin-ink">
                    {new Date(project.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <Separator className="bg-admin-bg-muted" />

            {/* Actions */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-admin-ink">Actions</h4>
              <div className="space-y-2">
                {['open', 'in_progress'].includes(project.status) && (
                  <>
                    <Button 
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => onMarkComplete(project.id)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      Mark Closed
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full border-admin-border-strong text-admin-ink-secondary hover:bg-admin-bg-muted"
                      onClick={() => onArchive(project.id)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Archive className="w-4 h-4 mr-2" />
                      )}
                      Archive Project
                    </Button>
                  </>
                )}
                {!['open', 'in_progress'].includes(project.status) && (
                  <p className="text-sm text-admin-ink-muted text-center py-2">
                    This project is {project.status}
                  </p>
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
function ProjectsListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-100">
          <Skeleton className="w-10 h-10 rounded-lg bg-admin-bg-muted" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48 bg-admin-bg-muted" />
            <Skeleton className="h-3 w-32 bg-admin-bg-muted" />
          </div>
          <Skeleton className="h-6 w-16 bg-admin-bg-muted" />
          <Skeleton className="h-6 w-20 bg-admin-bg-muted" />
        </div>
      ))}
    </div>
  );
}

export default function AdminCollabHub() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<CollabProjectRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { toast } = useToast();
  
  const {
    projects,
    projectsLoading: isLoading,
    stats,
    updateProjectStatusAsync,
    archiveProjectAsync,
    isUpdatingStatus,
    isArchiving,
    projectsError,
    refetch,
  } = useAdminCollabHub();

  const isUpdating = isUpdatingStatus || isArchiving;

  // Handle mark closed with toast feedback
  const handleMarkClosed = useCallback(async (projectId: string) => {
    try {
      await updateProjectStatusAsync({ projectId, status: 'closed' });
      toast({
        title: 'Project closed',
        description: 'The project has been marked as closed successfully.',
      });
      setDetailOpen(false);
      setSelectedProject(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to close project',
        variant: 'destructive',
      });
    }
  }, [updateProjectStatusAsync, toast]);

  // Handle archive with toast feedback
  const handleArchive = useCallback(async (projectId: string) => {
    try {
      await archiveProjectAsync(projectId);
      toast({
        title: 'Project archived',
        description: 'The project has been archived successfully.',
      });
      setDetailOpen(false);
      setSelectedProject(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to archive project',
        variant: 'destructive',
      });
    }
  }, [archiveProjectAsync, toast]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch = 
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.owner?.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  // Stats
  const statsSummary = useMemo(() => ({
    total: stats.total,
    active: stats.active,
    completed: stats.completed,
    flagged: stats.flagged,
    archived: stats.archived,
    totalMembers: stats.totalMembers,
  }), [stats]);

  const handleProjectClick = (project: CollabProjectRow) => {
    setSelectedProject(project);
    setDetailOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Total Projects</p>
                  <p className="text-2xl font-bold text-admin-ink">{statsSummary.total}</p>
                </div>
                <Folder className="w-8 h-8 text-admin-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Active</p>
                  <p className="text-2xl font-bold text-admin-success">{statsSummary.active}</p>
                </div>
                <Clock className="w-8 h-8 text-admin-success" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Completed</p>
                  <p className="text-2xl font-bold text-admin-info">{statsSummary.completed}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-admin-info" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Flagged</p>
                  <p className="text-2xl font-bold text-admin-error">{statsSummary.flagged}</p>
                </div>
                <Flag className="w-8 h-8 text-admin-error" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Archived</p>
                  <p className="text-2xl font-bold text-admin-ink">{statsSummary.archived}</p>
                </div>
                <Archive className="w-8 h-8 text-admin-ink-muted" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Members</p>
                  <p className="text-2xl font-bold text-admin-success">{statsSummary.totalMembers}</p>
                </div>
                <Target className="w-8 h-8 text-admin-success" />
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
                  placeholder="Search projects..."
                  className="pl-10 bg-admin-bg-muted border-admin-border-strong text-admin-ink"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 bg-admin-bg-muted border-admin-border-strong text-admin-ink">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-admin-bg-muted border-admin-border-strong">
                  <SelectItem value="all" className="text-admin-ink">All Status</SelectItem>
                  <SelectItem value="open" className="text-admin-ink">Open</SelectItem>
                  <SelectItem value="in_progress" className="text-admin-ink">In Progress</SelectItem>
                  <SelectItem value="closed" className="text-admin-ink">Closed</SelectItem>
                  <SelectItem value="archived" className="text-admin-ink">Archived</SelectItem>
                  <SelectItem value="flagged" className="text-admin-ink">Flagged</SelectItem>
                  <SelectItem value="draft" className="text-admin-ink">Draft</SelectItem>
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

        {/* Projects List */}
        <Card className="bg-admin-bg-elevated border-admin-border">
          <CardContent className="p-0">
            {isLoading ? (
              <ProjectsListSkeleton />
            ) : projectsError ? (
              <div className="p-8 text-center text-admin-error">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                <p>Error loading projects</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="p-8 text-center text-admin-ink-muted">
                <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No projects found</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center gap-4 p-4 hover:bg-admin-bg-subtle cursor-pointer transition-colors border-b border-gray-100 last:border-0"
                    onClick={() => handleProjectClick(project)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-admin-bg-muted flex items-center justify-center">
                      <Folder className="w-5 h-5 text-admin-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-admin-ink truncate">{project.title}</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-admin-ink-muted">
                        <span>by {project.owner?.full_name || 'Unknown'}</span>
                        {project.college_domain && (
                          <span className="flex items-center gap-1">
                            <GraduationCap className="w-3 h-3" />
                            {project.college_domain}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="text-right">
                        <p className="text-admin-ink font-medium">{project.team_count}</p>
                        <p className="text-admin-ink-muted text-xs">members</p>
                      </div>
                      <ProjectStatusBadge status={project.status} />
                      <ChevronRight className="w-4 h-4 text-admin-ink-subtle" />
                    </div>
                  </div>
                ))}
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Project Detail Sheet */}
        <ProjectDetailSheet
          project={selectedProject}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onArchive={handleArchive}
          onMarkComplete={handleMarkClosed}
          isUpdating={isUpdating}
        />
      </div>
    </AdminLayout>
  );
}
