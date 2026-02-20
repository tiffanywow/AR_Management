import { useEffect, useState, useCallback } from 'react';
import { searchService, SearchResult } from '@/lib/searchService';

export function useSearch() {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    searchService.initialize().then(() => setInitialized(true));
  }, []);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchService.search(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const refreshIndex = useCallback(async () => {
    await searchService.refreshIndex();
  }, []);

  return {
    search,
    searchResults,
    isSearching,
    initialized,
    refreshIndex,
  };
}
