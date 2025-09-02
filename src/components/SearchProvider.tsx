'use client';

import { createContext, useContext, useCallback, useState } from 'react';
import type { BookWithSearchMetadata } from '@/types';

// Search Results Context
interface SearchContextType {
  searchResults: BookWithSearchMetadata[] | null;
  hasActiveSearch: boolean;
  setSearchResults: (results: BookWithSearchMetadata[], isActive: boolean) => void;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const useSearchContext = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearchContext must be used within SearchProvider');
  }
  return context;
};

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchResults, setSearchResultsState] = useState<BookWithSearchMetadata[] | null>(null);
  const [hasActiveSearch, setHasActiveSearch] = useState(false);

  const setSearchResults = useCallback((results: BookWithSearchMetadata[], isActive: boolean) => {
    setSearchResultsState(results);
    setHasActiveSearch(isActive);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResultsState(null);
    setHasActiveSearch(false);
  }, []);

  return (
    <SearchContext.Provider value={{
      searchResults,
      hasActiveSearch,
      setSearchResults,
      clearSearch
    }}>
      {children}
    </SearchContext.Provider>
  );
}