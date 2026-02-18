import { useEffect, useCallback, useMemo, useState } from "react";
import { Bookmark, Briefcase, Users, MapPin, Calendar, X, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PostSkeleton } from "@/components/ui/skeleton-loader";
import { PostCard } from "@/components/home/PostCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/contexts/ProfileContext";
import { getSavedItems, toggleSaveItem } from "@/lib/saved-api";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SEO } from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";

export default function SavedItems() {
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canSaveBookmarks, profileType, isLoading: permissionsLoading } = useFeatureAccess();
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());

  // All hooks must be called unconditionally at the top
  const queryKey = useMemo(() => ["saved-items", profile?.id] as const, [profile?.id]);

  const { data, isLoading, isPending, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!profile?.id) throw new Error("Profile missing");
      const result = await getSavedItems(profile.id);
      if (result.error) throw new Error(result.error);
      return result;
    },
    enabled: Boolean(profile?.id) && canSaveBookmarks, // Only fetch if authorized
    staleTime: 15000,
  });

  // True when we're still resolving permissions, profile, or query data
  const showLoading = permissionsLoading || !profile?.id || isLoading || (isPending && canSaveBookmarks);

  const loadSavedItems = useCallback(async () => {
    if (!profile?.id || !canSaveBookmarks) return;
    await queryClient.invalidateQueries({ queryKey });
  }, [profile?.id, queryClient, queryKey, canSaveBookmarks]);

  const handleUnsaveItem = useCallback(async (itemType: 'project' | 'club', itemId: string) => {
    if (!profile?.id || removingItems.has(itemId)) return;

    setRemovingItems(prev => new Set(prev).add(itemId));
    try {
      const result = await toggleSaveItem(profile.id, itemType, itemId);
      if (result.error) {
        toast({
          title: "Failed to unsave",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: itemType === "project" ? "Project unsaved" : "Club unsaved",
        description: `Removed from your saved items`,
      });
      // Invalidate saved-items cache to refresh the list
      await queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      toast({
        title: "Action failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setRemovingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }, [profile?.id, removingItems, toast, queryClient, queryKey]);

  useEffect(() => {
    // Guard inside effect, not early return before hook
    if (!profile?.id || !canSaveBookmarks) return;

    const channel = supabase
      .channel(`saved-items-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "saved_items",
          filter: `user_id=eq.${profile.id}`,
        },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_likes" },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments" },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comment_likes" },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient, queryKey, canSaveBookmarks]);

  // Show loading screen while permissions / profile are resolving
  if (showLoading) {
    return (
      <div className="home-theme bg-[#000000] min-h-screen text-white">
        <SEO title="Saved Items" description="View your bookmarked posts, projects, and clubs on Clstr." />
        <div className="container max-w-4xl py-8 px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2 text-white">Saved Items</h1>
            <p className="text-white/50">
              View all your bookmarked posts, projects, and clubs
            </p>
          </div>
          <div className="space-y-4 mt-6">
            <PostSkeleton />
            <PostSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // Access control check AFTER all hooks are called and loading resolved
  if (!canSaveBookmarks) {
    return (
      <div className="home-theme bg-[#000000] min-h-screen text-white">
        <SEO title="Access Restricted" description="Saved Items feature is not available for your profile type." />
        <div className="container max-w-2xl py-12 px-4">
          <Alert variant="destructive">
            <Shield className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">Access Restricted</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-4">
                Saved Items feature is not available for {profileType} profiles.
                This feature is available for Students, Alumni, and Faculty.
              </p>
              <Button onClick={() => navigate('/home')} size="sm" className="bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]">
                Go to Home
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const savedPosts = data?.posts ?? [];
  const savedProjects = data?.projects ?? [];
  const savedClubs = data?.clubs ?? [];

  if (isError) {
    return (
      <div className="home-theme bg-[#000000] min-h-screen text-white">
        <SEO title="Saved Items" description="View your bookmarked posts, projects, and clubs on Clstr." />
        <div className="container max-w-4xl py-8 px-4">
          <ErrorState
            title="Failed to load saved items"
            message={error instanceof Error ? error.message : "Failed to load saved items"}
            onRetry={loadSavedItems}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="home-theme bg-[#000000] min-h-screen text-white">
      <SEO title="Saved Items" description="View your bookmarked posts, projects, and clubs on Clstr." />
      <div className="container max-w-4xl py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-white">Saved Items</h1>
          <p className="text-white/50">
            View all your bookmarked posts, projects, and clubs
          </p>
        </div>

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/[0.06] border border-white/10">
            <TabsTrigger value="posts" className="data-[state=active]:bg-white/[0.12] data-[state=active]:text-white text-white/60">
              <Bookmark className="h-4 w-4 mr-2" />
              Posts ({savedPosts.length})
            </TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-white/[0.12] data-[state=active]:text-white text-white/60">
              <Briefcase className="h-4 w-4 mr-2" />
              Projects ({savedProjects.length})
            </TabsTrigger>
            <TabsTrigger value="clubs" className="data-[state=active]:bg-white/[0.12] data-[state=active]:text-white text-white/60">
              <Users className="h-4 w-4 mr-2" />
              Clubs ({savedClubs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-4 mt-6">
            {savedPosts.length === 0 ? (
              <EmptyState
                icon={Bookmark}
                title="No saved posts"
                description="Posts you save will appear here"
              />
            ) : (
              savedPosts.map((post) => (
                <PostCard key={post.id} post={post} onPostUpdated={loadSavedItems} />
              ))
            )}
          </TabsContent>

          <TabsContent value="projects" className="space-y-4 mt-6">
            {savedProjects.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No saved projects"
                description="Projects you save will appear here"
              />
            ) : (
              savedProjects.map((project) => (
                <Card
                  key={project.id}
                  className="home-card-tier2 p-6 cursor-pointer transition-colors hover:bg-white/[0.08]"
                  onClick={() => navigate(`/projects?view=${project.id}`)}
                >
                  <CardHeader className="p-0 pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl font-semibold mb-2 text-white">{project.title}</CardTitle>
                        {project.summary && (
                          <CardDescription className="text-sm text-white/50">{project.summary}</CardDescription>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-white/40 hover:text-white hover:bg-white/[0.08]"
                        disabled={removingItems.has(project.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnsaveItem('project', project.id);
                        }}
                        title="Remove from saved"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <p className="text-white/60 mb-4 line-clamp-3">{project.description}</p>
                    <div className="flex gap-2 flex-wrap mb-4">
                      {project.category && (
                        <Badge variant="secondary" className="bg-white/[0.08] text-white/70 border-transparent">{project.category}</Badge>
                      )}
                      {project.project_type && (
                        <Badge variant="outline" className="border-white/15 text-white/60">{project.project_type}</Badge>
                      )}
                      <Badge variant="outline" className="border-white/15 text-white/60">{project.status}</Badge>
                      {project.team_size_target && (
                        <Badge variant="outline" className="border-white/15 text-white/60">
                          Team: {project.team_size_current || 0}/{project.team_size_target}
                        </Badge>
                      )}
                    </div>
                    {project.owner && (
                      <div className="flex items-center gap-2 text-sm text-white/40">
                        <span>Created by {project.owner.full_name}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="clubs" className="space-y-4 mt-6">
            {savedClubs.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No saved clubs"
                description="Clubs you save will appear here"
              />
            ) : (
              savedClubs.map((club) => (
                <Card
                  key={club.id}
                  className="home-card-tier2 p-6 cursor-pointer transition-colors hover:bg-white/[0.08]"
                  onClick={() => navigate(`/ecocampus/clubs/${club.id}`)}
                >
                  <CardHeader className="p-0 pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl font-semibold mb-2 text-white">{club.name}</CardTitle>
                        {club.short_description && (
                          <CardDescription className="text-sm text-white/50">{club.short_description}</CardDescription>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-white/40 hover:text-white hover:bg-white/[0.08]"
                        disabled={removingItems.has(club.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnsaveItem('club', club.id);
                        }}
                        title="Remove from saved"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <p className="text-white/60 mb-4 line-clamp-3">{club.description}</p>
                    <div className="flex gap-2 flex-wrap mb-4">
                      <Badge variant="secondary" className="bg-white/[0.08] text-white/70 border-transparent">{club.club_type}</Badge>
                      {club.category && (
                        <Badge variant="outline" className="border-white/15 text-white/60">{club.category}</Badge>
                      )}
                      <Badge variant="outline" className="border-white/15 text-white/60">
                        <Users className="h-3 w-3 mr-1" />
                        {club.member_count} members
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm text-white/40">
                      {club.meeting_schedule && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{club.meeting_schedule}</span>
                        </div>
                      )}
                      {club.meeting_location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{club.meeting_location}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
