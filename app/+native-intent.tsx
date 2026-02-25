/**
 * Native deep-link intent handler — Phase 4 (Navigation & Deep Link Parity)
 *
 * Converts incoming deep-link paths into Expo Router paths.
 * Handles both custom scheme (`clstr://`) and universal links
 * (`https://clstr.network/...`).
 *
 * Cold-start behavior:
 *   When `initial` is true, the resolved path is returned immediately.
 *   Expo Router internally defers rendering until the navigation tree
 *   is ready, so the path is safe to return.
 *
 *   For non-auth deep links during cold start, the DeepLinkQueue
 *   (lib/deep-link-queue.ts) provides an additional safety net:
 *   if navigation or auth is not yet resolved, the link is held
 *   and replayed once both conditions are met.
 *
 * Background-resume behavior:
 *   When `initial` is false, the link arrived while the app was
 *   already running. The resolved path is returned for immediate
 *   navigation by Expo Router.
 *
 * Routes:
 *   clstr://auth/callback#...      → /auth/callback (token exchange)
 *   clstr://post/:id               → /post/:id
 *   clstr://profile/:id            → /user/:id
 *   clstr://events/:id             → /event/:id
 *   clstr://messaging?partner=:id  → /chat/:id
 *   clstr://notifications          → /notifications
 *   clstr://settings               → /settings
 *   clstr://search                 → /search
 *   clstr://saved                  → /saved
 *   clstr://jobs                   → /jobs
 *   clstr://jobs/:id               → /job/:id
 *   clstr://mentorship             → /mentorship
 *   clstr://clubs                  → /clubs
 *   clstr://alumni                 → /alumni
 *   clstr://projects               → /projects
 *   clstr://projects/:id           → /project/:id
 *   clstr://ecocampus              → /ecocampus
 *   clstr://portfolio              → /portfolio
 *   clstr://skill-analysis         → /skill-analysis
 *   clstr://ai-chat                → /ai-chat
 *   clstr://feed                   → /
 */

import { enqueue as enqueueDeepLink } from '@/lib/deep-link-queue';

export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): string {
  // ----- Auth callback (highest priority — never queued) -----
  if (path.includes('auth/callback')) {
    return '/auth/callback';
  }

  // ----- Strip scheme prefix if present -----
  let cleanPath = path;

  // Remove custom scheme (clstr://)
  cleanPath = cleanPath.replace(/^clstr:\/\//, '/');

  // Remove universal link prefix (https://clstr.network or https://www.clstr.network)
  cleanPath = cleanPath.replace(/^https?:\/\/(www\.)?clstr\.network/, '');

  // Ensure leading slash
  if (cleanPath && !cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }

  // ----- Route mapping: web paths → mobile routes -----

  // Post detail: /post/:id or /posts/:id
  const postMatch = cleanPath.match(/^\/posts?\/([a-zA-Z0-9\-]+)/);
  if (postMatch) {
    return `/post/${postMatch[1]}`;
  }

  // User profile: /profile/:id or /user/:id
  const profileMatch = cleanPath.match(/^\/(?:profile|user)\/([a-zA-Z0-9\-]+)/);
  if (profileMatch) {
    return `/user/${profileMatch[1]}`;
  }

  // Event detail: /events/:id or /event/:id
  const eventMatch = cleanPath.match(/^\/events?\/([a-zA-Z0-9\-]+)/);
  if (eventMatch) {
    return `/event/${eventMatch[1]}`;
  }

  // Messaging: /messaging?partner=:id or /chat/:id
  const messagingMatch = cleanPath.match(/^\/messaging/);
  if (messagingMatch) {
    const partnerMatch = cleanPath.match(/[?&]partner=([a-zA-Z0-9\-]+)/);
    if (partnerMatch) {
      return `/chat/${partnerMatch[1]}`;
    }
    return '/(tabs)/messages';
  }

  const chatMatch = cleanPath.match(/^\/chat\/([a-zA-Z0-9\-]+)/);
  if (chatMatch) {
    return `/chat/${chatMatch[1]}`;
  }

  // Notifications
  if (cleanPath.startsWith('/notifications')) {
    return '/notifications';
  }

  // Settings
  if (cleanPath.startsWith('/settings')) {
    return '/settings';
  }

  // Search (Phase 8)
  if (cleanPath.startsWith('/search')) {
    return '/search';
  }

  // Saved items (Phase 8)
  if (cleanPath.startsWith('/saved') || cleanPath.startsWith('/bookmarks')) {
    return '/saved';
  }

  // ── Phase 9 — Advanced Features ──

  // Jobs: /jobs/:id
  const jobMatch = cleanPath.match(/^\/jobs?\/([a-zA-Z0-9\-]+)/);
  if (jobMatch) {
    return `/job/${jobMatch[1]}`;
  }
  // Jobs list
  if (cleanPath === '/jobs') {
    return '/jobs';
  }

  // Mentorship
  if (cleanPath.startsWith('/mentorship')) {
    return '/mentorship';
  }

  // Clubs
  if (cleanPath.startsWith('/clubs')) {
    return '/clubs';
  }

  // Alumni
  if (cleanPath.startsWith('/alumni')) {
    return '/alumni';
  }

  // Projects / CollabHub: /projects/:id
  const projectMatch = cleanPath.match(/^\/projects?\/([a-zA-Z0-9\-]+)/);
  if (projectMatch) {
    return `/project/${projectMatch[1]}`;
  }
  // Projects list
  if (cleanPath === '/projects' || cleanPath === '/collabhub') {
    return '/projects';
  }

  // EcoCampus
  if (cleanPath.startsWith('/ecocampus') || cleanPath.startsWith('/eco-campus')) {
    return '/ecocampus';
  }

  // Portfolio
  if (cleanPath.startsWith('/portfolio')) {
    return '/portfolio';
  }

  // Skill Analysis
  if (cleanPath.startsWith('/skill-analysis') || cleanPath.startsWith('/skills')) {
    return '/skill-analysis';
  }

  // AI Chat
  if (cleanPath.startsWith('/ai-chat') || cleanPath.startsWith('/ai')) {
    return '/ai-chat';
  }

  // Feed / home
  if (cleanPath === '/feed' || cleanPath === '/home') {
    return '/';
  }

  // Network
  if (cleanPath.startsWith('/network') || cleanPath.startsWith('/connections')) {
    return '/(tabs)/network';
  }

  // Events list (no ID)
  if (cleanPath === '/events') {
    return '/(tabs)/events';
  }

  // ----- Cold-start queue integration (Phase 4) -----
  // For cold-start deep links (initial=true), enqueue the resolved path
  // into the DeepLinkQueue as a safety net. The queue ensures the link
  // is replayed after nav tree + auth are both ready.
  // The path is still returned to Expo Router for normal handling.
  if (initial && cleanPath && cleanPath !== '/') {
    enqueueDeepLink(path);
  }

  // ----- Fallback -----
  // For unknown paths, return the cleaned path or root
  return cleanPath || '/';
}
