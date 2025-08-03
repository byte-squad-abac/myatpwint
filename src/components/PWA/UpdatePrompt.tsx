'use client';

import React from 'react';
import {
  Snackbar,
  Alert,
  Button,
  Box,
  Typography
} from '@mui/material';
import {
  SystemUpdate as UpdateIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { usePWA } from './PWAProvider';

export default function UpdatePrompt() {
  const { hasUpdate, updateApp } = usePWA();

  const handleUpdate = () => {
    updateApp();
  };

  const handleDismiss = () => {
    // For now, just hide the update prompt
    // In a real app, you might want to store this preference
  };

  if (!hasUpdate) return null;

  return (
    <Snackbar
      open={hasUpdate}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ bottom: 20 }}
    >
      <Alert
        severity="info"
        sx={{ 
          width: '100%', 
          alignItems: 'center',
          backgroundColor: '#2196f3',
          color: 'white',
          '& .MuiAlert-icon': {
            color: 'white'
          }
        }}
        icon={<UpdateIcon />}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              color="inherit"
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleUpdate}
              sx={{ 
                borderColor: 'white',
                color: 'white',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Update
            </Button>
            <Button
              color="inherit"
              size="small"
              onClick={handleDismiss}
              sx={{ 
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Later
            </Button>
          </Box>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Update Available
          </Typography>
          <Typography variant="caption">
            A new version of the app is ready to install
          </Typography>
        </Box>
      </Alert>
    </Snackbar>
  );
}