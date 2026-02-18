
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/avatar';
import { Search, Calendar, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  createItemRequestResponse,
  deleteItemRequestResponse,
  fetchItemRequestResponses,
  fetchRequests,
  sendEcoCampusMessage,
  ItemRequest,
  ItemRequestResponse,
} from '@/lib/ecocampus-api';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { assertValidUuid } from '@/lib/uuid';

// Query keys for consistent cache management
const ECOCAMPUS_QUERY_KEYS = {
  itemRequests: ['ecocampus', 'item-requests'] as const,
  itemRequestResponses: (userId: string | undefined) => ['ecocampus', 'item-request-responses', userId] as const,
};

const Requests = () => {
  const [searchQuery, setSearchQuery] = useState('');
  // Track requests with pending response mutations to prevent double-clicks
  const [pendingResponses, setPendingResponses] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const {
    data: requests = [],
    isLoading,
    error: requestsError,
  } = useQuery({
    queryKey: ECOCAMPUS_QUERY_KEYS.itemRequests,
    queryFn: fetchRequests,
    staleTime: 30_000, // 30 seconds
  });

  // Show error toast for requests loading failure
  useEffect(() => {
    if (requestsError) {
      console.error('Error loading requests:', requestsError);
      toast({
        title: 'Error',
        description: 'Failed to load requests. Please refresh the page.',
        variant: 'destructive',
      });
    }
  }, [requestsError, toast]);

  const {
    data: responses = [],
    isLoading: isLoadingResponses,
    error: responsesError,
  } = useQuery({
    queryKey: ECOCAMPUS_QUERY_KEYS.itemRequestResponses(profile?.id),
    queryFn: fetchItemRequestResponses,
    enabled: !!profile?.id,
    staleTime: 10_000, // 10 seconds - more frequent updates for user's own data
  });

  // Show error toast for responses loading failure
  useEffect(() => {
    if (responsesError) {
      console.error('Error loading responses:', responsesError);
    }
  }, [responsesError]);

  useEffect(() => {
    const channel = supabase
      .channel('item-requests-public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_requests' }, () => {
        queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.itemRequests });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    const domain = profile?.college_domain?.toLowerCase();
    if (!domain) return;

    const channel = supabase
      .channel('ecocampus-profiles-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `college_domain=eq.${domain}` }, () => {
        queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.itemRequests });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.college_domain, queryClient]);

  // Realtime subscription for responses - updates when user responds or gets responses
  useEffect(() => {
    if (!profile?.id) return;
    assertValidUuid(profile.id, 'profileId');

    const channel = supabase
      .channel(`item-request-responses-${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'item_request_responses', filter: `responder_id=eq.${profile.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.itemRequestResponses(profile.id) });
        }
      )
      // Also listen for responses where user is the requester (owner of request)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'item_request_responses', filter: `requester_id=eq.${profile.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.itemRequestResponses(profile.id) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  // Apply filters
  const filteredRequests = useMemo(() => {
    const loweredSearch = searchQuery.toLowerCase();
    return requests.filter(
      (request) =>
        request.item.toLowerCase().includes(loweredSearch) ||
        request.description.toLowerCase().includes(loweredSearch)
    );
  }, [requests, searchQuery]);

  const respondedRequestIds = useMemo(
    () => new Set(responses.map((response) => response.request_id)),
    [responses]
  );

  // Helper to add/remove pending response state
  const setPendingResponse = useCallback((requestId: string, isPending: boolean) => {
    setPendingResponses((prev) => {
      const newSet = new Set(prev);
      if (isPending) {
        newSet.add(requestId);
      } else {
        newSet.delete(requestId);
      }
      return newSet;
    });
  }, []);

  const responseMutation = useMutation({
    mutationFn: async (request: ItemRequest) => {
      if (!request.user_id) throw new Error('Request is missing requester information');
      assertValidUuid(request.user_id, 'requesterId');
      const response = await createItemRequestResponse(request.id, request.user_id);
      const messageBody = `I have ${request.item} and can help.\n\nRequest: ${request.description}`;
      try {
        await sendEcoCampusMessage(request.user_id, messageBody);
      } catch (error) {
        await deleteItemRequestResponse(response.id).catch(() => undefined);
        throw error;
      }
      return response;
    },
    onMutate: (request) => {
      setPendingResponse(request.id, true);
    },
    onError: (error, request) => {
      setPendingResponse(request.id, false);

      toast({
        title: 'Response failed',
        description: error instanceof Error ? error.message : 'Unable to respond to this request.',
        variant: 'destructive',
      });
    },
    onSuccess: (data, request) => {
      // Clear pending state
      setPendingResponse(request.id, false);

      toast({
        title: 'Response sent',
        description: 'The requester has been notified.',
      });
    },
    onSettled: () => {
      // Always refetch to ensure server state is synced
      queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.itemRequestResponses(profile?.id) });
    },
  });

  const handleRespondClick = async (request: ItemRequest) => {
    // Check if already responded or pending
    if (respondedRequestIds.has(request.id)) {
      toast({
        title: 'Already responded',
        description: 'You have already responded to this request.',
      });
      return;
    }
    if (pendingResponses.has(request.id)) {
      return; // Already in progress
    }

    responseMutation.mutate(request);
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <Input
          placeholder="Search requests..."
          className="pl-10 w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10 h-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-white/40" />
          <span className="ml-2 text-white/50">Loading requests...</span>
        </div>
      )}

      {/* Requests list */}
      {!isLoading && (
        <div className="space-y-3">
          {filteredRequests.map((request) => {
            const isOwner = profile?.id && profile.id === request.user_id;
            const hasResponded = respondedRequestIds.has(request.id);
            const isPending = pendingResponses.has(request.id);
            return (
              <div key={request.id} className="rounded-xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 hover:bg-white/[0.06] transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h3 className="font-semibold text-base md:text-lg text-white line-clamp-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{request.item}</h3>
                    <p className="text-xs md:text-sm text-white/50 line-clamp-2">{request.description}</p>
                    
                    <div className="flex items-center gap-1 text-xs md:text-sm text-white/45">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="truncate">{request.urgency}</span>
                    </div>
                  </div>
                  
                  <span className="px-2 py-1 rounded-full text-xs flex-shrink-0 bg-white/[0.08] text-white/70 border border-white/10">
                    {request.preference}
                  </span>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7 md:h-8 md:w-8">
                      <img src={request.requester?.avatar || '/placeholder.svg'} alt={request.requester?.name || 'Requester'} />
                    </Avatar>
                    <span className="text-xs md:text-sm text-white/60 truncate">{request.requester?.name || 'Anonymous'}</span>
                  </div>
                  
                  <button 
                    className="w-full sm:w-auto flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-xs md:text-sm bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() => handleRespondClick(request)}
                    disabled={!profile?.id || isOwner || hasResponded || isPending || isLoadingResponses}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : isOwner ? (
                      'Your request'
                    ) : hasResponded ? (
                      'Sent'
                    ) : (
                      'I Have This'
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {filteredRequests.length === 0 && (
            <div className="rounded-xl bg-white/[0.04] border border-white/10 p-12 text-center">
              <p className="text-white/40">No requests match your search criteria.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default Requests;
