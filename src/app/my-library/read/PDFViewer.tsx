'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

// Style constants
const STYLES = {
  container: {
    height: '100vh',
    width: '100vw',
    background: '#f8f9fa',
    overflow: 'hidden',
    position: 'relative' as const,
  },
  scrollContainer: {
    height: '100vh',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    position: 'relative' as const,
    overflow: 'auto',
    padding: '40px 20px',
    scrollBehavior: 'smooth' as const,
  },
  pdfPage: {
    background: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 20px rgba(0, 0, 0, 0.08)',
    padding: '40px',
    display: 'inline-block',
    margin: '0 auto',
  },
  loadingContainer: {
    padding: '60px',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '20px',
    minHeight: '400px',
    justifyContent: 'center',
  },
  button: {
    base: {
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    icon: {
      position: 'fixed' as const,
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(10px)',
    },
    control: {
      padding: '8px 16px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
    },
  },
  controlBar: {
    container: {
      position: 'fixed' as const,
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
    },
    content: {
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '24px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    },
  },
  divider: {
    width: '1px',
    height: '24px',
    background: 'rgba(255, 255, 255, 0.2)',
  },
} as const;

// Gesture configuration
const GESTURE_CONFIG = {
  THRESHOLD: 500,
  RESET_TIMEOUT: 300,
  UNLOCK_TIMEOUT: 500,
  SCROLL_EDGE_THRESHOLD: 5,
  SWIPE_THRESHOLD: 50,
  TOUCHPAD_MULTIPLIER: 3.0,
  TOUCHPAD_DELTA_THRESHOLD: 10,
} as const;

interface PDFViewerProps {
  fileUrl: string;
  bookName: string;
}

// Custom hook for gesture-based scrolling
function useGestureScroll(
  containerRef: React.RefObject<HTMLDivElement | null>,
  onPageChange: (direction: 'next' | 'prev') => void
) {
  const [gestureProgress, setGestureProgress] = useState(0);
  const [showIndicator, setShowIndicator] = useState(false);
  const [indicatorDirection, setIndicatorDirection] = useState<'next' | 'prev'>('next');

  const scrollState = useRef({
    isAtTop: true,
    isAtBottom: false,
    lastScrollTop: 0,
    isScrolling: false,
    scrollTimeout: null as NodeJS.Timeout | null,
    gestureAccumulator: 0,
    gestureDirection: 0,
    gestureStartTime: 0,
    isGestureActive: false,
    gestureResetTimeout: null as NodeJS.Timeout | null,
    gestureLocked: false,
  });

  const resetGesture = useCallback(() => {
    const state = scrollState.current;
    state.gestureAccumulator = 0;
    state.isGestureActive = false;
    state.gestureDirection = 0;
    state.gestureLocked = false;
    setGestureProgress(0);
    setShowIndicator(false);
  }, []);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const state = scrollState.current;
    
    state.lastScrollTop = scrollTop;
    
    const wasAtEdge = state.isAtTop || state.isAtBottom;
    state.isAtTop = scrollTop <= GESTURE_CONFIG.SCROLL_EDGE_THRESHOLD;
    state.isAtBottom = scrollTop + clientHeight >= scrollHeight - GESTURE_CONFIG.SCROLL_EDGE_THRESHOLD;
    const isAtEdge = state.isAtTop || state.isAtBottom;
    
    if (wasAtEdge && !isAtEdge && state.isGestureActive) {
      resetGesture();
    }
    
    if (state.scrollTimeout) clearTimeout(state.scrollTimeout);
    
    state.isScrolling = true;
    state.scrollTimeout = setTimeout(() => {
      state.isScrolling = false;
    }, 150);
  }, [containerRef, resetGesture]);

  const handleWheel = useCallback((event: WheelEvent) => {
    const container = containerRef.current;
    if (!container) return;
    
    const state = scrollState.current;
    const scrollingDown = event.deltaY > 0;
    
    const atEdgeScrollingPast = 
      (state.isAtBottom && scrollingDown) || 
      (state.isAtTop && !scrollingDown);
    
    if (atEdgeScrollingPast && !state.isScrolling) {
      event.preventDefault();
      
      if (state.gestureLocked) return;
      
      if (state.gestureResetTimeout) {
        clearTimeout(state.gestureResetTimeout);
      }
      
      const gestureDirection = scrollingDown ? 1 : -1;
      
      if (!state.isGestureActive || state.gestureDirection !== gestureDirection) {
        state.isGestureActive = true;
        state.gestureDirection = gestureDirection;
        state.gestureStartTime = Date.now();
        state.gestureAccumulator = 0;
        setIndicatorDirection(gestureDirection === 1 ? 'next' : 'prev');
      }
      
      const isTouchpad = Math.abs(event.deltaY) < GESTURE_CONFIG.TOUCHPAD_DELTA_THRESHOLD;
      const multiplier = isTouchpad ? GESTURE_CONFIG.TOUCHPAD_MULTIPLIER : 1.0;
      state.gestureAccumulator += Math.abs(event.deltaY) * multiplier;
      
      const progress = Math.min(100, (state.gestureAccumulator / GESTURE_CONFIG.THRESHOLD) * 100);
      
      setGestureProgress(progress);
      setShowIndicator(true);
      
      if (progress >= 100) {
        state.gestureLocked = true;
        
        if (state.gestureResetTimeout) {
          clearTimeout(state.gestureResetTimeout);
        }
        
        onPageChange(gestureDirection === 1 ? 'next' : 'prev');
        
        const newScrollPosition = gestureDirection === 1 ? 0 : container.scrollHeight - container.clientHeight;
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = newScrollPosition;
            state.isAtTop = gestureDirection === 1;
            state.isAtBottom = gestureDirection === -1;
          }
        }, 100);
        
        resetGesture();
        state.gestureLocked = true;
        
        setTimeout(() => {
          setShowIndicator(false);
        }, GESTURE_CONFIG.RESET_TIMEOUT);
        
        setTimeout(() => {
          state.gestureLocked = false;
        }, GESTURE_CONFIG.UNLOCK_TIMEOUT);
      } else {
        state.gestureResetTimeout = setTimeout(() => {
          resetGesture();
        }, GESTURE_CONFIG.RESET_TIMEOUT);
      }
    }
  }, [containerRef, onPageChange, resetGesture]);

  // Initialize scroll state
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    scrollState.current.isAtTop = scrollTop <= GESTURE_CONFIG.SCROLL_EDGE_THRESHOLD;
    scrollState.current.isAtBottom = scrollTop + clientHeight >= scrollHeight - GESTURE_CONFIG.SCROLL_EDGE_THRESHOLD;
  }, [containerRef]);

  return {
    handleScroll,
    handleWheel,
    gestureProgress,
    showIndicator,
    indicatorDirection,
    resetGesture,
  };
}

export default function PDFViewer({ fileUrl, bookName }: PDFViewerProps) {
  // PDF state
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.2);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [clickNavigationEnabled, setClickNavigationEnabled] = useState(false);
  const [lockMode, setLockMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  // Touch state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Navigation functions
  const goToPreviousPage = useCallback(() => {
    setPageNumber(prev => Math.max(1, prev - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setPageNumber(prev => numPages === 0 ? prev + 1 : Math.min(numPages, prev + 1));
  }, [numPages]);

  const handlePageChange = useCallback((direction: 'next' | 'prev') => {
    if (direction === 'next') goToNextPage();
    else goToPreviousPage();
  }, [goToNextPage, goToPreviousPage]);

  // Use custom gesture hook
  const {
    handleScroll,
    handleWheel,
    gestureProgress,
    showIndicator,
    indicatorDirection,
    resetGesture,
  } = useGestureScroll(containerRef, handlePageChange);

  // Click navigation
  const handleContainerClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!clickNavigationEnabled) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const isLeftHalf = clickX < rect.width / 2;
    
    if (isLeftHalf) goToPreviousPage();
    else goToNextPage();
  }, [clickNavigationEnabled, goToNextPage, goToPreviousPage]);

  // Touch handlers
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
    const isLeftSwipe = distance > GESTURE_CONFIG.SWIPE_THRESHOLD;
    const isRightSwipe = distance < -GESTURE_CONFIG.SWIPE_THRESHOLD;

    if (isLeftSwipe) goToNextPage();
    if (isRightSwipe) goToPreviousPage();
  }, [touchStart, touchEnd, goToNextPage, goToPreviousPage]);

  // Control visibility
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    
    if (mouseTimeoutRef.current) {
      clearTimeout(mouseTimeoutRef.current);
    }
    
    mouseTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  // PDF handlers
  const handleLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(null);
  }, []);

  const handleLoadError = useCallback((err: Error) => {
    if (fileUrl.startsWith('blob:') && err.message.includes('Unexpected server response')) {
      setError('PDF session expired. Please re-upload the file to continue reading.');
    } else {
      setError('Failed to load PDF. The file might be corrupted or inaccessible.');
    }
  }, [fileUrl]);

  const handlePageRenderError = useCallback((error: Error) => {
    // Suppress harmless TextLayer warnings
    if (error.message?.includes('TextLayer')) return;
    console.warn('Page render error:', error);
  }, []);

  // Effects
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleScroll, handleWheel]);

  useEffect(() => {
    setPageNumber(1);
    setError(null);
    resetGesture();
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [fileUrl, resetGesture]);

  useEffect(() => {
    return () => {
      if (mouseTimeoutRef.current) {
        clearTimeout(mouseTimeoutRef.current);
      }
    };
  }, []);

  // Memoized styles
  const controlVisibilityStyle = useMemo(() => ({
    opacity: showControls ? 1 : 0,
    visibility: showControls ? 'visible' as const : 'hidden' as const,
    transition: 'all 0.3s ease',
    pointerEvents: showControls ? 'auto' as const : 'none' as const,
  }), [showControls]);

  const gestureIndicatorColor = useMemo(() => {
    if (gestureProgress >= 100) return '#10b981';
    if (gestureProgress >= 75) return '#3b82f6';
    return '#8b5cf6';
  }, [gestureProgress]);

  return (
    <div style={STYLES.container} onMouseMove={handleMouseMove} onTouchStart={() => setShowControls(true)}>
      {/* Scrollable PDF Container */}
      <div 
        ref={containerRef}
        style={{
          ...STYLES.scrollContainer,
          cursor: clickNavigationEnabled ? 'pointer' : 'default',
        }}
        onClick={handleContainerClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* PDF Document */}
        <div style={STYLES.pdfPage}>
          <Document
            file={fileUrl}
            onLoadSuccess={handleLoadSuccess}
            onLoadError={handleLoadError}
            loading={
              <div style={STYLES.loadingContainer}>
                <div style={{ fontSize: '20px', color: '#495057' }}>Loading PDF...</div>
                <div style={{ fontSize: '16px', color: '#6c757d' }}>This may take a moment for large files</div>
              </div>
            }
            error={
              <div style={{ ...STYLES.loadingContainer, color: '#d32f2f' }}>
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
                    ...STYLES.button.base,
                    padding: '12px 24px',
                    borderRadius: '8px',
                    background: '#667eea',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: '500',
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
                <div style={{ padding: '40px', textAlign: 'center', fontSize: '16px', color: '#6c757d' }}>
                  Loading page {pageNumber}...
                </div>
              }
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        </div>
      </div>

      {/* Gesture Progress Indicator */}
      {showIndicator && (
        <div style={{
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
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: '500',
          }}>
            <span style={{ fontSize: '16px' }}>
              {indicatorDirection === 'next' ? '↓' : '↑'}
            </span>
            <span>
              {indicatorDirection === 'next' ? 'Next' : 'Previous'}
            </span>
          </div>
          
          <div style={{
            width: '150px',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${gestureProgress}%`,
              height: '100%',
              background: gestureIndicatorColor,
              transition: 'width 0.1s ease, background 0.3s ease',
              borderRadius: '2px',
            }} />
          </div>
          
          <div style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '11px',
            textAlign: 'center',
          }}>
            {gestureProgress < 100 ? 'Keep scrolling' : 'Ready'}
          </div>
        </div>
      )}

      {/* Lock Mode Toggle */}
      <button
        onClick={() => setLockMode(!lockMode)}
        style={{
          ...STYLES.button.base,
          ...STYLES.button.icon,
          top: '20px',
          left: '20px',
          zIndex: 1001,
          background: lockMode ? 'rgba(220, 38, 38, 0.8)' : 'rgba(0, 0, 0, 0.6)',
          color: '#ffffff',
          fontSize: '16px',
        }}
        title={lockMode ? "Unlock controls" : "Lock controls"}
      >
        {lockMode ? '🔒' : '🔓'}
      </button>

      {/* Close Button */}
      {!lockMode && (
        <button
          onClick={() => window.history.back()}
          style={{
            ...STYLES.button.base,
            ...STYLES.button.icon,
            ...controlVisibilityStyle,
            top: '20px',
            right: '20px',
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.6)',
            color: '#ffffff',
            fontSize: '20px',
          }}
        >
          ×
        </button>
      )}

      {/* Bottom Control Bar */}
      {!lockMode && (
        <div style={{
          ...STYLES.controlBar.container,
          ...controlVisibilityStyle,
        }}>
          <div style={STYLES.controlBar.content}>
            {/* Page Navigation */}
            <button 
              onClick={goToPreviousPage} 
              disabled={pageNumber <= 1}
              style={{
                ...STYLES.button.base,
                ...STYLES.button.control,
                background: pageNumber <= 1 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                color: pageNumber <= 1 ? 'rgba(255, 255, 255, 0.4)' : '#ffffff',
                cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              ← Previous
            </button>
            
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#ffffff',
              minWidth: '120px',
              textAlign: 'center',
            }}>
              Page {pageNumber} of {numPages || '?'}
            </div>
            
            <button 
              onClick={goToNextPage} 
              disabled={numPages > 0 && pageNumber >= numPages}
              style={{
                ...STYLES.button.base,
                ...STYLES.button.control,
                background: (numPages > 0 && pageNumber >= numPages) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                color: (numPages > 0 && pageNumber >= numPages) ? 'rgba(255, 255, 255, 0.4)' : '#ffffff',
                cursor: (numPages > 0 && pageNumber >= numPages) ? 'not-allowed' : 'pointer',
              }}
            >
              Next →
            </button>

            <div style={STYLES.divider} />

            {/* Zoom Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={() => setPdfScale(s => Math.max(0.5, s - 0.2))}
                style={{
                  ...STYLES.button.base,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                −
              </button>
              <span style={{ 
                fontSize: '13px',
                fontWeight: '500',
                color: '#ffffff',
                minWidth: '50px',
                textAlign: 'center',
              }}>
                {Math.round(pdfScale * 100)}%
              </span>
              <button 
                onClick={() => setPdfScale(s => Math.min(3, s + 0.2))}
                style={{
                  ...STYLES.button.base,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                +
              </button>
            </div>

            <div style={STYLES.divider} />

            {/* Click Navigation Toggle */}
            <label style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#ffffff',
            }}>
              <input
                type="checkbox"
                checked={clickNavigationEnabled}
                onChange={(e) => setClickNavigationEnabled(e.target.checked)}
                style={{ 
                  margin: 0,
                  width: '16px',
                  height: '16px',
                  accentColor: '#667eea',
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