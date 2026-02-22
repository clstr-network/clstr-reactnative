export function redirectSystemPath({
  path,
  initial,
}: { path: string; initial: boolean }) {
  if (path.startsWith('/post/')) return path;
  if (path.startsWith('/user/')) return path;
  if (path.startsWith('/event/')) return path;
  if (path.startsWith('/chat/')) return path;
  if (path === '/notifications') return path;
  if (path === '/settings') return path;
  return '/';
}
