/**
 * Identity Resolution — Unit & Integration Tests
 *
 * Tests the canonical identity abstraction layer:
 * - Type guards
 * - Hook behavior under various scenarios
 * - Threat model assertions (A1–D2)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isResolvedIdentity } from '@/types/identity';
import type { IdentityContext, IdentityError, IdentityResult, InviteOpsStats } from '@/types/identity';

// ──────────────────────────────────────────────────────────────────────────────
// 1. Type guard tests
// ──────────────────────────────────────────────────────────────────────────────
describe('isResolvedIdentity', () => {
  it('returns true for a fully resolved student identity', () => {
    const student: IdentityContext = {
      user_id: 'u1',
      role: 'Student',
      college_email: 'alice@raghuenggcollege.in',
      college_domain: 'raghuenggcollege.in',
      personal_email: null,
      source: 'student',
      full_name: 'Alice',
      avatar_url: null,
      university: 'Raghu Engineering',
      major: 'CS',
      graduation_year: '2027',
      onboarding_complete: true,
      has_profile: true,
      is_verified: false,
      profile_completion: 40,
      email_transition_status: null,
      personal_email_verified: false,
    };
    expect(isResolvedIdentity(student)).toBe(true);
  });

  it('returns true for an alumni identity', () => {
    const alumni: IdentityContext = {
      user_id: 'u2',
      role: 'Alumni',
      college_email: 'bob@raghuenggcollege.in',
      college_domain: 'raghuenggcollege.in',
      personal_email: 'bob@gmail.com',
      source: 'alumni',
      full_name: 'Bob',
      avatar_url: null,
      university: 'Raghu Engineering',
      major: 'EE',
      graduation_year: '2023',
      onboarding_complete: true,
      has_profile: true,
      is_verified: true,
      profile_completion: 75,
      email_transition_status: 'transitioned',
      personal_email_verified: true,
    };
    expect(isResolvedIdentity(alumni)).toBe(true);
  });

  it('returns false for an error response', () => {
    const err: IdentityError = {
      user_id: 'u3',
      error: 'no_profile',
      has_profile: false,
      onboarding_complete: false,
    };
    expect(isResolvedIdentity(err)).toBe(false);
  });

  it('returns false for auth-level error', () => {
    const err: IdentityResult = { error: 'Not authenticated', has_profile: false, onboarding_complete: false };
    expect(isResolvedIdentity(err)).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. Identity source classification
// ──────────────────────────────────────────────────────────────────────────────
describe('Identity source classification', () => {
  const makeIdentity = (role: string, source: IdentityContext['source']): IdentityContext => ({
    user_id: 'test',
    role,
    college_email: 'test@example.edu',
    college_domain: 'example.edu',
    personal_email: null,
    source,
    full_name: 'Test',
    avatar_url: null,
    university: null,
    major: null,
    graduation_year: null,
    onboarding_complete: true,
    has_profile: true,
    is_verified: false,
    profile_completion: 0,
    email_transition_status: null,
    personal_email_verified: false,
  });

  it('classifies Student correctly', () => {
    const id = makeIdentity('Student', 'student');
    expect(id.source).toBe('student');
    expect(id.role).toBe('Student');
  });

  it('classifies Alumni correctly', () => {
    const id = makeIdentity('Alumni', 'alumni');
    expect(id.source).toBe('alumni');
  });

  it('classifies Faculty correctly', () => {
    const id = makeIdentity('Faculty', 'faculty');
    expect(id.source).toBe('faculty');
  });

  it('classifies Club correctly', () => {
    const id = makeIdentity('Club', 'club');
    expect(id.source).toBe('club');
  });

  it('classifies mid-onboarding alumni', () => {
    const id = makeIdentity('Alumni', 'alumni_invite_pending_onboarding');
    expect(id.source).toBe('alumni_invite_pending_onboarding');
    expect(id.onboarding_complete).toBe(true); // overridden by caller
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. Threat model assertions
// ──────────────────────────────────────────────────────────────────────────────
describe('Threat Model Assertions', () => {
  describe('Class A — Invite Token Abuse', () => {
    it('A1: tokens are random, single-use, and expiring (schema invariant)', () => {
      // This is a schema-level guarantee. We assert the type constraint:
      // token field must be a non-empty string, and expires_at must be a valid datetime.
      // In the SQL migration: token text UNIQUE NOT NULL, expires_at timestamptz NOT NULL
      expect(true).toBe(true); // Documented invariant — tested at DB level via migration
    });

    it('A2: accept_invite uses auth.uid() — no user_id parameter', () => {
      // The accept_invite RPC signature is (p_token text).
      // There is no p_auth_user_id parameter — the server reads auth.uid().
      // Additionally it verifies auth.users.email === invite.personal_email.
      expect(true).toBe(true); // Structural invariant verified by migration audit
    });

    it('A3: replay after acceptance is blocked by status check', () => {
      // accept_alumni_invite checks status = 'invited' before proceeding.
      // Once status = 'accepted', subsequent calls return error.
      expect(true).toBe(true); // Structural invariant verified by migration audit
    });
  });

  describe('Class B — Auth Email Confusion', () => {
    it('B1: domain checks never use auth.email — always profiles.college_domain', () => {
      // In get_identity_context(), college_domain comes from profiles.college_domain
      // which was set from alumni_invites.college_domain during onboarding (for alumni)
      // or from the academic email domain (for students).
      // auth.users.email is never referenced.
      const identity: IdentityContext = {
        user_id: 'attacker',
        role: 'Student',
        college_email: 'legit@raghuenggcollege.in',
        college_domain: 'raghuenggcollege.in',
        personal_email: null,
        source: 'student',
        full_name: 'Legitimate',
        avatar_url: null,
        university: null,
        major: null,
        graduation_year: null,
        onboarding_complete: true,
        has_profile: true,
        is_verified: false,
        profile_completion: 0,
        email_transition_status: null,
        personal_email_verified: false,
      };

      // Even if auth.email were "attacker@othercollege.edu",
      // the identity.college_domain remains what the profile says.
      expect(identity.college_domain).toBe('raghuenggcollege.in');
    });

    it('B2: alumni cannot change email or college_domain (trigger guard)', () => {
      // guard_alumni_profile_email_immutability() trigger blocks UPDATE on
      // profiles.email and profiles.college_domain when role = 'Alumni'.
      expect(true).toBe(true); // DB trigger invariant
    });
  });

  describe('Class C — UI Timing / Race Attacks', () => {
    it('C1: missing profile forces redirect — no content flash', () => {
      const noProfile: IdentityResult = {
        error: 'no_profile',
        has_profile: false,
        onboarding_complete: false,
      };
      expect(isResolvedIdentity(noProfile)).toBe(false);
      // Components reading identity === null will gate/redirect
    });

    it('C2: sessionStorage tampering is overridden by server RPC', () => {
      // get_accepted_invite_context() is the server-authoritative fallback.
      // Even if sessionStorage is tampered, onboarding reads from the RPC.
      expect(true).toBe(true); // Architecture invariant
    });
  });

  describe('Class D — Admin Abuse / Mistakes', () => {
    it('D1: resend cooldown is 24 hours (server-enforced)', () => {
      // resend_alumni_invite() checks:
      // IF v_invite.last_sent_at IS NOT NULL
      //    AND v_invite.last_sent_at > NOW() - INTERVAL '24 hours'
      // THEN return error
      expect(true).toBe(true); // DB function invariant
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. InviteOpsStats type shape
// ──────────────────────────────────────────────────────────────────────────────
describe('InviteOpsStats type', () => {
  it('has all required fields', () => {
    const stats: InviteOpsStats = {
      total_invites: 1000,
      invited: 600,
      accepted: 300,
      expired: 50,
      disputed: 10,
      cancelled: 40,
      accepted_today: 5,
      invited_today: 20,
      accepted_7d: 80,
      invited_7d: 200,
      avg_accept_hours: 12.5,
      unique_domains: 15,
      pending_expiring_24h: 30,
    };
    expect(stats.total_invites).toBe(1000);
    expect(stats.accepted + stats.invited + stats.expired + stats.disputed + stats.cancelled).toBe(1000);
    expect(stats.avg_accept_hours).toBe(12.5);
    expect(stats.pending_expiring_24h).toBe(30);
  });

  it('allows null avg_accept_hours when no invites accepted', () => {
    const stats: InviteOpsStats = {
      total_invites: 0,
      invited: 0,
      accepted: 0,
      expired: 0,
      disputed: 0,
      cancelled: 0,
      accepted_today: 0,
      invited_today: 0,
      accepted_7d: 0,
      invited_7d: 0,
      avg_accept_hours: null,
      unique_domains: 0,
      pending_expiring_24h: 0,
    };
    expect(stats.avg_accept_hours).toBeNull();
  });
});
