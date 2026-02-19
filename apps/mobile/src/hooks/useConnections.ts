/**
 * useConnections — Network / connections hooks for mobile.
 *
 * Wraps @clstr/core profile-api connections CRUD with useQuery / useMutation.
 * Uses QUERY_KEYS.social from @clstr/shared (S2 enforced).
 * Errors returned as structured objects (S6 — no toast/alert).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPendingConnectionRequests,
  getSentConnectionRequests,
  acceptConnectionRequest,
  rejectConnectionRequest,
  addConnectionRequest,
  removeConnection,
} from '@clstr/core/api/profile-api';
import { supabase } from '@clstr/shared/integrations/supabase/client';
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { useAuth } from '@clstr/shared/hooks/useAuth';

/**
 * Fetch same-domain users from profiles table for the Network "People" tab.
 */
export function useNetworkUsers() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: QUERY_KEYS.social.network(),
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('college_domain')
        .eq('id', user.id)
        .single();

      if (!profile?.college_domain) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, headline, role, branch')
        .eq('college_domain', profile.college_domain)
        .neq('id', user.id)
        .order('full_name', { ascending: true })
        .limit(50);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

/**
 * Fetch pending incoming connection requests.
 */
export function usePendingRequests() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: [...QUERY_KEYS.social.network(), 'pending'],
    queryFn: () => getPendingConnectionRequests(supabase, user!.id),
    enabled: !!user?.id,
  });

  return {
    requests: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

/**
 * Fetch sent (outgoing) connection requests.
 */
export function useSentRequests() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: [...QUERY_KEYS.social.network(), 'sent'],
    queryFn: () => getSentConnectionRequests(supabase, user!.id),
    enabled: !!user?.id,
  });

  return {
    requests: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Accept a connection request. Invalidates network queries on success.
 */
export function useAcceptConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) =>
      acceptConnectionRequest(supabase, connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.network() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.connectedUsers() });
    },
  });
}

/**
 * Reject a connection request. Invalidates network queries on success.
 */
export function useRejectConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) =>
      rejectConnectionRequest(supabase, connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.network() });
    },
  });
}

/**
 * Send a connection request. Invalidates network queries on success.
 */
export function useSendConnectionRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (receiverId: string) =>
      addConnectionRequest(supabase, user!.id, receiverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.network() });
    },
  });
}
