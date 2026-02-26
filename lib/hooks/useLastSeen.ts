/**
 * useLastSeen — Updates the current user's last_seen timestamp.
 *
 * Phase 16.1: Messaging Enhancements — Online Status Indicator.
 *
 * Pings updateLastSeen on mount and every 60 seconds while the app
 * is in the foreground. Pauses when backgrounded to save battery.
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { updateLastSeen } from '@/lib/api/messages';

const AUTH_MODE = process.env.EXPO_PUBLIC_AUTH_MODE;

export function useLastSeen() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startInterval = useCallback(() => {
    if (intervalRef.current) return;
    updateLastSeen().catch(() => {});
    intervalRef.current = setInterval(() => {
      updateLastSeen().catch(() => {});
    }, 60_000);
  }, []);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (AUTH_MODE === 'mock') return;

    if (!user?.id) return;

    // Start immediately
    startInterval();

    // Listen for app state changes
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        startInterval();
      } else {
        stopInterval();
      }
    });

    return () => {
      stopInterval();
      sub.remove();
    };
  }, [user?.id, startInterval, stopInterval]);
}
