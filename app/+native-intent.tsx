/**
 * Native deep-link intent handler — Phase 5.4
 *
 * Converts incoming deep-link paths into Expo Router paths.
 * Handles both custom scheme (`clstr://`) and universal links
 * (`https://clstr.network/...`).
 *
 * Routes:
 *   clstr://auth/callback#...      → /auth/callback (token exchange)
 *   clstr://post/:id               → /post/:id
 *   clstr://profile/:id            → /user/:id
 *   clstr://events/:id             → /event/:id
 *   clstr://messaging?partner=:id  → /chat/:id
 *   clstr://notifications          → /notifications
 *   clstr://settings               → /settings
 *   clstr://feed                   → /
 *
 * Cold start:
 *   When `initial` is true and the link is NOT an auth callback,
 *   we still return the resolved path — Expo Router handles queuing
 *   until the navigation container is ready.
 */

export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): string {
  // ----- Auth callback (highest priority) -----
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

  // ----- Fallback -----
  // For unknown paths, return the cleaned path or root
  return cleanPath || '/';
}
