'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Box, CircularProgress, Alert } from '@mui/material';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { PDFReaderProps, ReaderPerformanceMetrics } from '../types';
import { PDFLoadError } from './ReaderErrorBoundary';
import { useScrollTouchGestures } from '../hooks/useTouchGestures';
import styles from './PDFReader.module.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker - use the bundled version to avoid version mismatches
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// Suppress TextLayer cancellation warnings (they're harmless)
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args[0]?.includes?.('TextLayer task cancelled')) {
    return; // Suppress this specific warning
  }
  originalConsoleError(...args);
};

// PDFReaderProps is now imported from types

class PageManager {
  private pageHeights = new Map<number, number>();
  private static readonly BUFFER_SIZE = 5;
  private static readonly ESTIMATED_PAGE_HEIGHT = 600;
  
  constructor(private totalPages: number) {}
  
  getVisiblePageRange(scrollTop: number, containerHeight: number): [number, number] {
    const averagePageHeight = this.getAveragePageHeight();
    const startPage = Math.max(1, Math.floor(scrollTop / averagePageHeight) - PageManager.BUFFER_SIZE);
    const endPage = Math.min(this.totalPages, Math.ceil((scrollTop + containerHeight) / averagePageHeight) + PageManager.BUFFER_SIZE);
    return [startPage, endPage];
  }
  
  private getAveragePageHeight(): number {
    if (this.pageHeights.size === 0) return PageManager.ESTIMATED_PAGE_HEIGHT;
    const heights = Array.from(this.pageHeights.values());
    return heights.reduce((sum, height) => sum + height, 0) / heights.length;
  }
  
  setPageHeight(pageNumber: number, height: number) {
    this.pageHeights.set(pageNumber, height);
  }
  
  getPageHeight(pageNumber: number): number {
    return this.pageHeights.get(pageNumber) || PageManager.ESTIMATED_PAGE_HEIGHT;
  }
  
  getEstimatedScrollHeight(): number {
    return this.totalPages * this.getAveragePageHeight();
  }
  
  getPagePosition(pageNumber: number): number {
    let position = 0;
    for (let i = 1; i < pageNumber; i++) {
      position += this.getPageHeight(i) + 16; // 16px margin
    }
    return position;
  }
  
  shouldRenderPage(pageNumber: number, visibleRange: [number, number]): boolean {
    return pageNumber >= visibleRange[0] && pageNumber <= visibleRange[1];
  }
  
  cleanup() {
    this.pageHeights.clear();
  }
}


export default function PDFReader({ fileData, zoomLevel, onStateChange }: PDFReaderProps) {
  const { theme } = useTheme();
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageWidth, setPageWidth] = useState<number>(800);
  const [error, setError] = useState<string | null>(null);
  const [visibleRange, setVisibleRange] = useState<[number, number]>([1, 10]);
  
  // Memoized onStateChange to prevent unnecessary re-renders
  const memoizedOnStateChange = useCallback(onStateChange, [onStateChange]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pageManagerRef = useRef<PageManager | null>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  
  // Touch gesture support
  const touchGestures = useScrollTouchGestures(containerRef, {
    onPageUp: () => {
      if (containerRef.current) {
        const scrollAmount = containerRef.current.clientHeight * 0.8;
        containerRef.current.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
      }
    },
    onPageDown: () => {
      if (containerRef.current) {
        const scrollAmount = containerRef.current.clientHeight * 0.8;
        containerRef.current.scrollBy({ top: scrollAmount, behavior: 'smooth' });
      }
    },
  });
  
  const pageManager = useMemo(() => {
    if (numPages > 0) {
      if (pageManagerRef.current) {
        pageManagerRef.current.cleanup();
      }
      pageManagerRef.current = new PageManager(numPages);
      return pageManagerRef.current;
    }
    return null;
  }, [numPages]);
  
  // Theme-based styles
  const containerStyles = useMemo(() => ({
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
  }), [theme]);
  
  const pageStyles = useMemo(() => ({
    backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
  }), [theme]);
  
  const placeholderStyles = useMemo(() => ({
    backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
    color: theme === 'dark' ? '#cccccc' : '#999999',
    border: theme === 'dark' ? '1px solid #444' : '1px solid #eee',
  }), [theme]);
  
  // Apply dark mode styles to PDF content
  useEffect(() => {
    const applyDarkMode = () => {
      const pageElements = document.querySelectorAll('.react-pdf__Page');
      pageElements.forEach(pageElement => {
        if (theme === 'dark') {
          (pageElement as HTMLElement).style.filter = 'invert(1) hue-rotate(180deg)';
        } else {
          (pageElement as HTMLElement).style.filter = 'none';
        }
      });
    };
    
    // Apply immediately
    applyDarkMode();
    
    // Also apply when new pages are loaded
    const observer = new MutationObserver(applyDarkMode);
    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true
      });
    }
    
    return () => {
      observer.disconnect();
    };
  }, [theme]);

  // Calculate container width and set page width with zoom
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // Mobile-responsive width calculation
        const isMobile = window.innerWidth < 768;
        const marginRatio = isMobile ? 0.95 : 0.9; // Less margin on mobile
        const maxWidth = isMobile ? containerWidth : 800;
        const baseWidth = Math.min(containerWidth * marginRatio, maxWidth);
        setPageWidth(baseWidth * (zoomLevel / 100));
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [zoomLevel]);

  // Handle document load success
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(null);
    
    memoizedOnStateChange({
      totalPages: numPages,
      currentPage: 1,
      progress: 0,
      isLoading: false,
      error: null
    });
  }, [memoizedOnStateChange]);

  // Handle document load error
  const onDocumentLoadError = useCallback((_error: Error) => {
    const errorMessage = 'Failed to load PDF document';
    const pdfError = new PDFLoadError(errorMessage);
    
    setError(errorMessage);
    memoizedOnStateChange({
      isLoading: false,
      error: errorMessage
    });
    
    // Log structured error for debugging
    console.error('PDF Load Error:', {
      error: pdfError,
      originalError: _error,
      timestamp: new Date().toISOString()
    });
  }, [memoizedOnStateChange]);

  // Handle page load success
  const onPageLoadSuccess = useCallback((page: any, pageNumber: number) => {
    const viewport = page.getViewport({ scale: 1 });
    const scale = pageWidth / viewport.width;
    const scaledHeight = viewport.height * scale;
    
    pageManager?.setPageHeight(pageNumber, scaledHeight);
  }, [pageWidth, pageManager]);

  // Calculate scroll position and update current page
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !pageManager) return;

    try {
      const container = containerRef.current;
      const newScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      
      // Calculate visible page range
      const newVisibleRange = pageManager.getVisiblePageRange(newScrollTop, containerHeight);
      
      // Update visible range if changed
      if (newVisibleRange[0] !== visibleRange[0] || newVisibleRange[1] !== visibleRange[1]) {
        setVisibleRange(newVisibleRange);
      }
      
      // Calculate current page based on scroll position
      const averagePageHeight = pageManager.getPageHeight(1);
      const estimatedCurrentPage = Math.max(1, Math.min(numPages, Math.ceil(newScrollTop / averagePageHeight)));
      
      // Only update if page actually changed
      if (estimatedCurrentPage !== currentPage) {
        setCurrentPage(estimatedCurrentPage);
        
        // Calculate progress (0-100)
        const totalScrollHeight = pageManager.getEstimatedScrollHeight();
        const progress = totalScrollHeight > 0 ? (newScrollTop / totalScrollHeight) * 100 : 0;
        
        // Update state only when page changes to reduce API calls
        memoizedOnStateChange({
          currentPage: estimatedCurrentPage,
          progress: Math.min(100, Math.max(0, progress))
        });
      }
    } catch (error) {
      console.error('Error in handleScroll:', error);
    }
  }, [currentPage, visibleRange, pageManager, numPages, memoizedOnStateChange]);

  // Setup intersection observer for better performance
  useEffect(() => {
    if (!containerRef.current || !pageManager) return;

    const options = {
      root: containerRef.current,
      rootMargin: '1000px',
      threshold: 0.1
    };

    intersectionObserverRef.current = new IntersectionObserver(() => {
      // Handle visibility changes if needed
    }, options);

    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
    };
  }, [pageManager]);

  // Set up scroll listener with throttling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', throttledScroll, { passive: true });
    return () => container.removeEventListener('scroll', throttledScroll);
  }, [handleScroll]);

  // Keyboard navigation with screen reader announcements
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const pageHeight = container.clientHeight * 0.9; // 90% of container height

      switch (event.key) {
        case 'ArrowDown':
        case ' ':
          event.preventDefault();
          container.scrollBy({ top: pageHeight, behavior: 'smooth' });
          // Announce page change for screen readers
          setTimeout(() => {
            const announcement = `Page ${currentPage} of ${numPages}`;
            const ariaLabel = container.getAttribute('aria-label');
            if (ariaLabel !== announcement) {
              container.setAttribute('aria-label', `PDF document, ${announcement}`);
            }
          }, 100);
          break;
        case 'ArrowUp':
          event.preventDefault();
          container.scrollBy({ top: -pageHeight, behavior: 'smooth' });
          // Announce page change for screen readers
          setTimeout(() => {
            const announcement = `Page ${currentPage} of ${numPages}`;
            const ariaLabel = container.getAttribute('aria-label');
            if (ariaLabel !== announcement) {
              container.setAttribute('aria-label', `PDF document, ${announcement}`);
            }
          }, 100);
          break;
        case 'Home':
          event.preventDefault();
          container.scrollTo({ top: 0, behavior: 'smooth' });
          container.setAttribute('aria-label', 'PDF document, beginning of document');
          break;
        case 'End':
          event.preventDefault();
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
          container.setAttribute('aria-label', 'PDF document, end of document');
          break;
        case 'PageDown':
          event.preventDefault();
          container.scrollBy({ top: pageHeight, behavior: 'smooth' });
          break;
        case 'PageUp':
          event.preventDefault();
          container.scrollBy({ top: -pageHeight, behavior: 'smooth' });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, numPages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
      if (pageManagerRef.current) {
        pageManagerRef.current.cleanup();
      }
    };
  }, []);

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      className={theme === 'dark' ? styles.darkMode : styles.lightMode}
      role="document"
      aria-label={`PDF document, page ${currentPage} of ${numPages}`}
      aria-live="polite"
      aria-atomic="false"
      tabIndex={0}
      sx={{
        height: '100%',
        overflow: 'auto',
        ...containerStyles,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: { xs: '10px 0', sm: '20px 0' },
        // Touch-friendly scrolling
        WebkitOverflowScrolling: 'touch',
        // Responsive scrollbar
        '&::-webkit-scrollbar': {
          width: { xs: '4px', sm: '8px' },
        },
        '&::-webkit-scrollbar-track': {
          background: theme === 'dark' ? '#333' : '#f1f1f1',
        },
        '&::-webkit-scrollbar-thumb': {
          background: theme === 'dark' ? '#666' : '#c1c1c1',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: theme === 'dark' ? '#777' : '#a8a8a8',
        },
        // Focus indicators
        '&:focus': {
          outline: '2px solid #2196f3',
          outlineOffset: '2px',
        },
      }}
    >
      <Document
        file={fileData}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <CircularProgress />
          </Box>
        }
      >
        <Box
          sx={{
            height: pageManager?.getEstimatedScrollHeight() || '100vh',
            position: 'relative',
          }}
        >
          {Array.from(new Array(visibleRange[1] - visibleRange[0] + 1), (_, index) => {
            const pageNumber = visibleRange[0] + index;
            const shouldRender = pageManager?.shouldRenderPage(pageNumber, visibleRange);
            const pagePosition = pageManager?.getPagePosition(pageNumber) || 0;
            const pageHeight = pageManager?.getPageHeight(pageNumber) || 600;
            
            return (
              <Box
                key={pageNumber}
                sx={{
                  position: 'absolute',
                  top: pagePosition,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  mb: { xs: 1, sm: 2 },
                  boxShadow: theme === 'dark' ? '0 2px 8px rgba(255,255,255,0.1)' : '0 2px 8px rgba(0,0,0,0.1)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  ...pageStyles,
                  minHeight: pageHeight,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  // Mobile-friendly touch target
                  touchAction: 'pan-y pinch-zoom',
                }}
              >
                {shouldRender ? (
                  <Page
                    pageNumber={pageNumber}
                    width={pageWidth}
                    onLoadSuccess={(page) => onPageLoadSuccess(page, pageNumber)}
                    loading={
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress size={24} />
                      </Box>
                    }
                  />
                ) : (
                  <Box sx={{ 
                    width: pageWidth, 
                    height: pageHeight,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    ...placeholderStyles
                  }}>
                    Page {pageNumber}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Document>
    </Box>
  );
}