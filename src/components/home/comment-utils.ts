import type { QueryClient } from '@tanstack/react-query';

/**
 * Optimistically patch `comments_count` for a specific post across
 * all feed / detail caches so the count updates instantly — no
 * waiting for a server round-trip.
 */
export function updateCommentCountInFeeds(
  queryClient: QueryClient,
  postId: string,
  delta: number,
) {
  const patch = (old: any) => {
    if (!old) return old;

    // Infinite-query pages format
    if (old.pages) {
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          posts: page.posts?.map((p: any) =>
            p.id === postId
              ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) + delta) }
              : p,
          ),
        })),
      };
    }

    // Array format
    if (Array.isArray(old)) {
      return old.map((p: any) =>
        p.id === postId
          ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) + delta) }
          : p,
      );
    }

    // Single-post format
    if (old.id === postId) {
      return { ...old, comments_count: Math.max(0, (old.comments_count || 0) + delta) };
    }

    return old;
  };

  queryClient.setQueriesData(
    {
      predicate: (q) => {
        const key = q.queryKey;
        return (
          key.includes('home-feed') ||
          key.includes('feed-posts') ||
          key.includes('profile-posts') ||
          key.includes('saved-items') ||
          key.includes('post-detail')
        );
      },
    },
    patch,
  );
}
