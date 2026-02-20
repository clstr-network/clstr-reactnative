/**
 * CLSTR Local Test Harness — Programmatic test utilities
 *
 * These functions exercise Phase 9 deep linking, auth, navigation,
 * realtime, and persistence WITHOUT requiring:
 *   - Apple Developer account
 *   - Play Console
 *   - Expo Push production
 *   - Domain DNS / .well-known
 *
 * Usage: import from DevTestOverlay or call from React Native debugger console.
 */
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { AppState, type AppStateStatus } from 'react-native';
import { supabase } from '@clstr/shared/integrations/supabase/client';
import {
  navigationRef,
  dispatchDeepLink,
} from '@clstr/shared/navigation/navigationRef';

// ─────────────────────────────────────────────────────────────
// 1. Deep Link Dispatch
// ─────────────────────────────────────────────────────────────

/**
 * Simulate an incoming deep link as if the OS delivered it.
 * Works even when NavigationContainer is not yet ready (tests queue).
 */
export function simulateDeepLink(url: string): {
  dispatched: boolean;
  queued: boolean;
  navReady: boolean;
} {
  const navReady = navigationRef.isReady();
  const dispatched = dispatchDeepLink(url);
  return {
    dispatched,
    queued: !dispatched,
    navReady,
  };
}

/**
 * Fire the Linking event handler directly (bypasses OS).
 * This is what subscribe() in linking.ts listens to.
 */
export function fireUrlEvent(url: string): void {
  // Emit the same event expo-linking would produce
  Linking.openURL(url).catch((err) => {
    console.warn('[testHarness] openURL failed (expected on simulator):', err.message);
  });
}

// ─────────────────────────────────────────────────────────────
// 2. Auth State Inspection
// ─────────────────────────────────────────────────────────────

export interface AuthSnapshot {
  hasSession: boolean;
  userId: string | null;
  email: string | null;
  accessTokenPrefix: string | null;
  expiresAt: string | null;
  refreshTokenPrefix: string | null;
}

export async function getAuthSnapshot(): Promise<AuthSnapshot> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    return {
      hasSession: false,
      userId: null,
      email: null,
      accessTokenPrefix: null,
      expiresAt: null,
      refreshTokenPrefix: null,
    };
  }
  const s = data.session;
  return {
    hasSession: true,
    userId: s.user.id,
    email: s.user.email ?? null,
    accessTokenPrefix: s.access_token.substring(0, 20) + '...',
    expiresAt: s.expires_at ? new Date(s.expires_at * 1000).toISOString() : null,
    refreshTokenPrefix: s.refresh_token
      ? s.refresh_token.substring(0, 12) + '...'
      : null,
  };
}

// ─────────────────────────────────────────────────────────────
// 3. SecureStore Persistence (R6)
// ─────────────────────────────────────────────────────────────

const SUPABASE_STORAGE_KEY = 'supabase.auth.token';

export interface SecureStoreSnapshot {
  hasToken: boolean;
  rawLength: number;
  parsedOk: boolean;
  accessTokenPrefix: string | null;
}

export async function inspectSecureStore(): Promise<SecureStoreSnapshot> {
  try {
    const raw = await SecureStore.getItemAsync(SUPABASE_STORAGE_KEY);
    if (!raw) {
      return { hasToken: false, rawLength: 0, parsedOk: false, accessTokenPrefix: null };
    }
    const parsed = JSON.parse(raw);
    return {
      hasToken: true,
      rawLength: raw.length,
      parsedOk: true,
      accessTokenPrefix: parsed?.access_token
        ? String(parsed.access_token).substring(0, 20) + '...'
        : null,
    };
  } catch {
    return { hasToken: false, rawLength: 0, parsedOk: false, accessTokenPrefix: null };
  }
}

export async function clearSecureStore(): Promise<void> {
  await SecureStore.deleteItemAsync(SUPABASE_STORAGE_KEY);
}

// ─────────────────────────────────────────────────────────────
// 4. Navigation State Inspection
// ─────────────────────────────────────────────────────────────

export interface NavSnapshot {
  isReady: boolean;
  currentRoute: string | null;
  currentParams: Record<string, unknown> | null;
  stateIndex: number | null;
}

export function getNavSnapshot(): NavSnapshot {
  if (!navigationRef.isReady()) {
    return { isReady: false, currentRoute: null, currentParams: null, stateIndex: null };
  }
  const route = navigationRef.getCurrentRoute();
  const state = navigationRef.getRootState();
  return {
    isReady: true,
    currentRoute: route?.name ?? null,
    currentParams: (route?.params as Record<string, unknown>) ?? null,
    stateIndex: state?.index ?? null,
  };
}

// ─────────────────────────────────────────────────────────────
// 5. Auth Callback Test Scenarios
// ─────────────────────────────────────────────────────────────

/** Simulate a PKCE callback with a fake code (should fail gracefully) */
export function testAuthCallbackPKCE(code = 'test-pkce-code-123'): ReturnType<typeof simulateDeepLink> {
  return simulateDeepLink(`clstr://auth/callback?code=${code}`);
}

/** Simulate a callback with error params */
export function testAuthCallbackError(): ReturnType<typeof simulateDeepLink> {
  return simulateDeepLink(
    'clstr://auth/callback?error=access_denied&error_description=Link+expired',
  );
}

/** Simulate an OAuth implicit flow callback */
export function testAuthCallbackImplicit(): ReturnType<typeof simulateDeepLink> {
  return simulateDeepLink(
    'clstr://auth/callback?access_token=fake-token&refresh_token=fake-refresh',
  );
}

/**
 * Double-tap test: fire the same auth callback URL twice.
 *
 * Layer 1 — dispatchDeepLink dedup (navigationRef.ts):
 *   Identical URLs within 500ms are silently rejected → second.dispatched = false.
 *
 * Layer 2 — consumedCodes Set (AuthCallbackScreen.tsx):
 *   Even if the URL somehow reaches the screen twice (e.g., after the dedup
 *   window expires), the PKCE code is tracked in a module-level Set and the
 *   second exchange is skipped.
 *
 * This test validates Layer 1 (rapid dedup). To test Layer 2, use
 * `testAuthIdempotencyLayer2()` which adds a >500ms delay.
 */
export function testIdempotencyGuard(): {
  first: ReturnType<typeof simulateDeepLink>;
  second: ReturnType<typeof simulateDeepLink>;
  note: string;
} {
  const code = `idem-test-${Date.now()}`;
  const first = testAuthCallbackPKCE(code);
  const second = testAuthCallbackPKCE(code);
  return {
    first,
    second,
    note: second.dispatched
      ? 'WARN: dedup guard did not catch duplicate — check DEDUP_WINDOW_MS'
      : 'OK: second dispatch blocked by dedup guard (Layer 1)',
  };
}

/**
 * Dedup stress test: fire the same profile deep link 5 times rapidly.
 * Only the first should dispatch; the rest should be deduped.
 */
export function testDeepLinkDedup(url = 'clstr://profile/dedup-test'): {
  results: ReturnType<typeof simulateDeepLink>[];
  dispatchedCount: number;
  dedupedCount: number;
} {
  const results = Array.from({ length: 5 }, () => simulateDeepLink(url));
  const dispatchedCount = results.filter((r) => r.dispatched).length;
  return {
    results,
    dispatchedCount,
    dedupedCount: results.length - dispatchedCount,
  };
}

// ─────────────────────────────────────────────────────────────
// 6. Navigation Route Tests
// ─────────────────────────────────────────────────────────────

export function testDeepLinkProfile(userId = 'test-user-id'): ReturnType<typeof simulateDeepLink> {
  return simulateDeepLink(`clstr://profile/${userId}`);
}

export function testDeepLinkPost(postId = '123'): ReturnType<typeof simulateDeepLink> {
  return simulateDeepLink(`clstr://post/${postId}`);
}

export function testDeepLinkEvent(eventId = '456'): ReturnType<typeof simulateDeepLink> {
  return simulateDeepLink(`clstr://events/${eventId}`);
}

export function testDeepLinkMessaging(): ReturnType<typeof simulateDeepLink> {
  return simulateDeepLink('clstr://messaging');
}

// ─────────────────────────────────────────────────────────────
// 7. Cold Start Queue Test
// ─────────────────────────────────────────────────────────────

/**
 * Simulates a deep link arriving BEFORE NavigationContainer is ready.
 * In real cold-start, this is handled by getInitialURL + pendingUrl queue.
 * Here we test the dispatchDeepLink fallback path.
 */
export function testColdStartQueue(url = 'clstr://profile/cold-start-test'): {
  result: ReturnType<typeof simulateDeepLink>;
  note: string;
} {
  const result = simulateDeepLink(url);
  return {
    result,
    note: result.queued
      ? 'URL queued (nav not ready) — will flush on onNavigationReady'
      : 'URL dispatched immediately (nav was ready — simulates warm start)',
  };
}

// ─────────────────────────────────────────────────────────────
// 8. Rapid Message Stress Test Helper
// ─────────────────────────────────────────────────────────────

/**
 * Sends N rapid messages via supabase insert (requires auth).
 * Use to stress-test chat realtime dedup and scroll behavior.
 */
export async function stressSendMessages(
  receiverId: string,
  count = 20,
  delayMs = 100,
): Promise<{ sent: number; errors: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    console.warn('[testHarness] Must be authenticated to send messages');
    return { sent: 0, errors: 0 };
  }

  let sent = 0;
  let errors = 0;

  for (let i = 0; i < count; i++) {
    const { error } = await supabase.from('messages').insert({
      sender_id: session.user.id,
      receiver_id: receiverId,
      content: `[STRESS TEST] Message ${i + 1}/${count} — ${Date.now()}`,
    });

    if (error) {
      errors++;
      console.warn(`[stressTest] Message ${i + 1} failed:`, error.message);
    } else {
      sent++;
    }

    // Tiny delay to simulate rapid typing
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return { sent, errors };
}

// ─────────────────────────────────────────────────────────────
// 9. Session Refresh Test
// ─────────────────────────────────────────────────────────────

/**
 * Force a token refresh to validate autoRefreshToken behavior.
 */
export async function testSessionRefresh(): Promise<{
  success: boolean;
  error: string | null;
  newExpiresAt: string | null;
}> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    return { success: false, error: error.message, newExpiresAt: null };
  }
  return {
    success: true,
    error: null,
    newExpiresAt: data.session?.expires_at
      ? new Date(data.session.expires_at * 1000).toISOString()
      : null,
  };
}

// ─────────────────────────────────────────────────────────────
// 10. Full Diagnostic Dump
// ─────────────────────────────────────────────────────────────

export interface FullDiagnostic {
  timestamp: string;
  auth: AuthSnapshot;
  secureStore: SecureStoreSnapshot;
  navigation: NavSnapshot;
  appState: AppStateStatus;
}

export async function runFullDiagnostic(): Promise<FullDiagnostic> {
  const [auth, secureStore] = await Promise.all([
    getAuthSnapshot(),
    inspectSecureStore(),
  ]);
  return {
    timestamp: new Date().toISOString(),
    auth,
    secureStore,
    navigation: getNavSnapshot(),
    appState: AppState.currentState,
  };
}
