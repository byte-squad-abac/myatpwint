'use client';

import React, { useState, useEffect } from 'react';
import RecommendationSection, { RecommendationBook } from './RecommendationSection';
import {
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Box,
  Chip,
} from '@mui/material';

export interface TrendingBooksProps {
  limit?: number;
  timeWindowDays?: number;
  category?: string;
  showScores?: boolean;
  showAlgorithm?: boolean;
  allowTimeWindowSelection?: boolean;
  allowCategorySelection?: boolean;
}

interface TrendingResponse {
  success: boolean;
  recommendations: any[];
  algorithm?: string;
  model_version?: string;
  time_window_days: number;
  total: number;
  cached: boolean;
}

const TIME_WINDOW_OPTIONS = [
  { value: 7, label: 'This Week' },
  { value: 30, label: 'This Month' },
  { value: 90, label: 'Last 3 Months' },
  { value: 365, label: 'This Year' },
];

const CATEGORY_OPTIONS = [
  'Fiction',
  'Non-Fiction',
  'Romance',
  'Mystery',
  'Science Fiction',
  'Fantasy',
  'Biography',
  'History',
  'Self-Help',
  'Business',
  'Technology',
  'Health',
  'Education',
  'Children',
  'Young Adult',
];

export default function TrendingBooks({
  limit = 8,
  timeWindowDays = 30,
  category,
  showScores = true,
  showAlgorithm = true,
  allowTimeWindowSelection = true,
  allowCategorySelection = true,
}: TrendingBooksProps) {
  const [books, setBooks] = useState<RecommendationBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeWindow, setSelectedTimeWindow] = useState(timeWindowDays);
  const [selectedCategory, setSelectedCategory] = useState(category || '');

  const fetchTrendingBooks = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        timeWindow: selectedTimeWindow.toString(),
        minScore: '0.1',
      });

      if (selectedCategory) {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`/api/recommendations/trending?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch trending books: ${response.statusText}`);
      }

      const data: TrendingResponse = await response.json();

      if (data.success && data.recommendations) {
        setBooks(data.recommendations);
      } else {
        throw new Error('No trending books found');
      }
    } catch (err) {
      console.error('Error fetching trending books:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trending books');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingBooks();
  }, [selectedTimeWindow, selectedCategory, limit]);

  const getTimeWindowLabel = () => {
    const option = TIME_WINDOW_OPTIONS.find(opt => opt.value === selectedTimeWindow);
    return option?.label || `Last ${selectedTimeWindow} days`;
  };

  const getTitle = () => {
    const timeLabel = getTimeWindowLabel();
    if (selectedCategory) {
      return `Trending ${selectedCategory} Books`;
    }
    return `Trending Books • ${timeLabel}`;
  };

  const getSubtitle = () => {
    if (books.length === 0 && !loading) {
      return 'No trending books found for the selected criteria';
    }
    
    const timeLabel = getTimeWindowLabel().toLowerCase();
    return `Most popular books ${timeLabel.replace('this', 'this').replace('last', 'in the last')} • ${books.length} books`;
  };

  const FilterControls = () => {
    if (!allowTimeWindowSelection && !allowCategorySelection) {
      return null;
    }

    return (
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {allowTimeWindowSelection && (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Time Period</InputLabel>
            <Select
              value={selectedTimeWindow}
              label="Time Period"
              onChange={(e) => setSelectedTimeWindow(e.target.value as number)}
            >
              {TIME_WINDOW_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {allowCategorySelection && (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={selectedCategory}
              label="Category"
              onChange={(e) => setSelectedCategory(e.target.value as string)}
            >
              <MenuItem value="">All Categories</MenuItem>
              {CATEGORY_OPTIONS.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>
    );
  };

  return (
    <Box>
      <FilterControls />
      <RecommendationSection
        title={getTitle()}
        subtitle={getSubtitle()}
        books={books}
        loading={loading}
        error={error}
        onRefresh={fetchTrendingBooks}
        maxBooks={limit}
        showAlgorithm={showAlgorithm}
        showScores={showScores}
        expandable={books.length > limit}
        type="trending"
      />
    </Box>
  );
}