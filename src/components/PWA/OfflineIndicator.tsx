'use client';

import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  Box,
  Typography
} from '@mui/material';
import {
  WifiOff as OfflineIcon,
  Wifi as OnlineIcon
} from '@mui/icons-material';
import { usePWA } from './PWAProvider';

export default function OfflineIndicator() {
  const { isOffline } = usePWA();
  const [mounted, setMounted] = useState(false);
  const [showOnlineMessage, setShowOnlineMessage] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (isOffline && !wasOffline) {
      setWasOffline(true);
    } else if (!isOffline && wasOffline) {
      setShowOnlineMessage(true);
      setWasOffline(false);
      // Hide online message after 3 seconds
      setTimeout(() => setShowOnlineMessage(false), 3000);
    }
  }, [isOffline, wasOffline, mounted]);

  if (!mounted) {
    return null;
  }

  return (
    <>
      {/* Offline notification */}
      <Snackbar
        open={isOffline}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ 
          top: 80, // Below the header
          zIndex: 1400 
        }}
      >
        <Alert
          severity="warning"
          sx={{ 
            width: '100%', 
            alignItems: 'center',
            backgroundColor: '#ff9800',
            color: 'white'
          }}
          icon={<OfflineIcon sx={{ color: 'white' }} />}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              You&apos;re offline
            </Typography>
            <Typography variant="caption">
              You can still read downloaded books and browse cached content
            </Typography>
          </Box>
        </Alert>
      </Snackbar>

      {/* Back online notification */}
      <Snackbar
        open={showOnlineMessage}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ 
          top: 80,
          zIndex: 1400 
        }}
        onClose={() => setShowOnlineMessage(false)}
      >
        <Alert
          severity="success"
          sx={{ 
            width: '100%', 
            alignItems: 'center',
            backgroundColor: '#4caf50',
            color: 'white'
          }}
          icon={<OnlineIcon sx={{ color: 'white' }} />}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            You&apos;re back online!
          </Typography>
        </Alert>
      </Snackbar>
    </>
  );
}