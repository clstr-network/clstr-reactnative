import { useEffect, useCallback, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProfile } from '@/contexts/ProfileContext';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { getPosts, Post } from '@/lib/social-api';
import { getConnectionCount, getProfileViewsCount } from '@/lib/profile-api';
import { supabase } from '@/integrations/supabase/client';
import { CreatePostCard } from '@/components/home/CreatePostCard';
import { PostCard } from '@/components/home/PostCard';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const Feed = () => {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { collegeDomain, role, hasAlumniMentorBadge, hasClubLeadBadge } = useRolePermissions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const postsQueryKey = useMemo(() => ['feed-posts', profile?.id] as const, [profile?.id]);

  const { data: posts = [], isLoading, isError, error } = useQuery({
    queryKey: postsQueryKey,
    queryFn: async () => {
      const response = await getPosts({ pageSize: 20 });
      return response.posts as Post[];
    },
    // Only enable when we have a profile and profile loading is complete
    enabled: Boolean(profile?.id) && !isProfileLoading,
    staleTime: 30000,
    retry: 1, // Only retry once to avoid infinite loops
  });
  const { data: networkStats, error: statsError, isLoading: statsLoading } = useQuery({
    queryKey: ['profile-stats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) throw new Error('Profile missing');
      const [connections, profileViews] = await Promise.all([
        getConnectionCount(profile.id),
        getProfileViewsCount(profile.id),
      ]);
      return { connections, profileViews };
    },
    enabled: Boolean(profile?.id),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`connections-count-${profile.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'connections',
        filter: `requester_id=eq.${profile.id}`,
      }, () => queryClient.invalidateQueries({ queryKey: ['profile-stats', profile.id] }))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'connections',
        filter: `receiver_id=eq.${profile.id}`,
      }, () => queryClient.invalidateQueries({ queryKey: ['profile-stats', profile.id] }))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  const refreshPosts = useCallback(() => {
    if (!profile?.id) return;
    queryClient.invalidateQueries({ queryKey: postsQueryKey });
  }, [profile?.id, queryClient, postsQueryKey]);

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel('home-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, refreshPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, refreshPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, refreshPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_shares' }, refreshPosts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, refreshPosts]);

  return (
    <div className="container py-4 md:py-6 px-4 md:px-6 pb-20 md:pb-6">
      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        {/* Left Sidebar - Profile Summary - Hidden on mobile, shown on desktop */}
        <aside className="hidden lg:block lg:col-span-1 space-y-4 md:space-y-6">
          <Card className="overflow-hidden">
            <div className="h-20 md:h-24 bg-white/[0.04] border-b border-white/10" />
            <div className="relative px-4 pb-4">
              <Avatar className="absolute -top-10 md:-top-12 ring-4 ring-white h-20 w-20 md:h-24 md:w-24">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback>
                  {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="pt-12 md:pt-16 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg md:text-xl">{profile?.full_name || 'User'}</h3>
                  {hasAlumniMentorBadge && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Mentor
                    </span>
                  )}
                  {hasClubLeadBadge && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                      Club Lead
                    </span>
                  )}
                </div>
                <p className="text-sm md:text-base text-white/60">{role}</p>
                <p className="text-sm text-white/60">{profile?.university}</p>
                <p className="text-xs text-white/40">{collegeDomain}</p>
                <div className="flex gap-2 mt-4">
                  <Button 
                    size="sm" 
                    className="bg-white/10 border border-white/15 text-white hover:bg-white/[0.15] touch-target"
                    onClick={() => navigate('/profile')}
                  >
                    View Profile
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h3 className="font-semibold">Your Network</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-white/60">Connections</span>
                <span className="text-sm font-semibold text-white/60">
                  {statsLoading ? '…' : networkStats?.connections ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-white/60">Profile Views</span>
                <span className="text-sm font-semibold text-white/60">
                  {statsLoading
                    ? '…'
                    : statsError
                      ? '—'
                      : networkStats?.profileViews ?? 0}
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2 touch-target"
                onClick={() => navigate('/network')}
              >
                Grow Your Network
              </Button>
              {statsError && (
                <p className="text-xs text-white/60">
                  Profile view tracking unavailable: {statsError instanceof Error ? statsError.message : 'not available'}
                </p>
              )}
            </div>
          </Card>
        </aside>

        {/* Main Feed - Full width on mobile, 2 cols on desktop */}
        <main className="w-full lg:col-span-2 space-y-4 md:space-y-6">
          <CreatePostCard onPostCreated={refreshPosts} />

          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white/60" />
            </div>
          )}

          {isError && (
            <Alert variant="destructive">
              <AlertDescription>{error instanceof Error ? error.message : 'Failed to load posts'}</AlertDescription>
            </Alert>
          )}

          {!isLoading && !error && posts.length === 0 && (
            <Card className="p-8 md:p-12 text-center">
              <p className="text-white/60">No posts yet. Be the first to share something!</p>
            </Card>
          )}

          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onPostUpdated={refreshPosts} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Feed;
