'use client';

import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  Chip,
  Typography,
  Fade,
} from '@mui/material';
import {
  Search,
  Clear,
  Psychology,
  TrendingUp,
} from '@mui/icons-material';
import RecommendationSection, { RecommendationBook } from './RecommendationSection';
import { debounce } from 'lodash';

export interface SearchWithRecommendationsProps {
  placeholder?: string;
  limit?: number;
  category?: string;
  minSimilarity?: number;
  showScores?: boolean;
  showAlgorithm?: boolean;
  showSuggestions?: boolean;
  onSearchChange?: (query: string) => void;
  autoSearch?: boolean;
  searchDelay?: number;
}

interface SearchResponse {
  success: boolean;
  query: string;
  recommendations: any[];
  algorithm?: string;
  model_version?: string;
  total: number;
  cached: boolean;
}

const SEARCH_SUGGESTIONS = [
  'Myanmar literature',
  'Historical fiction',
  'Business strategy',
  'Love stories',
  'Science and technology',
  'Self improvement',
  'Cooking recipes',
  'Ancient history',
  'Modern philosophy',
  'Adventure novels',
];

export default function SearchWithRecommendations({
  placeholder = 'Search for books by content, theme, or topic...',
  limit = 12,
  category,
  minSimilarity = 0.2,
  showScores = true,
  showAlgorithm = true,
  showSuggestions = true,
  onSearchChange,
  autoSearch = true,
  searchDelay = 500,
}: SearchWithRecommendationsProps) {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<RecommendationBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [algorithm, setAlgorithm] = useState<string>('');

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setBooks([]);
      setHasSearched(false);
      setAlgorithm('');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        query: searchQuery.trim(),
        limit: limit.toString(),
        minSimilarity: minSimilarity.toString(),
      });

      if (category) {
        params.append('category', category);
      }

      const response = await fetch(`/api/recommendations/search?${params}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data: SearchResponse = await response.json();

      if (data.success) {
        setBooks(data.recommendations || []);
        setAlgorithm(data.algorithm || '');
        setHasSearched(true);
      } else {
        throw new Error('Search returned no results');
      }
    } catch (err) {
      console.error('Error performing search:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setBooks([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => {
      performSearch(searchQuery);
    }, searchDelay),
    [limit, category, minSimilarity]
  );

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    onSearchChange?.(newQuery);

    if (autoSearch) {
      debouncedSearch(newQuery);
    }
  };

  const handleSearchSubmit = () => {
    performSearch(query);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    performSearch(suggestion);
  };

  const handleClear = () => {
    setQuery('');
    setBooks([]);
    setHasSearched(false);
    setError(null);
    setAlgorithm('');
    onSearchChange?.('');
  };

  const getResultsTitle = () => {
    if (!hasSearched) return '';
    if (loading) return 'Searching...';
    if (books.length === 0) return `No results for "${query}"`;
    return `Search Results for "${query}"`;
  };

  const getResultsSubtitle = () => {
    if (!hasSearched || loading) return '';
    if (books.length === 0) return 'Try different keywords or browse our trending books';
    
    const algorithmName = algorithm === 'semantic_search' ? 'AI semantic search' : 'text search';
    return `Found ${books.length} books using ${algorithmName}`;
  };

  const getSearchIcon = () => {
    if (algorithm === 'semantic_search') {
      return <Psychology sx={{ color: 'primary.main' }} />;
    }
    return <Search />;
  };

  return (
    <Box>
      {/* Search Input */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          mb: showSuggestions ? 2 : 3,
          borderRadius: 2,
        }}
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearchSubmit();
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {getSearchIcon()}
              </InputAdornment>
            ),
            endAdornment: query && (
              <InputAdornment position="end">
                <IconButton onClick={handleClear} size="small">
                  <Clear />
                </IconButton>
              </InputAdornment>
            ),
            sx: {
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(0,0,0,0.1)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
              },
            }
          }}
        />

        {/* Search Algorithm Indicator */}
        {hasSearched && algorithm && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={algorithm === 'semantic_search' ? <Psychology /> : <TrendingUp />}
              label={
                algorithm === 'semantic_search' 
                  ? 'AI Semantic Search' 
                  : 'Traditional Search'
              }
              size="small"
              sx={{
                backgroundColor: algorithm === 'semantic_search' 
                  ? 'rgba(156, 39, 176, 0.1)' 
                  : 'rgba(25, 118, 210, 0.1)',
                color: algorithm === 'semantic_search' 
                  ? 'rgba(156, 39, 176, 0.8)' 
                  : 'rgba(25, 118, 210, 0.8)',
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {algorithm === 'semantic_search' 
                ? 'Understanding the meaning behind your search'
                : 'Matching keywords in book titles and descriptions'
              }
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Search Suggestions */}
      {showSuggestions && !hasSearched && (
        <Fade in>
          <Paper
            elevation={1}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2,
              backgroundColor: 'rgba(0,0,0,0.02)',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                mb: 1.5,
                color: 'text.secondary',
                fontWeight: 500,
              }}
            >
              Try searching for:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {SEARCH_SUGGESTIONS.map((suggestion) => (
                <Chip
                  key={suggestion}
                  label={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                    },
                  }}
                />
              ))}
            </Box>
          </Paper>
        </Fade>
      )}

      {/* Search Results */}
      {(hasSearched || loading) && (
        <RecommendationSection
          title={getResultsTitle()}
          subtitle={getResultsSubtitle()}
          books={books}
          loading={loading}
          error={error}
          onRefresh={() => performSearch(query)}
          maxBooks={limit}
          showAlgorithm={showAlgorithm}
          showScores={showScores}
          expandable={books.length > 8}
          type="search"
        />
      )}

      {/* No Search Yet Message */}
      {!hasSearched && !loading && !showSuggestions && (
        <Paper
          elevation={1}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 2,
            backgroundColor: 'rgba(0,0,0,0.02)',
          }}
        >
          <Search sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            Start searching to discover books
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use our AI-powered search to find books by content, themes, or topics
          </Typography>
        </Paper>
      )}
    </Box>
  );
}