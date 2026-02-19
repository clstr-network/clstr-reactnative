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

export function useRealtimeReconnect(
  userId: string | undefined,
  onReconnect: () => void,
) {
  const prevState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!userId) return;

    const subscription = AppState.addEventListener('change', async (next) => {
      const wasBackground = prevState.current.match(/inactive|background/);
      prevState.current = next;

      if (wasBackground && next === 'active') {
        // Validate session before reconnecting — JWT may have expired
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          if (__DEV__) {
            console.warn('[reconnect] Session expired while backgrounded:', error?.message);
          }
          // Session is dead — auth flow will handle redirect; skip reconnect
          return;
        }

        onReconnect();
      }
    });

    return () => subscription.remove();
  }, [userId, onReconnect]);
}
