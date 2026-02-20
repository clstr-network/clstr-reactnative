/**
 * CLSTR Navigation — Shared Navigation Ref
 *
 * A module-level createNavigationContainerRef so that:
 * - linking.ts can check isReady() before dispatching intents
 * - Intent queuing works when notifications fire before nav tree mounts
 * - Any service (push handler, auth callback) can navigate imperatively
 */
import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Queue of deep-link URLs that arrived before NavigationContainer was ready.
 * Flushed once isReady() becomes true.
 */
let pendingUrl: string | null = null;
let linkListener: ((url: string) => void) | null = null;

/**
 * Call this from linking.subscribe to register the listener
 * that React Navigation uses to receive URL events.
 */
export function setLinkListener(listener: (url: string) => void) {
  linkListener = listener;

  // Flush any pending URL that arrived before nav was ready
  if (pendingUrl) {
    const url = pendingUrl;
    pendingUrl = null;
    listener(url);
  }
}

export function clearLinkListener() {
  linkListener = null;
}

/**
 * Last URL dispatched — used to deduplicate rapid-fire links.
 * Rapid deep link spam (Test C) can cause the same URL to arrive
 * multiple times in quick succession via linking.subscribe.
 */
let lastDispatchedUrl: string | null = null;
let lastDispatchedAt = 0;
const DEDUP_WINDOW_MS = 500;

/**
 * Dispatch a deep-link URL to the navigation system.
 * If NavigationContainer is not yet ready, queues it for later.
 *
 * Deduplicates identical URLs within a 500ms window to prevent
 * rapid-fire deep link spam from corrupting the navigation stack.
 *
 * Returns true if the URL was dispatched immediately.
 */
export function dispatchDeepLink(url: string): boolean {
  // Deduplicate rapid identical dispatches
  const now = Date.now();
  if (url === lastDispatchedUrl && now - lastDispatchedAt < DEDUP_WINDOW_MS) {
    return false;
  }
  lastDispatchedUrl = url;
  lastDispatchedAt = now;

  if (linkListener && navigationRef.isReady()) {
    linkListener(url);
    return true;
  }

  // Queue — will be flushed when setLinkListener is called
  // or when nav becomes ready
  pendingUrl = url;
  return false;
}

/**
 * Call this from the NavigationContainer's onReady callback
 * to flush any queued intents.
 */
export function onNavigationReady() {
  if (pendingUrl && linkListener) {
    const url = pendingUrl;
    pendingUrl = null;
    linkListener(url);
  }
}
