
import { useState, useEffect, useCallback } from "react";
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { CHANNELS } from '@clstr/shared/realtime/channels';
import { Link } from "react-router-dom";
import { Search, Plus, UserMinus, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { UserBadge } from "@/components/ui/user-badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { BasicUserProfile } from "@clstr/shared/types/profile";
import {
  getConnections,
  getConnectionRequests,
  removeConnection,
  acceptConnectionRequest,
  rejectConnectionRequest,
} from "@/lib/social-api";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { assertValidUuid } from "@clstr/shared/utils/uuid";

type ConnectionListItem = {
  id: string;
  message?: string | null;
  profile?: BasicUserProfile | null;
};

type PendingRequestItem = {
  id: string;
  message?: string | null;
  requester?: BasicUserProfile | null;
};

interface ProfileConnectionsProps {
  profileId: string;
  isCurrentUser: boolean;
}

const ProfileConnections = ({ profileId, isCurrentUser }: ProfileConnectionsProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [connectionsList, setConnectionsList] = useState<ConnectionListItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequestItem[]>([]);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const loadConnections = useCallback(async () => {
    try {
      assertValidUuid(profileId, "profileId");
      if (!isCurrentUser) {
        setConnectionsList([]);
        return;
      }

      const data = await getConnections();
      const mapped = data.map((connection) => {
        const otherProfile =
          connection.requester_id === profileId ? connection.receiver : connection.requester;

        return {
          id: connection.id,
          message: connection.message ?? null,
          profile: (otherProfile as BasicUserProfile | undefined) ?? null,
        } satisfies ConnectionListItem;
      });

      setConnectionsList(mapped);
    } catch (error) {
      console.error('Failed to load connections:', error);
      toast({
        title: "Error",
        description: "Failed to load connections.",
        variant: "destructive",
      });
    }
  }, [isCurrentUser, profileId]);

  const loadPendingRequests = useCallback(async () => {
    try {
      assertValidUuid(profileId, "profileId");
      if (!isCurrentUser) {
        setPendingRequests([]);
        return;
      }

      const data = await getConnectionRequests();
      const mapped = data.map((request) => ({
        id: request.id,
        message: request.message ?? null,
        requester: (request.requester as BasicUserProfile | undefined) ?? null,
      })) satisfies PendingRequestItem[];

      setPendingRequests(mapped);
    } catch (error) {
      console.error('Failed to load pending requests:', error);
    }
  }, [isCurrentUser, profileId]);

  useEffect(() => {
    loadConnections();
    if (isCurrentUser) {
      loadPendingRequests();
    }
  }, [profileId, isCurrentUser, loadConnections, loadPendingRequests]);

  useEffect(() => {
    const connectionIds = connectionsList
      .map((connection) => connection.profile?.id)
      .filter(Boolean) as string[];
    const requestIds = pendingRequests
      .map((request) => request.requester?.id)
      .filter(Boolean) as string[];

    const trackedIds = Array.from(new Set([...connectionIds, ...requestIds]));
    if (trackedIds.length === 0) return;

    const filter = `id=in.(${trackedIds.join(',')})`;
    const channel = supabase
      .channel(CHANNELS.social.profileConnections(profileId))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter },
        () => {
          loadConnections();
          if (isCurrentUser) {
            loadPendingRequests();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionsList, isCurrentUser, loadConnections, loadPendingRequests, pendingRequests, profileId]);

  useEffect(() => {
    if (!profileId) return;

    const channel = supabase
      .channel(CHANNELS.social.profileConnectionsUpdates(profileId))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "connections", filter: `requester_id=eq.${profileId}` },
        () => {
          loadConnections();
          if (isCurrentUser) {
            loadPendingRequests();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "connections", filter: `receiver_id=eq.${profileId}` },
        () => {
          loadConnections();
          if (isCurrentUser) {
            loadPendingRequests();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, isCurrentUser, loadConnections, loadPendingRequests]);

  // Filter connections based on search term
  const filteredConnections = connectionsList.filter(connection =>
    connection.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRemoveConnection = async (connectionId: string) => {
    try {
      setIsLoading(true);
      await removeConnection(connectionId);
      await loadConnections();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats(profileId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.network() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.connectedUsers() });
      toast({
        title: "Connection removed",
        description: "The connection has been removed from your network.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Error",
        description: errorMessage || "Failed to remove connection.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      setIsLoading(true);
      await acceptConnectionRequest(requestId);
      await loadConnections();
      await loadPendingRequests();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats(profileId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.network() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.connectedUsers() });
      toast({
        title: "Request accepted",
        description: "Connection request has been accepted.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Error",
        description: errorMessage || "Failed to accept connection request.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      setIsLoading(true);
      await rejectConnectionRequest(requestId);
      await loadPendingRequests();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats(profileId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.network() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.connectedUsers() });
      toast({
        title: "Request rejected",
        description: "Connection request has been rejected.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Error",
        description: errorMessage || "Failed to reject connection request.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-medium text-white">Connections ({connectionsList.length})</h3>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              placeholder="Search connections"
              className="pl-10 w-full bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 focus:border-white/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="w-full sm:w-auto border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white/80">All Filters</Button>

            {isCurrentUser && (
              <Button
                variant="default"
                className="bg-white/[0.10] hover:bg-white/[0.15] text-white border border-white/10 w-full sm:w-auto"
                onClick={() => setIsManageModalOpen(true)}
              >
                Manage Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredConnections.map((connection) => (
          <div
            key={connection.id}
            className="flex flex-col gap-4 p-4 border border-white/10 rounded-xl bg-white/[0.04] hover:bg-white/[0.06] transition-all sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4 min-w-0">
              <UserAvatar
                src={connection.profile?.avatar_url || ''}
                name={connection.profile?.full_name || 'Unknown'}
                userType={connection.profile?.role}
                size="md"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Link to={`/profile/${connection.profile?.id}`} className="font-medium text-white/80 hover:text-white truncate">
                    {connection.profile?.full_name || 'Unknown'}
                  </Link>
                  {connection.profile?.role && (
                    <UserBadge userType={connection.profile.role} size="sm" />
                  )}
                </div>
                <p className="text-sm text-white/40 truncate">{connection.profile?.headline || 'No headline'}</p>
              </div>
            </div>

            {isCurrentUser && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white/30 hover:text-white/50 hover:bg-white/[0.06] w-full sm:w-auto justify-center"
                onClick={() => handleRemoveConnection(connection.id)}
                disabled={isLoading}
              >
                <UserMinus className="h-4 w-4 mr-1" />
                Remove
              </Button>
            )}
          </div>
        ))}
      </div>

      {connectionsList.length === 0 && (
        <div className="text-center py-8">
          <p className="text-white/40 mb-2">No connections to display.</p>
          {isCurrentUser && (
            <Button className="bg-white/[0.10] hover:bg-white/[0.15] text-white border border-white/10">
              <Plus className="h-4 w-4 mr-2" />
              Find Connections
            </Button>
          )}
        </div>
      )}

      {/* Manage Profile Modal */}
      <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Connections</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="connections" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="connections">Connections ({connectionsList.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending Requests ({pendingRequests.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="connections" className="mt-4 space-y-4">
              <Input
                placeholder="Search your connections"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-4"
              />

              {filteredConnections.length > 0 ? (
                <div className="space-y-3">
                  {filteredConnections.map((connection) => (
                    <div
                      key={connection.id}
                      className="flex flex-col gap-3 p-3 border border-white/10 rounded-xl bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="flex-shrink-0">
                          <AvatarImage src={connection.profile?.avatar_url || undefined} alt={connection.profile?.full_name || 'Unknown'} className="object-cover" />
                          <AvatarFallback className="text-xs font-semibold bg-white/[0.08] text-white/60">
                            {connection.profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate text-white/80">{connection.profile?.full_name || 'Unknown'}</div>
                          <div className="text-sm text-white/40 truncate">{connection.profile?.headline || 'No headline'}</div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/30 hover:text-white/50 hover:bg-white/[0.06] w-full sm:w-auto justify-center"
                        onClick={() => handleRemoveConnection(connection.id)}
                        disabled={isLoading}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-white/40">No connections found.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pending" className="mt-4 space-y-4">
              {pendingRequests.length > 0 ? (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex flex-col gap-3 p-3 border border-white/10 rounded-xl bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="flex-shrink-0">
                          <AvatarImage src={request.requester?.avatar_url || undefined} alt={request.requester?.full_name || 'Unknown'} className="object-cover" />
                          <AvatarFallback className="text-xs font-semibold bg-white/[0.08] text-white/60">
                            {request.requester?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate text-white/80">{request.requester?.full_name || 'Unknown'}</div>
                          <div className="text-sm text-white/40 truncate">{request.requester?.headline || 'No headline'}</div>
                          {request.message && (
                            <div className="text-xs text-white/30 mt-1">{request.message}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                          onClick={() => handleAcceptRequest(request.id)}
                          disabled={isLoading}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/30 hover:text-white/50 hover:bg-white/[0.06]"
                          onClick={() => handleRejectRequest(request.id)}
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-white/40">No pending requests.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileConnections;
