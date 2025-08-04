'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@supabase/auth-helpers-react';
import {
  Box,
  IconButton,
  Typography,
  LinearProgress,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack,
  Fullscreen,
  FullscreenExit,
  DarkMode,
  LightMode,
  CloudDownload,
  CheckCircle,
} from '@mui/icons-material';

import dynamic from 'next/dynamic';
import supabaseClient from '@/lib/supabaseClient';
import { ThemeProvider, useTheme } from '@/lib/contexts/ThemeContext';
import { ReaderErrorBoundary } from './components/ReaderErrorBoundary';
import PDFNavigationControls from './components/PDFNavigationControls';
import { PDFNavigationProps } from './components/PDFReader';
import { LibraryBook, ReaderState } from '@/lib/types';
import { useOfflineBooks } from '@/hooks/useOfflineBooks';

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

function BookReaderContent() {
  const { theme } = useTheme();
  const router = useRouter();
  const session = useSession();
  const searchParams = useSearchParams();
  const bookId = searchParams.get('id');
  
  
  const [book, setBook] = useState<LibraryBook | null>(null);
  const [fileData, setFileData] = useState<ArrayBuffer | string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'epub' | 'txt' | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(150);
  const [readerState, setReaderState] = useState<ReaderState>({
    currentPage: 1,
    totalPages: 1,
    progress: 0,
    isLoading: true,
    error: null,
    isFullscreen: false,
    zoomLevel: 150,
  });
  
  // PDF Navigation props ref
  const pdfNavigationRef = React.useRef<PDFNavigationProps>({
    onNavigateToPage: () => {},
    onNavigateFirst: () => {},
    onNavigateLast: () => {},
    onNavigateNext: () => {},
    onNavigatePrevious: () => {},
  });
  
  // Track window size for responsive navigation controls
  const [isMobile, setIsMobile] = useState(false);
  
  // Offline functionality
  const { 
    downloadBook, 
    isBookOffline, 
    isDownloading
  } = useOfflineBooks();
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize(); // Set initial value
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load book from Supabase or IndexedDB
  useEffect(() => {
    if (!bookId) {
      setReaderState(prev => ({ ...prev, error: 'No book selected', isLoading: false }));
      return;
    }

    // If no session but we have a bookId, still try to load from offline storage
    console.log('🔍 Loading book:', bookId, 'Session:', !!session);

    const loadPurchasedBook = async () => {
      try {
        // First check if we have this book offline
        const offlineStorage = (await import('@/lib/pwa/offlineStorage')).offlineStorage;
        
        const offlineBook = await offlineStorage.getOfflineBook(bookId!);
        console.log('📚 Offline book found:', !!offlineBook);
        
        if (offlineBook) {
          // Load from offline storage
          const book: LibraryBook = {
            id: offlineBook.id,
            name: offlineBook.title,
            author: 'Unknown Author',
            price: 0,
            description: '',
            category: '',
            published_date: '',
            edition: '',
            tags: [],
            image_url: '',
            created_at: '',
            fileName: `${offlineBook.title}.pdf`,
            file: null,
            size: 'Unknown',
            uploadDate: offlineBook.downloadDate.toString(),
            source: 'indexeddb',
          };
          
          setBook(book);
          
          // Load file from IndexedDB
          const offlineFile = await offlineStorage.getOfflineBookFile(bookId!);
          console.log('📁 Offline file found:', !!offlineFile);
          
          if (offlineFile) {
            // Convert blob to ArrayBuffer for the reader
            const arrayBuffer = await offlineFile.arrayBuffer();
            setFileData(arrayBuffer);
            setFileType('pdf'); // Assume PDF for now
            setReaderState(prev => ({ ...prev, isLoading: false }));
            console.log('✅ Book loaded from offline storage');
            return;
          }
        }

        // If no session, we can't load from Supabase
        if (!session) {
          setReaderState(prev => ({ 
            ...prev, 
            error: 'Book not available offline. Please connect to internet and download it first.', 
            isLoading: false 
          }));
          return;
        }

        // If no offline book, try to load from Supabase
        const { data: purchase, error: purchaseError } = await supabaseClient
          .from('purchases')
          .select(`
            *,
            books (
              id,
              name,
              author,
              file_url
            )
          `)
          .eq('user_id', session.user.id)
          .eq('book_id', bookId)
          .single();

        if (purchaseError || !purchase) {
          setReaderState(prev => ({ ...prev, error: 'Book not found in your library. Try going online or download it first.', isLoading: false }));
          return;
        }

        const book: LibraryBook = {
          id: purchase.books.id,
          name: purchase.books.name,
          author: purchase.books.author || 'Unknown Author',
          price: purchase.books.price || 0,
          description: purchase.books.description || '',
          category: purchase.books.category || '',
          published_date: purchase.books.published_date || '',
          edition: purchase.books.edition || '',
          tags: purchase.books.tags || [],
          image_url: purchase.books.image_url || '',
          created_at: purchase.books.created_at || '',
          fileName: `${purchase.books.name}.pdf`,
          file: null,
          size: 'Unknown',
          uploadDate: purchase.purchased_at,
          source: 'supabase',
          fileUrl: purchase.books.file_url,
        };

        setBook(book);
        
        // Load file from URL
        if (purchase.books.file_url) {
          await loadFileDataFromUrl(purchase.books.file_url, book.fileName);
        } else {
          setReaderState(prev => ({ ...prev, error: 'Book file not available', isLoading: false }));
        }
      } catch (error) {
        console.error('❌ Error loading purchased book:', error);
        setReaderState(prev => ({ 
          ...prev, 
          error: `Failed to load book: ${error instanceof Error ? error.message : 'Unknown error'}`, 
          isLoading: false 
        }));
      }
    };

    loadPurchasedBook();
  }, [bookId]);


  const loadFileDataFromUrl = async (url: string, fileName: string) => {
    try {
      const extension = fileName.split('.').pop()?.toLowerCase();
      
      if (extension === 'pdf') {
        const response = await fetch(url, {
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        setFileData(arrayBuffer);
        setFileType('pdf');
      } else if (extension === 'epub') {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        setFileData(arrayBuffer);
        setFileType('epub');
      } else if (extension === 'txt') {
        const response = await fetch(url);
        const text = await response.text();
        setFileData(text);
        setFileType('txt');
      } else {
        throw new Error('Unsupported file format');
      }
      
      setReaderState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('Error loading file from URL:', error);
      setReaderState(prev => ({ 
        ...prev, 
        error: 'Error loading file from cloud storage', 
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


  // Handle fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle session redirect
  useEffect(() => {
    if (!session) {
      router.push('/login');
    }
  }, [session, router]);

  if (!session) {
    return null;
  }

  if (readerState.error) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: '#641B2E' }}>
          <IconButton edge="start" color="inherit" onClick={handleBack}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, color: 'white' }}>
            Error Loading Book
          </Typography>
        </Box>
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
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: '#641B2E' }}>
          <IconButton edge="start" color="inherit" onClick={handleBack}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, color: 'white' }}>
            Loading...
          </Typography>
        </Box>
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
            aria-label="Go back to library"
            title="Go back to library"
          >
            <ArrowBack sx={{ fontSize: 24 }} />
          </IconButton>
          
          <IconButton 
            sx={{ color: theme === 'dark' ? '#cccccc' : '#666666', p: 1 }}
            aria-label="Search in document"
            title="Search in document (coming soon)"
            disabled
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </IconButton>
          
          {/* Offline Download Button */}
          <IconButton 
            onClick={() => downloadBook({
              id: bookId!,
              title: book?.name || 'Unknown Book',
              author: book?.author || 'Unknown Author',
              fileUrl: book?.fileUrl || ''
            })}
            disabled={isDownloading === bookId || isBookOffline(bookId!)}
            sx={{ 
              color: isBookOffline(bookId!) ? '#4caf50' : (theme === 'dark' ? '#cccccc' : '#666666'), 
              p: 1 
            }}
            aria-label={isBookOffline(bookId!) ? "Book downloaded" : "Download for offline reading"}
            title={isBookOffline(bookId!) ? "Book downloaded for offline reading" : "Download for offline reading"}
          >
            {isDownloading === bookId ? (
              <CircularProgress size={20} />
            ) : isBookOffline(bookId!) ? (
              <CheckCircle sx={{ fontSize: 24 }} />
            ) : (
              <CloudDownload sx={{ fontSize: 24 }} />
            )}
          </IconButton>
          
          {/* PDF Navigation Controls */}
          {fileType === 'pdf' && readerState.totalPages > 1 && (
            <PDFNavigationControls
              currentPage={readerState.currentPage}
              totalPages={readerState.totalPages}
              onNavigateToPage={pdfNavigationRef.current.onNavigateToPage}
              onNavigateFirst={pdfNavigationRef.current.onNavigateFirst}
              onNavigateLast={pdfNavigationRef.current.onNavigateLast}
              onNavigateNext={pdfNavigationRef.current.onNavigateNext}
              onNavigatePrevious={pdfNavigationRef.current.onNavigatePrevious}
              compact={isMobile}
            />
          )}
        </Box>
        
        <Typography 
          variant="h6" 
          component="h1"
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
              aria-label="Zoom out"
              title="Zoom out"
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
              aria-label={`Current zoom level: ${zoomLevel} percent`}
            >
              {zoomLevel}%
            </Typography>
            
            <IconButton 
              onClick={handleZoomIn}
              sx={{ color: theme === 'dark' ? '#cccccc' : '#666666', p: 0.5, minWidth: 'auto' }}
              disabled={zoomLevel >= 200}
              size="small"
              aria-label="Zoom in"
              title="Zoom in"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </IconButton>
          </Box>
          
          <IconButton 
            onClick={handleFullscreen}
            sx={{ color: theme === 'dark' ? '#cccccc' : '#666666', p: 1 }}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
        </Box>
      </Box>

      {/* Main Reader Content */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <ReaderErrorBoundary>
          {fileType === 'pdf' && fileData && (
            <PDFReader 
              fileData={fileData as ArrayBuffer}
              onStateChange={handleReaderStateChange}
              zoomLevel={zoomLevel}
              navigationProps={pdfNavigationRef.current}
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
        </ReaderErrorBoundary>
      </Box>

      {/* Bottom Progress Bar - Exact Book Fusion Style */}
      <Box 
        sx={{ position: 'relative', height: '40px', display: 'flex', alignItems: 'center' }}
        role="progressbar"
        aria-label="Reading progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={readerState.progress}
        aria-valuetext={`${Math.round(readerState.progress)}% complete, page ${readerState.currentPage} of ${readerState.totalPages}`}
      >
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
            aria-hidden="true"
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
          aria-live="polite"
          aria-atomic="true"
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
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      role="switch"
      aria-checked={theme === 'dark'}
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