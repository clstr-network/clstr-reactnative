/**
 * useRealtimeReconnect — R5 mitigation: background/foreground reconnection.
 *
 * Listens for AppState changes. When the app returns from
 * background → foreground:
 *   1. Validates session is still alive (JWT may have expired while bg'd)
 *   2. Calls onReconnect so the parent hook can refetch + resubscribe
 *
 * Channel teardown is NOT done here — useChatRealtime owns its own
 * channelRef and handles cleanup inside subscribe().
 */
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@clstr/shared/integrations/supabase/client';

/**
 * Minimum gap between reconnect calls (ms).
 * Prevents rapid bg→fg→bg→fg cycles from firing multiple reconnects
 * before the first one finishes (Test A: duplicate foreground + reconnect).
 */
const RECONNECT_DEBOUNCE_MS = 2000;

export function useRealtimeReconnect(
  userId: string | undefined,
  onReconnect: () => void,
) {
  const prevState = useRef<AppStateStatus>(AppState.currentState);
  const reconnecting = useRef(false);
  const lastReconnectAt = useRef(0);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const subscription = AppState.addEventListener('change', async (next) => {
      const wasBackground = prevState.current.match(/inactive|background/);
      prevState.current = next;

      if (wasBackground && next === 'active') {
        // Debounce guard — prevent rapid bg→fg→bg→fg cascades
        const now = Date.now();
        if (reconnecting.current || now - lastReconnectAt.current < RECONNECT_DEBOUNCE_MS) {
          if (__DEV__) {
            console.log('[reconnect] Debounced — reconnect already in progress or too recent');
          }
          return;
        }

        reconnecting.current = true;
        lastReconnectAt.current = now;

        try {
          // Validate session before reconnecting — JWT may have expired
          const { data, error } = await supabase.auth.getSession();
          if (cancelled) return;

          if (error || !data.session) {
            if (__DEV__) {
              console.warn('[reconnect] Session expired while backgrounded:', error?.message);
            }
            // Session is dead — auth flow will handle redirect; skip reconnect
            return;
          }

          onReconnect();
        } finally {
          reconnecting.current = false;
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [userId, onReconnect]);
}
