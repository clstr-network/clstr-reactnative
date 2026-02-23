/**
 * usePagination — Client-side pagination hook.
 *
 * Manages paginated display of a pre-loaded item list with
 * loadMore, reset, and addItem functionality.
 */

import { useState, useCallback } from 'react';

interface UsePaginationOptions<T> {
  initialData: T[];
  itemsPerPage?: number;
}

export function usePagination<T>({
  initialData,
  itemsPerPage = 5,
}: UsePaginationOptions<T>) {
  const [allItems] = useState<T[]>(initialData);
  const [displayedItems, setDisplayedItems] = useState<T[]>(
    initialData.slice(0, itemsPerPage),
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const hasMore = displayedItems.length < allItems.length;

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;

    setIsLoading(true);

    // Simulate brief loading state for smooth UX
    await new Promise((resolve) => setTimeout(resolve, 300));

    const nextPage = currentPage + 1;
    const endIndex = nextPage * itemsPerPage;
    const newDisplayedItems = allItems.slice(0, endIndex);

    setDisplayedItems(newDisplayedItems);
    setCurrentPage(nextPage);
    setIsLoading(false);
  }, [allItems, currentPage, hasMore, isLoading, itemsPerPage]);

  const reset = useCallback(() => {
    setDisplayedItems(allItems.slice(0, itemsPerPage));
    setCurrentPage(1);
  }, [allItems, itemsPerPage]);

  const addItem = useCallback((item: T) => {
    setDisplayedItems((prev) => [item, ...prev]);
  }, []);

  return {
    items: displayedItems,
    hasMore,
    isLoading,
    loadMore,
    reset,
    addItem,
  };
}
