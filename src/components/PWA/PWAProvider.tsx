'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import InstallPrompt from './InstallPrompt';
import OfflineIndicator from './OfflineIndicator';
import UpdatePrompt from './UpdatePrompt';

interface PWAContextType {
  isInstalled: boolean;
  isOffline: boolean;
  hasUpdate: boolean;
  installPrompt: any;
  showInstallPrompt: () => void;
  updateApp: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if app is installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isNavigatorStandalone = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isNavigatorStandalone);
    };

    // Check online/offline status
    const updateOnlineStatus = () => {
      setIsOffline(!navigator.onLine);
    };

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      console.log('PWA install prompt available');
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      console.log('PWA installed successfully');
    };

    // Service worker update handling
    const handleSWUpdate = () => {
      setHasUpdate(true);
      console.log('Service worker update available');
    };

    checkInstalled();
    updateOnlineStatus();

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Register service worker update handler
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
          handleSWUpdate();
        }
      });

      // Register service worker manually if not already registered
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const showInstallPrompt = async () => {
    if (!installPrompt) return;
    
    const result = await installPrompt.prompt();
    console.log('Install prompt result:', result);
    
    if (result.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const updateApp = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.controller?.postMessage({
        type: 'SKIP_WAITING'
      });
      window.location.reload();
    }
  };

  const value = {
    isInstalled,
    isOffline,
    hasUpdate,
    installPrompt,
    showInstallPrompt,
    updateApp
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
      <InstallPrompt />
      <OfflineIndicator />
      <UpdatePrompt />
    </PWAContext.Provider>
  );
}

export function usePWA() {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within PWAProvider');
  }
  return context;
}