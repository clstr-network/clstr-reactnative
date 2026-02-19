/**
 * useNotifications — Notification hooks for mobile.
 *
 * Polls the `notifications` table every 30 seconds.
 * Push notifications are Phase 9 scope.
 * Uses QUERY_KEYS.social.notifications() from @clstr/shared (S2 enforced).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@clstr/shared/integrations/supabase/client';
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { useAuth } from '@clstr/shared/hooks/useAuth';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

const POLL_INTERVAL_MS = 30_000;

/**
 * Fetch notifications for the current user, polling every 30 seconds.
 */
export function useNotifications() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: QUERY_KEYS.social.notifications(),
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    enabled: !!user?.id,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const notifications = query.data ?? [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

/**
 * Mark a single notification as read.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.social.notifications(),
      });
    },
  });
}

/**
 * Mark all notifications as read for the current user.
 */
export function useMarkAllNotificationsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.social.notifications(),
      });
    },
  });
}
