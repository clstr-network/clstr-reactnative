/**
 * AppState lifecycle hooks — Phase 3.5 enhanced.
 *
 * useAppStateLifecycle: Basic foreground/background callbacks.
 * useAppStateRealtimeLifecycle: Full lifecycle with session refresh,
 *   query invalidation, and realtime channel reconnection.
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/adapters/core-client';
import { subscriptionManager } from '@/lib/realtime/subscription-manager';
import { QUERY_KEYS } from '@/lib/query-keys';

/**
 * Basic AppState lifecycle hook (original — preserved for backward compat).
 */
export function useAppStateLifecycle(callbacks: {
  onForeground?: () => void;
  onBackground?: () => void;
}) {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        callbacks.onForeground?.();
      }
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        callbacks.onBackground?.();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [callbacks.onForeground, callbacks.onBackground]);
}

/**
 * Minimum gap between reconnect cycles (ms).
 * Prevents rapid bg→fg→bg→fg cascades from causing duplicate work.
 */
const RECONNECT_DEBOUNCE_MS = 2_000;

/**
 * Enhanced AppState lifecycle hook for realtime.
 *
 * On foreground resume:
 *   1. Validates session (JWT may expire while backgrounded)
 *   2. Refreshes session token if needed
 *   3. Invalidates critical query caches (conversations, notifications)
 *   4. Reconnects all realtime channels via SubscriptionManager
 *
 * On background:
 *   - No-op (Supabase SDK handles connection keep-alive internally;
 *     OS will kill socket after ~30s anyway)
 */
export function useAppStateRealtimeLifecycle() {
  const queryClient = useQueryClient();
  const prevState = useRef<AppStateStatus>(AppState.currentState);
  const reconnecting = useRef(false);
  const lastReconnectAt = useRef(0);

  const handleForeground = useCallback(async () => {
    const now = Date.now();

    // Debounce guard
    if (reconnecting.current || now - lastReconnectAt.current < RECONNECT_DEBOUNCE_MS) {
      if (__DEV__) {
        console.log('[AppState] Debounced — reconnect in progress or too recent');
      }
      return;
    }

    reconnecting.current = true;
    lastReconnectAt.current = now;

    try {
      // 1. Validate + refresh session
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        if (__DEV__) {
          console.warn('[AppState] Session expired while backgrounded:', error?.message);
        }
        // Session dead — auth guard will redirect to login
        return;
      }

      // Attempt token refresh if token is close to expiry
      const expiresAt = data.session.expires_at ?? 0;
      const expiresInMs = expiresAt * 1000 - Date.now();
      if (expiresInMs < 5 * 60 * 1000) {
        // Less than 5 minutes left — proactively refresh
        await supabase.auth.refreshSession();
        if (__DEV__) {
          console.log('[AppState] Token refreshed proactively');
        }
      }

      // 2. Invalidate critical caches that may be stale
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadMessages });

      // 3. Reconnect all realtime channels
      await subscriptionManager.reconnectAll();

      if (__DEV__) {
        console.log('[AppState] Foreground resume complete — channels reconnected');
      }
    } catch (e) {
      if (__DEV__) {
        console.warn('[AppState] Foreground resume error:', e);
      }
    } finally {
      reconnecting.current = false;
    }
  }, [queryClient]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      const wasBackground = prevState.current.match(/inactive|background/);
      prevState.current = next;

      if (wasBackground && next === 'active') {
        handleForeground();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handleForeground]);
}
