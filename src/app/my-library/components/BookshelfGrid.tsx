'use client';

import React from 'react';
import {
  Box,
  Typography,
  Fade,
  Grow,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import BookCard, { LibraryBook } from './BookCard';
import EmptyBookshelf from './EmptyBookshelf';
import LoadingBookshelf from './LoadingBookshelf';

interface BookshelfGridProps {
  books: LibraryBook[];
  loading?: boolean;
  onReadBook: (bookId: string) => void;
  onDeleteBook: (bookId: string) => void;
  searchTerm?: string;
  filterType?: string;
}

export default function BookshelfGrid({
  books,
  loading = false,
  onReadBook,
  onDeleteBook,
  searchTerm = '',
  filterType = 'all',
}: BookshelfGridProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  // Books are already filtered by parent component



  // Group books by category for better organization
  const groupBooksByType = (books: LibraryBook[]) => {
    const groups: { [key: string]: LibraryBook[] } = {
      pdf: [],
      epub: [],
      txt: [],
      other: []
    };

    books.forEach(book => {
      const extension = book.fileName.split('.').pop()?.toLowerCase();
      if (extension && groups[extension]) {
        groups[extension].push(book);
      } else {
        groups.other.push(book);
      }
    });

    return groups;
  };

  if (loading) {
    return <LoadingBookshelf />;
  }

  if (books.length === 0) {
    return <EmptyBookshelf />;
  }

  // Show grouped view when not searching
  if (!searchTerm && filterType === 'all' && books.length > 6) {
    const groupedBooks = groupBooksByType(books);
    
    return (
      <Box sx={{ width: '100%' }}>
        {Object.entries(groupedBooks).map(([type, typeBooks]) => {
          if (typeBooks.length === 0) return null;
          
          const typeDisplayName = {
            pdf: '📄 PDF Documents',
            epub: '📖 eBooks',
            txt: '📝 Text Files',
            other: '📁 Other Files'
          }[type];

          return (
            <Fade in={true} timeout={500} key={type}>
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="h6"
                  sx={{
                    mb: 2,
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    borderBottom: `2px solid ${theme.palette.divider}`,
                    pb: 1,
                  }}
                >
                  {typeDisplayName} ({typeBooks.length})
                </Typography>
                
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, 1fr)',
                      md: 'repeat(3, 1fr)',
                      lg: 'repeat(4, 1fr)',
                    },
                    gap: 3,
                  }}
                >
                  {typeBooks.slice(0, 6).map((book, index) => (
                    <Box key={`${type}-${book.id}-${index}`}>
                      <Grow
                        in={true}
                        timeout={500 + index * 100}
                        style={{ transformOrigin: '0 0 0' }}
                      >
                        <Box sx={{ height: '100%' }}>
                          <BookCard
                            book={book}
                            onRead={onReadBook}
                            onDelete={onDeleteBook}
                            index={index}
                          />
                        </Box>
                      </Grow>
                    </Box>
                  ))}
                </Box>
                
                {typeBooks.length > 6 && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      + {typeBooks.length - 6} more {type.toUpperCase()} files
                    </Typography>
                  </Box>
                )}
              </Box>
            </Fade>
          );
        })}
      </Box>
    );
  }

  // Regular grid view - Enhanced 3D Environment
  return (
    <Box 
      sx={{ 
        width: '100%',
        position: 'relative',
        perspective: '2000px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 3D Environment Background */}
      <Box
        sx={{
          position: 'absolute',
          top: '-100px',
          left: '-50px',
          right: '-50px',
          bottom: '-100px',
          background: `
            radial-gradient(ellipse at center top, rgba(139, 69, 19, 0.1) 0%, transparent 70%),
            linear-gradient(135deg, 
              rgba(101, 67, 33, 0.05) 0%, 
              rgba(160, 82, 45, 0.08) 25%, 
              rgba(205, 133, 63, 0.05) 50%, 
              rgba(222, 184, 135, 0.03) 100%
            )
          `,
          borderRadius: '50px',
          zIndex: -2,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '20%',
            left: '10%',
            right: '10%',
            height: '60%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(139, 69, 19, 0.03) 50%, transparent 100%)',
            transform: 'rotateX(60deg)',
            borderRadius: '20px',
          }
        }}
      />

      {/* Floating Particles Effect */}
      {[...Array(8)].map((_, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            width: '4px',
            height: '4px',
            background: 'rgba(139, 69, 19, 0.3)',
            borderRadius: '50%',
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animation: `float-${i % 3} ${3 + Math.random() * 2}s ease-in-out infinite`,
            zIndex: -1,
            '@keyframes float-0': {
              '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
              '50%': { transform: 'translateY(-20px) rotate(180deg)' },
            },
            '@keyframes float-1': {
              '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
              '33%': { transform: 'translateY(-15px) translateX(15px)' },
              '66%': { transform: 'translateY(-30px) translateX(-10px)' },
            },
            '@keyframes float-2': {
              '0%, 100%': { transform: 'translateY(0px) scale(1)' },
              '50%': { transform: 'translateY(-25px) scale(1.2)' },
            },
          }}
        />
      ))}

      {/* Results header with enhanced styling */}
      <Box 
        sx={{ 
          mb: 4, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '-10px',
            left: 0,
            right: 0,
            height: '2px',
            background: `linear-gradient(90deg, 
              transparent 0%, 
              ${theme.palette.primary.main}40 20%, 
              ${theme.palette.primary.main} 50%, 
              ${theme.palette.primary.main}40 80%, 
              transparent 100%
            )`,
            borderRadius: '2px',
          }
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            background: `linear-gradient(45deg, ${theme.palette.text.primary}, ${theme.palette.primary.main})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            position: 'relative',
            '&::before': {
              content: '"📚"',
              position: 'absolute',
              left: '-40px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '24px',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
            }
          }}
        >
          Your Immersive Library ({books.length} book{books.length !== 1 ? 's' : ''})
        </Typography>
        
        {(searchTerm || filterType !== 'all') && (
          <Box
            sx={{
              px: 2,
              py: 1,
              backgroundColor: 'rgba(139, 69, 19, 0.1)',
              borderRadius: 2,
              border: '1px solid rgba(139, 69, 19, 0.2)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {searchTerm && `"${searchTerm}"`}
              {searchTerm && filterType !== 'all' && ' • '}
              {filterType !== 'all' && `${filterType.toUpperCase()} files`}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Enhanced 3D Grid Container */}
      <Box
        sx={{
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: 'rotateX(2deg)',
          padding: '20px 0',
        }}
      >
        {/* Virtual Shelf Effect */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: '-20px',
            right: '-20px',
            height: '100%',
            background: `
              repeating-linear-gradient(
                transparent,
                transparent 380px,
                rgba(139, 69, 19, 0.1) 380px,
                rgba(139, 69, 19, 0.1) 390px,
                transparent 390px,
                transparent 420px
              )
            `,
            zIndex: -1,
            borderRadius: '10px',
          }}
        />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 4,
          }}
        >
          {books.map((book, index) => (
            <Box key={`regular-${book.id}-${index}`}>
              <Grow
                in={true}
                timeout={400}
                style={{ 
                  transformOrigin: '50% 100% 0',
                  transitionDelay: `${index * 80}ms`,
                }}
              >
                <Box 
                  sx={{ 
                    height: '100%',
                    position: 'relative',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      bottom: '-15px',
                      left: '10%',
                      right: '10%',
                      height: '8px',
                      background: 'rgba(139, 69, 19, 0.6)',
                      borderRadius: '50%',
                      filter: 'blur(4px)',
                      transform: 'rotateX(60deg)',
                      zIndex: -1,
                    }
                  }}
                >
                  <BookCard
                    book={book}
                    onRead={onReadBook}
                    onDelete={onDeleteBook}
                    index={index}
                  />
                </Box>
              </Grow>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Ambient Lighting Effect */}
      <Box
        sx={{
          position: 'absolute',
          top: '-50px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '200px',
          height: '100px',
          background: 'radial-gradient(ellipse, rgba(255, 248, 220, 0.3) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(20px)',
          zIndex: -1,
          animation: 'ambientPulse 4s ease-in-out infinite',
          '@keyframes ambientPulse': {
            '0%, 100%': { opacity: 0.3, transform: 'translateX(-50%) scale(1)' },
            '50%': { opacity: 0.6, transform: 'translateX(-50%) scale(1.2)' },
          },
        }}
      />
    </Box>
  );
}