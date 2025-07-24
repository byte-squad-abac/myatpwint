'use client';

import React from 'react';
import {
  Box,
  Chip,
  Tooltip,
  IconButton,
  Typography,
} from '@mui/material';
import {
  CloudOff as OfflineIcon,
  Cloud as OnlineIcon,
  CloudDownload as DownloadIcon,
  Delete as DeleteIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { useOnlineStatus, useOfflineBooks } from '@/lib/hooks/useOfflineBooks';

interface OfflineStatusIndicatorProps {
  bookId?: string;
  compact?: boolean;
  showStorageInfo?: boolean;
}

/**
 * Offline Status Indicator Component
 * 
 * Shows the current online/offline status and provides
 * controls for offline book management.
 * 
 * Features:
 * - Online/offline status display
 * - Download/remove offline books
 * - Storage usage information
 * - Responsive design
 */
export default function OfflineStatusIndicator({
  bookId,
  compact = false,
  showStorageInfo = false,
}: OfflineStatusIndicatorProps) {
  const isOnline = useOnlineStatus();
  const {
    isBookOffline,
    removeOfflineBook,
    getStorageUsage,
    isLoading,
  } = useOfflineBooks();

  const storageUsage = getStorageUsage();
  const bookIsOffline = bookId ? isBookOffline(bookId) : false;

  // Handle remove offline book
  const handleRemoveOffline = async () => {
    if (!bookId) return;
    await removeOfflineBook(bookId);
  };

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Online/Offline Status */}
        <Tooltip title={isOnline ? 'Online' : 'Offline'}>
          <Chip
            icon={isOnline ? <OnlineIcon /> : <OfflineIcon />}
            label={isOnline ? 'Online' : 'Offline'}
            size="small"
            color={isOnline ? 'success' : 'warning'}
            variant="outlined"
          />
        </Tooltip>

        {/* Book Offline Status */}
        {bookId && (
          <Tooltip title={bookIsOffline ? 'Available offline' : 'Online only'}>
            <Chip
              icon={bookIsOffline ? <StorageIcon /> : <DownloadIcon />}
              label={bookIsOffline ? 'Offline' : 'Online'}
              size="small"
              color={bookIsOffline ? 'primary' : 'default'}
              variant="outlined"
            />
          </Tooltip>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'background.paper' }}>
      {/* Network Status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {isOnline ? (
          <OnlineIcon sx={{ color: 'success.main' }} />
        ) : (
          <OfflineIcon sx={{ color: 'warning.main' }} />
        )}
        <Typography variant="body2" color="textSecondary">
          {isOnline ? 'Connected to internet' : 'No internet connection'}
        </Typography>
      </Box>

      {/* Book Offline Status */}
      {bookId && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <StorageIcon sx={{ color: bookIsOffline ? 'primary.main' : 'text.disabled' }} />
            <Typography variant="body2">
              {bookIsOffline ? 'Available offline' : 'Online only'}
            </Typography>
          </Box>

          {/* Offline Controls */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {bookIsOffline ? (
              <Tooltip title="Remove from offline storage">
                <IconButton
                  size="small"
                  onClick={handleRemoveOffline}
                  disabled={isLoading}
                  sx={{ color: 'error.main' }}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Download for offline reading (feature available in BookCard)">
                <IconButton
                  size="small"
                  disabled={true}
                  sx={{ color: 'text.disabled' }}
                >
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      )}

      {/* Storage Information */}
      {showStorageInfo && storageUsage && (
        <Box sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="textSecondary" display="block">
            Storage: {storageUsage.used} / {storageUsage.quota} ({storageUsage.percentage}% used)
          </Typography>
          <Box
            sx={{
              width: '100%',
              height: 4,
              bgcolor: 'grey.200',
              borderRadius: 2,
              mt: 0.5,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                width: `${storageUsage.percentage}%`,
                height: '100%',
                bgcolor: storageUsage.percentage > 80 ? 'warning.main' : 'primary.main',
                transition: 'width 0.3s ease',
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}

// Simple hook to get offline status for use in other components
export function useOfflineIndicator(bookId?: string) {
  const isOnline = useOnlineStatus();
  const { isBookOffline } = useOfflineBooks();
  
  return {
    isOnline,
    isBookOffline: bookId ? isBookOffline(bookId) : false,
    canReadOffline: !isOnline && bookId ? isBookOffline(bookId) : true,
  };
}