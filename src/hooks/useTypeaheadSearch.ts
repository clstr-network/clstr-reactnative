import { useQuery } from "@tanstack/react-query";
import { typeaheadSearch, type TypeaheadResults } from "@/lib/typeahead-search";

export const typeaheadKeys = {
  root: ["typeahead"] as const,
  query: (query: string, collegeDomain: string | null) =>
    ["typeahead", query, collegeDomain] as const,
};

interface UseTypeaheadSearchParams {
  query: string;
  collegeDomain: string | null | undefined;
}

/**
 * Custom hook for typeahead search in navbar.
 * Uses college_domain from profile context.
 */
export const useTypeaheadSearch = ({ query, collegeDomain }: UseTypeaheadSearchParams) => {
  const normalizedQuery = (query ?? '').trim();
  
  // Normalize domain to lowercase (don't over-process)
  const effectiveDomain = collegeDomain?.trim().toLowerCase() ?? null;
  
  const isEnabled = normalizedQuery.length >= 2 && Boolean(effectiveDomain);

  return useQuery<TypeaheadResults>({
    queryKey: typeaheadKeys.query(normalizedQuery, effectiveDomain),
    queryFn: () => typeaheadSearch({ query: normalizedQuery, collegeDomain: effectiveDomain }),
    enabled: isEnabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
};
