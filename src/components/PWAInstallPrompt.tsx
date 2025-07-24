'use client';

import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  IconButton,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  GetApp as InstallIcon,
  Close as CloseIcon,
  PhoneIphone as MobileIcon,
  Computer as DesktopIcon,
} from '@mui/icons-material';

// TypeScript interface for the install prompt event
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Props interface for the component
interface PWAInstallPromptProps {
  // Optional props to customize the component
  autoShow?: boolean;
  showInHeader?: boolean;
  customTrigger?: React.ReactNode;
}

/**
 * PWA Install Prompt Component
 * 
 * This component handles the PWA installation flow:
 * 1. Listens for the 'beforeinstallprompt' event
 * 2. Shows a custom install dialog
 * 3. Handles the installation process
 * 4. Provides feedback to the user
 * 
 * References:
 * - https://web.dev/customize-install/
 * - https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
 */
export default function PWAInstallPrompt({ 
  autoShow = true, 
  showInHeader = false,
  customTrigger 
}: PWAInstallPromptProps) {
  // State management for the install prompt
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Responsive design hooks
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Check if PWA is already installed
  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    
    if (isInStandaloneMode || isIOSStandalone) {
      setIsInstalled(true);
    }
  }, []);

  // Listen for the beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] beforeinstallprompt event fired');
      
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Save the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show our custom install prompt if autoShow is enabled
      if (autoShow && !isInstalled) {
        // Add a small delay to ensure the page is fully loaded
        setTimeout(() => setShowInstallDialog(true), 2000);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('[PWA] App was installed');
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowSuccessMessage(true);
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [autoShow, isInstalled]);

  // Handle the install button click
  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.warn('[PWA] No deferred prompt available');
      setShowErrorMessage(true);
      return;
    }

    try {
      setIsInstalling(true);
      
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for the user to respond
      const choiceResult = await deferredPrompt.userChoice;
      
      console.log('[PWA] User choice:', choiceResult.outcome);
      
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
        setShowInstallDialog(false);
        // Success message will be shown when 'appinstalled' event fires
      } else {
        console.log('[PWA] User dismissed the install prompt');
        setShowInstallDialog(false);
      }
      
      // Clear the deferred prompt
      setDeferredPrompt(null);
      
    } catch (error) {
      console.error('[PWA] Error during installation:', error);
      setShowErrorMessage(true);
    } finally {
      setIsInstalling(false);
    }
  };

  // Handle dialog close
  const handleCloseDialog = () => {
    setShowInstallDialog(false);
  };

  // Don't render if already installed or no prompt available
  if (isInstalled) {
    return null;
  }

  // Custom trigger button (for header or other locations)
  if (customTrigger) {
    return (
      <>
        <div onClick={() => setShowInstallDialog(true)}>
          {customTrigger}
        </div>
        {renderInstallDialog()}
      </>
    );
  }

  // Header install button
  if (showInHeader && deferredPrompt) {
    return (
      <>
        <Button
          startIcon={<InstallIcon />}
          onClick={() => setShowInstallDialog(true)}
          sx={{
            color: '#FBDB93',
            borderColor: '#FBDB93',
            '&:hover': {
              borderColor: '#FBDB93',
              backgroundColor: 'rgba(251, 219, 147, 0.1)',
            },
          }}
          variant="outlined"
          size="small"
        >
          Install App
        </Button>
        {renderInstallDialog()}
      </>
    );
  }

  // Main install dialog
  function renderInstallDialog() {
    return (
      <>
        {/* Install Dialog */}
        <Dialog
          open={showInstallDialog}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              background: 'linear-gradient(135deg, #641B2E 0%, #8B2E4B 100%)',
              color: '#FBDB93',
            },
          }}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isMobile ? <MobileIcon /> : <DesktopIcon />}
              <Typography variant="h6" component="span">
                Install Myat Pwint App
              </Typography>
            </Box>
            <IconButton onClick={handleCloseDialog} sx={{ color: '#FBDB93' }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Install Myat Pwint Publishing House for a better reading experience:
            </Typography>
            
            <Box component="ul" sx={{ pl: 2, mb: 2 }}>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                📚 Read your books offline
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                ⚡ Faster loading and performance
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                🏠 Quick access from your home screen
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                🔔 Get notified about new releases
              </Typography>
            </Box>
            
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              The app will work just like the website but with enhanced features and offline capability.
            </Typography>
          </DialogContent>
          
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button 
              onClick={handleCloseDialog}
              sx={{ color: '#FBDB93' }}
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleInstallClick}
              variant="contained"
              disabled={isInstalling || !deferredPrompt}
              startIcon={<InstallIcon />}
              sx={{
                backgroundColor: '#FBDB93',
                color: '#641B2E',
                '&:hover': {
                  backgroundColor: '#F5D186',
                },
                '&:disabled': {
                  backgroundColor: 'rgba(251, 219, 147, 0.3)',
                  color: 'rgba(100, 27, 46, 0.5)',
                },
              }}
            >
              {isInstalling ? 'Installing...' : 'Install App'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Success Message */}
        <Snackbar
          open={showSuccessMessage}
          autoHideDuration={5000}
          onClose={() => setShowSuccessMessage(false)}
        >
          <Alert 
            onClose={() => setShowSuccessMessage(false)} 
            severity="success"
            sx={{ width: '100%' }}
          >
            Myat Pwint app installed successfully! You can now access it from your home screen.
          </Alert>
        </Snackbar>

        {/* Error Message */}
        <Snackbar
          open={showErrorMessage}
          autoHideDuration={5000}
          onClose={() => setShowErrorMessage(false)}
        >
          <Alert 
            onClose={() => setShowErrorMessage(false)} 
            severity="error"
            sx={{ width: '100%' }}
          >
            Unable to install the app. Please try again or install manually from your browser menu.
          </Alert>
        </Snackbar>
      </>
    );
  }

  // Default: don't render anything if conditions aren't met
  return <>{renderInstallDialog()}</>;
}

// Hook for using PWA install functionality in other components
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    
    if (isInStandaloneMode || isIOSStandalone) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = () => {
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return { canInstall, isInstalled };
}