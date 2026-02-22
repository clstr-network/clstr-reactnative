/**
 * useRealtimeSubscription — Generic base hook for Supabase realtime channels.
 *
 * Phase 3 deliverable.
 *
 * Provides a consistent pattern for subscribing to postgres_changes,
 * registering with the SubscriptionManager, and cleaning up on unmount.
 *
 * Usage:
 *   useRealtimeSubscription({
 *     channelName: CHANNELS.feed.homeFeed(),
 *     table: 'posts',
 *     event: '*',
 *     filter: undefined,
 *     onPayload: (payload) => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed }),
 *     enabled: !!userId,
 *   });
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/adapters/core-client';
import { subscriptionManager } from '@/lib/realtime/subscription-manager';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface RealtimeSubscriptionConfig {
  /** Unique channel name — use CHANNELS.* generators */
  channelName: string;

  /** Postgres table to watch */
  table: string;

  /** Postgres change event type */
  event: PostgresChangeEvent;

  /** Optional filter (e.g., `id=eq.some-uuid`) */
  filter?: string;

  /** Schema (default: 'public') */
  schema?: string;

  /** Callback on payload */
  onPayload: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;

  /** Whether to enable the subscription (defaults to true) */
  enabled?: boolean;
}

/**
 * Base realtime subscription hook.
 *
 * Manages the full lifecycle: subscribe → react → cleanup.
 * Registered with SubscriptionManager for reconnect support.
 */
export function useRealtimeSubscription({
  channelName,
  table,
  event,
  filter,
  schema = 'public',
  onPayload,
  enabled = true,
}: RealtimeSubscriptionConfig) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(onPayload);
  callbackRef.current = onPayload;

  const createChannel = useCallback((): RealtimeChannel => {
    const subscriptionConfig: {
      event: PostgresChangeEvent;
      schema: string;
      table: string;
      filter?: string;
    } = {
      event,
      schema,
      table,
    };

    if (filter) {
      subscriptionConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        subscriptionConfig,
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          callbackRef.current(payload);
        },
      )
      .subscribe();

    return channel;
  }, [channelName, table, event, filter, schema]);

  useEffect(() => {
    if (!enabled) {
      // Clean up if disabled after being enabled
      if (channelRef.current) {
        subscriptionManager.unsubscribe(channelName);
        channelRef.current = null;
      }
      return;
    }

    // Create and register channel
    const channel = createChannel();
    channelRef.current = channel;
    subscriptionManager.subscribe(channelName, channel, createChannel);

    return () => {
      subscriptionManager.unsubscribe(channelName);
      channelRef.current = null;
    };
  }, [channelName, enabled, createChannel]);
}

/**
 * Multi-table variant — subscribe to multiple tables on a single channel.
 */
interface MultiTableConfig {
  channelName: string;
  subscriptions: Array<{
    table: string;
    event: PostgresChangeEvent;
    filter?: string;
    schema?: string;
    onPayload: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  }>;
  enabled?: boolean;
}

export function useRealtimeMultiSubscription({
  channelName,
  subscriptions,
  enabled = true,
}: MultiTableConfig) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subsRef = useRef(subscriptions);
  subsRef.current = subscriptions;

  const createChannel = useCallback((): RealtimeChannel => {
    let builder = supabase.channel(channelName);

    for (const sub of subsRef.current) {
      const config: {
        event: PostgresChangeEvent;
        schema: string;
        table: string;
        filter?: string;
      } = {
        event: sub.event,
        schema: sub.schema ?? 'public',
        table: sub.table,
      };

      if (sub.filter) {
        config.filter = sub.filter;
      }

      builder = builder.on('postgres_changes', config, sub.onPayload);
    }

    return builder.subscribe();
  }, [channelName]);

  useEffect(() => {
    if (!enabled) {
      if (channelRef.current) {
        subscriptionManager.unsubscribe(channelName);
        channelRef.current = null;
      }
      return;
    }

    const channel = createChannel();
    channelRef.current = channel;
    subscriptionManager.subscribe(channelName, channel, createChannel);

    return () => {
      subscriptionManager.unsubscribe(channelName);
      channelRef.current = null;
    };
  }, [channelName, enabled, createChannel]);
}
