import { useEffect, useMemo } from "react";
import { CHANNELS } from '@clstr/shared/realtime/channels';
import { Button } from "@/components/ui/button";
import { UserPlus, Check } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { UserBadge, UserType, normalizeUserType } from "@/components/ui/user-badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { assertValidUuid } from "@clstr/shared/utils/uuid";
import { getConnectionStatusesForUsers, sendConnectionRequest, countMutualConnectionsBatch } from "@/lib/social-api";

interface ConnectionProfile {
  id: string;
  name: string;
  avatar: string;
  role: string;
  batch: string;
  mutual: number | null;
  userType?: UserType;
  isConnected?: boolean;
  isPending?: boolean;
}

const TrendingConnections = () => {
  const { profile } = useProfile();
  const { canSendConnectionRequests } = useRolePermissions();
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ["trending-connections", profile?.id, profile?.college_domain] as const,
    [profile?.id, profile?.college_domain]
  );

  const connectionsQuery = useQuery({
    queryKey,
    queryFn: async (): Promise<ConnectionProfile[]> => {
      if (!profile?.id) throw new Error("Not authenticated");
      assertValidUuid(profile.id, "userId");

      // Prefer explicit domain isolation; fall back to allowing the DB/RLS to filter.
      const baseQuery = supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role, year_of_completion, graduation_year, profile_completion, last_seen")
        .neq("id", profile.id)
        .limit(2)
        .order("profile_completion", { ascending: false });

      const { data: profiles, error } = profile.college_domain
        ? await baseQuery.eq("college_domain", profile.college_domain)
        : await baseQuery;

      if (error) throw error;

      const rows = profiles ?? [];
      const ids = rows.map((r) => r.id);

      const statuses = await getConnectionStatusesForUsers(ids);

      // Fetch mutual connection counts using batch RPC (more efficient)
      let mutualCounts = new Map<string, number>();
      if (ids.length > 0) {
        try {
          mutualCounts = await countMutualConnectionsBatch(profile.id, ids);
        } catch (error) {
          // If batch fails, treat counts as unavailable (don't lie with 0)
          console.warn('Failed to fetch mutual counts:', error);
        }
      }

      return rows.map((r) => {
        const status = statuses.get(r.id);
        return {
          id: r.id,
          name: r.full_name || "Unknown User",
          avatar: r.avatar_url || "",
          role: String(r.role || "Member"),
          batch: r.year_of_completion
            ? `Class of ${r.year_of_completion}`
            : r.graduation_year
              ? `Class of ${r.graduation_year}`
              : "",
          mutual: mutualCounts.has(r.id) ? (mutualCounts.get(r.id) ?? 0) : null,
          userType: normalizeUserType(r.role || undefined),
          isConnected: status === "accepted",
          isPending: status === "pending",
        };
      });
    },
    enabled: Boolean(profile?.id),
    staleTime: 30000,
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (receiverId: string) => {
      assertValidUuid(receiverId, "receiverId");
      return sendConnectionRequest(receiverId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.network() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.connectedUsers() });
    },
  });

  const refresh = useMemo(
    () => () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.network() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.connectedUsers() });
    },
    [queryClient, queryKey]
  );

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(CHANNELS.social.trendingConnections(profile.id))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connections",
          filter: `requester_id=eq.${profile.id}`,
        },
        refresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connections",
          filter: `receiver_id=eq.${profile.id}`,
        },
        refresh
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, refresh]);

  const handleConnect = async (connectionId: string) => {
    if (!profile?.id) {
      toast({ title: "Please login", description: "You need to login to connect with others" });
      return;
    }

    if (!canSendConnectionRequests) {
      toast({
        title: "Not permitted",
        description: "Your role is not allowed to send connection requests.",
        variant: "destructive",
      });
      return;
    }

    try {
      await sendRequestMutation.mutateAsync(connectionId);
      toast({ title: "Connection request sent", description: "Your connection request has been sent." });
    } catch (error) {
      toast({
        title: "Error sending connection request",
        description: error instanceof Error ? error.message : "Failed to send request",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="alumni-card p-5 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-medium text-sm text-white/70 uppercase tracking-wider">Trending Connections</h3>
        <RouterLink to="/network" className="text-xs text-blue-500/60 hover:text-blue-500 transition-colors">View all</RouterLink>
      </div>
      {connectionsQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="flex items-center justify-between animate-pulse gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/10 flex-shrink-0"></div>
                <div className="space-y-2 min-w-0">
                  <div className="h-3 bg-white/10 rounded w-24"></div>
                  <div className="h-2 bg-white/10 rounded w-32"></div>
                  <div className="h-2 bg-white/10 rounded w-20"></div>
                </div>
              </div>
              <div className="h-8 w-20 bg-white/10 rounded flex-shrink-0"></div>
            </div>
          ))}
        </div>
      ) : connectionsQuery.isError ? (
        <div className="text-center py-4 text-sm text-white/50">
          <p>Unable to load connections</p>
          <Button
            variant="link"
            size="sm"
            onClick={() => connectionsQuery.refetch()}
            className="text-white/60 hover:text-white"
          >
            Try again
          </Button>
        </div>
      ) : (connectionsQuery.data ?? []).length === 0 ? (
        <div className="text-center py-6 text-sm text-white/40">
          <UserPlus className="h-8 w-8 mx-auto mb-2 text-white/20" />
          <p>No connections to show</p>
          <p className="text-xs mt-1">Start growing your network!</p>
        </div>
      ) : (
        <div className="space-y-5">
          {(connectionsQuery.data ?? []).map(person => (
            <div key={person.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <RouterLink to={`/profile/${person.id}`} className="hover:opacity-90 transition-opacity flex-shrink-0">
                  <UserAvatar
                    src={person.avatar}
                    name={person.name}
                    userType={person.userType}
                    size="sm"
                  />
                </RouterLink>
                <div className="min-w-0 flex-1">
                  <RouterLink to={`/profile/${person.id}`} className="hover:text-white transition-colors">
                    <p className="text-sm font-medium truncate" title={person.name}>
                      {person.name}
                    </p>
                  </RouterLink>
                  <div className="mt-1 flex items-center gap-1.5">
                    {person.userType && (
                      <UserBadge userType={person.userType} size="sm" showIcon={false} className="shrink-0" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-white/50 leading-tight">
                    {(person.mutual ?? 0)} mutual connections
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0">
                {person.isConnected ? (
                  <span className="flex items-center gap-1 text-xs text-white/60 whitespace-nowrap">
                    <Check className="h-3.5 w-3.5" />
                    Connected
                  </span>
                ) : person.isPending ? (
                  <span className="text-xs text-white/40 whitespace-nowrap">
                    Pending
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-3 justify-center border-blue-500/25 text-blue-500/80 hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                    onClick={() => handleConnect(person.id)}
                    disabled={sendRequestMutation.isPending}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    <span className="text-xs">Connect</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default TrendingConnections;
