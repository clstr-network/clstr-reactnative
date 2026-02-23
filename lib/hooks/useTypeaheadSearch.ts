/**
 * useTypeaheadSearch — React Query hook for typeahead/instant search.
 *
 * Uses the bound `typeaheadSearch` from lib/api/search.ts.
 * Requires minimum 2 characters and a valid college domain.
 */

import { useQuery } from '@tanstack/react-query';
import { typeaheadSearch } from '@/lib/api/search';

export const typeaheadKeys = {
  root: ['typeahead'] as const,
  query: (query: string, collegeDomain: string | null) =>
    ['typeahead', query, collegeDomain] as const,
};

interface UseTypeaheadSearchParams {
  query: string;
  collegeDomain: string | null | undefined;
}

/**
 * Custom hook for typeahead search.
 * Uses college_domain from identity context.
 */
export function useTypeaheadSearch({ query, collegeDomain }: UseTypeaheadSearchParams) {
  const normalizedQuery = (query ?? '').trim();

  // Normalize domain to lowercase
  const effectiveDomain = collegeDomain?.trim().toLowerCase() ?? null;

  const isEnabled = normalizedQuery.length >= 2 && Boolean(effectiveDomain);

  return useQuery({
    queryKey: typeaheadKeys.query(normalizedQuery, effectiveDomain),
    queryFn: () => typeaheadSearch({ query: normalizedQuery, collegeDomain: effectiveDomain }),
    enabled: isEnabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}
