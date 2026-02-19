/**
 * useEvents — Event hooks for mobile.
 *
 * Wraps @clstr/core events-api with useQuery / useMutation.
 * Uses QUERY_KEYS.events from @clstr/shared (S2 enforced).
 * Errors returned as structured objects (S6 — no toast/alert).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEventById,
  getEventByIdPublic,
  registerForEvent,
  unregisterFromEvent,
} from '@clstr/core/api/events-api';
import type { Event } from '@clstr/core/api/events-api';
import { supabase } from '@clstr/shared/integrations/supabase/client';
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { useAuth } from '@clstr/shared/hooks/useAuth';

/**
 * Fetch all events for the current user's college domain.
 * Falls back to public query when not authenticated.
 */
export function useEvents() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: QUERY_KEYS.events.all(),
    queryFn: async () => {
      // Fetch events list via direct Supabase query
      // (events-api doesn't export a list function, we compose one)
      const { data: profile } = user?.id
        ? await supabase
            .from('profiles')
            .select('college_domain')
            .eq('id', user.id)
            .single()
        : { data: null };

      let query = supabase
        .from('events')
        .select(
          `*, creator:profiles!events_creator_id_fkey(id, full_name, avatar_url, role)`,
        )
        .order('event_date', { ascending: true });

      if (profile?.college_domain) {
        query = query.eq('college_domain', profile.college_domain);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Event[];
    },
    enabled: !!user,
  });

  return {
    events: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

/**
 * Fetch a single event by ID (authenticated — includes is_registered).
 */
export function useEventDetail(eventId: string | undefined) {
  const query = useQuery({
    queryKey: [...QUERY_KEYS.events.detail(), eventId],
    queryFn: () => getEventById(supabase, eventId!),
    enabled: !!eventId,
  });

  return {
    event: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Register for an event. Invalidates event detail + list on success.
 */
export function useRegisterEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => registerForEvent(supabase, eventId),
    onSuccess: (_data, eventId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.detail() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.all() });
    },
  });
}

/**
 * Unregister from an event. Invalidates event detail + list on success.
 */
export function useUnregisterEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => unregisterFromEvent(supabase, eventId),
    onSuccess: (_data, eventId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.detail() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.all() });
    },
  });
}
