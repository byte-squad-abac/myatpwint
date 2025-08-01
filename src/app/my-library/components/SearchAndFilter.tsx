'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
  Chip,
  Typography,
  Paper,
  Collapse,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Clear,
  FilterList,
  GridView,
  ViewList,
  Sort,
  CloudDownload,
  Storage,
} from '@mui/icons-material';
import { LibraryBook } from './BookCard';

interface SearchAndFilterProps {
  books: LibraryBook[];
  onSearchChange: (searchTerm: string) => void;
  onFilterChange: (filterType: string) => void;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onViewModeChange: (viewMode: 'grid' | 'list') => void;
  searchTerm: string;
  filterType: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list';
}

export default function SearchAndFilter({
  books,
  onSearchChange,
  onFilterChange,
  onSortChange,
  onViewModeChange,
  searchTerm,
  filterType,
  sortBy,
  sortOrder,
  viewMode,
}: SearchAndFilterProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  // Debounced search using useEffect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearchChange(localSearchTerm);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [localSearchTerm, onSearchChange]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalBooks = books.length;
    const fileTypes = books.reduce((acc, book) => {
      const ext = book.fileName.split('.').pop()?.toLowerCase() || 'unknown';
      acc[ext] = (acc[ext] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const cloudBooks = books.filter(book => book.source === 'supabase').length;
    const localBooks = books.filter(book => book.source === 'indexeddb').length;

    return { totalBooks, fileTypes, cloudBooks, localBooks };
  }, [books]);

  const handleClearSearch = () => {
    setLocalSearchTerm('');
    onSearchChange('');
  };

  const handleSortChange = (newSortBy: string) => {
    if (newSortBy === sortBy) {
      // Toggle sort order if same field
      onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      onSortChange(newSortBy, 'asc');
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 2,
        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`,
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Main Search Bar */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search your bookshelf by title or filename..."
          value={localSearchTerm}
          onChange={(e) => setLocalSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search color="action" />
              </InputAdornment>
            ),
            endAdornment: localSearchTerm && (
              <InputAdornment position="end">
                <IconButton onClick={handleClearSearch} size="small">
                  <Clear />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: theme.palette.background.paper,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
              '&.Mui-focused': {
                backgroundColor: theme.palette.background.paper,
              },
            },
          }}
        />
      </Box>

      {/* Quick Filters and Stats */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: 2,
          mb: 2,
        }}
      >
        {/* Quick Filter Chips */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            Filter:
          </Typography>
          
          {['all', 'pdf', 'epub', 'txt'].map((type) => (
            <Chip
              key={type}
              label={`${type.toUpperCase()}${type !== 'all' ? ` (${stats.fileTypes[type] || 0})` : ` (${stats.totalBooks})`}`}
              variant={filterType === type ? 'filled' : 'outlined'}
              color={filterType === type ? 'primary' : 'default'}
              onClick={() => onFilterChange(type)}
              sx={{
                borderRadius: 1,
                fontWeight: 500,
                '&:hover': {
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </Box>

        {/* Storage Source Indicators */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Tooltip title="Cloud Storage" arrow>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CloudDownload sx={{ fontSize: 16, color: '#4CAF50' }} />
              <Typography variant="caption" color="text.secondary">
                {stats.cloudBooks}
              </Typography>
            </Box>
          </Tooltip>
          
          <Tooltip title="Local Storage" arrow>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Storage sx={{ fontSize: 16, color: '#FF9800' }} />
              <Typography variant="caption" color="text.secondary">
                {stats.localBooks}
              </Typography>
            </Box>
          </Tooltip>
        </Box>
      </Box>

      {/* Advanced Controls */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: 2,
        }}
      >
        {/* Sort Controls */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            Sort by:
          </Typography>
          
          {[
            { value: 'name', label: 'Title' },
            { value: 'uploadDate', label: 'Date Added' },
            { value: 'size', label: 'Size' },
            { value: 'fileName', label: 'Filename' },
          ].map((option) => (
            <Chip
              key={option.value}
              label={`${option.label} ${sortBy === option.value ? (sortOrder === 'asc' ? '↑' : '↓') : ''}`}
              variant={sortBy === option.value ? 'filled' : 'outlined'}
              color={sortBy === option.value ? 'secondary' : 'default'}
              onClick={() => handleSortChange(option.value)}
              icon={sortBy === option.value ? <Sort /> : undefined}
              sx={{
                borderRadius: 1,
                fontWeight: 500,
                '&:hover': {
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </Box>

        {/* View Mode Toggle */}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newMode) => newMode && onViewModeChange(newMode)}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              borderRadius: 1,
              border: `1px solid ${theme.palette.divider}`,
              '&.Mui-selected': {
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
              },
            },
          }}
        >
          <ToggleButton value="grid" aria-label="grid view">
            <GridView />
          </ToggleButton>
          <ToggleButton value="list" aria-label="list view">
            <ViewList />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Search Results Summary */}
      {(searchTerm || filterType !== 'all') && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            backgroundColor: theme.palette.action.hover,
            borderRadius: 1,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            📚 Showing {books.length} book{books.length !== 1 ? 's' : ''}
            {searchTerm && ` matching "${searchTerm}"`}
            {filterType !== 'all' && ` in ${filterType.toUpperCase()} format`}
            {books.length === 0 && ' - try adjusting your search or filters'}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

