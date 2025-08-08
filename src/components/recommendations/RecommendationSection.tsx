'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Skeleton,
  Button,
  Chip,
  IconButton,
  Collapse,
  Fade,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Refresh,
  Psychology,
  TrendingUp,
  Recommend,
  Search,
} from '@mui/icons-material';
import Link from 'next/link';

export interface RecommendationBook {
  id: string;
  name: string;
  author: string;
  price: number;
  category: string;
  image_url?: string;
  description?: string;
  similarity_score?: number;
  recommendation_reason?: string;
  algorithm?: string;
  trend_score?: number;
}

export interface RecommendationSectionProps {
  title: string;
  subtitle?: string;
  books: RecommendationBook[];
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onViewAll?: () => void;
  maxBooks?: number;
  showAlgorithm?: boolean;
  showScores?: boolean;
  expandable?: boolean;
  type?: 'similar' | 'personalized' | 'trending' | 'search';
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'similar': return <Recommend />;
    case 'personalized': return <Psychology />;
    case 'trending': return <TrendingUp />;
    case 'search': return <Search />;
    default: return <Recommend />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'similar': return '#2196F3';
    case 'personalized': return '#9C27B0';
    case 'trending': return '#FF5722';
    case 'search': return '#4CAF50';
    default: return '#2196F3';
  }
};

function BookCardSkeleton() {
  return (
    <Paper
      elevation={2}
      sx={{
        minWidth: 180,
        maxWidth: 180,
        borderRadius: 2,
        overflow: 'hidden',
        flex: '0 0 auto',
      }}
    >
      <Skeleton variant="rectangular" height={240} />
      <Box sx={{ p: 2 }}>
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="text" width="70%" />
        <Skeleton variant="text" width="50%" />
      </Box>
    </Paper>
  );
}

function RecommendationBookCard({ book, showScores = false }: { 
  book: RecommendationBook; 
  showScores?: boolean;
}) {
  const [imageError, setImageError] = useState(false);
  
  const placeholderImage = `https://via.placeholder.com/180x240/4A90E2/FFFFFF?text=${encodeURIComponent(book.name.substring(0, 3))}`;

  return (
    <Fade in timeout={300}>
      <Link href={`/books/${book.id}`} style={{ textDecoration: 'none' }}>
        <Paper
          elevation={2}
          sx={{
            minWidth: 180,
            maxWidth: 180,
            borderRadius: 2,
            overflow: 'hidden',
            flex: '0 0 auto',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            '&:hover': {
              transform: 'translateY(-4px) scale(1.02)',
              boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
            },
          }}
        >
          {/* Book Cover */}
          <Box sx={{ position: 'relative', height: 240 }}>
            <img
              src={imageError || !book.image_url ? placeholderImage : book.image_url}
              alt={book.name}
              onError={() => setImageError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            
            {/* Score Badge */}
            {showScores && (book.similarity_score || book.trend_score) && (
              <Chip
                label={`${Math.round((book.similarity_score || book.trend_score || 0) * 100)}%`}
                size="small"
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(76, 175, 80, 0.9)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              />
            )}

            {/* Category Badge */}
            {book.category && (
              <Chip
                label={book.category}
                size="small"
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  fontSize: '0.7rem',
                  height: 20,
                }}
              />
            )}
          </Box>

          {/* Book Info */}
          <Box sx={{ p: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                fontSize: '0.875rem',
                lineHeight: 1.2,
                mb: 0.5,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                minHeight: '2.4em',
              }}
            >
              {book.name}
            </Typography>
            
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: '0.75rem',
                mb: 1,
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              by {book.author}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: 'primary.main',
                fontWeight: 700,
                fontSize: '0.875rem',
              }}
            >
              {book.price.toLocaleString()} MMK
            </Typography>

            {/* Recommendation Reason */}
            {book.recommendation_reason && (
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.7rem',
                  mt: 1,
                  display: 'block',
                  fontStyle: 'italic',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {book.recommendation_reason}
              </Typography>
            )}
          </Box>
        </Paper>
      </Link>
    </Fade>
  );
}

export default function RecommendationSection({
  title,
  subtitle,
  books,
  loading = false,
  error,
  onRefresh,
  onViewAll,
  maxBooks = 6,
  showAlgorithm = false,
  showScores = false,
  expandable = false,
  type = 'similar',
}: RecommendationSectionProps) {
  const [expanded, setExpanded] = useState(false);
  
  const displayBooks = expanded ? books : books.slice(0, maxBooks);
  const hasMoreBooks = books.length > maxBooks;
  const typeIcon = getTypeIcon(type);
  const typeColor = getTypeColor(type);

  if (!loading && (!books || books.length === 0)) {
    return null;
  }

  return (
    <Paper
      elevation={1}
      sx={{
        p: 3,
        mb: 4,
        borderRadius: 3,
        background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
        border: '1px solid rgba(0,0,0,0.05)',
      }}
    >
      {/* Section Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: typeColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            {typeIcon}
          </Box>
          
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: '1.25rem',
                color: 'text.primary',
                mb: subtitle ? 0.5 : 0,
              }}
            >
              {title}
            </Typography>
            
            {subtitle && (
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                }}
              >
                {subtitle}
              </Typography>
            )}

            {/* Algorithm Badge */}
            {showAlgorithm && books.length > 0 && books[0].algorithm && (
              <Chip
                label={`AI • ${books[0].algorithm.replace('_', ' ')}`}
                size="small"
                sx={{
                  mt: 1,
                  backgroundColor: 'rgba(156, 39, 176, 0.1)',
                  color: 'rgba(156, 39, 176, 0.8)',
                  fontSize: '0.7rem',
                  fontWeight: 500,
                }}
              />
            )}
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {onRefresh && (
            <IconButton
              onClick={onRefresh}
              disabled={loading}
              sx={{ color: 'text.secondary' }}
            >
              <Refresh />
            </IconButton>
          )}
          
          {onViewAll && (
            <Button
              variant="outlined"
              size="small"
              onClick={onViewAll}
              sx={{
                borderColor: typeColor,
                color: typeColor,
                '&:hover': {
                  backgroundColor: `${typeColor}15`,
                  borderColor: typeColor,
                },
              }}
            >
              View All
            </Button>
          )}
        </Box>
      </Box>

      {/* Error State */}
      {error && (
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
            color: 'error.main',
          }}
        >
          <Typography variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
          {onRefresh && (
            <Button
              variant="outlined"
              color="error"
              onClick={onRefresh}
              startIcon={<Refresh />}
            >
              Try Again
            </Button>
          )}
        </Box>
      )}

      {/* Books Grid */}
      {!error && (
        <>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              scrollbarWidth: 'thin',
              pb: 2,
              '&::-webkit-scrollbar': {
                height: 6,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0,0,0,0.1)',
                borderRadius: 3,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: 3,
              },
            }}
          >
            {loading ? (
              // Loading skeletons
              Array.from({ length: 6 }).map((_, index) => (
                <BookCardSkeleton key={index} />
              ))
            ) : (
              // Actual books
              displayBooks.map((book, index) => (
                <RecommendationBookCard
                  key={book.id}
                  book={book}
                  showScores={showScores}
                />
              ))
            )}
          </Box>

          {/* Expand/Collapse Button */}
          {expandable && hasMoreBooks && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                variant="text"
                onClick={() => setExpanded(!expanded)}
                endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
                sx={{ color: typeColor }}
              >
                {expanded ? 'Show Less' : `Show ${books.length - maxBooks} More Books`}
              </Button>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
}