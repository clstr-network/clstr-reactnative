/**
 * useFeed — Infinite-scroll feed hook.
 *
 * Wraps useInfiniteQuery with getPosts from @clstr/core.
 * Uses QUERY_KEYS.feed.posts() (S2 enforced).
 * Pagination logic stays in getPosts (S5).
 * Errors returned as structured objects (S6 — no toast/alert).
 */
import { useInfiniteQuery } from '@tanstack/react-query';
import { getPosts } from '@clstr/core/api/social-api';
import { supabase } from '@clstr/shared/integrations/supabase/client';
import { QUERY_KEYS } from '@clstr/shared/query-keys';

export function useFeed() {
  const query = useInfiniteQuery({
    queryKey: QUERY_KEYS.feed.posts(),
    queryFn: async ({ pageParam }) => {
      return getPosts(supabase, {
        pageSize: 15,
        cursor: pageParam ?? null,
        sortBy: 'recent',
      });
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    initialPageParam: null as string | null,
  });

  const posts = query.data?.pages.flatMap((page) => page.posts) ?? [];

  return {
    posts,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}
