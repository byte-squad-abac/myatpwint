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

  // Handle mouse wheel scrolling with improved smooth debouncing
  const handleWheel = useCallback((event: WheelEvent) => {
    // Prevent default scrolling behavior
    event.preventDefault();
    
    const now = Date.now();
    const state = scrollState.current;
    const timeSinceLastEvent = now - state.lastEventTime;
    const timeSinceLastPageChange = now - state.lastPageChangeTime;
    
    // Determine scroll direction
    const currentDirection = event.deltaY > 0 ? 1 : -1;
    
    // Reset everything if:
    // 1. Direction changed
    // 2. Too much time passed since last scroll (user stopped scrolling)
    // 3. We already changed page in this scroll session
    if (currentDirection !== state.direction || 
        timeSinceLastEvent > 300 || 
        (state.hasChangedPage && timeSinceLastPageChange < 600)) {
      state.accumulator = 0;
      state.direction = currentDirection;
      state.pageAtScrollStart = pageNumber;
      state.hasChangedPage = false;
      setScrollProgress(0);
    }
    
    // Only accumulate if we haven't changed page yet in this scroll session
    if (!state.hasChangedPage) {
      // Add to accumulator with consistent scaling
      const scrollAmount = Math.abs(event.deltaY);
      state.accumulator += scrollAmount * 0.5; // Reduced multiplier for more control
      state.lastEventTime = now;
      
      // Calculate and show progress
      const threshold = 150; // Fixed threshold for consistency
      const progress = Math.min(100, (state.accumulator / threshold) * 100);
      setScrollProgress(progress);
      setShowScrollIndicator(true);
      
      // Clear previous hide timer
      if (hideIndicatorTimer.current) {
        clearTimeout(hideIndicatorTimer.current);
      }
      
      // Hide indicator after stopping
      hideIndicatorTimer.current = setTimeout(() => {
        setShowScrollIndicator(false);
        setScrollProgress(0);
      }, 500);
      
      // Change page only once per scroll session
      if (state.accumulator >= threshold && !state.isChangingPage) {
        state.isChangingPage = true;
        
        // Change page based on direction
        if (currentDirection > 0) {
          goToNextPage();
        } else {
          goToPreviousPage();
        }
        
        // Mark that we've changed page in this scroll session
        state.hasChangedPage = true;
        
        // Reset after a delay
        setTimeout(() => {
          state.isChangingPage = false;
          state.accumulator = 0;
          setScrollProgress(0);
        }, 300);
      }
    }
  }, [goToNextPage, goToPreviousPage, pageNumber]);

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
    console.error('PDF load error:', err);
    setError('Failed to load PDF. The file might be corrupted or inaccessible.');
  }, []);

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
        <div>🖱️ <strong>Desktop:</strong> Use mouse wheel to scroll through pages smoothly</div>
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
        {/* Scroll progress indicator */}
        {showScrollIndicator && (
          <div 
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.7)',
              borderRadius: '20px',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              zIndex: 10,
              transition: 'opacity 0.2s ease',
              opacity: showScrollIndicator ? 1 : 0,
            }}
          >
            <span style={{ color: '#fff', fontSize: '12px' }}>
              {scrollState.current.direction > 0 ? 'Next' : 'Previous'}
            </span>
            <div style={{
              width: '100px',
              height: '4px',
              background: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${scrollProgress}%`,
                height: '100%',
                background: '#007bff',
                transition: 'width 0.1s ease',
              }} />
            </div>
            <span style={{ color: '#fff', fontSize: '12px' }}>
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
                color: 'red',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{ fontSize: '18px' }}>Failed to load PDF</div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  The file might be corrupted or inaccessible.
                </div>
                <button 
                  onClick={() => window.location.reload()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    background: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  Try Again
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