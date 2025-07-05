'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

interface PDFViewerProps {
  fileUrl: string;
  bookName: string;
}

export default function PDFViewer({ fileUrl, bookName }: PDFViewerProps) {
  // State for PDF data
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfScale, setPdfScale] = useState<number>(1.2);
  const [error, setError] = useState<string | null>(null);
  
  // State for navigation settings
  const [clickNavigationEnabled, setClickNavigationEnabled] = useState<boolean>(true);
  const [lockMode, setLockMode] = useState<boolean>(false);
  
  // Refs for DOM elements
  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  // Touch/swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Smart scroll state for page-internal scrolling
  const scrollState = useRef({
    isAtTop: true,
    isAtBottom: false,
    lastScrollTop: 0,
    isScrolling: false,
    scrollTimeout: null as NodeJS.Timeout | null,
  });

  // Navigation functions with scroll position reset
  const goToPreviousPage = useCallback(() => {
    const newPage = Math.max(1, pageNumber - 1);
    if (newPage !== pageNumber) {
      setPageNumber(newPage);
      // Reset scroll position will be handled in wheel handler
    }
  }, [pageNumber]);

  const goToNextPage = useCallback(() => {
    let newPage: number;
    if (numPages === 0) {
      newPage = pageNumber + 1;
    } else {
      newPage = Math.min(numPages, pageNumber + 1);
    }
    if (newPage !== pageNumber) {
      setPageNumber(newPage);
      // Reset scroll position will be handled in wheel handler
    }
  }, [numPages, pageNumber]);

  /**
   * Smart scroll handler that allows scrolling within tall PDF pages
   * before changing to the next/previous page.
   * 
   * Key features:
   * - Scrolls within the page content first
   * - Only changes page when at the top/bottom edge
   * - Works with mouse wheel, touchpad, and touch
   * - Prevents accidental page jumps
   */
  const handleScroll = useCallback((event: Event) => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    
    // Update scroll position tracking
    const state = scrollState.current;
    const scrollDirection = scrollTop > state.lastScrollTop ? 1 : -1;
    state.lastScrollTop = scrollTop;
    
    // Check if at top or bottom with a small threshold (5px)
    const threshold = 5;
    state.isAtTop = scrollTop <= threshold;
    state.isAtBottom = scrollTop + clientHeight >= scrollHeight - threshold;
    
    // Clear previous timeout
    if (state.scrollTimeout) {
      clearTimeout(state.scrollTimeout);
    }
    
    state.isScrolling = true;
    state.scrollTimeout = setTimeout(() => {
      state.isScrolling = false;
    }, 150);
  }, []);

  /**
   * Handle wheel events for page navigation when at edges
   */
  const handleWheel = useCallback((event: WheelEvent) => {
    const container = containerRef.current;
    if (!container) return;
    
    const state = scrollState.current;
    const scrollingDown = event.deltaY > 0;
    
    // If we're at the bottom and scrolling down, go to next page
    if (state.isAtBottom && scrollingDown && !state.isScrolling) {
      event.preventDefault();
      goToNextPage();
      // Scroll to top of new page
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
          state.isAtTop = true;
          state.isAtBottom = false;
        }
      }, 100);
    }
    // If we're at the top and scrolling up, go to previous page  
    else if (state.isAtTop && !scrollingDown && !state.isScrolling) {
      event.preventDefault();
      goToPreviousPage();
      // Scroll to bottom of new page if it's taller than viewport
      setTimeout(() => {
        if (containerRef.current) {
          const container = containerRef.current;
          const scrollHeight = container.scrollHeight;
          const clientHeight = container.clientHeight;
          if (scrollHeight > clientHeight) {
            container.scrollTop = scrollHeight - clientHeight;
            state.isAtTop = false;
            state.isAtBottom = true;
          }
        }
      }, 100);
    }
    // Otherwise, let normal scrolling happen
  }, [goToNextPage, goToPreviousPage]);

  // Handle click/tap navigation on left/right sides
  const handleContainerClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!clickNavigationEnabled) return;
    
    const container = event.currentTarget;
    const rect = container.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const containerWidth = rect.width;
    
    // Divide the container into two halves
    const centerLine = containerWidth / 2;
    
    if (clickX < centerLine) {
      // Clicked on left half - go to previous page
      goToPreviousPage();
    } else {
      // Clicked on right half - go to next page
      goToNextPage();
    }
  }, [clickNavigationEnabled, goToNextPage, goToPreviousPage]);

  // Touch handlers for mobile swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNextPage();
    }
    if (isRightSwipe) {
      goToPreviousPage();
    }
  }, [touchStart, touchEnd, goToNextPage, goToPreviousPage]);

  // Add scroll and wheel event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add event listeners
    container.addEventListener('scroll', handleScroll);
    container.addEventListener('wheel', handleWheel, { passive: false });
    
    // Initialize scroll state
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    scrollState.current.isAtTop = scrollTop <= 5;
    scrollState.current.isAtBottom = scrollTop + clientHeight >= scrollHeight - 5;
    
    // Cleanup: remove event listeners when component unmounts
    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
      if (scrollState.current.scrollTimeout) {
        clearTimeout(scrollState.current.scrollTimeout);
      }
    };
  }, [handleScroll, handleWheel]);

  // Reset to first page when file changes
  useEffect(() => {
    setPageNumber(1);
    setError(null);
    // Reset scroll state
    scrollState.current = {
      isAtTop: true,
      isAtBottom: false,
      lastScrollTop: 0,
      isScrolling: false,
      scrollTimeout: null,
    };
    // Scroll to top
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [fileUrl]);

  // Handle PDF load success
  const handleLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log('PDF loaded successfully with', numPages, 'pages');
    setNumPages(numPages);
    setError(null);
  }, []);

  // Handle PDF load error
  const handleLoadError = useCallback((err: Error) => {
    // Check if it's a blob URL error (happens on page reload)
    if (fileUrl.startsWith('blob:') && err.message.includes('Unexpected server response')) {
      setError('PDF session expired. Please re-upload the file to continue reading.');
    } else {
      console.error('PDF load error:', err);
      setError('Failed to load PDF. The file might be corrupted or inaccessible.');
    }
  }, [fileUrl]);

  // Handle page render error to suppress TextLayer warnings
  const handlePageRenderError = useCallback((error: Error) => {
    // Suppress TextLayer cancellation warnings - they're harmless
    if (error.message && error.message.includes('TextLayer')) {
      return; // Ignore TextLayer errors silently
    }
    console.warn('Page render error:', error);
  }, []);

  // Add state for control visibility
  const [showControls, setShowControls] = useState<boolean>(true);
  const [mouseTimeout, setMouseTimeout] = useState<NodeJS.Timeout | null>(null);

  // Handle mouse movement to show/hide controls
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (mouseTimeout) {
      clearTimeout(mouseTimeout);
    }
    const timeout = setTimeout(() => {
      setShowControls(false);
    }, 3000); // Hide after 3 seconds of inactivity
    setMouseTimeout(timeout);
  }, [mouseTimeout]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (mouseTimeout) {
        clearTimeout(mouseTimeout);
      }
    };
  }, [mouseTimeout]);

  return (
    <div 
      style={{ 
        height: '100vh',
        width: '100vw',
        background: '#f8f9fa',
        overflow: 'hidden', // Prevent page scrolling
        position: 'relative'
      }}
      onMouseMove={handleMouseMove}
      onTouchStart={() => setShowControls(true)}
    >
      {/* Clean PDF Content Area - Scrollable Container */}
      <div 
        ref={containerRef}
        style={{ 
          height: '100vh',
          width: '100%',
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'flex-start',
          position: 'relative',
          cursor: clickNavigationEnabled ? 'pointer' : 'default',
          overflow: 'auto', // Enable scrolling for tall pages
          padding: '40px 20px',
          scrollBehavior: 'smooth', // Smooth scrolling transitions
        }}
        onClick={handleContainerClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* PDF Document - Clean white background */}
        <div 
          ref={pageContainerRef}
          style={{
            background: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 20px rgba(0, 0, 0, 0.08)',
            padding: '40px',
            display: 'inline-block',
            margin: '0 auto',
          }}
        >
          {/* PDF Document */}
          <Document
            file={fileUrl}
            onLoadSuccess={handleLoadSuccess}
            onLoadError={handleLoadError}
            loading={
              <div style={{ 
                padding: '60px', 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
                minHeight: '400px',
                justifyContent: 'center'
              }}>
                <div style={{ fontSize: '20px', color: '#495057' }}>Loading PDF...</div>
                <div style={{ fontSize: '16px', color: '#6c757d' }}>This may take a moment for large files</div>
              </div>
            }
            error={
              <div style={{ 
                padding: '60px', 
                textAlign: 'center', 
                color: '#d32f2f',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
                minHeight: '400px',
                justifyContent: 'center'
              }}>
                <div style={{ fontSize: '20px', fontWeight: '500' }}>
                  {error || 'Failed to load PDF'}
                </div>
                {fileUrl.startsWith('blob:') && (
                  <div style={{ fontSize: '16px', color: '#666', maxWidth: '500px', lineHeight: '1.5' }}>
                    This is expected in testing when you reload the page. 
                    Please go back and re-upload the PDF file.
                  </div>
                )}
                <button 
                  onClick={() => window.history.back()}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#667eea',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                >
                  Go Back
                </button>
              </div>
            }
          >
            <Page 
              pageNumber={pageNumber} 
              scale={pdfScale}
              onRenderError={handlePageRenderError}
              loading={
                <div style={{ 
                  padding: '40px', 
                  textAlign: 'center',
                  fontSize: '16px',
                  color: '#6c757d'
                }}>
                  Loading page {pageNumber}...
                </div>
              }
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        </div>
      </div>

      {/* Lock Mode Toggle - Always Visible */}
      <button
        onClick={() => setLockMode(!lockMode)}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 1001,
          background: lockMode ? 'rgba(220, 38, 38, 0.8)' : 'rgba(0, 0, 0, 0.6)',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          fontSize: '16px',
          cursor: 'pointer',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = lockMode ? 'rgba(220, 38, 38, 1)' : 'rgba(0, 0, 0, 0.8)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = lockMode ? 'rgba(220, 38, 38, 0.8)' : 'rgba(0, 0, 0, 0.6)';
        }}
        title={lockMode ? "Unlock controls" : "Lock controls"}
      >
        {lockMode ? '🔒' : '🔓'}
      </button>

      {/* Close Button - Hidden in Lock Mode */}
      {!lockMode && (
        <button
          onClick={() => window.history.back()}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.6)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            opacity: showControls ? 1 : 0,
            visibility: showControls ? 'visible' : 'hidden',
            transition: 'all 0.3s ease',
            pointerEvents: showControls ? 'auto' : 'none'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
          }}
        >
          ×
        </button>
      )}



      {/* Bottom Control Bar - Hidden in Lock Mode */}
      {!lockMode && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          opacity: showControls ? 1 : 0,
          visibility: showControls ? 'visible' : 'hidden',
          transition: 'all 0.3s ease',
          pointerEvents: showControls ? 'auto' : 'none'
        }}>
        <div style={{
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}>
          {/* Page Navigation */}
          <button 
            onClick={goToPreviousPage} 
            disabled={pageNumber <= 1}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: pageNumber <= 1 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
              color: pageNumber <= 1 ? 'rgba(255, 255, 255, 0.4)' : '#ffffff',
              cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseOver={(e) => {
              if (pageNumber > 1) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              }
            }}
            onMouseOut={(e) => {
              if (pageNumber > 1) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }
            }}
          >
            ← Previous
          </button>
          
          {/* Page Counter */}
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#ffffff',
            minWidth: '120px',
            textAlign: 'center'
          }}>
            Page {pageNumber} of {numPages || '?'}
          </div>
          
          <button 
            onClick={goToNextPage} 
            disabled={numPages > 0 && pageNumber >= numPages}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: (numPages > 0 && pageNumber >= numPages) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
              color: (numPages > 0 && pageNumber >= numPages) ? 'rgba(255, 255, 255, 0.4)' : '#ffffff',
              cursor: (numPages > 0 && pageNumber >= numPages) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseOver={(e) => {
              if (!(numPages > 0 && pageNumber >= numPages)) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              }
            }}
            onMouseOut={(e) => {
              if (!(numPages > 0 && pageNumber >= numPages)) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }
            }}
          >
            Next →
          </button>

          {/* Divider */}
          <div style={{
            width: '1px',
            height: '24px',
            background: 'rgba(255, 255, 255, 0.2)'
          }} />

          {/* Zoom Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={() => setPdfScale(s => Math.max(0.5, s - 0.2))}
              style={{ 
                padding: '8px 12px', 
                borderRadius: '8px', 
                border: 'none',
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '14px',
                fontWeight: '500'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              −
            </button>
            <span style={{ 
              fontSize: '13px', 
              fontWeight: '500',
              color: '#ffffff',
              minWidth: '50px',
              textAlign: 'center'
            }}>
              {Math.round(pdfScale * 100)}%
            </span>
            <button 
              onClick={() => setPdfScale(s => Math.min(3, s + 0.2))}
              style={{ 
                padding: '8px 12px', 
                borderRadius: '8px', 
                border: 'none',
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '14px',
                fontWeight: '500'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              +
            </button>
          </div>

          {/* Divider */}
          <div style={{
            width: '1px',
            height: '24px',
            background: 'rgba(255, 255, 255, 0.2)'
          }} />

          {/* Click Navigation Toggle */}
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#ffffff'
          }}>
            <input
              type="checkbox"
              checked={clickNavigationEnabled}
              onChange={(e) => setClickNavigationEnabled(e.target.checked)}
              style={{ 
                margin: 0,
                width: '16px',
                height: '16px',
                accentColor: '#667eea'
              }}
            />
            Click Nav
          </label>
        </div>
        </div>
      )}

    </div>
  );
} 