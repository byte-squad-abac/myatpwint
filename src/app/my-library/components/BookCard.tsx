'use client';

import React, { useState, useMemo } from 'react';
import {
  Typography,
  IconButton,
  Chip,
  Box,
  Skeleton,
  Fade,
} from '@mui/material';
import {
  Visibility,
  Delete,
  CloudDownload,
  Storage,
  MenuBook,
  AutoStories,
} from '@mui/icons-material';

// Import centralized types and utilities
import { LibraryBook, BookCardProps, FileType } from '@/lib/types';
import { getFileExtension } from '@/lib/utils';
import { APP_CONSTANTS } from '@/lib/config';

// Constants
const BOOK_COLOR_SETS = [
  { primary: '#8B4513', secondary: '#A0522D', spine: '#654321' },
  { primary: '#1B4F72', secondary: '#2E86AB', spine: '#0F3460' },
  { primary: '#145A32', secondary: '#239B56', spine: '#0E4B2E' },
  { primary: '#78281F', secondary: '#C0392B', spine: '#641E16' },
  { primary: '#4A235A', secondary: '#8E44AD', spine: '#3E1F4F' },
  { primary: '#935116', secondary: '#D68910', spine: '#7D4427' },
  { primary: '#2C3E50', secondary: '#566573', spine: '#1B2631' },
  { primary: '#7E5109', secondary: '#B7950B', spine: '#633F02' },
  { primary: '#922B21', secondary: '#CB4335', spine: '#7B241C' },
  { primary: '#1A5490', secondary: '#2874A6', spine: '#154360' },
];

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop&crop=center',
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=400&fit=crop&crop=center',
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&h=400&fit=crop&crop=center',
  'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=300&h=400&fit=crop&crop=center',
  'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=300&h=400&fit=crop&crop=center',
  'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=300&h=400&fit=crop&crop=center',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=400&fit=crop&crop=center',
];

const FILE_TYPE_CONFIG = {
  pdf: { type: 'PDF', icon: MenuBook, color: '#FF6B6B' },
  epub: { type: 'EPUB', icon: AutoStories, color: '#4ECDC4' },
  txt: { type: 'TXT', icon: MenuBook, color: '#45B7D1' },
  default: { type: 'BOOK', icon: MenuBook, color: '#96CEB4' },
};

// Utility functions
const generateHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const generateBookColor = (name: string) => {
  const hash = generateHash(name);
  return BOOK_COLOR_SETS[hash % BOOK_COLOR_SETS.length];
};

const generatePlaceholderCover = (name: string) => {
  const hash = generateHash(name);
  return PLACEHOLDER_IMAGES[hash % PLACEHOLDER_IMAGES.length];
};

const getFileType = (fileName: string) => {
  const extension = getFileExtension(fileName);
  return FILE_TYPE_CONFIG[extension as keyof typeof FILE_TYPE_CONFIG] || FILE_TYPE_CONFIG.default;
};

// Using centralized BookCardProps interface from types
interface ExtendedBookCardProps extends BookCardProps {
  onRead: (bookId: string) => void;
  onDelete: (bookId: string) => void;
  loading?: boolean;
  index?: number;
}

// Loading skeleton component
function BookCardSkeleton() {
  return (
    <Box sx={{ height: 380, perspective: '1000px', transformStyle: 'preserve-3d' }}>
      <Skeleton
        variant="rectangular"
        sx={{
          width: '100%',
          height: '100%',
          borderRadius: 2,
          transform: 'rotateY(-8deg) rotateX(3deg)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        }}
      />
    </Box>
  );
}

// Action buttons component
function ActionButtons({ 
  isHovered, 
  onRead, 
  onDelete 
}: { 
  isHovered: boolean; 
  onRead: () => void; 
  onDelete: () => void; 
}) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 10,
        right: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        opacity: isHovered ? 1 : 0,
        transform: isHovered ? 'translateX(0)' : 'translateX(20px)',
        transition: 'all 0.3s ease',
        zIndex: 10,
      }}
    >
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          onRead();
        }}
        sx={{
          width: 40,
          height: 40,
          backgroundColor: 'rgba(25, 118, 210, 0.9)',
          color: 'white',
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 1)',
            transform: 'scale(1.1)',
          },
          transition: 'all 0.2s ease',
        }}
      >
        <Visibility sx={{ fontSize: 20 }} />
      </IconButton>

      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        sx={{
          width: 40,
          height: 40,
          backgroundColor: 'rgba(211, 47, 47, 0.9)',
          color: 'white',
          '&:hover': {
            backgroundColor: 'rgba(211, 47, 47, 1)',
            transform: 'scale(1.1)',
          },
          transition: 'all 0.2s ease',
        }}
      >
        <Delete sx={{ fontSize: 20 }} />
      </IconButton>
    </Box>
  );
}

export default function BookCard({ book, onRead, onDelete, loading = false, index = 0 }: ExtendedBookCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  // Memoize expensive calculations
  const bookColors = useMemo(() => generateBookColor(book.name), [book.name]);
  const fileInfo = useMemo(() => getFileType(book.fileName), [book.fileName]);
  const placeholderCover = useMemo(() => generatePlaceholderCover(book.name), [book.name]);

  const handleRead = () => {
    setIsOpening(true);
    setTimeout(() => onRead(book.id), 600);
  };

  if (loading) {
    return <BookCardSkeleton />;
  }

  return (
    <Fade in={true} timeout={300 + index * 100}>
      <Box sx={{ cursor: 'pointer' }}>
        {/* 3D Book */}
        <Box
          sx={{
            height: 380,
            perspective: '1200px',
            transformStyle: 'preserve-3d',
            position: 'relative',
            mb: 2,
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleRead}
        >
          <Box
            sx={{
              width: '100%',
              height: '100%',
              position: 'relative',
              transformStyle: 'preserve-3d',
              transform: isHovered 
                ? 'rotateY(-15deg) rotateX(5deg) translateY(-20px) scale(1.05)'
                : 'rotateY(-8deg) rotateX(3deg)',
              transition: 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              filter: isHovered ? 'brightness(1.1)' : 'brightness(1)',
            }}
          >
            {/* Book Back Cover */}
            <Box
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                background: `linear-gradient(135deg, ${bookColors.spine} 0%, ${bookColors.primary} 100%)`,
                borderRadius: '8px 4px 4px 8px',
                transform: 'translateZ(-20px)',
                border: `2px solid ${bookColors.spine}`,
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)',
              }}
            />

            {/* Book Spine */}
            <Box
              sx={{
                position: 'absolute',
                width: '15px',
                height: '100%',
                right: 0,
                background: `linear-gradient(180deg, ${bookColors.spine} 0%, ${bookColors.primary} 50%, ${bookColors.spine} 100%)`,
                transform: 'rotateY(90deg) translateZ(8px)',
                transformOrigin: 'left center',
                borderRadius: '0 4px 4px 0',
                border: `1px solid ${bookColors.spine}`,
                boxShadow: 'inset -5px 0 10px rgba(0,0,0,0.4)',
              }}
            />

            {/* Book Front Cover */}
            <Box
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '8px 4px 4px 8px',
                transform: isOpening ? 'rotateY(-120deg)' : 'translateZ(0px)',
                transformOrigin: 'right center',
                transition: 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                border: `3px solid ${bookColors.spine}`,
                overflow: 'hidden',
                boxShadow: isHovered 
                  ? '0 30px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset'
                  : '0 20px 40px rgba(0,0,0,0.2)',
                backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%), url(${book.imageUrl || placeholderCover})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `
                    radial-gradient(circle at 20% 20%, rgba(255,255,255,0.2) 0%, transparent 50%),
                    linear-gradient(45deg, rgba(255,255,255,0.05) 0%, transparent 100%)
                  `,
                  pointerEvents: 'none',
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: '15px',
                  left: '15px',
                  right: '15px',
                  bottom: '15px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '4px',
                  pointerEvents: 'none',
                },
              }}
            >
              {/* File Type Badge */}
              <Chip
                icon={<fileInfo.icon />}
                label={fileInfo.type}
                sx={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  backgroundColor: fileInfo.color,
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '11px',
                  height: '28px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                  transition: 'transform 0.3s ease',
                  '& .MuiChip-icon': {
                    color: 'white',
                    fontSize: '14px',
                  },
                }}
              />

              {/* Source & Size Indicator */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 15,
                  right: 15,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  borderRadius: '12px',
                  px: 1,
                  py: 0.5,
                }}
              >
                {book.source === 'purchased' ? (
                  <CloudDownload sx={{ fontSize: 12, color: 'white', opacity: 0.9 }} />
                ) : (
                  <Storage sx={{ fontSize: 12, color: 'white', opacity: 0.9 }} />
                )}
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '9px',
                    color: 'white',
                    opacity: 0.9,
                    fontWeight: 500,
                  }}
                >
                  {book.size}
                </Typography>
              </Box>
            </Box>

            {/* Pages Effect */}
            {[...Array(3)].map((_, i) => (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  width: 'calc(100% - 4px)',
                  height: 'calc(100% - 4px)',
                  top: '2px',
                  left: '2px',
                  background: '#f8f9fa',
                  borderRadius: '6px 2px 2px 6px',
                  transform: `translateZ(-${(i + 1) * 2}px) translateX(-${i}px)`,
                  border: '1px solid #e9ecef',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  opacity: 0.8 - (i * 0.15),
                }}
              />
            ))}

            {/* Shadow */}
            <Box
              sx={{
                position: 'absolute',
                bottom: '-40px',
                left: '-20px',
                right: '-20px',
                height: '40px',
                background: 'radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, transparent 70%)',
                transform: isHovered ? 'scale(1.2) translateY(10px)' : 'scale(1)',
                transition: 'all 0.6s ease',
                borderRadius: '50%',
                filter: 'blur(10px)',
                zIndex: -1,
              }}
            />
          </Box>

          <ActionButtons
            isHovered={isHovered}
            onRead={handleRead}
            onDelete={() => onDelete(book.id)}
          />
        </Box>

        {/* Book Info */}
        <Box sx={{ textAlign: 'center', mt: 1 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '0.9rem', sm: '1rem' },
              lineHeight: 1.2,
              color: 'text.primary',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-word',
              mb: 0.5,
            }}
          >
            {book.name}
          </Typography>
          
          {book.author && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: '0.75rem',
                opacity: 0.8,
                display: 'block',
                mb: 0.5,
              }}
            >
              by {book.author}
            </Typography>
          )}
          
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.7rem',
              opacity: 0.6,
            }}
          >
            {book.purchaseDate 
              ? `Purchased ${new Date(book.purchaseDate).toLocaleDateString()}` 
              : `Added ${new Date(book.uploadDate).toLocaleDateString()}`}
          </Typography>
        </Box>
      </Box>
    </Fade>
  );
}

