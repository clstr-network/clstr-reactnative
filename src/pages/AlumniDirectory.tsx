import { useState, useEffect, useMemo } from 'react';
import { CHANNELS } from '@clstr/shared/realtime/channels';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, UserPlus, MessageSquare, RefreshCw, GraduationCap, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProfile } from '@/contexts/ProfileContext';
import { useIdentityContext } from '@/contexts/IdentityContext';
import { useFeatureAccess, useRouteGuard } from '@/hooks/useFeatureAccess';
import { supabase } from '@/integrations/supabase/client';
import { sendConnectionRequest, getConnectionStatusesForUsers } from '@/lib/social-api';
import { assertValidUuid } from '@clstr/shared/utils/uuid';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@clstr/shared/query-keys';

interface AlumniUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  university: string | null;
  college_domain: string | null;
  bio: string | null;
  headline: string | null;
  location: string | null;
  branch: string | null;
  graduation_year: number | null;
  // Alumni-specific fields from alumni_profiles join
  current_company: string | null;
  current_position: string | null;
  industry: string | null;
  willing_to_mentor: boolean;
  connection_status?: 'none' | 'pending' | 'accepted';
}

// Query keys for React Query cache management
const ALUMNI_QUERY_KEYS = {
  alumni: (domain: string | null) => ['alumni-directory', 'alumni', domain] as const,
};

const AlumniDirectory = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [graduationYearFilter, setGraduationYearFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [mentorFilter, setMentorFilter] = useState<boolean | null>(null);
  const { profile, isLoading: profileLoading } = useProfile();
  
  // FINAL Matrix Permissions for Alumni Directory:
  // canViewAlumniDirectory: Student Ã¢Å“â€¦, Alumni Ã¢Å“â€¦, Faculty Ã¢Å“â€¦, Club Ã°Å¸Å¡Â«
  // canConnectWithAlumni: Student Ã¢Å“â€¦, Alumni Ã¢Å“â€¦, Faculty Ã¢Å“â€¦, Club Ã°Å¸Å¡Â«
  const { 
    canViewAlumniDirectory, 
    canConnectWithAlumni,
    isLoading: permissionsLoading 
  } = useFeatureAccess();
  
  // Route guard - redirect Clubs away from Alumni Directory
  useRouteGuard(canViewAlumniDirectory, '/home');
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Derived domain Ã¢â‚¬â€ authoritative source is IdentityContext (server RPC)
  const { collegeDomain: identityDomain } = useIdentityContext();
  const effectiveDomain = identityDomain ?? null;

  // Fetch alumni from same domain using React Query
  const {
    data: alumniData,
    isLoading: alumniLoading,
    error: alumniError,
    refetch: refetchAlumni,
  } = useQuery({
    queryKey: ALUMNI_QUERY_KEYS.alumni(effectiveDomain),
    queryFn: async () => {
      if (!effectiveDomain || !profile?.id) {
        return [];
      }

      assertValidUuid(profile.id, 'profileId');

      // Use SECURITY DEFINER RPC for alumni profiles (bypasses own-row RLS)
      const { data, error } = await supabase
        .rpc('get_alumni_by_domain', {
          p_domain: effectiveDomain,
          p_limit: 500,
          p_offset: 0,
        });

      if (error) throw error;

      // RPC returns jsonb array with flattened alumni data
      const alumni = (Array.isArray(data) ? data : JSON.parse(data || '[]')) as Array<Record<string, unknown>>;

      // Transform to AlumniUser, filtering out self
      return alumni
        .filter((user) => user.id !== profile.id)
        .map((user) => ({
          id: user.id as string,
          full_name: (user.full_name as string) || 'Unknown',
          avatar_url: (user.avatar_url as string | null),
          role: (user.role as string) || 'Alumni',
          university: (user.university as string | null),
          college_domain: (user.college_domain as string | null),
          bio: (user.bio as string | null),
          headline: (user.headline as string | null),
          location: (user.location as string | null),
          branch: (user.branch as string | null),
          graduation_year: (user.graduation_year as number | null),
          current_company: (user.current_company as string | null) || null,
          current_position: (user.current_position as string | null) || null,
          industry: (user.industry as string | null) || null,
          willing_to_mentor: (user.willing_to_mentor as boolean) || false,
        } as AlumniUser));
    },
    enabled: !!profile?.id && !!effectiveDomain,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });

  const visibleAlumniIds = useMemo(() => (alumniData ?? []).map((u) => u.id), [alumniData]);

  const { data: connectionStatuses } = useQuery({
    queryKey: QUERY_KEYS.social.alumniDirectoryStatuses(...visibleAlumniIds),
    queryFn: async () => {
      const map = await getConnectionStatusesForUsers(visibleAlumniIds);
      return Object.fromEntries(map.entries()) as Record<string, string | null>;
    },
    enabled: !!profile?.id && visibleAlumniIds.length > 0,
    staleTime: 10_000,
  });

  // Compute alumni with connection status
  const alumniWithStatus = useMemo(() => {
    const alumni = alumniData || [];
    const statusByUserId = connectionStatuses ?? {};

    const normalizeStatus = (raw: string | null | undefined): 'none' | 'pending' | 'accepted' => {
      if (raw === 'accepted') return 'accepted';
      if (raw === 'pending') return 'pending';
      return 'none';
    };

    return alumni.map((alum) => ({
      ...alum,
      connection_status: normalizeStatus(statusByUserId[alum.id]),
    }));
  }, [alumniData, connectionStatuses]);

  // Get unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    const alumni = alumniData || [];
    const years = [...new Set(alumni.map(a => a.graduation_year).filter((year): year is number => typeof year === 'number'))]
      .sort((a, b) => b - a);
    const industries = [...new Set(alumni.map(a => a.industry).filter(Boolean))].sort();
    return { years, industries };
  }, [alumniData]);

  // Filter alumni based on search and filters
  const filteredAlumni = useMemo(() => {
    let filtered = alumniWithStatus;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (alum) =>
          alum.full_name?.toLowerCase().includes(query) ||
          alum.current_company?.toLowerCase().includes(query) ||
          alum.current_position?.toLowerCase().includes(query) ||
          alum.branch?.toLowerCase().includes(query) ||
          alum.industry?.toLowerCase().includes(query)
      );
    }

    if (graduationYearFilter !== 'all') {
      filtered = filtered.filter(alum => alum.graduation_year !== null && String(alum.graduation_year) === graduationYearFilter);
    }

    if (industryFilter !== 'all') {
      filtered = filtered.filter(alum => alum.industry === industryFilter);
    }

    if (mentorFilter !== null) {
      filtered = filtered.filter(alum => alum.willing_to_mentor === mentorFilter);
    }

    return filtered;
  }, [alumniWithStatus, searchQuery, graduationYearFilter, industryFilter, mentorFilter]);

  // Query key for connection statuses (used for optimistic updates)
  const alumniStatusQueryKey = ['alumni-directory', 'connection-statuses', ...visibleAlumniIds] as const;

  // Send connection request mutation
  const sendRequestMutation = useMutation({
    mutationFn: (userId: string) => {
      if (!canConnectWithAlumni) {
        throw new Error('You are not allowed to send connection requests.');
      }
      return sendConnectionRequest(userId);
    },
    onMutate: async (userId: string) => {
      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: alumniStatusQueryKey });
      // Snapshot previous value
      const previousStatuses = queryClient.getQueryData<Record<string, string | null>>(alumniStatusQueryKey);
      // Optimistically set this user's status to pending
      queryClient.setQueryData<Record<string, string | null>>(alumniStatusQueryKey, (old) => ({
        ...old,
        [userId]: 'pending',
      }));
      return { previousStatuses };
    },
    onSuccess: () => {
      toast({
        title: 'Connection request sent',
        description: 'Your request has been sent to this alumni',
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.network() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.connectedUsers() });
    },
    onError: (error: Error, _userId, context) => {
      // Roll back to previous value on error
      if (context?.previousStatuses) {
        queryClient.setQueryData(alumniStatusQueryKey, context.previousStatuses);
      }
      toast({
        title: 'Failed to send request',
        description: error.message || 'Unable to send connection request',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Refetch in background to ensure server state is in sync
      queryClient.invalidateQueries({ queryKey: alumniStatusQueryKey });
    },
  });

  // Realtime subscription for connections changes
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(CHANNELS.social.alumniDirectoryConnections(profile.id))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
          filter: `requester_id=eq.${profile.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.alumniDirectory() });
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
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.alumniDirectory() });
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

  // Realtime subscription for alumni profile changes
  const alumniIdsFilter = useMemo(() => (visibleAlumniIds.length > 0 ? visibleAlumniIds.join(',') : ''), [visibleAlumniIds]);

  useEffect(() => {
    if (!effectiveDomain || !profile?.id) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    const profilesChannel = supabase
      .channel(CHANNELS.social.alumniDirectoryProfiles(effectiveDomain))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `college_domain=eq.${effectiveDomain}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.alumniDirectory() });
        }
      )
      .subscribe();

    channels.push(profilesChannel);

    if (alumniIdsFilter) {
      const alumniProfilesChannel = supabase
        .channel(CHANNELS.social.alumniDirectoryAlumniProfiles(effectiveDomain))
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'alumni_profiles',
            filter: `user_id=in.(${alumniIdsFilter})`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.alumniDirectory() });
          }
        )
        .subscribe();

      channels.push(alumniProfilesChannel);
    }

    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [effectiveDomain, profile?.id, alumniIdsFilter, queryClient]);

  const clearFilters = () => {
    setGraduationYearFilter('all');
    setIndustryFilter('all');
    setMentorFilter(null);
    setSearchQuery('');
  };

  const activeFilterCount = [
    graduationYearFilter !== 'all',
    industryFilter !== 'all',
    mentorFilter !== null,
  ].filter(Boolean).length;

  const isLoading = profileLoading || permissionsLoading || alumniLoading;

  // Show loading state
  if (profileLoading || permissionsLoading) {
    return (
      <div className="home-theme bg-[#000000] min-h-screen text-white">
        <div className="container py-6 px-4 md:px-6">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            <span className="ml-2 text-white/60">Loading alumni directory...</span>
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
              Please complete your profile setup to access the alumni directory.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Check permission
  if (!canViewAlumniDirectory) {
    return (
      <div className="home-theme bg-[#000000] min-h-screen text-white">
        <div className="container py-6 px-4 md:px-6">
          <Alert>
            <AlertDescription>
              You don't have permission to view the alumni directory.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Show message if no domain available
  if (!effectiveDomain) {
    return (
      <div className="home-theme bg-[#000000] min-h-screen text-white">
        <div className="container mx-auto py-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 text-white/70">
            Your college domain is not set. Please update your profile with a valid academic email to access the alumni directory.
            <button
              className="block mt-4 px-4 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm"
              onClick={() => navigate('/settings')}
            >
              Update Profile
            </button>
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
              Alumni Directory
            </h1>
            <p className="text-white/50 text-sm">
              Connect with alumni from {effectiveDomain}
            </p>
          </div>

          {/* Search bar + Refresh */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 order-first sm:order-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                placeholder="Search by name, company, position, branch, or industry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10 h-10"
              />
            </div>
            <button
              onClick={() => refetchAlumni()}
              disabled={isLoading}
              className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-white/[0.06] border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Filter pills */}
          <div className="rounded-xl bg-white/[0.04] border border-white/10 p-1.5 flex flex-wrap gap-1">
            {/* Graduation year pills */}
            <button
              onClick={() => setGraduationYearFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                graduationYearFilter === 'all'
                  ? 'bg-white/[0.10] text-white border border-white/15'
                  : 'text-white/45 hover:text-white/70 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              All Years
            </button>
            {filterOptions.years.map((year) => (
              <button
                key={year}
                onClick={() => setGraduationYearFilter(graduationYearFilter === String(year) ? 'all' : String(year))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  graduationYearFilter === String(year)
                    ? 'bg-white/[0.10] text-white border border-white/15'
                    : 'text-white/45 hover:text-white/70 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                {year}
              </button>
            ))}

            {filterOptions.industries.length > 0 && (
              <div className="w-px h-6 bg-white/10 self-center mx-0.5" />
            )}

            {/* Industry pills */}
            {filterOptions.industries.map((industry) => (
              <button
                key={industry}
                onClick={() => setIndustryFilter(industryFilter === industry ? 'all' : industry!)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  industryFilter === industry
                    ? 'bg-white/[0.10] text-white border border-white/15'
                    : 'text-white/45 hover:text-white/70 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                {industry}
              </button>
            ))}

            <div className="w-px h-6 bg-white/10 self-center mx-0.5" />

            {/* Mentor toggle pill */}
            <button
              onClick={() => setMentorFilter(mentorFilter === true ? null : true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mentorFilter === true
                  ? 'bg-white/[0.10] text-white border border-white/15'
                  : 'text-white/45 hover:text-white/70 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              Mentors
            </button>

            {activeFilterCount > 0 && (
              <>
                <div className="w-px h-6 bg-white/10 self-center mx-0.5" />
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/40 hover:text-white/60 transition-all"
                >
                  Clear ({activeFilterCount})
                </button>
              </>
            )}
          </div>

          {/* Result count Ã¢â‚¬â€ muted metadata */}
          {!alumniLoading && !alumniError && (
            <p className="text-xs text-white/30">{filteredAlumni.length} alumni found</p>
          )}

          {/* Error State */}
          {alumniError && (
            <Alert variant="destructive">
              <AlertDescription>
                {alumniError instanceof Error ? alumniError.message : 'Failed to load alumni directory'}
              </AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {alumniLoading && (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white/40" />
            </div>
          )}

          {/* Empty State */}
          {!alumniLoading && !alumniError && filteredAlumni.length === 0 && (
            <div className="rounded-xl bg-white/[0.04] border border-white/10 p-12 text-center">
              <GraduationCap className="h-12 w-12 mx-auto text-white/20 mb-4" />
              <p className="text-white/40">
                {searchQuery || activeFilterCount > 0
                  ? 'No alumni match your search criteria'
                  : 'No alumni found from your institution yet'}
              </p>
            </div>
          )}

          {/* Alumni Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAlumni.map((alum) => (
              <div key={alum.id} className="rounded-xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 flex flex-col gap-4 h-full overflow-hidden hover:bg-white/[0.06] transition-colors">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <Avatar
                    className="h-14 w-14 sm:h-16 sm:w-16 cursor-pointer flex-shrink-0"
                    onClick={() => navigate(`/profile/${alum.id}`)}
                  >
                    <AvatarImage src={alum.avatar_url || undefined} />
                    <AvatarFallback className="bg-white/10 text-white/70">
                      {alum.full_name?.split(' ').map((n) => n[0]).join('') || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <h3
                      className="font-semibold truncate cursor-pointer text-white hover:text-white/80 transition-colors"
                      onClick={() => navigate(`/profile/${alum.id}`)}
                    >
                      {alum.full_name}
                    </h3>
                    {alum.headline ? (
                      <p className="text-sm text-white/50 truncate">{alum.headline}</p>
                    ) : alum.current_position && alum.current_company ? (
                      <p className="text-sm text-white/50 truncate">
                        {alum.current_position} at {alum.current_company}
                      </p>
                    ) : (
                      <p className="text-sm text-white/50">Alumni</p>
                    )}
                    {(alum.branch || alum.graduation_year) && (
                      <p className="text-xs text-white/35 truncate">
                        {[alum.branch, alum.graduation_year ? `Class of ${alum.graduation_year}` : null].filter(Boolean).join(' Ã¢â‚¬Â¢ ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Metadata row */}
                <div className="flex flex-wrap gap-2 text-xs">
                  {alum.location && (
                    <span className="flex items-center gap-1 text-white/40">
                      <MapPin className="h-3 w-3" /> {alum.location}
                    </span>
                  )}
                  {alum.industry && (
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-white/40">
                      {alum.industry}
                    </span>
                  )}
                  {alum.willing_to_mentor && (
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-white/40">
                      Open to Mentor
                    </span>
                  )}
                </div>

                {alum.bio && (
                  <p className="text-sm text-white/50 line-clamp-2 break-words">{alum.bio}</p>
                )}

                {/* Actions */}
                <div className="mt-auto flex flex-col sm:flex-row gap-2">
                  {alum.connection_status === 'none' && (
                    <Button
                      size="sm"
                      className="w-full sm:flex-1 bg-white/10 hover:bg-white/15 text-white border border-white/15"
                      onClick={() => sendRequestMutation.mutate(alum.id)}
                      disabled={sendRequestMutation.isPending || !canConnectWithAlumni}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {sendRequestMutation.isPending ? 'Sending...' : 'Connect'}
                    </Button>
                  )}
                  {alum.connection_status === 'pending' && (
                    <Button size="sm" variant="outline" className="w-full sm:flex-1 border-white/10 text-white/40 bg-transparent" disabled>
                      Request Pending
                    </Button>
                  )}
                  {alum.connection_status === 'accepted' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:flex-1 border-white/15 text-white/70 hover:bg-white/10 bg-transparent"
                      onClick={() => navigate(`/messaging?partner=${alum.id}`)}
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
      </div>
    </div>
  );
};

export default AlumniDirectory;
