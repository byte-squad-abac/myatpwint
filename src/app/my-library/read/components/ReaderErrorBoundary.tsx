'use client';

import React from 'react';
import { Box, Alert, Button, Typography } from '@mui/material';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface ReaderErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ReaderErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export class ReaderErrorBoundary extends React.Component<
  ReaderErrorBoundaryProps,
  ReaderErrorBoundaryState
> {
  constructor(props: ReaderErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ReaderErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console for debugging
    console.error('Reader Error Boundary caught an error:', error, errorInfo);
    
    // Here you could also send the error to an error reporting service
    // Example: errorReportingService.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent 
            error={this.state.error || new Error('Unknown error')} 
            retry={this.handleRetry} 
          />
        );
      }

      // Default error UI
      return (
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
          }}
        >
          <Box
            sx={{
              maxWidth: 500,
              textAlign: 'center',
            }}
          >
            <AlertTriangle size={48} color="#f44336" style={{ marginBottom: '16px' }} />
            
            <Typography variant="h5" gutterBottom>
              Reader Error
            </Typography>
            
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body1" gutterBottom>
                {this.state.error?.message || 'An unexpected error occurred while loading the document.'}
              </Typography>
              
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details style={{ marginTop: '8px' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                    Error Details (Development)
                  </summary>
                  <Box
                    component="pre"
                    sx={{
                      mt: 1,
                      p: 1,
                      bgcolor: '#f5f5f5',
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      overflow: 'auto',
                      maxHeight: 200,
                    }}
                  >
                    {this.state.error?.stack}
                    {this.state.errorInfo?.componentStack}
                  </Box>
                </details>
              )}
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<RefreshCw size={16} />}
                onClick={this.handleRetry}
              >
                Try Again
              </Button>
              
              <Button
                variant="outlined"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              If this problem persists, please try refreshing the page or contact support.
            </Typography>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Reader error:', error, errorInfo);
    
    // You could also dispatch to an error reporting service here
    // errorReportingService.captureException(error, { extra: errorInfo });
  }, []);

  return { handleError };
}

// Custom error classes for different types of reader errors
export class PDFLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PDFLoadError';
  }
}

export class EPUBLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EPUBLoadError';
  }
}

export class TXTLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TXTLoadError';
  }
}

// Type guards for error handling
export function isPDFLoadError(error: Error): error is PDFLoadError {
  return error.name === 'PDFLoadError';
}

export function isEPUBLoadError(error: Error): error is EPUBLoadError {
  return error.name === 'EPUBLoadError';
}

export function isTXTLoadError(error: Error): error is TXTLoadError {
  return error.name === 'TXTLoadError';
}