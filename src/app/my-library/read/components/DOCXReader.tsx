'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import * as mammoth from 'mammoth';
import { DOCXReaderProps } from '@/lib/types';
import { useTheme } from '@/lib/contexts/ThemeContext';

export default function DOCXReader({ fileData, zoomLevel, onStateChange }: DOCXReaderProps) {
  const { theme } = useTheme();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [progress, setProgress] = useState<number>(0);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Memoized onStateChange to prevent unnecessary re-renders
  const memoizedOnStateChange = useCallback(onStateChange, [onStateChange]);
  
  // Removed debug logging - issue was re-render loop
  
  // Calculate font size based on zoom level
  const fontSize = Math.round(16 * (zoomLevel / 100));
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isParsing = useRef<boolean>(false);

  // Parse DOCX file
  useEffect(() => {
    if (!fileData || isParsing.current) return;

    const parseDocx = async () => {
      if (isParsing.current) {
        console.log('⚠️ Already parsing, skipping...');
        return;
      }
      
      isParsing.current = true;
      try {
        console.log('🔄 Starting DOCX parsing...');
        setIsLoading(true);
        setError(null);
        
        // Extract HTML from DOCX using arrayBuffer (browser environment)
        console.log('📄 Converting DOCX to HTML...');
        const result = await mammoth.convertToHtml({ arrayBuffer: fileData });
        console.log('✅ DOCX conversion completed, HTML length:', result.value.length);
        
        if (result.messages.length > 0) {
          console.warn('DOCX conversion warnings:', result.messages);
        }
        
        console.log('💾 Setting HTML content...');
        setHtmlContent(result.value);
        
        // Estimate pages based on content length
        const textLength = result.value.replace(/<[^>]*>/g, '').length;
        const charactersPerPage = 2000; // Estimate
        const estimatedPages = Math.ceil(textLength / charactersPerPage) || 1;
        
        console.log('📊 Text length:', textLength, 'Estimated pages:', estimatedPages);
        
        setTotalPages(estimatedPages);
        console.log('⏹️ Setting loading to false...');
        setIsLoading(false);
        
        console.log('📤 Calling onStateChange...');
        onStateChange({
          totalPages: estimatedPages,
          currentPage: 1,
          progress: 0,
          isLoading: false,
          error: null
        });
        
        console.log('✅ DOCX parsing completed successfully!');
        
      } catch (err) {
        console.error('❌ Error parsing DOCX:', err);
        setError(`Failed to parse DOCX file: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
        
        onStateChange({
          isLoading: false,
          error: `Failed to parse DOCX file: ${err instanceof Error ? err.message : 'Unknown error'}`
        });
      } finally {
        isParsing.current = false;
      }
    };

    parseDocx();
  }, [fileData]); // Remove memoizedOnStateChange from dependencies to prevent re-render loop

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
        
        onStateChange({
          currentPage: newCurrentPage,
          progress: Math.min(100, Math.max(0, newProgress))
        });
      }
    } catch (error) {
      console.error('Error in DOCX handleScroll:', error);
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
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (isLoading) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2, color: theme === 'dark' ? '#ffffff' : '#333333' }}>
          Loading DOCX file...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
          padding: '20px',
        }}
      >
        <Typography 
          color="error" 
          align="center"
          sx={{ color: theme === 'dark' ? '#ff6b6b' : 'error.main' }}
        >
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        height: '100%',
        overflow: 'auto',
        bgcolor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
        padding: '40px 20px',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: theme === 'dark' ? '#333333' : '#f1f1f1',
        },
        '&::-webkit-scrollbar-thumb': {
          background: theme === 'dark' ? '#666666' : '#c1c1c1',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: theme === 'dark' ? '#888888' : '#a8a8a8',
        },
      }}
    >
      <Box
        ref={contentRef}
        sx={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '0 20px',
          fontSize: `${fontSize}px`,
          lineHeight: 1.6,
          color: theme === 'dark' ? '#e0e0e0' : '#333333',
          fontFamily: 'Georgia, serif',
          '& p': {
            marginBottom: '1em',
            textAlign: 'justify',
            color: theme === 'dark' ? '#e0e0e0' : '#333333',
          },
          '& h1, & h2, & h3, & h4, & h5, & h6': {
            marginTop: '1.5em',
            marginBottom: '0.5em',
            fontWeight: 'bold',
            color: theme === 'dark' ? '#ffffff' : '#222222',
          },
          '& ul, & ol': {
            marginBottom: '1em',
            paddingLeft: '2em',
          },
          '& li': {
            marginBottom: '0.5em',
            color: theme === 'dark' ? '#e0e0e0' : '#333333',
          },
          '& table': {
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '1em',
          },
          '& th, & td': {
            border: `1px solid ${theme === 'dark' ? '#555555' : '#ddd'}`,
            padding: '8px',
            textAlign: 'left',
            color: theme === 'dark' ? '#e0e0e0' : '#333333',
            backgroundColor: theme === 'dark' ? 'transparent' : 'transparent',
          },
          '& th': {
            backgroundColor: theme === 'dark' ? '#333333' : '#f5f5f5',
            fontWeight: 'bold',
            color: theme === 'dark' ? '#ffffff' : '#222222',
          },
          '& img': {
            maxWidth: '100%',
            height: 'auto',
            marginBottom: '1em',
          },
          '& strong, & b': {
            color: theme === 'dark' ? '#ffffff' : '#222222',
          },
          '& em, & i': {
            color: theme === 'dark' ? '#cccccc' : '#444444',
          },
        }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </Box>
  );
}