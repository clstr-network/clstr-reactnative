/**
 * AdminTalentGraph - Talent Network Graph Visualization
 * 
 * Interactive network graph showing relationships between users, clubs, and projects.
 * Supabase-backed with real-time data from talent graph views.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminTalentGraph } from '@/hooks/useAdminTalentGraph';
import { 
  Network,
  Users,
  Building2,
  Folder,
  Filter,
  RefreshCw,
  Loader2,
  Download,
  AlertTriangle,
  ArrowRight,
  Share2,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AdminLayout from '@/components/admin/AdminLayout';

// Types
type TalentEdgeType = 'mentorship' | 'leadership' | 'collaboration' | 'connection';

interface TalentEdge {
  source_id: string;
  target_id: string;
  edge_type: TalentEdgeType;
  weight: number;
}

interface TalentStats {
  total_nodes: number;
  total_edges: number;
  mentorship_edges: number;
  leadership_edges: number;
  collaboration_edges: number;
  top_mentors: Array<{ id: string; name: string; mentee_count: number }>;
  top_leaders: Array<{ id: string; name: string; club_count: number }>;
  top_collaborators: Array<{ id: string; name: string; project_count: number }>;
}


// Edge type badge
function EdgeTypeBadge({ type }: { type: TalentEdge['edge_type'] }) {
  const config = {
    mentorship: { color: 'bg-admin-primary-light text-admin-primary border-admin-primary-muted', label: 'Mentorship' },
    leadership: { color: 'bg-amber-100 text-amber-600 border-amber-300', label: 'Leadership' },
    collaboration: { color: 'bg-admin-success-light text-admin-success border-emerald-300', label: 'Collaboration' },
    connection: { color: 'bg-admin-bg-muted text-admin-ink-secondary border-admin-border-strong', label: 'Connection' },
  };
  
  const { color, label } = config[type] || config.collaboration;
  
  return (
    <Badge variant="outline" className={cn(color)}>
      {label}
    </Badge>
  );
}

// Top performers list
function TopPerformersList({ 
  title, 
  items, 
  countLabel,
  icon: Icon,
}: { 
  title: string;
  items: Array<{ id: string; name: string; [key: string]: unknown }>;
  countLabel: string;
  icon: typeof Users;
}) {
  return (
    <Card className="bg-admin-bg-elevated border-admin-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-admin-ink text-sm flex items-center gap-2">
          <Icon className="w-4 h-4 text-admin-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-admin-ink-muted">No data available</p>
          ) : (
            items.map((item, index) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-2 rounded-lg bg-admin-bg-subtle"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-admin-primary/20 text-admin-primary text-xs flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-sm text-admin-ink truncate max-w-[150px]">{item.name}</span>
                </div>
                <span className="text-xs text-admin-ink-muted">
                  {(() => {
                    const numericValue = Object.values(item).find(
                      (value): value is number => typeof value === 'number' && value > 0
                    );
                    return `${numericValue ?? 0} ${countLabel}`;
                  })()}
                </span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminTalentGraph() {
  const [filterType, setFilterType] = useState<string>('all');
  
  const { graph, graphLoading: isLoading, graphError: error, refetch } = useAdminTalentGraph();

  const nodeMap = useMemo(() => {
    return new Map(graph.nodes.map((node) => [node.id, node]));
  }, [graph.nodes]);

  const edges = useMemo<TalentEdge[]>(() => {
    return graph.edges.map((edge) => ({
      source_id: edge.source_id,
      target_id: edge.target_id,
      edge_type: edge.type as TalentEdgeType,
      weight: edge.weight,
    }));
  }, [graph.edges]);

  const stats = useMemo<TalentStats>(() => {
    const mentorshipEdges = edges.filter((edge) => edge.edge_type === 'mentorship');
    const leadershipEdges = edges.filter((edge) => edge.edge_type === 'leadership');
    const collaborationEdges = edges.filter((edge) => edge.edge_type === 'collaboration');

    const buildTop = (edgesToCount: TalentEdge[], labelKey: 'mentee_count' | 'club_count' | 'project_count') => {
      const counts = new Map<string, number>();
      for (const edge of edgesToCount) {
        counts.set(edge.source_id, (counts.get(edge.source_id) || 0) + 1);
      }

      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, count]) => ({
          id,
          name: nodeMap.get(id)?.label || 'Unknown',
          [labelKey]: count,
        }));
    };

    return {
      total_nodes: graph.nodes.length,
      total_edges: edges.length,
      mentorship_edges: mentorshipEdges.length,
      leadership_edges: leadershipEdges.length,
      collaboration_edges: collaborationEdges.length,
      top_mentors: buildTop(mentorshipEdges, 'mentee_count') as TalentStats['top_mentors'],
      top_leaders: buildTop(leadershipEdges, 'club_count') as TalentStats['top_leaders'],
      top_collaborators: buildTop(collaborationEdges, 'project_count') as TalentStats['top_collaborators'],
    };
  }, [edges, graph.nodes.length, nodeMap]);

  // Filter edges
  const filteredEdges = useMemo(() => {
    return edges.filter(edge => {
      if (filterType !== 'all' && edge.edge_type !== filterType) return false;
      return true;
    });
  }, [edges, filterType]);

  // Export data (aggregated only, no PII)
  const handleExport = () => {
    const exportData = {
      generated_at: new Date().toISOString(),
      summary: {
        total_nodes: stats.total_nodes,
        total_edges: stats.total_edges,
        edge_types: {
          mentorship: stats.mentorship_edges,
          leadership: stats.leadership_edges,
          collaboration: stats.collaboration_edges,
        },
      },
      note: 'This export contains aggregated data only. No personal identifiers included.',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `talent-graph-summary-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-admin-ink">Talent Graph</h1>
            <p className="text-sm text-admin-ink-muted">Platform-wide relationship network intelligence</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              className="border-admin-border-strong text-admin-ink-secondary hover:bg-admin-bg-muted"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
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
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Nodes</p>
                  <p className="text-2xl font-bold text-admin-ink">{stats.total_nodes}</p>
                </div>
                <Network className="w-8 h-8 text-admin-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Edges</p>
                  <p className="text-2xl font-bold text-admin-ink">{stats.total_edges}</p>
                </div>
                <Share2 className="w-8 h-8 text-admin-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Mentorships</p>
                  <p className="text-2xl font-bold text-admin-primary">{stats.mentorship_edges}</p>
                </div>
                <Users className="w-8 h-8 text-admin-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Leadership</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.leadership_edges}</p>
                </div>
                <GraduationCap className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-admin-bg-elevated border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-admin-ink-muted">Collaborations</p>
                  <p className="text-2xl font-bold text-admin-success">{stats.collaboration_edges}</p>
                </div>
                <Folder className="w-8 h-8 text-admin-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TopPerformersList
            title="Top Mentors"
            items={stats.top_mentors}
            countLabel="mentees"
            icon={Users}
          />
          <TopPerformersList
            title="Top Leaders"
            items={stats.top_leaders}
            countLabel="clubs"
            icon={GraduationCap}
          />
          <TopPerformersList
            title="Top Collaborators"
            items={stats.top_collaborators}
            countLabel="projects"
            icon={Folder}
          />
        </div>

        {/* Graph Visualization Placeholder */}
        <Card className="bg-admin-bg-elevated border-admin-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-admin-ink">Network Graph</CardTitle>
                <CardDescription className="text-admin-ink-muted">
                  Interactive visualization of talent relationships
                </CardDescription>
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40 bg-admin-bg-muted border-admin-border-strong text-admin-ink">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent className="bg-admin-bg-muted border-admin-border-strong">
                  <SelectItem value="all" className="text-admin-ink">All Edges</SelectItem>
                  <SelectItem value="mentorship" className="text-admin-ink">Mentorship</SelectItem>
                  <SelectItem value="leadership" className="text-admin-ink">Leadership</SelectItem>
                  <SelectItem value="collaboration" className="text-admin-ink">Collaboration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[400px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-admin-primary" />
              </div>
            ) : error ? (
              <div className="h-[400px] flex flex-col items-center justify-center text-admin-error">
                <AlertTriangle className="w-12 h-12 mb-4" />
                <p>Error loading talent graph</p>
              </div>
            ) : filteredEdges.length === 0 ? (
              <div className="h-[400px] flex flex-col items-center justify-center text-admin-ink-muted">
                <Network className="w-12 h-12 mb-4 opacity-50" />
                <p>No relationship data available</p>
                <p className="text-sm text-admin-ink-subtle mt-2">
                  Relationships will appear as users mentor, lead clubs, or collaborate on projects
                </p>
              </div>
            ) : (
              <div className="h-[400px] overflow-hidden">
                {/* Edge list view (simplified - full graph would need a library like react-force-graph) */}
                <ScrollArea className="h-full">
                  <div className="space-y-2 p-4">
                    <p className="text-sm text-admin-ink-muted mb-4">
                      Showing {filteredEdges.length} relationships
                    </p>
                    {filteredEdges.slice(0, 50).map((edge, index) => {
                      const sourceNode = nodeMap.get(edge.source_id);
                      const targetNode = nodeMap.get(edge.target_id);

                      return (
                        <div 
                          key={index}
                          className="flex items-center gap-3 p-3 rounded-lg bg-admin-bg-subtle"
                        >
                          <div className="flex-1 flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="text-xs border-admin-border-strong text-admin-ink-muted">
                              {sourceNode?.type || 'unknown'}
                            </Badge>
                            <span className="text-sm text-admin-ink truncate">
                              {sourceNode?.label || `${edge.source_id.slice(0, 8)}...`}
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-admin-ink-subtle flex-shrink-0" />
                          <EdgeTypeBadge type={edge.edge_type} />
                          <ArrowRight className="w-4 h-4 text-admin-ink-subtle flex-shrink-0" />
                          <div className="flex-1 flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="text-xs border-admin-border-strong text-admin-ink-muted">
                              {targetNode?.type || 'unknown'}
                            </Badge>
                            <span className="text-sm text-admin-ink truncate">
                              {targetNode?.label || `${edge.target_id.slice(0, 8)}...`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {filteredEdges.length > 50 && (
                      <p className="text-center text-sm text-admin-ink-muted py-4">
                        + {filteredEdges.length - 50} more relationships
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Query Builder Note */}
        <Card className="bg-admin-bg-elevated border-admin-border">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-admin-primary-light">
                <Network className="w-6 h-6 text-admin-primary" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-admin-ink mb-2">Query Builder</h3>
                <p className="text-sm text-admin-ink-muted mb-4">
                  Advanced queries like "Alumni who mentored more than 3 students" or "Students who led clubs and worked on projects" 
                  can be built using the structured query interface.
                </p>
                <Badge variant="outline" className="text-admin-ink-muted border-admin-border-strong">
                  Coming Soon
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
