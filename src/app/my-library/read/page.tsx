'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@supabase/auth-helpers-react';
import {
  Box,
  IconButton,
  Typography,
  AppBar,
  Toolbar,
  LinearProgress,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack,
  Fullscreen,
  FullscreenExit,
  MenuBook,
  TextFields,
} from '@mui/icons-material';

import dynamic from 'next/dynamic';
import { bookStorage } from '@/lib/storage';
import { ThemeProvider, useTheme } from '@/lib/contexts/ThemeContext';
import { DarkMode, LightMode } from '@mui/icons-material';

const PDFReader = dynamic(() => import('./components/PDFReader'), {
  ssr: false,
  loading: () => <CircularProgress />
});

const EPUBReader = dynamic(() => import('./components/EPUBReader'), {
  ssr: false,
  loading: () => <CircularProgress />
});

const TXTReader = dynamic(() => import('./components/TXTReader'), {
  ssr: false,
  loading: () => <CircularProgress />
});

interface LibraryBook {
  id: string;
  name: string;
  fileName: string;
  file: File | null;
  size: string;
  uploadDate: string;
}

interface ReaderState {
  currentPage: number;
  totalPages: number;
  progress: number;
  isLoading: boolean;
  error: string | null;
}


function BookReaderContent() {
  const { theme } = useTheme();
  const router = useRouter();
  const session = useSession();
  const searchParams = useSearchParams();
  const bookId = searchParams.get('id');
  
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  
  const [book, setBook] = useState<LibraryBook | null>(null);
  const [fileData, setFileData] = useState<ArrayBuffer | string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'epub' | 'txt' | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [readerState, setReaderState] = useState<ReaderState>({
    currentPage: 1,
    totalPages: 1,
    progress: 0,
    isLoading: true,
    error: null,
  });

  // Load book from IndexedDB
  useEffect(() => {
    if (!bookId) {
      setReaderState(prev => ({ ...prev, error: 'No book selected', isLoading: false }));
      return;
    }

    const loadBook = async () => {
      try {
        const storedBook = await bookStorage.getBook(bookId);
        
        if (!storedBook) {
          setReaderState(prev => ({ ...prev, error: 'Book not found', isLoading: false }));
          return;
        }

        // Create file object from stored data
        const file = new File([storedBook.fileData], storedBook.fileName, { type: storedBook.fileType });
        
        const book: LibraryBook = {
          id: storedBook.id,
          name: storedBook.name,
          fileName: storedBook.fileName,
          file: file,
          size: storedBook.size,
          uploadDate: storedBook.uploadDate,
        };

        setBook(book);
        
        // Load file data
        loadFileData(file, storedBook.fileName);
      } catch (error) {
        console.error('Error loading book from IndexedDB:', error);
        setReaderState(prev => ({ 
          ...prev, 
          error: 'Error loading book from library', 
          isLoading: false 
        }));
      }
    };

    loadBook();
  }, [bookId]);

  const loadFileData = async (file: File, fileName: string) => {
    try {
      const extension = fileName.split('.').pop()?.toLowerCase();
      
      if (extension === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        setFileData(arrayBuffer);
        setFileType('pdf');
      } else if (extension === 'epub') {
        const arrayBuffer = await file.arrayBuffer();
        setFileData(arrayBuffer);
        setFileType('epub');
      } else if (extension === 'txt') {
        const text = await file.text();
        setFileData(text);
        setFileType('txt');
      } else {
        throw new Error('Unsupported file format');
      }
      
      setReaderState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      setReaderState(prev => ({ 
        ...prev, 
        error: 'Error loading file data', 
        isLoading: false 
      }));
    }
  };


  const handleBack = () => {
    router.push('/my-library');
  };

  const handleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const handleReaderStateChange = (newState: Partial<ReaderState>) => {
    setReaderState(prev => ({ ...prev, ...newState }));
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 50));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  // Handle fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle session loading and redirect
  useEffect(() => {
    // Give some time for session to load
    const timer = setTimeout(() => {
      setIsSessionLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isSessionLoading && !session) {
      router.push('/login');
    }
  }, [session, router, isSessionLoading]);

  // Show loading while session is loading
  if (isSessionLoading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!session) {
    return null;
  }

  if (readerState.error) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static" sx={{ bgcolor: '#641B2E' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={handleBack}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Error Loading Book
            </Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
          <Alert severity="error" sx={{ maxWidth: 600 }}>
            {readerState.error}
          </Alert>
        </Box>
      </Box>
    );
  }

  if (readerState.isLoading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static" sx={{ bgcolor: '#641B2E' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={handleBack}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Loading...
            </Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      bgcolor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999
    }}>
      {/* Top Navigation Bar - Exact Book Fusion Style */}
      <Box 
        sx={{ 
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          bgcolor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
          borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton 
            onClick={handleBack}
            sx={{ color: theme === 'dark' ? '#cccccc' : '#666666', p: 1 }}
          >
            <ArrowBack sx={{ fontSize: 24 }} />
          </IconButton>
          
          <IconButton 
            sx={{ color: theme === 'dark' ? '#cccccc' : '#666666', p: 1 }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </IconButton>
        </Box>
        
        <Typography 
          variant="h6" 
          sx={{ 
            fontSize: '18px',
            fontWeight: 500,
            color: theme === 'dark' ? '#ffffff' : '#333333'
          }}
        >
          {book?.name || 'Reading Book'}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ThemeToggleButton />
          
          <IconButton 
            sx={{ color: theme === 'dark' ? '#cccccc' : '#666666', p: 1 }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, border: theme === 'dark' ? '1px solid #555' : '1px solid #e0e0e0', borderRadius: '4px', px: 1 }}>
            <IconButton 
              onClick={handleZoomOut}
              sx={{ color: theme === 'dark' ? '#cccccc' : '#666666', p: 0.5, minWidth: 'auto' }}
              disabled={zoomLevel <= 50}
              size="small"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13H5v-2h14v2z"/>
              </svg>
            </IconButton>
            
            <Typography 
              variant="caption" 
              sx={{ 
                minWidth: '45px', 
                textAlign: 'center', 
                fontSize: '12px',
                color: theme === 'dark' ? '#cccccc' : '#666666',
                fontWeight: 500
              }}
            >
              {zoomLevel}%
            </Typography>
            
            <IconButton 
              onClick={handleZoomIn}
              sx={{ color: theme === 'dark' ? '#cccccc' : '#666666', p: 0.5, minWidth: 'auto' }}
              disabled={zoomLevel >= 200}
              size="small"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </IconButton>
          </Box>
          
          <IconButton 
            onClick={handleFullscreen}
            sx={{ color: theme === 'dark' ? '#cccccc' : '#666666', p: 1 }}
          >
            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
        </Box>
      </Box>

      {/* Main Reader Content */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {fileType === 'pdf' && fileData && (
          <PDFReader 
            fileData={fileData as ArrayBuffer}
            onStateChange={handleReaderStateChange}
            zoomLevel={zoomLevel}
          />
        )}
        {fileType === 'epub' && fileData && (
          <EPUBReader 
            fileData={fileData as ArrayBuffer}
            onStateChange={handleReaderStateChange}
            zoomLevel={zoomLevel}
          />
        )}
        {fileType === 'txt' && fileData && (
          <TXTReader 
            fileData={fileData as string}
            onStateChange={handleReaderStateChange}
            zoomLevel={zoomLevel}
          />
        )}
      </Box>

      {/* Bottom Progress Bar - Exact Book Fusion Style */}
      <Box sx={{ position: 'relative', height: '40px', display: 'flex', alignItems: 'center' }}>
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px' }}>
          <LinearProgress 
            variant="determinate" 
            value={readerState.progress} 
            sx={{ 
              height: '4px',
              backgroundColor: theme === 'dark' ? '#444' : '#e0e0e0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: theme === 'dark' ? '#64b5f6' : '#2196f3'
              }
            }}
          />
        </Box>
        
        <Typography 
          variant="caption" 
          sx={{ 
            position: 'absolute',
            right: 16,
            bottom: 8,
            fontSize: '12px',
            color: theme === 'dark' ? '#cccccc' : '#666666',
            fontWeight: 400
          }}
        >
          {readerState.currentPage} of {readerState.totalPages}
        </Typography>
      </Box>
    </Box>
  );
}

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <IconButton 
      onClick={toggleTheme}
      sx={{ color: theme === 'dark' ? '#cccccc' : '#666666', p: 1 }}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? <DarkMode /> : <LightMode />}
    </IconButton>
  );
}

export default function BookReaderPage() {
  return (
    <ThemeProvider>
      <Suspense fallback={
        <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      }>
        <BookReaderContent />
      </Suspense>
    </ThemeProvider>
  );
}