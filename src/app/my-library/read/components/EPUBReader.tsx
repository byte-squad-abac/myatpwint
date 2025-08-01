'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import ePub from 'epubjs';
import { EPUBReaderProps } from '../types';
import { EPUBLoadError } from './ReaderErrorBoundary';

// EPUBReaderProps is now imported from types

export default function EPUBReader({ fileData, zoomLevel, onStateChange }: EPUBReaderProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [progress, setProgress] = useState<number>(0);
  
  // Memoized onStateChange to prevent unnecessary re-renders
  const memoizedOnStateChange = useCallback(onStateChange, [onStateChange]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<any>(null);
  const renditionRef = useRef<any>(null);

  // Initialize EPUB reader
  useEffect(() => {
    if (!fileData || !containerRef.current) return;

    const initializeEPUB = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Create book instance
        const book = ePub(fileData);
        bookRef.current = book;

        // Wait for book to be ready
        await book.ready;

        // Get book spine length for page count estimation
        const spine = book.spine as any;
        const spineLength = spine.length || 1;
        setTotalPages(spineLength);

        // Create rendition
        const rendition = book.renderTo(containerRef.current!, {
          width: '100%',
          height: '100%',
          allowScriptedContent: true,
        });
        
        renditionRef.current = rendition;

        // Display the book
        await rendition.display();

        // Set up event listeners and store cleanup function
        const cleanupEventListeners = setupEventListeners(rendition, book);
        
        // Store cleanup function for later use
        (rendition as any)._cleanupEventListeners = cleanupEventListeners;

        setIsLoading(false);
        memoizedOnStateChange({
          totalPages: spineLength,
          currentPage: 1,
          progress: 0,
          isLoading: false,
          error: null
        });

      } catch (err) {
        console.error('Error initializing EPUB:', err);
        setError('Failed to load EPUB file');
        setIsLoading(false);
        memoizedOnStateChange({
          isLoading: false,
          error: 'Failed to load EPUB file'
        });
      }
    };

    initializeEPUB();

    // Cleanup
    return () => {
      if (renditionRef.current) {
        // Clean up event listeners first
        if ((renditionRef.current as any)._cleanupEventListeners) {
          (renditionRef.current as any)._cleanupEventListeners();
        }
        // Clean up keyboard handler if it exists
        if ((renditionRef.current as any)._keyPressHandler) {
          document.removeEventListener('keydown', (renditionRef.current as any)._keyPressHandler);
        }
        // Destroy rendition
        renditionRef.current.destroy();
      }
      if (bookRef.current) {
        bookRef.current.destroy();
      }
    };
  }, [fileData, memoizedOnStateChange]);

  // Setup event listeners for the rendition
  const setupEventListeners = useCallback((rendition: any, book: any) => {
    try {
      // Handle location changes
      rendition.on('relocated', (location: any) => {
        try {
          const currentSpineIndex = (book.spine as any).get(location.start.cfi)?.index || 0;
          const newCurrentPage = currentSpineIndex + 1;
          const newProgress = (currentSpineIndex / Math.max(1, totalPages - 1)) * 100;
          
          // Only update if values actually changed
          if (newCurrentPage !== currentPage) {
            setCurrentPage(newCurrentPage);
            setProgress(newProgress);
            
            memoizedOnStateChange({
              currentPage: newCurrentPage,
              progress: Math.min(100, Math.max(0, newProgress))
            });
          }
        } catch (error) {
          console.error('Error handling location change:', error);
        }
      });

      // Handle rendering errors
      rendition.on('renderError', (error: any) => {
        console.error('EPUB render error:', error);
        setError('Error rendering EPUB content');
        memoizedOnStateChange({
          error: 'Error rendering EPUB content'
        });
      });

      // Handle book loading
      rendition.on('loaded', () => {
        console.log('EPUB loaded successfully');
      });

      // Keyboard navigation
      const handleKeyPress = (event: KeyboardEvent) => {
        try {
          switch (event.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
              event.preventDefault();
              rendition.prev();
              break;
            case 'ArrowRight':
            case 'ArrowDown':
            case ' ':
              event.preventDefault();
              rendition.next();
              break;
            case 'Home':
              event.preventDefault();
              rendition.display(0);
              break;
            case 'End':
              event.preventDefault();
              rendition.display((book.spine as any).last().href);
              break;
          }
        } catch (error) {
          console.error('Error handling keyboard navigation:', error);
        }
      };

      // Add keyboard event listener
      document.addEventListener('keydown', handleKeyPress);
      
      // Store the cleanup function properly
      (rendition as any)._keyPressHandler = handleKeyPress;
      
      // Return cleanup function
      return () => {
        document.removeEventListener('keydown', handleKeyPress);
        rendition.off('relocated');
        rendition.off('renderError');
        rendition.off('loaded');
      };
    } catch (error) {
      console.error('Error setting up event listeners:', error);
    }
  }, [totalPages, currentPage, memoizedOnStateChange]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (renditionRef.current) {
        renditionRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup is now handled in the main useEffect above

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        position: 'relative',
        bgcolor: '#ffffff',
        overflow: 'hidden',
      }}
    >
      {isLoading && (
        <Box 
          sx={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            bgcolor: '#ffffff',
            zIndex: 1000
          }}
        >
          <CircularProgress />
        </Box>
      )}
      
      <Box
        ref={containerRef}
        sx={{
          height: '100%',
          width: '100%',
          '& iframe': {
            border: 'none',
            outline: 'none',
          },
          '& .epub-container': {
            height: '100%',
            overflow: 'auto',
          },
          '& .epub-view': {
            height: '100%',
          },
          // Custom scrollbar styling
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
      />
    </Box>
  );
}