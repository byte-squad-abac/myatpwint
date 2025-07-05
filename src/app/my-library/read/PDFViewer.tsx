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

  // Smart scroll state for page-internal scrolling with gesture-based navigation
  const scrollState = useRef({
    isAtTop: true,
    isAtBottom: false,
    lastScrollTop: 0,
    isScrolling: false,
    scrollTimeout: null as NodeJS.Timeout | null,
    // Gesture-based page navigation system
    // Requires sustained scrolling gesture at page boundaries
    gestureAccumulator: 0, // Accumulates scroll delta when at edge
    gestureDirection: 0, // 1 for down (next page), -1 for up (previous page)
    gestureStartTime: 0, // Timestamp when gesture started
    isGestureActive: false, // True when user is performing edge gesture
    gestureResetTimeout: null as NodeJS.Timeout | null, // Timeout for resetting gesture
  });
  
  // State for visual progress indicator
  const [gestureProgress, setGestureProgress] = useState<number>(0);
  const [showGestureIndicator, setShowGestureIndicator] = useState<boolean>(false);
  const [gestureIndicatorDirection, setGestureIndicatorDirection] = useState<'next' | 'prev'>('next');

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
    state.lastScrollTop = scrollTop;
    
    // Check if at top or bottom with a small threshold (5px)
    const threshold = 5;
    const wasAtEdge = state.isAtTop || state.isAtBottom;
    state.isAtTop = scrollTop <= threshold;
    state.isAtBottom = scrollTop + clientHeight >= scrollHeight - threshold;
    const isAtEdge = state.isAtTop || state.isAtBottom;
    
    // Reset gesture if user scrolls away from edge
    if (wasAtEdge && !isAtEdge && state.isGestureActive) {
      state.gestureAccumulator = 0;
      state.isGestureActive = false;
      state.gestureDirection = 0;
      setGestureProgress(0);
      setShowGestureIndicator(false);
    }
    
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
   * Handle wheel events for gesture-based page navigation
   * 
   * Gesture-Based Navigation System:
   * When user reaches the edge of a page, they must perform a sustained
   * scrolling gesture (like a long hard rub on touchpad) to change pages.
   * A progress indicator shows how much gesture is needed.
   * 
   * Behavior:
   * 1. At edge + scroll past: Start accumulating gesture
   * 2. Sustained scroll: Fill progress bar to 100%
   * 3. Release or pause: Reset gesture after timeout
   * 4. Complete gesture: Change page and reset
   */
  const handleWheel = useCallback((event: WheelEvent) => {
    const container = containerRef.current;
    if (!container) return;
    
    const state = scrollState.current;
    const scrollingDown = event.deltaY > 0;
    
    // Check if we're at an edge and trying to scroll past it
    const atEdgeScrollingPast = 
      (state.isAtBottom && scrollingDown) || 
      (state.isAtTop && !scrollingDown);
    
    if (atEdgeScrollingPast && !state.isScrolling) {
      event.preventDefault();
      
      // Clear any existing reset timeout
      if (state.gestureResetTimeout) {
        clearTimeout(state.gestureResetTimeout);
      }
      
      // Determine gesture direction
      const gestureDirection = scrollingDown ? 1 : -1;
      
      // Start or continue gesture
      if (!state.isGestureActive || state.gestureDirection !== gestureDirection) {
        // Starting new gesture
        state.isGestureActive = true;
        state.gestureDirection = gestureDirection;
        state.gestureStartTime = Date.now();
        state.gestureAccumulator = 0;
        setGestureIndicatorDirection(gestureDirection === 1 ? 'next' : 'prev');
      }
      
      // Accumulate gesture with higher sensitivity for touchpad
      // Touchpad typically has smaller deltaY values
      const isTouchpad = Math.abs(event.deltaY) < 10;
      const multiplier = isTouchpad ? 3.0 : 1.0;
      state.gestureAccumulator += Math.abs(event.deltaY) * multiplier;
      
      // Calculate progress (0-100%)
      const GESTURE_THRESHOLD = 500; // Adjust this value to control gesture length
      const progress = Math.min(100, (state.gestureAccumulator / GESTURE_THRESHOLD) * 100);
      
      // Update visual indicator
      setGestureProgress(progress);
      setShowGestureIndicator(true);
      
      // Check if gesture is complete
      if (progress >= 100) {
        // Clear reset timeout since we're changing page
        if (state.gestureResetTimeout) {
          clearTimeout(state.gestureResetTimeout);
        }
        
        // Change page
        if (gestureDirection === 1) {
          goToNextPage();
          // Scroll to top of new page
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = 0;
              state.isAtTop = true;
              state.isAtBottom = false;
            }
          }, 100);
        } else {
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
        
        // Reset gesture state
        state.gestureAccumulator = 0;
        state.isGestureActive = false;
        state.gestureDirection = 0;
        state.gestureResetTimeout = null;
        setGestureProgress(0);
        
        // Hide indicator after a delay
        setTimeout(() => {
          setShowGestureIndicator(false);
        }, 300);
      } else {
        // Set timeout to reset gesture if user stops scrolling
        state.gestureResetTimeout = setTimeout(() => {
          state.gestureAccumulator = 0;
          state.isGestureActive = false;
          state.gestureDirection = 0;
          state.gestureResetTimeout = null;
          setGestureProgress(0);
          setShowGestureIndicator(false);
        }, 300); // Reset after 300ms of inactivity
      }
    }
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
    const state = scrollState.current;

    // For touch, we'll keep simple swipe navigation without gesture system
    // The gesture system is primarily for scroll wheel/touchpad
    if (isLeftSwipe && state.isAtBottom) {
      goToNextPage();
    }
    if (isRightSwipe && state.isAtTop) {
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
      if (scrollState.current.gestureResetTimeout) {
        clearTimeout(scrollState.current.gestureResetTimeout);
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
      gestureAccumulator: 0,
      gestureDirection: 0,
      gestureStartTime: 0,
      isGestureActive: false,
      gestureResetTimeout: null,
    };
    // Reset gesture indicator
    setGestureProgress(0);
    setShowGestureIndicator(false);
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

      {/* Gesture Progress Indicator - Compact Design */}
      {showGestureIndicator && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.75)',
            borderRadius: '20px',
            padding: '12px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            zIndex: 1000,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
            transition: 'opacity 0.3s ease',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: '500',
          }}>
            <span style={{ fontSize: '16px' }}>
              {gestureIndicatorDirection === 'next' ? '↓' : '↑'}
            </span>
            <span>
              {gestureIndicatorDirection === 'next' ? 'Next' : 'Previous'}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div style={{
            width: '150px',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '2px',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div
              style={{
                width: `${gestureProgress}%`,
                height: '100%',
                background: gestureProgress >= 100 
                  ? '#10b981' // Green when complete
                  : gestureProgress >= 75 
                    ? '#3b82f6' // Blue when almost there
                    : '#8b5cf6', // Purple for progress
                transition: 'width 0.1s ease, background 0.3s ease',
                borderRadius: '2px',
              }}
            />
          </div>
          
          <div style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '11px',
            textAlign: 'center',
          }}>
            {gestureProgress < 100 
              ? 'Keep scrolling' 
              : 'Ready'}
          </div>
        </div>
      )}

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