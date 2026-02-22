/**
 * Mobile API barrel — single import point for all API adapters.
 *
 * Usage:
 *   import { getPosts, getConversations, getProfileById } from '@/lib/api';
 */

// ── Phase 0-8 adapters ───────────────────────────────────────────────
export * from './social';
export * from './messages';
export * from './events';
export * from './profile';
export * from './account';
export * from './search';
export * from './permissions';
export * from './notifications';
export * from './settings';
export * from './saved';

// ── Phase 9 adapters (Advanced Features) ─────────────────────────────
export * from './jobs';
export * from './clubs';
export * from './projects';
export * from './ecocampus';
export * from './portfolio';
export * from './skill-analysis';
export * from './ai-chat';
export * from './mentorship';
export * from './alumni';
