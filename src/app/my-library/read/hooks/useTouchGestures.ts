import { useRef, useEffect, useCallback } from 'react';

interface TouchGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchStart?: (scale: number) => void;
  onPinchMove?: (scale: number) => void;
  onPinchEnd?: (scale: number) => void;
  onDoubleTap?: () => void;
  swipeThreshold?: number;
  pinchThreshold?: number;
  doubleTapDelay?: number;
  disabled?: boolean;
}

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

export function useTouchGestures(options: TouchGestureOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinchStart,
    onPinchMove,
    onPinchEnd,
    onDoubleTap,
    swipeThreshold = 50,
    pinchThreshold = 0.1,
    doubleTapDelay = 300,
    disabled = false,
  } = options;

  const startTouch = useRef<TouchPoint | null>(null);
  const startTouches = useRef<TouchPoint[]>([]);
  const lastTap = useRef<number>(0);
  const isPinching = useRef<boolean>(false);
  const initialPinchDistance = useRef<number>(0);
  const currentScale = useRef<number>(1);

  const getTouchPoint = useCallback((touch: Touch): TouchPoint => ({
    x: touch.clientX,
    y: touch.clientY,
    time: Date.now(),
  }), []);

  const getDistance = useCallback((touch1: TouchPoint, touch2: TouchPoint): number => {
    const dx = touch1.x - touch2.x;
    const dy = touch1.y - touch2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return;

    const touches = Array.from(e.touches).map(getTouchPoint);
    
    if (touches.length === 1) {
      startTouch.current = touches[0];
      isPinching.current = false;
      
      // Check for double tap
      const now = Date.now();
      if (now - lastTap.current < doubleTapDelay) {
        onDoubleTap?.();
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    } else if (touches.length === 2) {
      startTouches.current = touches;
      isPinching.current = true;
      initialPinchDistance.current = getDistance(touches[0], touches[1]);
      onPinchStart?.(currentScale.current);
    }
  }, [disabled, getTouchPoint, getDistance, onDoubleTap, onPinchStart, doubleTapDelay]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled) return;

    const touches = Array.from(e.touches).map(getTouchPoint);

    if (isPinching.current && touches.length === 2) {
      const currentDistance = getDistance(touches[0], touches[1]);
      const scale = currentDistance / initialPinchDistance.current;
      
      if (Math.abs(scale - currentScale.current) > pinchThreshold) {
        currentScale.current = scale;
        onPinchMove?.(scale);
      }
    }
  }, [disabled, getTouchPoint, getDistance, onPinchMove, pinchThreshold]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (disabled) return;

    if (isPinching.current) {
      isPinching.current = false;
      onPinchEnd?.(currentScale.current);
      currentScale.current = 1;
      return;
    }

    if (!startTouch.current) return;

    const touches = Array.from(e.changedTouches).map(getTouchPoint);
    const endTouch = touches[0];
    
    const deltaX = endTouch.x - startTouch.current.x;
    const deltaY = endTouch.y - startTouch.current.y;
    const deltaTime = endTouch.time - startTouch.current.time;
    
    // Only process swipes if they're fast enough (< 300ms)
    if (deltaTime > 300) {
      startTouch.current = null;
      return;
    }

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Check if the swipe is strong enough
    if (absDeltaX > swipeThreshold || absDeltaY > swipeThreshold) {
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    }

    startTouch.current = null;
  }, [disabled, getTouchPoint, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onPinchEnd, swipeThreshold]);

  const attachToElement = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    const options = { passive: false };
    
    element.addEventListener('touchstart', handleTouchStart, options);
    element.addEventListener('touchmove', handleTouchMove, options);
    element.addEventListener('touchend', handleTouchEnd, options);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Auto-attach to ref
  const ref = useRef<HTMLElement>(null);
  
  useEffect(() => {
    return attachToElement(ref.current);
  }, [attachToElement]);

  return {
    ref,
    attachToElement,
    isGesturing: isPinching.current,
  };
}

// Hook for scroll-based touch gestures
export function useScrollTouchGestures(
  containerRef: React.RefObject<HTMLElement>,
  options: {
    onPageUp?: () => void;
    onPageDown?: () => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    disabled?: boolean;
  } = {}
) {
  const {
    onPageUp,
    onPageDown,
    onZoomIn,
    onZoomOut,
    disabled = false,
  } = options;

  const touchGestures = useTouchGestures({
    onSwipeUp: () => {
      if (containerRef.current) {
        const scrollAmount = containerRef.current.clientHeight * 0.8;
        containerRef.current.scrollBy({ top: scrollAmount, behavior: 'smooth' });
      }
      onPageDown?.();
    },
    onSwipeDown: () => {
      if (containerRef.current) {
        const scrollAmount = containerRef.current.clientHeight * 0.8;
        containerRef.current.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
      }
      onPageUp?.();
    },
    onPinchMove: (scale) => {
      if (scale > 1.2) {
        onZoomIn?.();
      } else if (scale < 0.8) {
        onZoomOut?.();
      }
    },
    onDoubleTap: () => {
      // Double tap to zoom
      onZoomIn?.();
    },
    disabled,
  });

  useEffect(() => {
    if (containerRef.current) {
      return touchGestures.attachToElement(containerRef.current);
    }
  }, [touchGestures, containerRef]);

  return touchGestures;
}