/**
 * useLastSeen — Updates the current user's last_seen timestamp.
 *
 * Pings updateLastSeen on mount and every 60 seconds, BUT only while
 * the app is in the foreground. Pauses the interval when backgrounded
 * to avoid battery drain and unnecessary Supabase traffic.
 */
import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { updateLastSeen } from '@clstr/core/api/messages-api';
import { supabase } from '@clstr/shared/integrations/supabase/client';
import { useAuth } from '@clstr/shared/hooks/useAuth';

export function useLastSeen() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startInterval = useCallback(() => {
    if (intervalRef.current) return; // already running
    updateLastSeen(supabase).catch(() => {});
    intervalRef.current = setInterval(() => {
      updateLastSeen(supabase).catch(() => {});
    }, 60_000);
  }, []);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // Start immediately
    startInterval();

    // Pause/resume on app state change
    const subscription = AppState.addEventListener(
      'change',
      (next: AppStateStatus) => {
        if (next === 'active') {
          startInterval();
        } else {
          stopInterval();
        }
      },
    );

    return () => {
      stopInterval();
      subscription.remove();
    };
  }, [user?.id, startInterval, stopInterval]);
}
