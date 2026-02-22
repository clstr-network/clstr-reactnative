import { QueryClient } from '@tanstack/react-query';

/**
 * React Query client configured for Supabase-direct data fetching.
 *
 * All query functions are provided inline by the hooks / screens that consume
 * them — there is no global `queryFn`.  The Express-proxy pattern has been
 * removed; every query now calls @clstr/core API functions (pre-bound to the
 * mobile Supabase client via lib/api/*).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,        // 2 minutes
      gcTime: 1000 * 60 * 10,           // 10 minutes garbage-collection
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 1,
    },
  },
});
