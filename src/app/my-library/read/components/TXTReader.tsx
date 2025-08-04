'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { TXTReaderProps } from '@/lib/types';
import { TXTLoadError } from './ReaderErrorBoundary';

// TXTReaderProps is now imported from types

export default function TXTReader({ fileData, zoomLevel, onStateChange }: TXTReaderProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [progress, setProgress] = useState<number>(0);
  const [lineHeight, setLineHeight] = useState<number>(1.6);
  
  // Memoized onStateChange to prevent unnecessary re-renders
  const memoizedOnStateChange = useCallback(onStateChange, [onStateChange]);
  
  // Calculate font size based on zoom level
  const fontSize = Math.round(16 * (zoomLevel / 100));
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize reader
  useEffect(() => {
    if (!fileData) return;

    // Calculate estimated pages based on content length
    const wordsPerPage = 300; // Average words per page
    const wordCount = fileData.split(/\s+/).length;
    const estimatedPages = Math.ceil(wordCount / wordsPerPage);
    
    setTotalPages(estimatedPages);
    
    memoizedOnStateChange({
      totalPages: estimatedPages,
      currentPage: 1,
      progress: 0,
      isLoading: false,
      error: null
    });
  }, [fileData, memoizedOnStateChange]);

  // Handle scroll position and update current page
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;

    try {
      const container = containerRef.current;
      const content = contentRef.current;
      
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const contentHeight = content.scrollHeight;
      
      // Calculate progress (0-100)
      const totalScrollHeight = contentHeight - containerHeight;
      const newProgress = totalScrollHeight > 0 ? (scrollTop / totalScrollHeight) * 100 : 0;
      
      // Calculate current page based on scroll position
      const newCurrentPage = Math.ceil((newProgress / 100) * totalPages) || 1;
      
      // Update state only if values changed
      if (newCurrentPage !== currentPage) {
        setCurrentPage(newCurrentPage);
        setProgress(newProgress);
        
        memoizedOnStateChange({
          currentPage: newCurrentPage,
          progress: Math.min(100, Math.max(0, newProgress))
        });
      }
    } catch (error) {
      console.error('Error in TXT handleScroll:', error);
    }
  }, [totalPages, currentPage, memoizedOnStateChange]);

  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const throttledScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        handleScroll();
      }, 50);
    };

    container.addEventListener('scroll', throttledScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', throttledScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const scrollAmount = container.clientHeight * 0.9; // 90% of container height

      switch (event.key) {
        case 'ArrowDown':
        case ' ':
          event.preventDefault();
          container.scrollBy({ top: scrollAmount, behavior: 'smooth' });
          break;
        case 'ArrowUp':
          event.preventDefault();
          container.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
          break;
        case 'Home':
          event.preventDefault();
          container.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'End':
          event.preventDefault();
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
          break;
        case 'PageDown':
          event.preventDefault();
          container.scrollBy({ top: scrollAmount, behavior: 'smooth' });
          break;
        case 'PageUp':
          event.preventDefault();
          container.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
          break;
        // Zoom shortcuts are now handled by the parent component
        case '+':
        case '=':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            // Zoom functionality is handled by parent component
          }
          break;
        case '-':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            // Zoom functionality is handled by parent component
          }
          break;
        case '0':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            // Zoom functionality is handled by parent component
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Memoized formatted text to prevent unnecessary re-renders
  const formattedText = useMemo(() => {
    if (!fileData) return null;
    
    return fileData.split('\n').map((paragraph, index) => {
      if (paragraph.trim() === '') {
        return <br key={index} />;
      }
      return (
        <Typography
          key={index}
          variant="body1"
          paragraph
          sx={{
            fontSize: `${fontSize}px`,
            lineHeight: lineHeight,
            textAlign: 'justify',
            color: '#333333',
            marginBottom: '1em',
            fontFamily: 'Georgia, serif',
          }}
        >
          {paragraph}
        </Typography>
      );
    });
  }, [fileData, fontSize, lineHeight]);

  return (
    <Box
      ref={containerRef}
      sx={{
        height: '100%',
        overflow: 'auto',
        bgcolor: '#ffffff',
        padding: '40px 20px',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#f1f1f1',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#c1c1c1',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#a8a8a8',
        },
      }}
    >
      <Box
        ref={contentRef}
        sx={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '0 20px',
        }}
      >
        {formattedText}
      </Box>
    </Box>
  );
}