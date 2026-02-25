/**
 * useDeepLinkHandler — Phase 4: Deep Link Queue Integration Hook
 *
 * Wires up the deep-link queue with Expo Router and the auth lifecycle.
 *
 * Responsibilities:
 *   1. Listens for incoming URLs via `Linking.useURL()` and enqueues non-auth links
 *   2. Signals nav-readiness once the component mounts (navigation tree is live)
 *   3. Signals auth-readiness once `useAuth().isLoading` settles
 *   4. Provides a flush callback using `router.push` from expo-router
 *   5. Resets the queue on sign-out
 *
 * This hook must be rendered inside both `<AuthProvider>` and the Expo Router
 * `<Stack>` tree (i.e., inside `RootLayoutNav` in `app/_layout.tsx`).
 */

import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import {
  enqueue,
  setNavReady,
  setAuthReady,
  setFlushCallback,
  reset as resetQueue,
} from '@/lib/deep-link-queue';

export function useDeepLinkHandler(): void {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const hasSignalledNav = useRef(false);
  const prevAuthenticated = useRef<boolean | null>(null);

  // ── 1. Register flush callback — uses expo-router's push ──
  useEffect(() => {
    setFlushCallback((path: string) => {
      console.log('[useDeepLinkHandler] Navigating to:', path);
      // Use setTimeout(0) to ensure the navigation happens outside the
      // current React render cycle — prevents navigation-during-render warnings.
      setTimeout(() => {
        try {
          router.push(path as any);
        } catch (e) {
          console.error('[useDeepLinkHandler] Navigation error:', e);
        }
      }, 0);
    });

    return () => {
      setFlushCallback(null as any);
    };
  }, [router]);

  // ── 2. Signal nav readiness on mount ──
  useEffect(() => {
    if (!hasSignalledNav.current) {
      hasSignalledNav.current = true;
      // Small delay ensures the Expo Router tree is fully committed
      const timer = setTimeout(() => setNavReady(), 100);
      return () => clearTimeout(timer);
    }
  }, []);

  // ── 3. Signal auth readiness once loading finishes ──
  useEffect(() => {
    if (!isLoading) {
      setAuthReady(isAuthenticated);
    }
  }, [isLoading, isAuthenticated]);

  // ── 4. Re-signal auth on successful login (for post-login redirect) ──
  useEffect(() => {
    if (
      prevAuthenticated.current === false &&
      isAuthenticated &&
      !isLoading
    ) {
      // User just logged in — re-signal so the queue flushes the held link
      console.log('[useDeepLinkHandler] Post-login auth signal — flushing held link');
      setAuthReady(true);
    }
    prevAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, isLoading]);

  // ── 5. Listen for incoming URLs and enqueue ──
  const url = Linking.useURL();
  useEffect(() => {
    if (url) {
      // Skip if it's an auth redirect — AuthProvider handles those
      if (url.includes('access_token') || url.includes('code=') || url.includes('auth/callback')) {
        return;
      }
      enqueue(url);
    }
  }, [url]);

  // ── 6. Reset queue on sign-out ──
  useEffect(() => {
    if (!isAuthenticated && prevAuthenticated.current === true) {
      console.log('[useDeepLinkHandler] Sign-out detected — resetting queue');
      resetQueue();
    }
  }, [isAuthenticated]);
}
