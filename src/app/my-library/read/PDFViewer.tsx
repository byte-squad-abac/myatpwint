'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

// Constants
const CONFIG = {
  GESTURE_THRESHOLD: 500,
  RESET_TIMEOUT: 300,
  UNLOCK_TIMEOUT: 500,
  SCROLL_EDGE_THRESHOLD: 5,
  SWIPE_THRESHOLD: 50,
  TOUCHPAD_MULTIPLIER: 3.0,
  TOUCHPAD_DELTA_THRESHOLD: 10,
  CONTROL_HIDE_DELAY: 3000,
  ZOOM_MIN: 0.5,
  ZOOM_MAX: 3,
  ZOOM_STEP: 0.2,
  DEFAULT_SCALE: 1.2,
} as const;

const STYLES = {
  container: {
    height: '100vh',
    width: '100%',
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
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '40px 20px',
    scrollBehavior: 'smooth' as const,
  },
  pdfDocument: {
    background: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 20px rgba(0, 0, 0, 0.08)',
    padding: '40px',
    display: 'block',
    margin: '0 auto',
    position: 'relative' as const,
    maxWidth: 'calc(100% - 40px)',
    width: '100%',
    boxSizing: 'border-box' as const,
    overflowX: 'hidden',
  },
  loadingState: {
    padding: '60px',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '20px',
    minHeight: '400px',
    justifyContent: 'center',
  },
  iconButton: {
    position: 'fixed' as const,
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    color: '#ffffff',
    fontSize: '16px',
  },
  controlBar: {
    position: 'fixed' as const,
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    background: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  controlButton: {
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '14px',
    fontWeight: '500',
  },
  gestureIndicator: {
    position: 'fixed' as const,
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 0, 0, 0.75)',
    borderRadius: '20px',
    padding: '12px 24px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
    zIndex: 1000,
    backdropFilter: 'blur(8px)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
    transition: 'opacity 0.3s ease',
  },
  readingProgress: {
    position: 'absolute' as const,
    bottom: '0',
    left: '0',
    right: '0',
    height: '6px',
    background: '#e0e0e0',
    borderRadius: '0 0 8px 8px',
    overflow: 'hidden' as const,
    zIndex: 10,
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
    transition: 'width 0.3s ease',
    borderRadius: '0 0 8px 8px',
    boxShadow: '0 0 6px rgba(102, 126, 234, 0.4)',
  },
  progressLabel: {
    position: 'absolute' as const,
    bottom: '12px',
    right: '12px',
    fontSize: '11px',
    color: '#666',
    background: 'rgba(255, 255, 255, 0.95)',
    padding: '3px 8px',
    borderRadius: '12px',
    pointerEvents: 'none' as const,
    border: '1px solid rgba(0,0,0,0.1)',
    fontWeight: '500',
    zIndex: 11,
  },
} as const;

interface PDFViewerProps {
  fileUrl: string;
}

// Custom hook for gesture-based page navigation
function useGestureNavigation(
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
    isGestureActive: false,
    gestureResetTimeout: null as NodeJS.Timeout | null,
    gestureLocked: false,
  });

  const resetGesture = useCallback(() => {
    const state = scrollState.current;
    Object.assign(state, {
      gestureAccumulator: 0,
      isGestureActive: false,
      gestureDirection: 0,
      gestureLocked: false,
    });
    setGestureProgress(0);
    setShowIndicator(false);
  }, []);

  const updateScrollState = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const state = scrollState.current;
    
    state.lastScrollTop = scrollTop;
    
    const wasAtEdge = state.isAtTop || state.isAtBottom;
    state.isAtTop = scrollTop <= CONFIG.SCROLL_EDGE_THRESHOLD;
    state.isAtBottom = scrollTop + clientHeight >= scrollHeight - CONFIG.SCROLL_EDGE_THRESHOLD;
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
        state.gestureAccumulator = 0;
        setIndicatorDirection(gestureDirection === 1 ? 'next' : 'prev');
      }
      
      const isTouchpad = Math.abs(event.deltaY) < CONFIG.TOUCHPAD_DELTA_THRESHOLD;
      const multiplier = isTouchpad ? CONFIG.TOUCHPAD_MULTIPLIER : 1.0;
      state.gestureAccumulator += Math.abs(event.deltaY) * multiplier;
      
      const progress = Math.min(100, (state.gestureAccumulator / CONFIG.GESTURE_THRESHOLD) * 100);
      
      setGestureProgress(progress);
      setShowIndicator(true);
      
      if (progress >= 100) {
        state.gestureLocked = true;
        
        if (state.gestureResetTimeout) {
          clearTimeout(state.gestureResetTimeout);
        }
        
        onPageChange(gestureDirection === 1 ? 'next' : 'prev');
        
        resetGesture();
        state.gestureLocked = true;
        
        setTimeout(() => setShowIndicator(false), CONFIG.RESET_TIMEOUT);
        setTimeout(() => { state.gestureLocked = false; }, CONFIG.UNLOCK_TIMEOUT);
      } else {
        state.gestureResetTimeout = setTimeout(resetGesture, CONFIG.RESET_TIMEOUT);
      }
    }
  }, [containerRef, onPageChange, resetGesture]);

  const resetScrollState = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const state = scrollState.current;
    state.isAtTop = scrollTop <= CONFIG.SCROLL_EDGE_THRESHOLD;
    state.isAtBottom = scrollTop + clientHeight >= scrollHeight - CONFIG.SCROLL_EDGE_THRESHOLD;
  }, [containerRef]);

  return {
    handleScroll: updateScrollState,
    handleWheel,
    gestureProgress,
    showIndicator,
    indicatorDirection,
    resetGesture,
    resetScrollState,
  };
}

// Custom hook for control visibility
function useControlVisibility() {
  const [showControls, setShowControls] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleActivity = useCallback(() => {
    setShowControls(true);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, CONFIG.CONTROL_HIDE_DELAY);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { showControls, handleActivity };
}

// Custom hook for keyboard navigation
function useKeyboardNavigation(
  containerRef: React.RefObject<HTMLDivElement | null>,
  goToNextPage: () => void,
  goToPreviousPage: () => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const container = containerRef.current;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPreviousPage();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNextPage();
          break;
        case 'ArrowDown':
          if (container) {
            e.preventDefault();
            container.scrollTo({
              top: container.scrollHeight - container.clientHeight,
              behavior: 'smooth'
            });
          }
          break;
        case 'ArrowUp':
          if (container) {
            e.preventDefault();
            container.scrollTo({ top: 0, behavior: 'smooth' });
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, goToNextPage, goToPreviousPage]);
}

// Custom hook for touch navigation
function useTouchNavigation(goToNextPage: () => void, goToPreviousPage: () => void) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

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
    const isLeftSwipe = distance > CONFIG.SWIPE_THRESHOLD;
    const isRightSwipe = distance < -CONFIG.SWIPE_THRESHOLD;

    if (isLeftSwipe) goToNextPage();
    if (isRightSwipe) goToPreviousPage();
  }, [touchStart, touchEnd, goToNextPage, goToPreviousPage]);

  return { handleTouchStart, handleTouchMove, handleTouchEnd };
}

// Reading Progress Bar Component
function ReadingProgressBar({ 
  currentPage, 
  totalPages 
}: { 
  currentPage: number; 
  totalPages: number;
}) {
  if (totalPages === 0) return null;
  
  const progress = (currentPage / totalPages) * 100;
  const progressPercent = Math.round(progress);
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      height: '4px',
      background: 'rgba(0, 0, 0, 0.1)',
      zIndex: 1002,
    }}>
      {/* Progress Fill */}
      <div 
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
          transition: 'width 0.3s ease',
        }} 
      />
      
      {/* Progress Label */}
      <div style={{
        position: 'absolute',
        bottom: '8px',
        right: '12px',
        fontSize: '11px',
        color: '#666',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '4px 8px',
        borderRadius: '4px',
        border: '1px solid rgba(0,0,0,0.1)',
        fontWeight: '500',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        {progressPercent}% • {currentPage} of {totalPages}
      </div>
    </div>
  );
}

// Gesture Progress Indicator Component
function GestureIndicator({ 
  show, 
  progress, 
  direction 
}: { 
  show: boolean; 
  progress: number; 
  direction: 'next' | 'prev'; 
}) {
  const progressColor = useMemo(() => {
    if (progress >= 100) return '#10b981';
    if (progress >= 75) return '#3b82f6';
    return '#8b5cf6';
  }, [progress]);

  if (!show) return null;

  return (
    <div style={STYLES.gestureIndicator}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#fff',
        fontSize: '13px',
        fontWeight: '500',
      }}>
        <span style={{ fontSize: '16px' }}>
          {direction === 'next' ? '↓' : '↑'}
        </span>
        <span>
          {direction === 'next' ? 'Next' : 'Previous'}
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
          width: `${progress}%`,
          height: '100%',
          background: progressColor,
          transition: 'width 0.1s ease, background 0.3s ease',
          borderRadius: '2px',
        }} />
      </div>
      
      <div style={{
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '11px',
        textAlign: 'center',
      }}>
        {progress < 100 ? 'Keep scrolling' : 'Ready'}
      </div>
    </div>
  );
}

// Control Bar Component
function ControlBar({
  pageNumber,
  numPages,
  pdfScale,
  clickNavigationEnabled,
  showControls,
  onPreviousPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
  onToggleClickNav,
}: {
  pageNumber: number;
  numPages: number;
  pdfScale: number;
  clickNavigationEnabled: boolean;
  showControls: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleClickNav: (enabled: boolean) => void;
}) {
  const controlStyle = useMemo(() => ({
    ...STYLES.controlBar,
    opacity: showControls ? 1 : 0,
    visibility: showControls ? 'visible' as const : 'hidden' as const,
    transition: 'all 0.3s ease',
    pointerEvents: showControls ? 'auto' as const : 'none' as const,
  }), [showControls]);

  return (
    <div style={controlStyle}>
      {/* Page Navigation */}
      <button 
        onClick={onPreviousPage} 
        disabled={pageNumber <= 1}
        style={{
          ...STYLES.controlButton,
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
        onClick={onNextPage} 
        disabled={numPages > 0 && pageNumber >= numPages}
        style={{
          ...STYLES.controlButton,
          background: (numPages > 0 && pageNumber >= numPages) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
          color: (numPages > 0 && pageNumber >= numPages) ? 'rgba(255, 255, 255, 0.4)' : '#ffffff',
          cursor: (numPages > 0 && pageNumber >= numPages) ? 'not-allowed' : 'pointer',
        }}
      >
        Next →
      </button>

      <div style={{
        width: '1px',
        height: '24px',
        background: 'rgba(255, 255, 255, 0.2)'
      }} />

      {/* Zoom Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button onClick={onZoomOut} style={STYLES.controlButton}>−</button>
        <span style={{ 
          fontSize: '13px',
          fontWeight: '500',
          color: '#ffffff',
          minWidth: '50px',
          textAlign: 'center',
        }}>
          {Math.round(pdfScale * 100)}%
        </span>
        <button onClick={onZoomIn} style={STYLES.controlButton}>+</button>
      </div>

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
        color: '#ffffff',
      }}>
        <input
          type="checkbox"
          checked={clickNavigationEnabled}
          onChange={(e) => onToggleClickNav(e.target.checked)}
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
  );
}

// Main PDF Viewer Component
export default function PDFViewer({ fileUrl }: PDFViewerProps) {
  // PDF state
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState<number>(CONFIG.DEFAULT_SCALE);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [clickNavigationEnabled, setClickNavigationEnabled] = useState(false);
  const [lockMode, setLockMode] = useState(false);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // Custom hooks
  const { showControls, handleActivity } = useControlVisibility();
  
  const {
    handleScroll,
    handleWheel,
    gestureProgress,
    showIndicator,
    indicatorDirection,
    resetGesture,
    resetScrollState,
  } = useGestureNavigation(containerRef, (direction) => {
    if (direction === 'next') goToNextPage();
    else goToPreviousPage();
  });

  // Navigation functions
  const goToPreviousPage = useCallback(() => {
    setPageNumber(prev => Math.max(1, prev - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setPageNumber(prev => numPages === 0 ? prev + 1 : Math.min(numPages, prev + 1));
  }, [numPages]);

  const handleZoomIn = useCallback(() => {
    setPdfScale(s => Math.min(CONFIG.ZOOM_MAX, s + CONFIG.ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setPdfScale(s => Math.max(CONFIG.ZOOM_MIN, s - CONFIG.ZOOM_STEP));
  }, []);

  // Event handlers
  const handleContainerClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!clickNavigationEnabled) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const isLeftHalf = clickX < rect.width / 2;
    
    if (isLeftHalf) goToPreviousPage();
    else goToNextPage();
  }, [clickNavigationEnabled, goToNextPage, goToPreviousPage]);

  const handlePageRenderSuccess = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.scrollTop = 0;
    resetScrollState();
  }, [resetScrollState]);

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
    if (error.message?.includes('TextLayer')) return;
    console.warn('Page render error:', error);
  }, []);

  // Custom hook integrations
  useKeyboardNavigation(containerRef, goToNextPage, goToPreviousPage);
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchNavigation(goToNextPage, goToPreviousPage);

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

  // Prevent horizontal scrolling
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyOverflowX = document.body.style.overflowX;
    const originalDocumentOverflowX = document.documentElement.style.overflowX;
    
    // Apply comprehensive overflow controls
    document.body.style.overflow = 'hidden';
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.overflowX = originalBodyOverflowX;
      document.documentElement.style.overflowX = originalDocumentOverflowX;
    };
  }, []);

  return (
    <div 
      style={STYLES.container} 
      onMouseMove={handleActivity} 
      onTouchStart={() => handleActivity()}
    >
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
        <div style={STYLES.pdfDocument}>
          <div style={{ 
            width: '100%', 
            maxWidth: '100%',
            overflow: 'hidden',
            overflowX: 'hidden',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <Document
            file={fileUrl}
            onLoadSuccess={handleLoadSuccess}
            onLoadError={handleLoadError}
            loading={
              <div style={STYLES.loadingState}>
                <div style={{ fontSize: '20px', color: '#495057' }}>Loading PDF...</div>
                <div style={{ fontSize: '16px', color: '#6c757d' }}>This may take a moment for large files</div>
              </div>
            }
            error={
              <div style={{ ...STYLES.loadingState, color: '#d32f2f' }}>
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
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    background: '#667eea',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '500',
                  }}
                >
                  Go Back
                </button>
              </div>
            }
          >
            <div style={{ 
              maxWidth: '100%', 
              width: '100%',
              overflow: 'hidden',
              overflowX: 'hidden',
              boxSizing: 'border-box'
            }}>
              <Page 
                pageNumber={pageNumber} 
                scale={pdfScale}
                onRenderSuccess={handlePageRenderSuccess}
                onRenderError={handlePageRenderError}
                loading={
                  <div style={{ padding: '40px', textAlign: 'center', fontSize: '16px', color: '#6c757d' }}>
                    Loading page {pageNumber}...
                  </div>
                }
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </div>
          </Document>
          </div>
        </div>
      </div>

      {/* Gesture Progress Indicator */}
      <GestureIndicator 
        show={showIndicator}
        progress={gestureProgress}
        direction={indicatorDirection}
      />

      {/* Top Right Button Group */}
      <div style={{
        position: 'fixed',
        top: '84px',
        right: '20px',
        zIndex: 1001,
        display: 'flex',
        gap: '8px',
        opacity: showControls ? 1 : 0,
        visibility: showControls ? 'visible' : 'hidden',
        transition: 'all 0.3s ease',
        pointerEvents: showControls ? 'auto' : 'none',
      }}>
        {/* Lock Mode Toggle */}
        <button
          onClick={() => setLockMode(!lockMode)}
          style={{
            ...STYLES.iconButton,
            position: 'relative',
            background: lockMode ? 'rgba(220, 38, 38, 0.8)' : 'rgba(0, 0, 0, 0.6)',
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
              ...STYLES.iconButton,
              position: 'relative',
              background: 'rgba(0, 0, 0, 0.6)',
              fontSize: '20px',
            }}
            title="Close reader"
          >
            ×
          </button>
        )}
      </div>

      {/* Bottom Control Bar */}
      {!lockMode && (
        <ControlBar
          pageNumber={pageNumber}
          numPages={numPages}
          pdfScale={pdfScale}
          clickNavigationEnabled={clickNavigationEnabled}
          showControls={showControls}
          onPreviousPage={goToPreviousPage}
          onNextPage={goToNextPage}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onToggleClickNav={setClickNavigationEnabled}
        />
      )}

      {/* Reading Progress Bar at Bottom Edge */}
      <ReadingProgressBar 
        currentPage={pageNumber}
        totalPages={numPages}
      />
    </div>
  );
}