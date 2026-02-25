/**
 * Phase 8 — Test Plan Item 1: Deep Link Route Mapping
 *
 * Validates that `+native-intent.tsx` `redirectSystemPath()` correctly maps
 * every deep-link URL pattern to its mobile-app route.
 *
 * Covers:
 *   - Custom scheme (`clstr://...`)
 *   - Universal links (`https://clstr.network/...`)
 *   - Auth callback priority
 *   - Fallback / unknown paths
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the deep-link-queue enqueue to prevent side effects
vi.mock('@/lib/deep-link-queue', () => ({
  enqueue: vi.fn(),
}));

import { redirectSystemPath } from '@/app/+native-intent';
import { enqueue } from '@/lib/deep-link-queue';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('redirectSystemPath — Route Mapping', () => {
  // ── Auth callback (highest priority) ──

  it('routes auth/callback to /auth/callback', () => {
    expect(redirectSystemPath({ path: 'clstr://auth/callback?code=123', initial: false })).toBe('/auth/callback');
  });

  it('routes auth/callback with hash fragment', () => {
    expect(redirectSystemPath({ path: 'clstr://auth/callback#access_token=jwt', initial: false })).toBe('/auth/callback');
  });

  it('routes universal link auth/callback', () => {
    expect(redirectSystemPath({ path: 'https://clstr.network/auth/callback?code=abc', initial: false })).toBe('/auth/callback');
  });

  // ── Post ──

  it('routes /post/:id', () => {
    expect(redirectSystemPath({ path: 'clstr://post/abc-123', initial: false })).toBe('/post/abc-123');
  });

  it('routes /posts/:id (plural)', () => {
    expect(redirectSystemPath({ path: 'clstr://posts/abc-123', initial: false })).toBe('/post/abc-123');
  });

  // ── Profile / User ──

  it('routes /profile/:id to /user/:id', () => {
    expect(redirectSystemPath({ path: 'clstr://profile/user-456', initial: false })).toBe('/user/user-456');
  });

  it('routes /user/:id to /user/:id', () => {
    expect(redirectSystemPath({ path: 'clstr://user/user-456', initial: false })).toBe('/user/user-456');
  });

  // ── Events ──

  it('routes /events/:id to /event/:id', () => {
    expect(redirectSystemPath({ path: 'clstr://events/evt-789', initial: false })).toBe('/event/evt-789');
  });

  it('routes /event/:id to /event/:id', () => {
    expect(redirectSystemPath({ path: 'clstr://event/evt-789', initial: false })).toBe('/event/evt-789');
  });

  it('routes /events (list) to tab', () => {
    expect(redirectSystemPath({ path: 'clstr://events', initial: false })).toBe('/(tabs)/events');
  });

  // ── Messaging / Chat ──

  it('routes /messaging to /(tabs)/messages', () => {
    expect(redirectSystemPath({ path: 'clstr://messaging', initial: false })).toBe('/(tabs)/messages');
  });

  it('routes /messaging?partner=:id to /chat/:id', () => {
    expect(redirectSystemPath({ path: 'clstr://messaging?partner=p-123', initial: false })).toBe('/chat/p-123');
  });

  it('routes /chat/:id to /chat/:id', () => {
    expect(redirectSystemPath({ path: 'clstr://chat/conv-abc', initial: false })).toBe('/chat/conv-abc');
  });

  // ── Notifications ──

  it('routes /notifications', () => {
    expect(redirectSystemPath({ path: 'clstr://notifications', initial: false })).toBe('/notifications');
  });

  // ── Settings ──

  it('routes /settings', () => {
    expect(redirectSystemPath({ path: 'clstr://settings', initial: false })).toBe('/settings');
  });

  // ── Search ──

  it('routes /search', () => {
    expect(redirectSystemPath({ path: 'clstr://search', initial: false })).toBe('/search');
  });

  // ── Saved ──

  it('routes /saved', () => {
    expect(redirectSystemPath({ path: 'clstr://saved', initial: false })).toBe('/saved');
  });

  it('routes /bookmarks to /saved', () => {
    expect(redirectSystemPath({ path: 'clstr://bookmarks', initial: false })).toBe('/saved');
  });

  // ── Jobs ──

  it('routes /jobs (list)', () => {
    expect(redirectSystemPath({ path: 'clstr://jobs', initial: false })).toBe('/jobs');
  });

  it('routes /jobs/:id to /job/:id', () => {
    expect(redirectSystemPath({ path: 'clstr://jobs/job-x', initial: false })).toBe('/job/job-x');
  });

  // ── Mentorship ──

  it('routes /mentorship', () => {
    expect(redirectSystemPath({ path: 'clstr://mentorship', initial: false })).toBe('/mentorship');
  });

  // ── Clubs ──

  it('routes /clubs', () => {
    expect(redirectSystemPath({ path: 'clstr://clubs', initial: false })).toBe('/clubs');
  });

  // ── Alumni ──

  it('routes /alumni', () => {
    expect(redirectSystemPath({ path: 'clstr://alumni', initial: false })).toBe('/alumni');
  });

  // ── Projects ──

  it('routes /projects (list)', () => {
    expect(redirectSystemPath({ path: 'clstr://projects', initial: false })).toBe('/projects');
  });

  it('routes /projects/:id to /project/:id', () => {
    expect(redirectSystemPath({ path: 'clstr://projects/proj-1', initial: false })).toBe('/project/proj-1');
  });

  it('routes /collabhub to /projects', () => {
    expect(redirectSystemPath({ path: 'clstr://collabhub', initial: false })).toBe('/projects');
  });

  // ── EcoCampus ──

  it('routes /ecocampus', () => {
    expect(redirectSystemPath({ path: 'clstr://ecocampus', initial: false })).toBe('/ecocampus');
  });

  it('routes /eco-campus to /ecocampus', () => {
    expect(redirectSystemPath({ path: 'clstr://eco-campus', initial: false })).toBe('/ecocampus');
  });

  // ── Portfolio ──

  it('routes /portfolio', () => {
    expect(redirectSystemPath({ path: 'clstr://portfolio', initial: false })).toBe('/portfolio');
  });

  // ── Skill Analysis ──

  it('routes /skill-analysis', () => {
    expect(redirectSystemPath({ path: 'clstr://skill-analysis', initial: false })).toBe('/skill-analysis');
  });

  it('routes /skills to /skill-analysis', () => {
    expect(redirectSystemPath({ path: 'clstr://skills', initial: false })).toBe('/skill-analysis');
  });

  // ── AI Chat ──

  it('routes /ai-chat', () => {
    expect(redirectSystemPath({ path: 'clstr://ai-chat', initial: false })).toBe('/ai-chat');
  });

  // ── Feed ──

  it('routes /feed to /', () => {
    expect(redirectSystemPath({ path: 'clstr://feed', initial: false })).toBe('/');
  });

  it('routes /home to /', () => {
    expect(redirectSystemPath({ path: 'clstr://home', initial: false })).toBe('/');
  });

  // ── Network ──

  it('routes /network to /(tabs)/network', () => {
    expect(redirectSystemPath({ path: 'clstr://network', initial: false })).toBe('/(tabs)/network');
  });

  it('routes /connections to /(tabs)/network', () => {
    expect(redirectSystemPath({ path: 'clstr://connections', initial: false })).toBe('/(tabs)/network');
  });

  // ── Universal link prefix ──

  it('strips https://clstr.network and routes correctly', () => {
    expect(redirectSystemPath({ path: 'https://clstr.network/post/uni-123', initial: false })).toBe('/post/uni-123');
  });

  it('strips https://www.clstr.network and routes correctly', () => {
    expect(redirectSystemPath({ path: 'https://www.clstr.network/events/uni-456', initial: false })).toBe('/event/uni-456');
  });
});

describe('redirectSystemPath — Cold Start (initial=true)', () => {
  // NOTE: The enqueue call in +native-intent.tsx is a safety-net at the
  // bottom of the function. Known routes (post, profile, events, etc.)
  // return early before reaching the enqueue block. Only unmatched paths
  // fall through to the enqueue call.

  it('does NOT enqueue known routes (they return before reaching enqueue)', () => {
    // Known path matches post route → returns '/post/cold-1' before enqueue
    redirectSystemPath({ path: 'clstr://post/cold-1', initial: true });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('enqueues unmatched paths during cold start as safety net', () => {
    // Unmatched path falls through all route matchers → reaches enqueue
    redirectSystemPath({ path: 'clstr://some-unknown-page/xyz', initial: true });
    expect(enqueue).toHaveBeenCalled();
  });

  it('does NOT enqueue auth callback URLs', () => {
    redirectSystemPath({ path: 'clstr://auth/callback?code=x', initial: true });
    // Auth callbacks return early at the top before reaching the enqueue block
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('does NOT enqueue for warm start (initial=false)', () => {
    // Even unmatched paths don't enqueue on warm start
    redirectSystemPath({ path: 'clstr://some-unknown-page/xyz', initial: false });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('does NOT enqueue root/home paths on cold start', () => {
    redirectSystemPath({ path: 'clstr://feed', initial: true });
    expect(enqueue).not.toHaveBeenCalled();
  });
});
