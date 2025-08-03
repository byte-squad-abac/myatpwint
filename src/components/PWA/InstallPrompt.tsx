'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Snackbar,
  Alert,
  IconButton
} from '@mui/material';
import {
  GetApp as InstallIcon,
  Close as CloseIcon,
  Smartphone as PhoneIcon,
  Computer as DesktopIcon
} from '@mui/icons-material';
import { usePWA } from './PWAProvider';

export default function InstallPrompt() {
  const { installPrompt, showInstallPrompt, isInstalled } = usePWA();
  const [showDialog, setShowDialog] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed
    const isDismissed = localStorage.getItem('pwa-install-dismissed') === 'true';
    setDismissed(isDismissed);

    // Show install prompt after user has spent some time on site
    if (installPrompt && !isInstalled && !isDismissed) {
      const timer = setTimeout(() => {
        setShowSnackbar(true);
      }, 10000); // Show after 10 seconds

      return () => clearTimeout(timer);
    }
  }, [installPrompt, isInstalled]);

  const handleInstall = async () => {
    setShowDialog(false);
    setShowSnackbar(false);
    await showInstallPrompt();
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowDialog(false);
    setShowSnackbar(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleLearnMore = () => {
    setShowSnackbar(false);
    setShowDialog(true);
  };

  if (isInstalled || !installPrompt || dismissed) return null;

  return (
    <>
      {/* Snackbar notification */}
      <Snackbar
        open={showSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: 80 }}
      >
        <Alert
          severity="info"
          sx={{ width: '100%', alignItems: 'center' }}
          icon={<InstallIcon />}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                color="inherit"
                size="small"
                onClick={handleLearnMore}
              >
                Learn More
              </Button>
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                onClick={handleInstall}
              >
                Install
              </Button>
              <IconButton
                size="small"
                color="inherit"
                onClick={handleDismiss}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          }
        >
          Install Myat Pwint for a better reading experience!
        </Alert>
      </Snackbar>

      {/* Detailed install dialog */}
      <Dialog
        open={showDialog}
        onClose={handleDismiss}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InstallIcon color="primary" />
            Install Myat Pwint App
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Get the best reading experience by installing our app directly on your device.
          </Typography>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <PhoneIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Mobile Benefits
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Read books offline<br/>
                  • App-like experience<br/>
                  • Push notifications<br/>
                  • Faster loading
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <DesktopIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Desktop Benefits
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • No browser clutter<br/>
                  • Quick access from dock<br/>
                  • Better performance<br/>
                  • Background updates
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Privacy:</strong> This app works entirely on your device. 
              Your reading data stays private and secure.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleDismiss} color="inherit">
            Maybe Later
          </Button>
          <Button
            onClick={handleInstall}
            variant="contained"
            startIcon={<InstallIcon />}
          >
            Install Now
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}