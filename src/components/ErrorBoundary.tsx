/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */

'use client';

import React, { Component, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';
import { ErrorHandler, AppError } from '@/lib/utils/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: AppError;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const appError = ErrorHandler.handle(error, 'ErrorBoundary');
    return {
      hasError: true,
      error: appError
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const appError = ErrorHandler.handle(error, 'ErrorBoundary');
    ErrorHandler.log(appError, 'ErrorBoundary');
    
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            p: 4,
          }}
        >
          <Paper
            elevation={2}
            sx={{
              p: 4,
              textAlign: 'center',
              maxWidth: 500,
              borderRadius: 2,
            }}
          >
            <ErrorOutline
              sx={{
                fontSize: 64,
                color: 'error.main',
                mb: 2,
              }}
            />
            
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Something went wrong
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {this.state.error 
                ? ErrorHandler.getUserMessage(this.state.error)
                : 'An unexpected error occurred. Please try again.'}
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={this.handleReset}
              sx={{ mt: 2 }}
            >
              Try Again
            </Button>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  backgroundColor: 'grey.100',
                  borderRadius: 1,
                  textAlign: 'left',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Error Type: {this.state.error.type}
                </Typography>
                <br />
                <Typography variant="caption" color="text.secondary">
                  Message: {this.state.error.message}
                </Typography>
                {this.state.error.code && (
                  <>
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      Code: {this.state.error.code}
                    </Typography>
                  </>
                )}
              </Box>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;