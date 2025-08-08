'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { analyticsService } from '@/lib/services/analytics.service';

export interface AnalyticsContextType {
  isEnabled: boolean;
  sessionId: string;
  userId?: string;
  trackEvent: (eventName: string, properties?: Record<string, any>) => Promise<void>;
  trackPageView: (pageName: string, properties?: Record<string, any>) => Promise<void>;
  setUserProperties: (properties: Record<string, any>) => void;
  enableAnalytics: () => void;
  disableAnalytics: () => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export interface AnalyticsProviderProps {
  children: ReactNode;
  enabledByDefault?: boolean;
  respectDoNotTrack?: boolean;
  sessionTimeout?: number; // in minutes
}

export function AnalyticsProvider({
  children,
  enabledByDefault = true,
  respectDoNotTrack = true,
  sessionTimeout = 30,
}: AnalyticsProviderProps) {
  const session = useSession();
  const [isEnabled, setIsEnabled] = useState(enabledByDefault);
  const [sessionId, setSessionId] = useState<string>('');
  const [userProperties, setUserPropertiesState] = useState<Record<string, any>>({});

  // Generate session ID
  useEffect(() => {
    const generateSessionId = () => {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      return `sess_${timestamp}_${random}`;
    };

    // Check for existing session ID in sessionStorage
    const existingSessionId = sessionStorage.getItem('analytics_session_id');
    const sessionStartTime = sessionStorage.getItem('analytics_session_start');
    
    if (existingSessionId && sessionStartTime) {
      const startTime = parseInt(sessionStartTime);
      const now = Date.now();
      const elapsedMinutes = (now - startTime) / (1000 * 60);
      
      if (elapsedMinutes < sessionTimeout) {
        // Use existing session
        setSessionId(existingSessionId);
      } else {
        // Start new session
        const newSessionId = generateSessionId();
        setSessionId(newSessionId);
        sessionStorage.setItem('analytics_session_id', newSessionId);
        sessionStorage.setItem('analytics_session_start', now.toString());
      }
    } else {
      // Start new session
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);
      sessionStorage.setItem('analytics_session_id', newSessionId);
      sessionStorage.setItem('analytics_session_start', Date.now().toString());
    }
  }, [sessionTimeout]);

  // Check Do Not Track preference
  useEffect(() => {
    if (respectDoNotTrack && typeof navigator !== 'undefined') {
      const doNotTrack = navigator.doNotTrack === '1' || 
                        (navigator as any).msDoNotTrack === '1' ||
                        (window as any).doNotTrack === '1';
      
      if (doNotTrack) {
        setIsEnabled(false);
      }
    }
  }, [respectDoNotTrack]);

  // Check user's analytics preference from localStorage
  useEffect(() => {
    const savedPreference = localStorage.getItem('analytics_enabled');
    if (savedPreference !== null) {
      setIsEnabled(savedPreference === 'true');
    }
  }, []);

  // Update user properties when session changes
  useEffect(() => {
    if (session?.user) {
      setUserPropertiesState(prev => ({
        ...prev,
        userId: session.user.id,
        userEmail: session.user.email,
        signedIn: true,
        sessionStart: new Date().toISOString(),
      }));
    } else {
      setUserPropertiesState(prev => ({
        ...prev,
        userId: undefined,
        userEmail: undefined,
        signedIn: false,
      }));
    }
  }, [session]);

  const trackEvent = async (eventName: string, properties: Record<string, any> = {}) => {
    if (!isEnabled) return;

    try {
      await analyticsService.trackInteraction({
        user_id: session?.user?.id,
        interaction_type: 'view', // Generic fallback
        metadata: {
          event_name: eventName,
          session_id: sessionId,
          ...userProperties,
          ...properties,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  };

  const trackPageView = async (pageName: string, properties: Record<string, any> = {}) => {
    if (!isEnabled) return;

    try {
      await analyticsService.trackInteraction({
        user_id: session?.user?.id,
        interaction_type: 'view',
        metadata: {
          event_name: 'page_view',
          page_name: pageName,
          page_url: typeof window !== 'undefined' ? window.location.href : '',
          page_title: typeof document !== 'undefined' ? document.title : '',
          session_id: sessionId,
          ...userProperties,
          ...properties,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  };

  const setUserProperties = (properties: Record<string, any>) => {
    setUserPropertiesState(prev => ({ ...prev, ...properties }));
  };

  const enableAnalytics = () => {
    setIsEnabled(true);
    localStorage.setItem('analytics_enabled', 'true');
  };

  const disableAnalytics = () => {
    setIsEnabled(false);
    localStorage.setItem('analytics_enabled', 'false');
  };

  // Auto-track page views
  useEffect(() => {
    if (isEnabled && typeof window !== 'undefined') {
      const handlePageChange = () => {
        const pageName = window.location.pathname;
        trackPageView(pageName);
      };

      // Track initial page view
      handlePageChange();

      // Listen for navigation changes
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function(...args) {
        originalPushState.apply(history, args);
        setTimeout(handlePageChange, 0);
      };

      history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        setTimeout(handlePageChange, 0);
      };

      window.addEventListener('popstate', handlePageChange);

      return () => {
        history.pushState = originalPushState;
        history.replaceState = originalReplaceState;
        window.removeEventListener('popstate', handlePageChange);
      };
    }
  }, [isEnabled, sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      analyticsService.cleanup();
    };
  }, []);

  const value: AnalyticsContextType = {
    isEnabled,
    sessionId,
    userId: session?.user?.id,
    trackEvent,
    trackPageView,
    setUserProperties,
    enableAnalytics,
    disableAnalytics,
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

// Hook to use analytics context
export function useAnalyticsContext() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalyticsContext must be used within an AnalyticsProvider');
  }
  return context;
}

// Privacy-conscious analytics component
export function AnalyticsConsent() {
  const { isEnabled, enableAnalytics, disableAnalytics } = useAnalyticsContext();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Show banner if user hasn't made a choice yet
    const hasChosenAnalytics = localStorage.getItem('analytics_enabled');
    if (hasChosenAnalytics === null) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    enableAnalytics();
    setShowBanner(false);
  };

  const handleDecline = () => {
    disableAnalytics();
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#f5f5f5',
        padding: '16px',
        borderTop: '1px solid #ddd',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}
    >
      <div style={{ flex: 1, minWidth: '300px' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
          We use analytics to improve our book recommendations. 
          This data is anonymized and helps us provide better suggestions.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleDecline}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Decline
        </button>
        <button
          onClick={handleAccept}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}

// HOC for automatic page tracking
export function withPageTracking<P extends object>(
  Component: React.ComponentType<P>,
  pageName: string,
  additionalProperties?: Record<string, any>
) {
  return function TrackedComponent(props: P) {
    const { trackPageView } = useAnalyticsContext();

    useEffect(() => {
      trackPageView(pageName, additionalProperties);
    }, [trackPageView]);

    return <Component {...props} />;
  };
}