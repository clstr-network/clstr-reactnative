import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { useIdentityContext } from "@/contexts/IdentityContext";
import { useFeatureAccess, useRouteGuard } from "@/hooks/useFeatureAccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Users, CheckCircle, Search, UserPlus, UserMinus, ExternalLink } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assertValidUuid } from "@/lib/uuid";
import {
  fetchClubsWithFollowStatus,
  followClubConnection,
  unfollowClubConnection,
  type ClubProfile,
} from "@/lib/clubs-api";

// A Club is simply a profile with role='Club'

const getErrorMessage = (error: unknown, fallback = "Something went wrong") =>
  error instanceof Error ? error.message : fallback;

export default function Clubs() {
  const { profile } = useProfile();
  // UC-2 FIX: Use IdentityContext as authoritative source for college_domain
  const { collegeDomain } = useIdentityContext();
  const { 
    canViewClubs, 
    canJoinClub, 
    canFollowClub
  } = useFeatureAccess();
  const { toast } = useToast();

  // Route guard: redirect if user cannot view clubs
  // Note: useRouteGuard handles the redirect via useEffect, not early return
  useRouteGuard(canViewClubs, '/home');

  const [searchQuery, setSearchQuery] = useState("");
  const [followingInProgress, setFollowingInProgress] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const clubsQueryKey = useMemo(
    () => ["clubs", collegeDomain, profile?.id] as const,
    [collegeDomain, profile?.id]
  );

  const { data: clubs = [], isLoading, isError, error } = useQuery({
    queryKey: clubsQueryKey,
    queryFn: async () => {
      if (!collegeDomain || !profile?.id) return [] as ClubProfile[];
      return fetchClubsWithFollowStatus({
        profileId: profile.id,
        collegeDomain,
      });
    },
    enabled: Boolean(collegeDomain && profile?.id),
    staleTime: 15000,
  });

  const followingClubs = useMemo(
    () => clubs.filter(c => c.is_following),
    [clubs]
  );

  // Realtime subscription for profiles and connections changes
  useEffect(() => {
    if (!collegeDomain) return;

    const channel = supabase
      .channel('clubs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `college_domain=eq.${collegeDomain}`,
        },
        (payload) => {
          // Only reload if a Club profile changed
          if (payload.new && (payload.new as { role?: string }).role === 'Club') {
            queryClient.invalidateQueries({ queryKey: clubsQueryKey });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: clubsQueryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [collegeDomain, clubsQueryKey, queryClient]);

  // Handle view query parameter from search page
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const viewClubId = searchParams.get('view');
    if (viewClubId && clubs.length > 0) {
      // Navigate to the club's profile page
      searchParams.delete('view');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, clubs, setSearchParams]);

  const followMutation = useMutation({
    mutationFn: async (clubId: string) => {
      if (!profile?.id || !collegeDomain) {
        throw new Error("Profile missing");
      }
      await followClubConnection({
        requesterId: profile.id,
        clubId,
        collegeDomain,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubsQueryKey });
      toast({
        title: "Following",
        description: "You are now following this club!",
      });
    },
    onError: (error) => {
      const description = getErrorMessage(error, "Failed to follow club");
      console.error("Error following club:", error);
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    },
    onSettled: (_data, _error, clubId) => {
      if (!clubId) return;
      setFollowingInProgress(prev => {
        const next = new Set(prev);
        next.delete(clubId);
        return next;
      });
    }
  });

  const unfollowMutation = useMutation({
    mutationFn: async (clubId: string) => {
      if (!profile?.id) throw new Error("Profile missing");
      await unfollowClubConnection({ requesterId: profile.id, clubId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubsQueryKey });
      toast({
        title: "Unfollowed",
        description: "You have unfollowed this club.",
      });
    },
    onError: (error) => {
      const description = getErrorMessage(error, "Failed to unfollow club");
      console.error("Error unfollowing club:", error);
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    },
    onSettled: (_data, _error, clubId) => {
      if (!clubId) return;
      setFollowingInProgress(prev => {
        const next = new Set(prev);
        next.delete(clubId);
        return next;
      });
    }
  });

  const handleFollowClub = (clubId: string) => {
    if (!profile?.id || followingInProgress.has(clubId)) return;
    setFollowingInProgress(prev => new Set(prev).add(clubId));
    followMutation.mutate(clubId);
  };

  const handleUnfollowClub = (clubId: string) => {
    if (!profile?.id || followingInProgress.has(clubId)) return;
    setFollowingInProgress(prev => new Set(prev).add(clubId));
    unfollowMutation.mutate(clubId);
  };

  // Filter clubs by search query
  const filteredClubs = clubs.filter(club => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      club.full_name?.toLowerCase().includes(query) ||
      club.headline?.toLowerCase().includes(query) ||
      club.bio?.toLowerCase().includes(query)
    );
  });

  const ClubCard = ({ club }: { club: ClubProfile }) => {
    const isProcessing = followingInProgress.has(club.id);
    
    // Determine if user can interact with clubs based on FINAL matrix:
    // - Students: can JOIN clubs
    // - Alumni: can FOLLOW clubs
    // - Faculty: cannot join or follow
    // - Club: cannot join or follow
    const canInteract = canJoinClub || canFollowClub;
    const actionLabel = canJoinClub ? "Join" : canFollowClub ? "Follow" : null;
    const unfollowLabel = canJoinClub ? "Leave" : "Unfollow";

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <Link
              to={`/profile/${club.id}`}
              className="flex items-center gap-3 hover:opacity-80"
              onClick={() => assertValidUuid(club.id, "club profile id")}
            >
              <Avatar className="h-14 w-14">
                <AvatarImage src={club.avatar_url || undefined} />
                <AvatarFallback className="text-lg">
                  {club.full_name?.substring(0, 2).toUpperCase() || "CL"}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {club.full_name || "Unnamed Club"}
                  {club.is_verified && (
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                  )}
                </CardTitle>
                <CardDescription className="line-clamp-1">
                  {club.headline || "Campus Club"}
                </CardDescription>
              </div>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {club.bio && (
            <p className="text-sm text-white/60 line-clamp-3">{club.bio}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-white/60">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{club.followers_count} followers</span>
            </div>
          </div>

          <div className="flex gap-2">
            {club.is_following ? (
              <>
                {canInteract && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleUnfollowClub(club.id)}
                    disabled={isProcessing}
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    {isProcessing ? "Processing..." : unfollowLabel}
                  </Button>
                )}
                <Link
                  to={`/profile/${club.id}`}
                  className={canInteract ? "flex-1" : "w-full"}
                  onClick={() => assertValidUuid(club.id, "club profile id")}
                >
                  <Button variant="default" size="sm" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Profile
                  </Button>
                </Link>
              </>
            ) : (
              <>
                {canInteract && actionLabel && (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleFollowClub(club.id)}
                    disabled={isProcessing}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {isProcessing ? "Processing..." : actionLabel}
                  </Button>
                )}
                <Link
                  to={`/profile/${club.id}`}
                  className={canInteract ? "flex-1" : "w-full"}
                  onClick={() => assertValidUuid(club.id, "club profile id")}
                >
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Profile
                  </Button>
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/60">Loading clubs...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    const description = getErrorMessage(error, "Failed to load clubs");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-white/60">{description}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Campus Clubs & Organizations"
        description="Discover and join student clubs and organizations at your campus. Connect with like-minded students and build your community."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Campus Clubs",
          description: "Find and join student clubs and campus organizations.",
          about: {
            "@type": "Organization",
            name: "Campus Club Directory",
          },
        }}
      />
      <div className="container mx-auto py-6 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Campus Clubs</h1>
            <p className="text-white/60">
            Discover and follow clubs at your campus
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:items-center">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/club-auth">Register your club</Link>
          </Button>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
            <Input
              placeholder="Search clubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="all">All Clubs ({clubs.length})</TabsTrigger>
          <TabsTrigger value="following">Following ({followingClubs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredClubs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-white/60" />
                <p className="text-white/60">
                  {searchQuery
                    ? "No clubs found matching your search."
                    : "No clubs at your campus yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClubs.map(club => (
                <ClubCard key={club.id} club={club} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="following" className="space-y-4">
          {followingClubs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-white/60" />
                <p className="text-white/60">You're not following any clubs yet.</p>
                <p className="text-sm text-white/60 mt-2">
                  Follow clubs to stay updated on their activities and events.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {followingClubs
                .filter(club => {
                  if (!searchQuery.trim()) return true;
                  const query = searchQuery.toLowerCase();
                  return (
                    club.full_name?.toLowerCase().includes(query) ||
                    club.headline?.toLowerCase().includes(query) ||
                    club.bio?.toLowerCase().includes(query)
                  );
                })
                .map(club => (
                  <ClubCard key={club.id} club={club} />
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}
