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
  
  // State for scroll progress indicator
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [showScrollIndicator, setShowScrollIndicator] = useState<boolean>(false);
  
  // Refs for DOM elements
  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  // Touch/swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Improved scroll state for smoother scrolling
  const scrollState = useRef({
    accumulator: 0,
    lastEventTime: 0,
    lastPageChangeTime: 0,
    isChangingPage: false,
    direction: 0, // -1 for up, 1 for down, 0 for none
    pageAtScrollStart: 1,
    hasChangedPage: false,
    // New fields for better touchpad handling
    consecutiveScrolls: 0,
    velocityHistory: [] as number[],
    isTouchpad: false,
    scrollIntention: 'idle' as 'idle' | 'scrolling' | 'page-change',
  });

  // Timer for hiding scroll indicator
  const hideIndicatorTimer = useRef<NodeJS.Timeout | null>(null);

  // Navigation functions with page change tracking
  const goToPreviousPage = useCallback(() => {
    const newPage = Math.max(1, pageNumber - 1);
    if (newPage !== pageNumber) {
      setPageNumber(newPage);
      scrollState.current.hasChangedPage = true;
      scrollState.current.lastPageChangeTime = Date.now();
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
      scrollState.current.hasChangedPage = true;
      scrollState.current.lastPageChangeTime = Date.now();
    }
  }, [numPages, pageNumber]);

  /**
   * Enhanced wheel handler that provides smooth, controlled scrolling for both mouse wheels
   * and touchpads. Uses delta value patterns to differentiate between input types and
   * applies appropriate thresholds and debouncing for each.
   * 
   * Key features:
   * - Touchpad detection via deltaY magnitude
   * - Accumulator-based scrolling with visual feedback
   * - Prevents accidental multi-page jumps
   * - Adaptive thresholds for different input devices
   * - Clear visual progress indicator
   */
  const handleWheel = useCallback((event: WheelEvent) => {
    // Prevent default scrolling behavior
    event.preventDefault();
    
    const now = Date.now();
    const state = scrollState.current;
    const timeSinceLastEvent = now - state.lastEventTime;
    const timeSinceLastPageChange = now - state.lastPageChangeTime;
    
    // Detect if this is likely a touchpad based on delta values
    // Touchpads typically have smaller, more frequent delta values
    const absDeltaY = Math.abs(event.deltaY);
    const isTouchpadLikely = absDeltaY < 4 || (event.deltaMode === 0 && absDeltaY < 50);
    
    // Determine scroll direction
    const currentDirection = event.deltaY > 0 ? 1 : -1;
    
    // Reset state if:
    // 1. Direction changed
    // 2. User paused scrolling (>200ms gap)
    // 3. Just changed page and cooldown hasn't expired
    const shouldReset = (
      currentDirection !== state.direction || 
      timeSinceLastEvent > 200 ||
      (state.hasChangedPage && timeSinceLastPageChange < 1200)
    );
    
    if (shouldReset) {
      state.accumulator = 0;
      state.direction = currentDirection;
      state.hasChangedPage = false;
      state.isTouchpad = isTouchpadLikely;
      setScrollProgress(0);
    }
    
    // Update last event time
    state.lastEventTime = now;
    
    // Only accumulate if we haven't just changed page
    if (!state.hasChangedPage && !state.isChangingPage) {
      // Apply different multipliers based on input type
      let multiplier = 1.0;
      if (state.isTouchpad) {
        // Touchpads need larger multiplier due to smaller deltas
        multiplier = 2.5;
      } else {
        // Mouse wheels have larger deltas, need smaller multiplier
        multiplier = 0.8;
      }
      
      // Cap the delta to prevent huge jumps from fast scrolling
      const cappedDelta = Math.min(absDeltaY, state.isTouchpad ? 10 : 50);
      
      // Accumulate scroll amount with capped delta
      state.accumulator += cappedDelta * multiplier;
      
      // Set threshold based on input type
      const threshold = state.isTouchpad ? 250 : 150;
      
      // Calculate progress
      const progress = Math.min(100, (state.accumulator / threshold) * 100);
      setScrollProgress(progress);
      
      // Show indicator when progress is meaningful
      if (progress > 5) {
        setShowScrollIndicator(true);
      }
      
      // Clear previous hide timer
      if (hideIndicatorTimer.current) {
        clearTimeout(hideIndicatorTimer.current);
      }
      
      // Set timer to hide indicator
      hideIndicatorTimer.current = setTimeout(() => {
        setShowScrollIndicator(false);
        setScrollProgress(0);
        state.accumulator = 0;
      }, 500);
      
      // Change page when threshold is reached
      if (state.accumulator >= threshold && timeSinceLastPageChange > 500) {
        state.isChangingPage = true;
        
        // Visual feedback for page change
        setScrollProgress(100);
        
        // Execute page change
        if (currentDirection > 0) {
          goToNextPage();
        } else {
          goToPreviousPage();
        }
        
        // Mark that we've changed page
        state.hasChangedPage = true;
        state.lastPageChangeTime = now;
        
        // Force a hard reset to prevent any queued events
        state.accumulator = 0;
        state.consecutiveScrolls = 0;
        
        // Reset state after a longer delay
        setTimeout(() => {
          state.isChangingPage = false;
          state.accumulator = 0;
          setScrollProgress(0);
          setShowScrollIndicator(false);
        }, 500);
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

    if (isLeftSwipe) {
      goToNextPage();
    }
    if (isRightSwipe) {
      goToPreviousPage();
    }
  }, [touchStart, touchEnd, goToNextPage, goToPreviousPage]);

  // Add/remove wheel event listener
  useEffect(() => {
    const container = pageContainerRef.current;
    if (!container) return;

    // Add wheel event listener
    container.addEventListener('wheel', handleWheel, { passive: false });
    
    // Cleanup: remove event listener when component unmounts
    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (hideIndicatorTimer.current) {
        clearTimeout(hideIndicatorTimer.current);
      }
    };
  }, [handleWheel]);

  // Reset to first page when file changes
  useEffect(() => {
    setPageNumber(1);
    setError(null);
    setScrollProgress(0);
    setShowScrollIndicator(false);
    // Reset scroll state
    scrollState.current = {
      accumulator: 0,
      lastEventTime: 0,
      lastPageChangeTime: 0,
      isChangingPage: false,
      direction: 0,
      pageAtScrollStart: 1,
      hasChangedPage: false,
      consecutiveScrolls: 0,
      velocityHistory: [],
      isTouchpad: false,
      scrollIntention: 'idle',
    };
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

  return (
    <div style={{ padding: '40px', maxWidth: 900, margin: '0 auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      {/* Header with book title */}
      <h2 style={{ textAlign: 'center', marginBottom: 24 }}>{bookName}</h2>
      
      {/* Navigation controls */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 16, gap: '16px', flexWrap: 'wrap' }}>
        {/* Page navigation buttons */}
        <button 
          onClick={goToPreviousPage} 
          disabled={pageNumber <= 1}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            background: pageNumber <= 1 ? '#f5f5f5' : '#fff',
            color: pageNumber <= 1 ? '#999' : '#333',
            cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          ← Previous
        </button>
        
        <span style={{ margin: '0 16px', fontWeight: 'bold' }}>
          Page {pageNumber} of {numPages || '?'}
        </span>
        
        <button 
          onClick={goToNextPage} 
          disabled={numPages > 0 && pageNumber >= numPages}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            background: (numPages > 0 && pageNumber >= numPages) ? '#f5f5f5' : '#fff',
            color: (numPages > 0 && pageNumber >= numPages) ? '#999' : '#333',
            cursor: (numPages > 0 && pageNumber >= numPages) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Next →
        </button>
        
        {/* Zoom controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={() => setPdfScale(s => Math.max(0.5, s - 0.2))}
            style={{ 
              padding: '4px 8px', 
              borderRadius: '4px', 
              border: '1px solid #ccc',
              background: '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            -
          </button>
          <span style={{ fontSize: '14px' }}>Zoom</span>
          <button 
            onClick={() => setPdfScale(s => Math.min(3, s + 0.2))}
            style={{ 
              padding: '4px 8px', 
              borderRadius: '4px', 
              border: '1px solid #ccc',
              background: '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            +
          </button>
        </div>
        
        {/* Click navigation toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              checked={clickNavigationEnabled}
              onChange={(e) => setClickNavigationEnabled(e.target.checked)}
              style={{ margin: 0 }}
            />
            Click Navigation
          </label>
        </div>
      </div>

      {/* Instructions */}
      <div style={{ textAlign: 'center', marginBottom: 16, fontSize: '14px', color: '#666' }}>
        <div>📱 <strong>Mobile:</strong> Swipe left/right to navigate</div>
        <div>🖱️ <strong>Desktop:</strong> Smooth scroll with mouse wheel or touchpad - watch the progress indicator</div>
        {clickNavigationEnabled && (
          <div>👆 <strong>Click Navigation:</strong> Click left half for previous, right half for next page</div>
        )}
      </div>

      {/* PDF viewer container with all navigation features */}
      <div 
        ref={containerRef}
        style={{ 
          display: 'flex', 
          justifyContent: 'center',
          position: 'relative',
          cursor: clickNavigationEnabled ? 'pointer' : 'default',
          minHeight: '400px' // Prevent layout shift during loading
        }}
        onClick={handleContainerClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Scroll progress indicator with enhanced visual feedback */}
        {showScrollIndicator && (
          <div 
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: scrollProgress === 100 ? 'rgba(0, 123, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
              borderRadius: '24px',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              zIndex: 10,
              transition: 'all 0.2s ease',
              opacity: showScrollIndicator ? 1 : 0,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <span style={{ 
              color: '#fff', 
              fontSize: '13px',
              fontWeight: '500',
              minWidth: '60px'
            }}>
              {scrollState.current.direction > 0 ? '↓ Next' : '↑ Previous'}
            </span>
            <div style={{
              width: '120px',
              height: '6px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '3px',
              overflow: 'hidden',
              position: 'relative',
            }}>
              <div style={{
                width: `${scrollProgress}%`,
                height: '100%',
                background: scrollProgress === 100 ? '#fff' : '#007bff',
                transition: 'width 0.15s ease',
                borderRadius: '3px',
              }} />
            </div>
            <span style={{ 
              color: '#fff', 
              fontSize: '13px',
              fontWeight: '500',
              minWidth: '35px',
              textAlign: 'right'
            }}>
              {Math.round(scrollProgress)}%
            </span>
          </div>
        )}

        {/* PDF document */}
        <div ref={pageContainerRef}>
          <Document
            file={fileUrl}
            onLoadSuccess={handleLoadSuccess}
            onLoadError={handleLoadError}
            loading={
              <div style={{ 
                padding: '40px', 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{ fontSize: '18px' }}>Loading PDF...</div>
                <div style={{ fontSize: '14px', color: '#666' }}>This may take a moment for large files</div>
              </div>
            }
            error={
              <div style={{ 
                padding: '40px', 
                textAlign: 'center', 
                color: '#d32f2f',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{ fontSize: '18px', fontWeight: '500' }}>
                  {error || 'Failed to load PDF'}
                </div>
                {fileUrl.startsWith('blob:') && (
                  <div style={{ fontSize: '14px', color: '#666', maxWidth: '400px' }}>
                    This is expected in testing when you reload the page. 
                    Please go back and re-upload the PDF file.
                  </div>
                )}
                <button 
                  onClick={() => window.history.back()}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '4px',
                    border: 'none',
                    background: '#1976d2',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
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
                  padding: '20px', 
                  textAlign: 'center',
                  fontSize: '14px',
                  color: '#666'
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
      
      {/* Error display */}
      {error && (
        <div style={{ 
          color: 'red', 
          textAlign: 'center', 
          marginTop: 16,
          padding: '16px',
          background: '#fff5f5',
          borderRadius: '4px',
          border: '1px solid #fed7d7'
        }}>
          {error}
        </div>
      )}
    </div>
  );
} 