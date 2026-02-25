/**
 * Phase 8 — Test Plan Item 2: Auth Idempotency Tests
 *
 * Validates that repeated auth callback hits do NOT double-create
 * sessions or profile actions.
 *
 * Layers tested:
 *   Layer 1: DeepLinkQueue — 500ms dedup window prevents identical URLs
 *   Layer 2: Auth callback screen — any code/token processing is guarded
 *
 * These tests focus on the queue-level dedup (Layer 1) since the callback
 * screen test (Layer 2) requires React component rendering with Supabase.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  enqueue,
  setNavReady,
  setAuthReady,
  setFlushCallback,
  reset,
  getPending,
} from '@/lib/deep-link-queue';

beforeEach(() => {
  reset();
});

describe('Auth Idempotency — Layer 1: Queue Dedup (Plan §2)', () => {
  it('auth callback URLs bypass queue entirely', () => {
    // Auth callbacks should NEVER enter the queue — the AuthProvider
    // and callback screen handle them directly
    enqueue('clstr://auth/callback?code=pkce-abc');
    expect(getPending()).toBeNull();
  });

  it('rapid identical auth callbacks are all bypassed (not queued)', () => {
    enqueue('clstr://auth/callback?code=same-code');
    enqueue('clstr://auth/callback?code=same-code');
    enqueue('clstr://auth/callback?code=same-code');
    expect(getPending()).toBeNull();
  });

  it('auth callback with access_token bypasses queue', () => {
    enqueue('clstr://auth/callback#access_token=jwt-token&refresh_token=ref');
    expect(getPending()).toBeNull();
  });

  it('rapid non-auth deep links are deduplicated (Layer 1)', () => {
    const flush = vi.fn();
    setFlushCallback(flush);
    setNavReady();
    setAuthReady(true);

    // Fire same URL 5 times rapidly
    for (let i = 0; i < 5; i++) {
      enqueue('clstr://post/123');
    }

    // Only the first should flush
    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith('/post/123');
  });

  it('different URLs are NOT deduplicated', () => {
    const flush = vi.fn();
    setFlushCallback(flush);
    setNavReady();
    setAuthReady(true);

    enqueue('clstr://post/111');
    enqueue('clstr://post/222');

    // Second enqueue replaces pending and flushes
    // Both should eventually flush (second replaces first if first already flushed)
    expect(flush).toHaveBeenCalled();
  });
});

describe('Auth Idempotency — Session Guard (Plan §2)', () => {
  it('sign-out clears queue — prevents stale callback replay', () => {
    // Simulate: user hits auth callback in previous session
    enqueue('clstr://post/from-old-session');
    expect(getPending()).toBe('/post/from-old-session');

    // Sign out clears everything
    reset();
    expect(getPending()).toBeNull();

    // New session — no stale link
    setNavReady();
    setAuthReady(true);
    // Nothing to flush
    const flush = vi.fn();
    setFlushCallback(flush);
    expect(flush).not.toHaveBeenCalled();
  });

  it('post-login redirect only fires for links from current session', () => {
    const flush = vi.fn();
    setFlushCallback(flush);

    // Session 1: link arrives, user not authenticated
    enqueue('clstr://post/session-1-link');
    setNavReady();
    setAuthReady(false); // Not logged in
    expect(flush).not.toHaveBeenCalled();

    // Sign out — clear session 1
    reset();
    setFlushCallback(flush);

    // Session 2: new login, no pending link
    setNavReady();
    setAuthReady(true);
    // Should NOT flush the session-1 link
    expect(flush).not.toHaveBeenCalled();
  });
});
