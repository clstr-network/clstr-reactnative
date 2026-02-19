import { useState, useEffect, useMemo } from 'react';
import { CHANNELS } from '@clstr/shared/realtime/channels';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Loader2, UserPlus, MessageSquare, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProfile } from '@/contexts/ProfileContext';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { supabase } from '@/integrations/supabase/client';
import { UserBadge } from '@/components/ui/user-badge';
import { 
  sendConnectionRequest, 
  cancelConnectionRequest,
  getConnectionRequests, 
  acceptConnectionRequest, 
  rejectConnectionRequest, 
  getConnections,
  getConnectionStatusesForUsers
} from '@/lib/social-api';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { AdvancedFilters, NetworkFilters } from '@/components/network/AdvancedFilters';

interface NetworkUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  college_domain: string | null;
  bio: string | null;
  branch: string | null;
  graduation_year: string | null;
  enrollment_year: number | null;
  course_duration_years: number | null;
  connection_status?: 'none' | 'pending' | 'accepted';
}

interface ConnectionRequest {
  id: string;
  requester: NetworkUser;
  message: string | null;
  created_at: string;
}

const toNetworkUser = (
  user: Partial<NetworkUser> & {
    id: string;
    full_name?: string | null;
    avatar_url?: string | null;
    role?: string | null;
  }
): NetworkUser => ({
  id: user.id,
  full_name: user.full_name || 'Unknown',
  avatar_url: user.avatar_url ?? null,
  role: user.role || 'Member',
  college_domain: user.college_domain ?? null,
  bio: user.bio ?? null,
  branch: user.branch ?? null,
  graduation_year: user.graduation_year ?? null,
  enrollment_year: user.enrollment_year ?? null,
  course_duration_years: user.course_duration_years ?? null,
});

/**
 * Computes a contextual subtitle line for network cards.
 * Replaces the redundant college name with meaningful academic context.
 *
 * - Student: "CSE Ã¢â‚¬Â¢ 3rd Year" or "CSE Ã¢â‚¬Â¢ Final Year"
 * - Alumni: "Mechanical Ã¢â‚¬Â¢ Class of 2021"
 * - Faculty: "Faculty Ã¢â‚¬Â¢ Computer Science"
 * - Club: "Club"
 */
function getRoleContextLine(user: NetworkUser): string {
  const role = (user.role || '').toLowerCase();
  const branch = user.branch || null;

  if (role === 'student') {
    let yearLabel = '';
    if (user.enrollment_year) {
      const currentYear = new Date().getFullYear();
      const duration = user.course_duration_years || 4;
      const yearOfStudy = currentYear - user.enrollment_year + 1;
      if (yearOfStudy >= duration) {
        yearLabel = 'Final Year';
      } else if (yearOfStudy === 1) {
        yearLabel = '1st Year';
      } else if (yearOfStudy === 2) {
        yearLabel = '2nd Year';
      } else if (yearOfStudy === 3) {
        yearLabel = '3rd Year';
      } else if (yearOfStudy > 0) {
        yearLabel = `${yearOfStudy}th Year`;
      }
    } else if (user.graduation_year) {
      yearLabel = `Class of ${user.graduation_year}`;
    }
    return [branch, yearLabel].filter(Boolean).join(' Ã¢â‚¬Â¢ ') || 'Student';
  }

  if (role === 'alumni') {
    const gradLabel = user.graduation_year ? `Class of ${user.graduation_year}` : '';
    return [branch, gradLabel].filter(Boolean).join(' Ã¢â‚¬Â¢ ') || 'Alumni';
  }

  if (role === 'faculty') {
    return branch ? `Faculty Ã¢â‚¬Â¢ ${branch}` : 'Faculty';
  }

  if (role === 'club' || role === 'organization') {
    return branch ? `Club Ã¢â‚¬Â¢ ${branch}` : 'Club';
  }

  return branch || '';
}

// Query keys for React Query cache management
const NETWORK_QUERY_KEYS = {
  users: (domain: string | null) => ['network', 'users', domain] as const,
  requests: ['network', 'requests'] as const,
  connections: ['network', 'connections'] as const,
};

const Network = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<NetworkFilters>({});
  const [activeTab, setActiveTab] = useState<'discover' | 'requests' | 'connections'>('discover');
  const { profile, isLoading: profileLoading } = useProfile();
  const { collegeDomain, isLoading: permissionsLoading } = useRolePermissions();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Derived domain - strict: college_domain only
  const effectiveDomain = useMemo(() => collegeDomain ?? null, [collegeDomain]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'discover' || tab === 'requests' || tab === 'connections') {
      setActiveTab(tab);
    }
  }, [location.search]);

  // Fetch users from same domain using React Query
  const { 
    data: usersData, 
    isLoading: usersLoading, 
    error: usersError,
    refetch: refetchUsers 
  } = useQuery({
    queryKey: NETWORK_QUERY_KEYS.users(effectiveDomain),
    queryFn: async () => {
      if (!effectiveDomain || !profile?.id) {
        return [];
      }

      const { data, error } = await supabase
        .rpc('get_profiles_by_domain', {
          p_domain: effectiveDomain,
          p_limit: 500,
          p_offset: 0,
        });

      if (error) throw error;

      // RPC returns jsonb array Ã¢â‚¬â€ parse and filter out self
      const profiles = (Array.isArray(data) ? data : JSON.parse(data || '[]')) as NetworkUser[];
      return profiles.filter((u) => u.id !== profile.id);
    },
    enabled: !!profile?.id && !!effectiveDomain,
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch connection requests using React Query
  const { 
    data: requestsData, 
    isLoading: requestsLoading,
    refetch: refetchRequests 
  } = useQuery({
    queryKey: NETWORK_QUERY_KEYS.requests,
    queryFn: async () => {
      const requests = await getConnectionRequests();
      return requests.map((req: { id: string; requester: unknown; message: string | null; created_at: string }) => ({
        id: req.id,
        requester: req.requester
          ? toNetworkUser(req.requester as Partial<NetworkUser> & { id: string })
          : toNetworkUser({ id: req.id }),
        message: req.message ?? null,
        created_at: req.created_at,
      })) as ConnectionRequest[];
    },
    enabled: !!profile?.id,
    staleTime: 10_000, // 10 seconds
  });

  // Fetch connections using React Query
  const { 
    data: connectionsData, 
    isLoading: connectionsLoading,
    refetch: refetchConnections 
  } = useQuery({
    queryKey: NETWORK_QUERY_KEYS.connections,
    queryFn: async () => {
      const conns = await getConnections();
      return conns.map((c: { id: string; requester_id: string; receiver_id: string; requester?: unknown; receiver?: unknown }) => {
        const connectedUser = (c.requester_id === profile?.id ? c.receiver : c.requester) as
          | (Partial<NetworkUser> & { id?: string })
          | undefined;
        return toNetworkUser({
          ...(connectedUser || {}),
          id: connectedUser?.id || c.id,
        });
      });
    },
    enabled: !!profile?.id,
    staleTime: 10_000,
  });

  const visibleUserIds = useMemo(() => (usersData ?? []).map((u) => u.id), [usersData]);

  const { data: connectionStatuses } = useQuery({
    queryKey: QUERY_KEYS.networkKeys.connectionStatuses(...visibleUserIds),
    queryFn: async () => {
      const map = await getConnectionStatusesForUsers(visibleUserIds);
      return Object.fromEntries(map.entries()) as Record<string, string | null>;
    },
    enabled: !!profile?.id && visibleUserIds.length > 0,
    staleTime: 10_000,
  });

  // Compute users with connection status
  const usersWithStatus = useMemo(() => {
    const users = usersData || [];
    const statusByUserId = connectionStatuses ?? {};

    const normalizeStatus = (raw: string | null | undefined): 'none' | 'pending' | 'accepted' => {
      if (raw === 'accepted') return 'accepted';
      if (raw === 'pending') return 'pending';
      return 'none';
    };

    return users.map((user) => ({
      ...user,
      connection_status: normalizeStatus(statusByUserId[user.id]),
    }));
  }, [usersData, connectionStatuses]);

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    let filtered = usersWithStatus;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(query) ||
          user.role?.toLowerCase().includes(query) ||
          user.branch?.toLowerCase().includes(query)
      );
    }

    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    if (filters.branch) {
      filtered = filtered.filter(user =>
        user.branch?.toLowerCase() === filters.branch!.toLowerCase()
      );
    }

    if (filters.year) {
      filtered = filtered.filter(user => {
        const yearFilter = filters.year!;
        if (yearFilter === 'Alumni') {
          return user.role?.toLowerCase() === 'alumni';
        }
        // Match "1st Year", "2nd Year", etc.
        if (user.enrollment_year) {
          const currentYear = new Date().getFullYear();
          const duration = user.course_duration_years || 4;
          const yearOfStudy = currentYear - user.enrollment_year + 1;
          const clampedYear = yearOfStudy >= duration ? duration : yearOfStudy;
          const ordinals: Record<number, string> = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };
          const label = ordinals[clampedYear] || `${clampedYear}th Year`;
          return label === yearFilter;
        }
        return false;
      });
    }

    if (filters.location) {
      // Location filter not available on discovery cards yet Ã¢â‚¬â€ reserved for future
    }

    return filtered;
  }, [usersWithStatus, searchQuery, filters]);

  // Query key for connection statuses (used for optimistic updates)
  const statusQueryKey = ['network', 'connection-statuses', ...visibleUserIds] as const;

  // Send connection request mutation
  const sendRequestMutation = useMutation({
    mutationFn: (userId: string) => sendConnectionRequest(userId),
    onMutate: async (userId: string) => {
      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: statusQueryKey });
      // Snapshot previous value
      const previousStatuses = queryClient.getQueryData<Record<string, string | null>>(statusQueryKey);
      // Optimistically set this user's status to pending
      queryClient.setQueryData<Record<string, string | null>>(statusQueryKey, (old) => ({
        ...old,
        [userId]: 'pending',
      }));
      return { previousStatuses };
    },
    onSuccess: () => {
      toast({
        title: 'Connection request sent',
        description: 'Your request has been sent successfully',
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.connectedUsers() });
    },
    onError: (error: Error, _userId, context) => {
      // Roll back to previous value on error
      if (context?.previousStatuses) {
        queryClient.setQueryData(statusQueryKey, context.previousStatuses);
      }
      toast({
        title: 'Failed to send request',
        description: error.message || 'Unable to send connection request',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Refetch in background to ensure server state is in sync
      queryClient.invalidateQueries({ queryKey: statusQueryKey });
    },
  });

  // Cancel connection request mutation
  const cancelRequestMutation = useMutation({
    mutationFn: (receiverId: string) => cancelConnectionRequest(receiverId),
    onMutate: async (receiverId: string) => {
      await queryClient.cancelQueries({ queryKey: statusQueryKey });
      const previousStatuses = queryClient.getQueryData<Record<string, string | null>>(statusQueryKey);
      // Optimistically revert status to none
      queryClient.setQueryData<Record<string, string | null>>(statusQueryKey, (old) => ({
        ...old,
        [receiverId]: null,
      }));
      return { previousStatuses };
    },
    onSuccess: () => {
      toast({ title: 'Request cancelled' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.connectedUsers() });
    },
    onError: (error: Error, _receiverId, context) => {
      if (context?.previousStatuses) {
        queryClient.setQueryData(statusQueryKey, context.previousStatuses);
      }
      toast({
        title: 'Failed to cancel',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: statusQueryKey });
    },
  });

  // Accept request mutation
  const acceptMutation = useMutation({
    mutationFn: (requestId: string) => acceptConnectionRequest(requestId),
    onSuccess: () => {
      toast({
        title: 'Connection accepted',
        description: 'You are now connected',
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.network() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.connectedUsers() });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to accept',
        description: error.message || 'Unable to accept request',
        variant: 'destructive',
      });
    },
  });

  // Reject request mutation
  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => rejectConnectionRequest(requestId),
    onSuccess: () => {
      toast({ title: 'Request rejected' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.network() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.connectedUsers() });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to reject',
        description: error.message || 'Unable to reject request',
        variant: 'destructive',
      });
    },
  });

  // Realtime subscription for connections changes
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(CHANNELS.social.networkConnections(profile.id))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
          filter: `requester_id=eq.${profile.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.network() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.connectedUsers() });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
          filter: `receiver_id=eq.${profile.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.network() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.connectedUsers() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  const isLoading = profileLoading || permissionsLoading || usersLoading;
  const connectionRequests = requestsData || [];
  const connections = connectionsData || [];

  // Show loading state while profile is loading
  if (profileLoading || permissionsLoading) {
    return (
      <div className="home-theme bg-[#000000] min-h-screen text-white">
        <div className="container py-6 px-4 md:px-6">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            <span className="ml-2 text-white/60">Loading your network...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error if no profile
  if (!profile) {
    return (
      <div className="home-theme bg-[#000000] min-h-screen text-white">
        <div className="container py-6 px-4 md:px-6">
          <Alert variant="destructive">
            <AlertDescription>
              Please complete your profile setup to access the network feature.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!effectiveDomain) {
    return (
      <div className="home-theme bg-[#000000] min-h-screen text-white">
        <div className="container mx-auto py-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 text-white/70">
            Your profile is missing a verified college domain. Please complete onboarding to access the network.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-theme bg-[#000000] min-h-screen text-white">
      <div className="container py-6 px-4 md:px-6">
        <div className="space-y-5">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              My Network
            </h1>
            <p className="text-white/50 text-sm">
              Connect with students, alumni, and faculty from {effectiveDomain}
            </p>
          </div>

          {/* Search bar with Refresh + Filters */}
          <div className="flex flex-row gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                placeholder="Search by name, role, or branch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10 h-10"
              />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  refetchUsers();
                  refetchRequests();
                  refetchConnections();
                }}
                disabled={isLoading}
                className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-white/[0.06] border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <AdvancedFilters
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>
          </div>

          {/* Tabs Ã¢â‚¬â€ match Posts/About/Projects styling */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
            <div className="w-full rounded-xl bg-white/[0.04] border-b border-white/10 p-1 grid grid-cols-3 gap-1">
              {([
                { key: 'discover' as const, label: 'Discover' },
                { key: 'requests' as const, label: 'Requests', count: connectionRequests.length },
                { key: 'connections' as const, label: 'Connections', count: connections.length },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center justify-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-2 rounded-lg text-[11px] sm:text-sm font-medium transition-all text-white/45 min-w-0 overflow-hidden ${
                    activeTab === tab.key
                      ? 'bg-white/[0.10] text-white border border-white/15'
                      : 'hover:text-white/70 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <span className="truncate">{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`flex-shrink-0 text-[10px] sm:text-xs tabular-nums leading-none px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.key ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-white/40'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'discover' && (
            <div className="space-y-4">
              {usersLoading && (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-white/40" />
                </div>
              )}

              {usersError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {usersError instanceof Error ? usersError.message : 'Failed to load network'}
                  </AlertDescription>
                </Alert>
              )}

              {!usersLoading && !usersError && filteredUsers.length === 0 && (
                <div className="rounded-xl bg-white/[0.04] border border-white/10 p-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-white/20 mb-4" />
                  <p className="text-white/40">
                    {searchQuery || Object.keys(filters).length > 0
                      ? 'No users match your search criteria'
                      : 'No other users found from your institution yet'}
                  </p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="rounded-xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 flex flex-col gap-4 h-full overflow-hidden hover:bg-white/[0.06] transition-colors">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <Avatar 
                        className="h-14 w-14 sm:h-16 sm:w-16 cursor-pointer" 
                        onClick={() => navigate(`/profile/${user.id}`)}
                      >
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="bg-white/10 text-white/70">
                          {user.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <h3 
                          className="font-semibold truncate cursor-pointer text-white hover:text-white/80 transition-colors"
                          onClick={() => navigate(`/profile/${user.id}`)}
                        >
                          {user.full_name}
                        </h3>
                        <div className="mt-1 flex items-center gap-2">
                          <UserBadge userType={user.role} size="sm" />
                          {getRoleContextLine(user) && (
                            <span className="text-xs text-white/45 truncate">Ã¢â‚¬Â¢ {getRoleContextLine(user)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {user.bio && (
                      <p className="text-sm text-white/50 line-clamp-2 break-words">{user.bio}</p>
                    )}

                    <div className="mt-auto flex flex-col sm:flex-row gap-2">
                      {user.connection_status === 'none' && (
                        <Button
                          size="sm"
                          className="w-full sm:flex-1 bg-white/10 hover:bg-white/15 text-white border border-white/15"
                          onClick={() => sendRequestMutation.mutate(user.id)}
                          disabled={sendRequestMutation.isPending && sendRequestMutation.variables === user.id}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          {sendRequestMutation.isPending && sendRequestMutation.variables === user.id ? 'Sending...' : 'Connect'}
                        </Button>
                      )}
                      {user.connection_status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:flex-1 border-amber-500/30 text-amber-400/70 hover:bg-amber-500/10 bg-transparent"
                          onClick={() => cancelRequestMutation.mutate(user.id)}
                          disabled={cancelRequestMutation.isPending && cancelRequestMutation.variables === user.id}
                        >
                          {cancelRequestMutation.isPending && cancelRequestMutation.variables === user.id
                            ? 'Cancelling...'
                            : 'Cancel Request'}
                        </Button>
                      )}
                      {user.connection_status === 'accepted' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:flex-1 border-white/15 text-white/70 hover:bg-white/10 bg-transparent"
                          onClick={() => navigate(`/messaging?partner=${user.id}`)}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Message
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-4">
              {requestsLoading && (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-white/40" />
                </div>
              )}

              {!requestsLoading && connectionRequests.length === 0 ? (
                <div className="rounded-xl bg-white/[0.04] border border-white/10 p-12 text-center">
                  <p className="text-white/40">No pending connection requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {connectionRequests.map((request) => (
                    <div key={request.id} className="rounded-xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 hover:bg-white/[0.06] transition-colors">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <Avatar 
                          className="h-14 w-14 sm:h-16 sm:w-16 cursor-pointer"
                          onClick={() => request.requester?.id && navigate(`/profile/${request.requester.id}`)}
                        >
                          <AvatarImage src={request.requester?.avatar_url || undefined} />
                          <AvatarFallback className="bg-white/10 text-white/70">
                            {request.requester?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate text-white">{request.requester?.full_name || 'Unknown'}</h3>
                          <div className="mt-1 flex items-center gap-2">
                            <UserBadge userType={request.requester?.role} size="sm" />
                            {request.requester && getRoleContextLine(request.requester) && (
                              <span className="text-xs text-white/45 truncate">Ã¢â‚¬Â¢ {getRoleContextLine(request.requester)}</span>
                            )}
                          </div>
                          {request.message && (
                            <p className="text-sm mt-2 text-white/60 italic">"{request.message}"</p>
                          )}
                          <div className="flex flex-col sm:flex-row gap-2 mt-4">
                            <Button
                              size="sm"
                              className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-white border border-white/15"
                              onClick={() => acceptMutation.mutate(request.id)}
                              disabled={acceptMutation.isPending && acceptMutation.variables === request.id}
                            >
                              {acceptMutation.isPending && acceptMutation.variables === request.id ? 'Accepting...' : 'Accept'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full sm:w-auto border-white/10 text-white/50 hover:bg-white/[0.06] bg-transparent"
                              onClick={() => rejectMutation.mutate(request.id)}
                              disabled={rejectMutation.isPending && rejectMutation.variables === request.id}
                            >
                              {rejectMutation.isPending && rejectMutation.variables === request.id ? 'Declining...' : 'Decline'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'connections' && (
            <div className="space-y-4">
              {connectionsLoading && (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-white/40" />
                </div>
              )}

              {!connectionsLoading && connections.length === 0 ? (
                <div className="rounded-xl bg-white/[0.04] border border-white/10 p-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-white/20 mb-4" />
                  <p className="text-white/40">You haven't connected with anyone yet</p>
                  <p className="text-sm text-white/30 mt-2">
                    Start by discovering people from your institution
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {connections.map((user) => (
                    <div key={user.id} className="rounded-xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 flex flex-col gap-4 h-full overflow-hidden hover:bg-white/[0.06] transition-colors">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <Avatar 
                          className="h-14 w-14 sm:h-16 sm:w-16 cursor-pointer"
                          onClick={() => navigate(`/profile/${user.id}`)}
                        >
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-white/10 text-white/70">
                            {user.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <h3 
                            className="font-semibold truncate cursor-pointer text-white hover:text-white/80 transition-colors"
                            onClick={() => navigate(`/profile/${user.id}`)}
                          >
                            {user.full_name}
                          </h3>
                          <div className="mt-1 flex items-center gap-2">
                            <UserBadge userType={user.role} size="sm" />
                            {getRoleContextLine(user) && (
                              <span className="text-xs text-white/45 truncate">Ã¢â‚¬Â¢ {getRoleContextLine(user)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full mt-auto border-white/15 text-white/70 hover:bg-white/10 bg-transparent" 
                        onClick={() => navigate(`/messaging?partner=${user.id}`)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Network;
