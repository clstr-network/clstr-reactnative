/**
 * Native deep-link intent handler.
 *
 * Converts incoming deep-link paths (e.g. clstr://auth/callback#token=...)
 * into Expo Router paths.
 */
export function redirectSystemPath({
  path,
  initial,
}: { path: string; initial: boolean }) {
  // auth/callback deep links from magic link / password reset emails
  if (path.includes('auth/callback')) {
    return '/auth/callback';
  }

  return path || '/';
}
