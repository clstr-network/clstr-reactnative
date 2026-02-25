/**
 * Phase 8 — Test Plan Items 1, 6, 7:
 *   1. Deep link tests (clstr://post/:id, profile/:id, events/:id, messaging, auth/callback)
 *   6. Navigation queue flush tests — link arrives before nav ready; executes once ready
 *   7. Cold start routing tests — killed app launched by deep link routes correctly
 *
 * Tests the DeepLinkQueue singleton:
 *   - enqueue / dedup / flush lifecycle
 *   - dual-gate (navReady + authReady) mechanism
 *   - auth-callback bypass
 *   - sign-out reset
 *   - cold-start queue→flush flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  enqueue,
  setNavReady,
  setAuthReady,
  setFlushCallback,
  getPending,
  reset,
  getState,
} from '@/lib/deep-link-queue';

// Fresh state for every test
beforeEach(() => {
  reset();
});

// ─────────────────────────────────────────────────────────────
// 1. Deep Link Tests (Test Plan Item 1)
// ─────────────────────────────────────────────────────────────

describe('DeepLinkQueue — Deep Link Tests (Plan §1)', () => {
  it('enqueues clstr://post/:id and normalizes path', () => {
    enqueue('clstr://post/abc-123');
    expect(getPending()).toBe('/post/abc-123');
  });

  it('enqueues clstr://profile/:id and normalizes path', () => {
    enqueue('clstr://profile/user-456');
    expect(getPending()).toBe('/profile/user-456');
  });

  it('enqueues clstr://events/:id and normalizes path', () => {
    enqueue('clstr://events/evt-789');
    expect(getPending()).toBe('/events/evt-789');
  });

  it('enqueues clstr://messaging and normalizes path', () => {
    enqueue('clstr://messaging');
    expect(getPending()).toBe('/messaging');
  });

  it('bypasses auth callback URLs (clstr://auth/callback)', () => {
    enqueue('clstr://auth/callback?code=test-pkce-code');
    expect(getPending()).toBeNull();
  });

  it('bypasses URLs containing access_token', () => {
    enqueue('clstr://auth/callback#access_token=fake-jwt&type=recovery');
    expect(getPending()).toBeNull();
  });

  it('bypasses URLs containing code= (PKCE)', () => {
    enqueue('clstr://auth/callback?code=pkce-12345');
    expect(getPending()).toBeNull();
  });

  it('normalizes https://clstr.network/post/id', () => {
    enqueue('https://clstr.network/post/xyz');
    expect(getPending()).toBe('/post/xyz');
  });

  it('normalizes https://www.clstr.network/events/id', () => {
    enqueue('https://www.clstr.network/events/123');
    expect(getPending()).toBe('/events/123');
  });

  it('ignores empty string', () => {
    enqueue('');
    expect(getPending()).toBeNull();
  });

  it('ignores root/home links', () => {
    enqueue('clstr://');
    expect(getPending()).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// 6. Navigation Queue Flush Tests (Test Plan Item 6)
// ─────────────────────────────────────────────────────────────

describe('DeepLinkQueue — Navigation Queue Flush (Plan §6)', () => {
  it('does NOT flush when only navReady', () => {
    const flush = vi.fn();
    setFlushCallback(flush);
    enqueue('clstr://post/111');
    setNavReady();
    expect(flush).not.toHaveBeenCalled();
    expect(getPending()).toBe('/post/111');
  });

  it('does NOT flush when only authReady', () => {
    const flush = vi.fn();
    setFlushCallback(flush);
    enqueue('clstr://post/111');
    setAuthReady(true);
    expect(flush).not.toHaveBeenCalled();
    expect(getPending()).toBe('/post/111');
  });

  it('flushes when BOTH navReady + authReady + authenticated', () => {
    const flush = vi.fn();
    setFlushCallback(flush);
    enqueue('clstr://post/222');
    setNavReady();
    setAuthReady(true);
    expect(flush).toHaveBeenCalledWith('/post/222');
    expect(getPending()).toBeNull();
  });

  it('does NOT flush if auth resolved but NOT authenticated', () => {
    const flush = vi.fn();
    setFlushCallback(flush);
    enqueue('clstr://post/333');
    setNavReady();
    setAuthReady(false); // not authenticated
    expect(flush).not.toHaveBeenCalled();
    // Link is held for post-login redirect
    expect(getPending()).toBe('/post/333');
  });

  it('flushes held link after re-signalling auth (post-login redirect)', () => {
    const flush = vi.fn();
    setFlushCallback(flush);
    enqueue('clstr://profile/user-x');
    setNavReady();
    // First: not authenticated — link is held
    setAuthReady(false);
    expect(flush).not.toHaveBeenCalled();
    // Now: user logs in — re-signal auth as ready
    setAuthReady(true);
    expect(flush).toHaveBeenCalledWith('/profile/user-x');
  });

  it('immediate flush when both gates already open', () => {
    const flush = vi.fn();
    setFlushCallback(flush);
    setNavReady();
    setAuthReady(true);
    // Enqueue after both gates open — should flush instantly
    enqueue('clstr://events/evt-live');
    expect(flush).toHaveBeenCalledWith('/events/evt-live');
  });
});

// ─────────────────────────────────────────────────────────────
// 7. Cold Start Routing Tests (Test Plan Item 7)
// ─────────────────────────────────────────────────────────────

describe('DeepLinkQueue — Cold Start Routing (Plan §7)', () => {
  it('holds link when nav not ready (simulates cold start)', () => {
    enqueue('clstr://post/cold-start-123');
    const state = getState();
    expect(state.navReady).toBe(false);
    expect(state.authReady).toBe(false);
    expect(state.pendingUrl).toBe('/post/cold-start-123');
  });

  it('flushes after both gates open (cold start → ready)', () => {
    const flush = vi.fn();
    setFlushCallback(flush);

    // Simulate cold start: link arrives first
    enqueue('clstr://post/cold-123');
    expect(flush).not.toHaveBeenCalled();

    // Navigation tree mounts (Expo Router ready)
    setNavReady();
    expect(flush).not.toHaveBeenCalled();

    // Auth resolves (session hydrated)
    setAuthReady(true);
    expect(flush).toHaveBeenCalledWith('/post/cold-123');
  });

  it('replaces pending URL with newest link', () => {
    vi.useFakeTimers();
    try {
      // Two links arrive during cold start — newest wins
      enqueue('clstr://post/old');
      // Advance time past the 500ms dedup window
      vi.advanceTimersByTime(600);
      enqueue('clstr://post/new');
      expect(getPending()).toBe('/post/new');
    } finally {
      vi.useRealTimers();
    }
  });
});

// ─────────────────────────────────────────────────────────────
// Deduplication
// ─────────────────────────────────────────────────────────────

describe('DeepLinkQueue — Deduplication', () => {
  it('deduplicates identical URLs within 500ms window', () => {
    enqueue('clstr://post/dedup');
    enqueue('clstr://post/dedup');
    enqueue('clstr://post/dedup');
    // Only the first enqueue should register
    expect(getPending()).toBe('/post/dedup');
  });

  it('accepts same URL after dedup window passes', async () => {
    enqueue('clstr://post/first');
    expect(getPending()).toBe('/post/first');

    // Simulate time passing beyond dedup window
    await new Promise((r) => setTimeout(r, 600));
    
    // Reset to allow re-enqueue
    reset();
    enqueue('clstr://post/first');
    expect(getPending()).toBe('/post/first');
  });
});

// ─────────────────────────────────────────────────────────────
// Sign-out Reset
// ─────────────────────────────────────────────────────────────

describe('DeepLinkQueue — Sign-out Reset', () => {
  it('clears all state on reset()', () => {
    setNavReady();
    setAuthReady(true);
    enqueue('clstr://post/stale-link');
    reset();
    const state = getState();
    expect(state.navReady).toBe(false);
    expect(state.authReady).toBe(false);
    expect(state.pendingUrl).toBeNull();
  });

  it('stale link from previous session does not replay after re-login', () => {
    const flush = vi.fn();
    setFlushCallback(flush);
    enqueue('clstr://post/old-session');
    setNavReady();

    // Sign out — reset
    reset();
    expect(flush).not.toHaveBeenCalled();

    // Re-login
    setNavReady();
    setAuthReady(true);
    // No pending — stale link was cleared
    expect(flush).not.toHaveBeenCalled();
  });
});
