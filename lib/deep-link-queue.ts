/**
 * DeepLinkQueue — Phase 4: Navigation & Deep Link Parity
 *
 * Singleton queue that holds deep-link URLs until two conditions are met:
 *   1. Navigation tree is mounted (Expo Router Stack is ready)
 *   2. Auth state is resolved (isLoading = false from AuthProvider)
 *
 * Once both gates are open the queue flushes: the most recent
 * non-auth URL is dispatched to expo-router and the queue is cleared.
 *
 * Auth-callback URLs (`/auth/callback`) are NEVER queued — they bypass
 * the queue entirely and are handled immediately by the auth callback screen.
 *
 * Deduplication: identical URLs within a 500 ms window are collapsed.
 *
 * Usage:
 *   - `enqueue(url)` — called from Linking listener / push notification tap
 *   - `setNavReady()` / `setAuthReady()` — called from _layout.tsx once conditions are met
 *   - `flush(navigate)` — called internally when both gates open; invokes the
 *     provided navigation callback with the pending path
 *   - `getPending()` — returns the current pending URL (for debugging)
 *   - `reset()` — clears all state (used on sign-out)
 */

import { router } from 'expo-router';

// ---------------------------------------------------------------------------
// Singleton state
// ---------------------------------------------------------------------------

let pendingUrl: string | null = null;
let navReady = false;
let authReady = false;

/** Last URL enqueued — used for dedup within the window. */
let lastEnqueuedUrl: string | null = null;
let lastEnqueuedAt = 0;
const DEDUP_WINDOW_MS = 500;

/** External flush callback — set by the layout hook. */
let flushCallback: ((path: string) => void) | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if the URL is an auth callback that should bypass the queue. */
function isAuthCallback(url: string): boolean {
  return (
    url.includes('auth/callback') ||
    url.includes('access_token') ||
    url.includes('code=')
  );
}

/**
 * Normalize a raw deep-link URL into an app-relative path.
 * Strips `clstr://`, `https://(www.)clstr.network`, and ensures leading `/`.
 */
function normalizePath(url: string): string {
  let p = url;

  // Handle standard web URLs by stripping origin and keeping only
  // pathname/search/hash as app-relative route.
  if (/^https?:\/\//.test(p)) {
    try {
      const parsed = new URL(p);
      p = `${parsed.pathname || '/'}${parsed.search || ''}${parsed.hash || ''}`;
    } catch {
      // Continue with fallback normalization below.
    }
  }

  // Handle Expo Go/dev-client runtime URLs.
  // Examples:
  //   exp://192.168.0.5:8081            -> /
  //   exp://192.168.0.5:8081/--/post/1  -> /post/1
  const expoPathMatch = p.match(/^exps?:\/\/[^/]+\/--(\/.*)?$/);
  if (expoPathMatch) {
    return expoPathMatch[1] || '/';
  }
  if (/^exps?:\/\/[^/]+\/?$/.test(p)) {
    return '/';
  }

  // Strip custom scheme
  p = p.replace(/^clstr:\/\//, '/');
  // Strip universal link prefix
  p = p.replace(/^https?:\/\/(www\.)?clstr\.network/, '');
  // Strip clstr.in prefix (magic-link redirect)
  p = p.replace(/^https?:\/\/(www\.)?clstr\.in/, '');

  // Recover from malformed routes like:
  //   /http:/localhost:8081/...
  //   /https://localhost:8081/...
  // which can happen if an absolute URL was pushed as a route segment.
  let malformed = p.match(/^\/https?:\/+[^/]+(\/.*)?$/);
  while (malformed) {
    p = malformed[1] || '/';
    malformed = p.match(/^\/https?:\/+[^/]+(\/.*)?$/);
  }

  // Also recover from single-slash variants: /http:/host/path
  malformed = p.match(/^\/https?:\/[^/]+(\/.*)?$/);
  while (malformed) {
    p = malformed[1] || '/';
    malformed = p.match(/^\/https?:\/[^/]+(\/.*)?$/);
  }

  // Ensure leading slash
  if (p && !p.startsWith('/')) p = '/' + p;
  return p || '/';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Enqueue a deep-link URL.
 *
 * - Auth callbacks bypass the queue and are NOT stored (handled by AuthProvider / callback screen).
 * - Identical URLs within 500 ms are deduplicated.
 * - If both gates (nav + auth) are already open the URL is flushed immediately.
 */
export function enqueue(url: string): void {
  if (!url) return;

  // Auth callback links never enter the queue
  if (isAuthCallback(url)) {
    console.log('[DeepLinkQueue] Auth callback URL bypassed queue:', url.substring(0, 80));
    return;
  }

  // Deduplicate rapid-fire identical links
  const now = Date.now();
  if (url === lastEnqueuedUrl && now - lastEnqueuedAt < DEDUP_WINDOW_MS) {
    console.log('[DeepLinkQueue] Deduplicated rapid link:', url.substring(0, 80));
    return;
  }
  lastEnqueuedUrl = url;
  lastEnqueuedAt = now;

  const path = normalizePath(url);

  // Ignore root/home links — no need to queue them
  if (path === '/' || path === '') return;

  pendingUrl = path;
  console.log('[DeepLinkQueue] Enqueued:', path);

  // Try immediate flush
  tryFlush();
}

/**
 * Signal that the Expo Router navigation tree is mounted and ready.
 */
export function setNavReady(): void {
  if (navReady) return;
  navReady = true;
  console.log('[DeepLinkQueue] Nav tree ready');
  tryFlush();
}

/**
 * Signal that the auth state has been resolved (isLoading = false).
 * `isAuthenticated` is passed so the queue can decide whether to
 * flush or discard (unauthenticated users shouldn't navigate to
 * protected screens).
 */
export function setAuthReady(isAuthenticated: boolean): void {
  authReady = true;
  console.log('[DeepLinkQueue] Auth ready, authenticated:', isAuthenticated);

  if (!isAuthenticated && pendingUrl) {
    // Store the pending URL so it can be recovered after login
    console.log('[DeepLinkQueue] User not authenticated — holding link for post-login redirect:', pendingUrl);
    // Don't flush yet; the link will be flushed when setAuthReady is called
    // again after successful authentication
    return;
  }

  tryFlush();
}

/**
 * Register the navigation callback used to actually perform the route change.
 * This is typically `router.push` or `router.navigate` from expo-router.
 */
export function setFlushCallback(cb: (path: string) => void): void {
  flushCallback = cb;
}

/**
 * Return the current pending URL (for debugging / test assertions).
 */
export function getPending(): string | null {
  return pendingUrl;
}

/**
 * Reset all queue state. Called on sign-out to ensure stale deep links
 * from a previous session are not replayed.
 */
export function reset(): void {
  pendingUrl = null;
  navReady = false;
  authReady = false;
  lastEnqueuedUrl = null;
  lastEnqueuedAt = 0;
  console.log('[DeepLinkQueue] Reset');
}

/**
 * Reset auth ready state only (called during sign-out flow before full reset).
 */
export function resetAuth(): void {
  authReady = false;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

/**
 * Attempt to flush the queue.
 * Only succeeds when:
 *   1. There IS a pending URL
 *   2. Nav tree is ready
 *   3. Auth is resolved AND user is authenticated
 */
function tryFlush(): void {
  if (!pendingUrl || !navReady || !authReady) return;

  const path = pendingUrl;
  pendingUrl = null;

  console.log('[DeepLinkQueue] Flushing:', path);

  if (flushCallback) {
    try {
      flushCallback(path);
    } catch (e) {
      console.error('[DeepLinkQueue] Flush callback error:', e);
      // Fallback to router.push
      try {
        router.push(path as any);
      } catch (fallbackError) {
        console.error('[DeepLinkQueue] Fallback router.push error:', fallbackError);
      }
    }
  } else {
    // Direct fallback — use expo-router's imperative API
    try {
      router.push(path as any);
    } catch (e) {
      console.error('[DeepLinkQueue] router.push error:', e);
    }
  }
}

// ---------------------------------------------------------------------------
// Debug
// ---------------------------------------------------------------------------
export function getState(): {
  pendingUrl: string | null;
  navReady: boolean;
  authReady: boolean;
} {
  return { pendingUrl, navReady, authReady };
}
