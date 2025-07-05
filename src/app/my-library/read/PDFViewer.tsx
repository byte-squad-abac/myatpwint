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
    <div style={{ 
      minHeight: '100vh',
      background: '#f8f9fa',
      padding: '20px 0'
    }}>
      <div style={{ 
        maxWidth: 1000, 
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        overflow: 'hidden'
      }}>
        {/* Professional Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '32px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background decoration */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-10%',
            width: '300px',
            height: '300px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-30%',
            left: '-5%',
            width: '200px',
            height: '200px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }} />
          
          <h1 style={{ 
            color: '#ffffff',
            fontSize: '28px',
            fontWeight: '600',
            margin: 0,
            textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            position: 'relative',
            zIndex: 1
          }}>
            {bookName}
          </h1>
        </div>
      
      {/* Modern Navigation Controls */}
      <div style={{ 
        padding: '24px 32px',
        borderBottom: '1px solid #e9ecef',
        background: 'linear-gradient(to right, #fafbfc, #ffffff)',
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          {/* Left: Page Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={goToPreviousPage} 
              disabled={pageNumber <= 1}
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                border: 'none',
                background: pageNumber <= 1 
                  ? 'linear-gradient(135deg, #e9ecef, #f8f9fa)' 
                  : 'linear-gradient(135deg, #667eea, #764ba2)',
                color: pageNumber <= 1 ? '#6c757d' : '#ffffff',
                cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: pageNumber <= 1 ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.3)',
                transform: pageNumber <= 1 ? 'none' : 'translateY(-1px)',
              }}
              onMouseOver={(e) => {
                if (pageNumber > 1) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                }
              }}
              onMouseOut={(e) => {
                if (pageNumber > 1) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                }
              }}
            >
              ← Previous
            </button>
            
            {/* Page Counter */}
            <div style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
              borderRadius: '12px',
              border: '2px solid #e9ecef',
              fontSize: '16px',
              fontWeight: '600',
              color: '#495057',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
              minWidth: '140px',
              textAlign: 'center'
            }}>
              Page {pageNumber} of {numPages || '?'}
            </div>
            
            <button 
              onClick={goToNextPage} 
              disabled={numPages > 0 && pageNumber >= numPages}
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                border: 'none',
                background: (numPages > 0 && pageNumber >= numPages)
                  ? 'linear-gradient(135deg, #e9ecef, #f8f9fa)' 
                  : 'linear-gradient(135deg, #667eea, #764ba2)',
                color: (numPages > 0 && pageNumber >= numPages) ? '#6c757d' : '#ffffff',
                cursor: (numPages > 0 && pageNumber >= numPages) ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: (numPages > 0 && pageNumber >= numPages) ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.3)',
                transform: (numPages > 0 && pageNumber >= numPages) ? 'none' : 'translateY(-1px)',
              }}
              onMouseOver={(e) => {
                if (!(numPages > 0 && pageNumber >= numPages)) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                }
              }}
              onMouseOut={(e) => {
                if (!(numPages > 0 && pageNumber >= numPages)) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                }
              }}
            >
              Next →
            </button>
          </div>
          
          {/* Right: Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Zoom controls */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              background: '#ffffff',
              padding: '8px 16px',
              borderRadius: '12px',
              border: '2px solid #e9ecef',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <button 
                onClick={() => setPdfScale(s => Math.max(0.5, s - 0.2))}
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '8px', 
                  border: 'none',
                  background: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
                  color: '#495057',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #e9ecef, #f8f9fa)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #f8f9fa, #ffffff)';
                }}
              >
                −
              </button>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '500',
                color: '#6c757d',
                minWidth: '45px',
                textAlign: 'center'
              }}>
                Zoom
              </span>
              <button 
                onClick={() => setPdfScale(s => Math.min(3, s + 0.2))}
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '8px', 
                  border: 'none',
                  background: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
                  color: '#495057',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #e9ecef, #f8f9fa)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #f8f9fa, #ffffff)';
                }}
              >
                +
              </button>
            </div>
            
            {/* Click navigation toggle */}
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              cursor: 'pointer',
              background: '#ffffff',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '2px solid #e9ecef',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#667eea';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#e9ecef';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
            }}
            >
              <input
                type="checkbox"
                checked={clickNavigationEnabled}
                onChange={(e) => setClickNavigationEnabled(e.target.checked)}
                style={{ 
                  margin: 0,
                  width: '18px',
                  height: '18px',
                  accentColor: '#667eea'
                }}
              />
              <span style={{ 
                fontSize: '14px',
                fontWeight: '500',
                color: '#495057'
              }}>
                Click Navigation
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Modern Instructions */}
      <div style={{ 
        padding: '20px 32px',
        background: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
        borderBottom: '1px solid #e9ecef'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '30px',
          flexWrap: 'wrap',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            color: '#495057',
            background: '#ffffff',
            padding: '12px 20px',
            borderRadius: '12px',
            border: '1px solid #e9ecef',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <span style={{ fontSize: '18px' }}>📱</span>
            <span><strong>Mobile:</strong> Swipe left/right to navigate</span>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            color: '#495057',
            background: '#ffffff',
            padding: '12px 20px',
            borderRadius: '12px',
            border: '1px solid #e9ecef',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <span style={{ fontSize: '18px' }}>🖱️</span>
            <span><strong>Desktop:</strong> Smooth scroll - watch the progress indicator</span>
          </div>
          {clickNavigationEnabled && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              color: '#495057',
              background: '#ffffff',
              padding: '12px 20px',
              borderRadius: '12px',
              border: '1px solid #e9ecef',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <span style={{ fontSize: '18px' }}>👆</span>
              <span><strong>Click Navigation:</strong> Left half = previous, right half = next</span>
            </div>
          )}
        </div>
      </div>

      {/* PDF Reader Section */}
      <div style={{ 
        padding: '32px',
        background: '#ffffff'
      }}>
        <div 
          ref={containerRef}
          style={{ 
            display: 'flex', 
            justifyContent: 'center',
            position: 'relative',
            cursor: clickNavigationEnabled ? 'pointer' : 'default',
            minHeight: '600px',
            borderRadius: '12px',
            background: '#fafbfc',
            border: '2px solid #e9ecef',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.05)'
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
            color: '#d32f2f', 
            textAlign: 'center', 
            margin: '20px 32px',
            padding: '20px',
            background: 'linear-gradient(135deg, #fff5f5, #ffffff)',
            borderRadius: '12px',
            border: '2px solid #f8d7da',
            boxShadow: '0 4px 12px rgba(211, 47, 47, 0.1)'
          }}>
            {error}
          </div>
        )}
      </div>
      </div>
    </div>
  );
} 