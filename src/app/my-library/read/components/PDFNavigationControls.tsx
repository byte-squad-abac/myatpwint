'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  IconButton,
  TextField,
  Typography,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  FirstPage,
  LastPage,
  NavigateBefore,
  NavigateNext,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useTheme } from '@/lib/contexts/ThemeContext';

interface PDFNavigationControlsProps {
  currentPage: number;
  totalPages: number;
  onNavigateToPage: (page: number) => void;
  onNavigateFirst: () => void;
  onNavigateLast: () => void;
  onNavigateNext: () => void;
  onNavigatePrevious: () => void;
  compact?: boolean;
}

export default function PDFNavigationControls({
  currentPage,
  totalPages,
  onNavigateToPage,
  onNavigateFirst,
  onNavigateLast,
  onNavigateNext,
  onNavigatePrevious,
  compact = false,
}: PDFNavigationControlsProps) {
  const { theme } = useTheme();
  const [pageInput, setPageInput] = useState('');
  const [showGoToDialog, setShowGoToDialog] = useState(false);
  const [inputError, setInputError] = useState(false);

  // Update page input when current page changes
  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  // Handle page input change with validation
  const handlePageInputChange = useCallback((value: string) => {
    setPageInput(value);
    
    // Validate input
    const pageNumber = parseInt(value, 10);
    const isValid = !isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages;
    setInputError(!isValid && value !== '');
  }, [totalPages]);

  // Handle page input submit
  const handlePageInputSubmit = useCallback(() => {
    const pageNumber = parseInt(pageInput, 10);
    
    if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > totalPages) {
      setInputError(true);
      return;
    }
    
    setInputError(false);
    onNavigateToPage(pageNumber);
    setShowGoToDialog(false);
  }, [pageInput, totalPages, onNavigateToPage]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl+G to open go-to-page dialog
      if (event.ctrlKey && event.key === 'g') {
        event.preventDefault();
        setShowGoToDialog(true);
        setPageInput(currentPage.toString());
        setInputError(false);
      }
      
      // Escape to close dialog
      if (event.key === 'Escape' && showGoToDialog) {
        setShowGoToDialog(false);
        setInputError(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, showGoToDialog]);

  const iconColor = theme === 'dark' ? '#cccccc' : '#666666';
  const backgroundColor = theme === 'dark' ? '#2d2d2d' : '#ffffff';
  const borderColor = theme === 'dark' ? '#555' : '#e0e0e0';

  if (compact) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5,
          bgcolor: backgroundColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '6px',
          px: 1,
        }}
      >
        <Tooltip title="Previous page (←)">
          <span>
            <IconButton
              onClick={onNavigatePrevious}
              disabled={currentPage <= 1}
              size="small"
              sx={{ color: iconColor, p: 0.5 }}
            >
              <NavigateBefore fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        
        <Typography
          variant="caption"
          sx={{
            minWidth: '60px',
            textAlign: 'center',
            fontSize: '12px',
            color: iconColor,
            cursor: 'pointer',
            px: 0.5,
            '&:hover': {
              backgroundColor: theme === 'dark' ? '#444' : '#f5f5f5',
            },
          }}
          onClick={() => setShowGoToDialog(true)}
          title="Click to go to page (Ctrl+G)"
        >
          {currentPage} / {totalPages}
        </Typography>
        
        <Tooltip title="Next page (→)">
          <span>
            <IconButton
              onClick={onNavigateNext}
              disabled={currentPage >= totalPages}
              size="small"
              sx={{ color: iconColor, p: 0.5 }}
            >
              <NavigateNext fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        {/* Go to Page Dialog */}
        <Dialog 
          open={showGoToDialog} 
          onClose={() => setShowGoToDialog(false)}
          PaperProps={{
            sx: {
              bgcolor: backgroundColor,
              minWidth: '300px',
            }
          }}
        >
          <DialogTitle sx={{ color: theme === 'dark' ? '#ffffff' : '#333333' }}>
            Go to Page
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Page Number"
              type="number"
              fullWidth
              variant="outlined"
              value={pageInput}
              onChange={(e) => handlePageInputChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handlePageInputSubmit();
                }
              }}
              error={inputError}
              helperText={inputError ? `Enter a number between 1 and ${totalPages}` : `Enter page number (1-${totalPages})`}
              inputProps={{
                min: 1,
                max: totalPages,
                step: 1,
              }}
              sx={{
                mt: 1,
                '& .MuiOutlinedInput-root': {
                  color: theme === 'dark' ? '#ffffff' : '#333333',
                  '& fieldset': {
                    borderColor: theme === 'dark' ? '#555' : '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: theme === 'dark' ? '#777' : '#999',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: theme === 'dark' ? '#cccccc' : '#666666',
                },
                '& .MuiFormHelperText-root': {
                  color: inputError ? '#f44336' : (theme === 'dark' ? '#cccccc' : '#666666'),
                },
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setShowGoToDialog(false)}
              sx={{ color: theme === 'dark' ? '#cccccc' : '#666666' }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePageInputSubmit}
              disabled={inputError || !pageInput}
              variant="contained"
              sx={{
                bgcolor: '#2196f3',
                '&:hover': {
                  bgcolor: '#1976d2',
                },
              }}
            >
              Go
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        bgcolor: backgroundColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        px: 1.5,
        py: 0.5,
      }}
    >
      <Tooltip title="First page (Home)">
        <span>
          <IconButton
            onClick={onNavigateFirst}
            disabled={currentPage <= 1}
            size="small"
            sx={{ color: iconColor }}
          >
            <FirstPage />
          </IconButton>
        </span>
      </Tooltip>
      
      <Tooltip title="Previous page (←)">
        <span>
          <IconButton
            onClick={onNavigatePrevious}
            disabled={currentPage <= 1}
            size="small"
            sx={{ color: iconColor }}
          >
            <NavigateBefore />
          </IconButton>
        </span>
      </Tooltip>
      
      <Typography
        variant="body2"
        sx={{
          minWidth: '80px',
          textAlign: 'center',
          fontSize: '14px',
          color: iconColor,
          cursor: 'pointer',
          px: 1,
          py: 0.5,
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: theme === 'dark' ? '#444' : '#f5f5f5',
          },
        }}
        onClick={() => setShowGoToDialog(true)}
        title="Click to go to page (Ctrl+G)"
      >
        {currentPage} of {totalPages}
      </Typography>
      
      <Tooltip title="Next page (→)">
        <span>
          <IconButton
            onClick={onNavigateNext}
            disabled={currentPage >= totalPages}
            size="small"
            sx={{ color: iconColor }}
          >
            <NavigateNext />
          </IconButton>
        </span>
      </Tooltip>
      
      <Tooltip title="Last page (End)">
        <span>
          <IconButton
            onClick={onNavigateLast}
            disabled={currentPage >= totalPages}
            size="small"
            sx={{ color: iconColor }}
          >
            <LastPage />
          </IconButton>
        </span>
      </Tooltip>

      {/* Go to Page Dialog */}
      <Dialog 
        open={showGoToDialog} 
        onClose={() => setShowGoToDialog(false)}
        PaperProps={{
          sx: {
            bgcolor: backgroundColor,
            minWidth: '350px',
          }
        }}
      >
        <DialogTitle sx={{ color: theme === 'dark' ? '#ffffff' : '#333333' }}>
          Go to Page
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Page Number"
            type="number"
            fullWidth
            variant="outlined"
            value={pageInput}
            onChange={(e) => handlePageInputChange(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handlePageInputSubmit();
              }
            }}
            error={inputError}
            helperText={inputError ? `Enter a number between 1 and ${totalPages}` : `Enter page number (1-${totalPages})`}
            inputProps={{
              min: 1,
              max: totalPages,
              step: 1,
            }}
            sx={{
              mt: 1,
              '& .MuiOutlinedInput-root': {
                color: theme === 'dark' ? '#ffffff' : '#333333',
                '& fieldset': {
                  borderColor: theme === 'dark' ? '#555' : '#e0e0e0',
                },
                '&:hover fieldset': {
                  borderColor: theme === 'dark' ? '#777' : '#999',
                },
              },
              '& .MuiInputLabel-root': {
                color: theme === 'dark' ? '#cccccc' : '#666666',
              },
              '& .MuiFormHelperText-root': {
                color: inputError ? '#f44336' : (theme === 'dark' ? '#cccccc' : '#666666'),
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowGoToDialog(false)}
            sx={{ color: theme === 'dark' ? '#cccccc' : '#666666' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handlePageInputSubmit}
            disabled={inputError || !pageInput}
            variant="contained"
            sx={{
              bgcolor: '#2196f3',
              '&:hover': {
                bgcolor: '#1976d2',
              },
            }}
          >
            Go
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}