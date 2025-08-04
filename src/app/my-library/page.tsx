'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Fade,
  Grow,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  AutoStories,
  TrendingUp,
} from '@mui/icons-material';
import supabaseClient from '@/lib/supabaseClient';
import { useOfflineBooks } from '@/hooks/useOfflineBooks';

// Import components
import BookshelfGrid from './components/BookshelfGrid';
import SearchAndFilter from './components/SearchAndFilter';
import EmptyBookshelf from './components/EmptyBookshelf';
import LoadingBookshelf from './components/LoadingBookshelf';
import { LibraryBook } from '@/lib/types';
import { getFileExtension } from '@/lib/utils';

// Constants
const BACKGROUND_STYLES = {
  background: `
    radial-gradient(ellipse at top left, rgba(139, 69, 19, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at top right, rgba(160, 82, 45, 0.1) 0%, transparent 50%),
    radial-gradient(ellipse at bottom center, rgba(205, 133, 63, 0.08) 0%, transparent 70%),
    linear-gradient(135deg, 
      rgba(245, 245, 220, 0.3) 0%, 
      transparent 25%,
      rgba(222, 184, 135, 0.2) 50%,
      transparent 75%,
      rgba(245, 245, 220, 0.3) 100%
    )
  `,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      repeating-linear-gradient(
        45deg,
        transparent,
        transparent 100px,
        rgba(139, 69, 19, 0.02) 100px,
        rgba(139, 69, 19, 0.02) 101px,
        transparent 101px,
        transparent 200px
      )
    `,
    pointerEvents: 'none',
    zIndex: 0,
  },
};

// Custom hook for purchased books
function usePurchasedBooks(session: any) {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const { offlineBooks } = useOfflineBooks();

  // Listen for network status changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    setIsOnline(navigator.onLine);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Check if we're offline first - if offline, we can show offline books without session
    const isOffline = !navigator.onLine;
    
    if (!isOffline && !session?.user?.id) return;
    
    const loadPurchasedBooks = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('🔍 Loading books for user:', session?.user?.id || 'offline');
        
        // Check if we're offline
        const isOffline = !navigator.onLine;
        
        // If offline, only show offline books
        if (isOffline) {
          console.log('🌐 Device is offline, loading offline books only');
          if (offlineBooks && offlineBooks.length > 0) {
            const libraryBooks: LibraryBook[] = offlineBooks.map((offlineBook: any) => ({
              id: offlineBook.id,
              name: offlineBook.title,
              fileName: `${offlineBook.title}.pdf`,
              size: 'Downloaded',
              uploadDate: offlineBook.downloadDate,
              file: null,
              source: 'indexeddb',
              fileUrl: 'offline',
              author: offlineBook.author || 'Unknown Author',
              description: 'Available offline',
              category: '',
              image_url: '',
              tags: [],
              published_date: offlineBook.downloadDate,
              edition: '',
            }));
            
            setBooks(libraryBooks);
            setIsLoading(false);
            return;
          } else {
            // No offline books available
            setBooks([]);
            setError('No books available offline. Download books when online to read them offline.');
            setIsLoading(false);
            return;
          }
        }
        
        // If online, first show offline books if available, then try to get online books
        if (offlineBooks && offlineBooks.length > 0) {
          console.log('📱 Found offline books:', offlineBooks.length);
          const libraryBooks: LibraryBook[] = offlineBooks.map((offlineBook: any) => ({
            id: offlineBook.id,
            name: offlineBook.title,
            fileName: `${offlineBook.title}.pdf`,
            size: 'Downloaded',
            uploadDate: offlineBook.downloadDate,
            file: null,
            source: 'indexeddb',
            fileUrl: 'offline',
            author: offlineBook.author || 'Unknown Author',
            description: 'Available offline',
            category: '',
            image_url: '',
            tags: [],
            published_date: offlineBook.downloadDate,
            edition: '',
          }));
          
          setBooks(libraryBooks);
          setIsLoading(false);
          return;
        }
        
        // If online, try to load from Supabase (requires session)
        if (!session?.user?.id) {
          console.log('📱 No session available, only showing offline books');
          setBooks([]);
          setError('Please sign in to see your purchased books online.');
          setIsLoading(false);
          return;
        }
        
        const { data: purchases, error } = await supabaseClient
          .from('purchases')
          .select(`
            *,
            books (
              id,
              name,
              author,
              description,
              category,
              image_url,
              file_url,
              tags,
              published_date,
              edition
            )
          `)
          .eq('user_id', session.user.id);

        console.log('📚 Purchases query result:', { purchases, error });
        
        if (error) throw error;

        const transformedBooks: LibraryBook[] = purchases?.map((purchase: any) => ({
          id: purchase.books.id,
          name: purchase.books.name,
          fileName: `${purchase.books.name}.pdf`,
          size: 'Unknown',
          uploadDate: purchase.purchased_at,
          file: null,
          source: 'purchased',
          fileUrl: purchase.books.file_url,
          author: purchase.books.author,
          description: purchase.books.description,
          category: purchase.books.category,
          imageUrl: purchase.books.image_url,
          tags: purchase.books.tags || [],
          purchasePrice: purchase.purchase_price,
          purchaseDate: purchase.purchased_at
        })) || [];

        setBooks(transformedBooks);
      } catch (error) {
        console.error('Error loading purchased books:', error);
        
        // If we have offline books, show them as fallback
        if (offlineBooks && offlineBooks.length > 0) {
          console.log('📱 Falling back to offline books');
          const libraryBooks: LibraryBook[] = offlineBooks.map((offlineBook: any) => ({
            id: offlineBook.id,
            name: offlineBook.title,
            fileName: `${offlineBook.title}.pdf`,
            size: 'Downloaded',
            uploadDate: offlineBook.downloadDate,
            file: null,
            source: 'indexeddb',
            fileUrl: 'offline',
            author: offlineBook.author || 'Unknown Author',
            description: 'Available offline',
            category: '',
            image_url: '',
            tags: [],
            published_date: offlineBook.downloadDate,
            edition: '',
          }));
          setBooks(libraryBooks);
          setError(null); // Clear error since we have offline books
        } else {
          setError('Unable to load your library. Try going online or download books first.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPurchasedBooks();
  }, [session?.user?.id, offlineBooks, isOnline]);

  return { books, isLoading, error };
}

// Custom hook for book filtering and search
function useBookFiltering(books: LibraryBook[]) {
  const [filteredBooks, setFilteredBooks] = useState<LibraryBook[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('uploadDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    let filtered = [...books];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(book => 
        book.name.toLowerCase().includes(searchLower) ||
        book.fileName.toLowerCase().includes(searchLower) ||
        book.author?.toLowerCase().includes(searchLower)
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(book => {
        const fileExtension = getFileExtension(book.fileName);
        return fileExtension === filterType;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'uploadDate':
          aValue = new Date(a.uploadDate);
          bValue = new Date(b.uploadDate);
          break;
        case 'author':
          aValue = (a.author || '').toLowerCase();
          bValue = (b.author || '').toLowerCase();
          break;
        default:
          aValue = a.uploadDate;
          bValue = b.uploadDate;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredBooks(filtered);
  }, [books, searchTerm, filterType, sortBy, sortOrder]);

  return {
    filteredBooks,
    searchTerm,
    filterType,
    sortBy,
    sortOrder,
    viewMode,
    setSearchTerm,
    setFilterType,
    setSortBy,
    setSortOrder,
    setViewMode
  };
}

// Header component
function BookshelfHeader({ books, isMobile, theme }: { books: LibraryBook[], isMobile: boolean, theme: any }) {
  const recentBooks = books.filter(b => 
    new Date(b.purchaseDate || b.uploadDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length;

  return (
    <Fade in={true} timeout={600}>
      <Box sx={{ mb: 4 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between', 
            alignItems: isMobile ? 'flex-start' : 'center',
            mb: 2,
            gap: 2,
          }}
        >
          <Box>
            <Typography 
              variant="h2" 
              sx={{ 
                fontWeight: 900,
                background: 'linear-gradient(45deg, #8B4513, #D2691E, #CD853F)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
                fontSize: isMobile ? '2.5rem' : '3.5rem',
                textShadow: '0 4px 8px rgba(139, 69, 19, 0.3)',
              }}
            >
              Bookshelf
            </Typography>
            <Typography 
              variant="h6" 
              color="text.secondary" 
              sx={{ 
                fontWeight: 400,
                fontSize: isMobile ? '1rem' : '1.25rem',
              }}
            >
              Your purchased books • {books.length} book{books.length !== 1 ? 's' : ''} owned
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {[
              { icon: <AutoStories />, label: 'Total Books', value: books.length },
              { icon: <TrendingUp />, label: 'This Month', value: recentBooks },
            ].map((stat, index) => (
              <Grow key={index} in={true} timeout={600 + index * 200}>
                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    minWidth: 120,
                    textAlign: 'center',
                    background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Box sx={{ color: theme.palette.primary.main, mb: 1 }}>
                    {stat.icon}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stat.label}
                  </Typography>
                </Paper>
              </Grow>
            ))}
          </Box>
        </Box>
      </Box>
    </Fade>
  );
}


export default function BookshelfPage() {
  const session = useSession();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Custom hooks
  const { books, isLoading, error } = usePurchasedBooks(session);
  const {
    filteredBooks,
    searchTerm,
    filterType,
    sortBy,
    sortOrder,
    viewMode,
    setSearchTerm,
    setFilterType,
    setSortBy,
    setSortOrder,
    setViewMode
  } = useBookFiltering(books);

  // Session management
  const [isClient, setIsClient] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
    const timer = setTimeout(() => setIsSessionLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isSessionLoading && !session) {
      router.push('/login');
    }
  }, [session, router, isSessionLoading]);

  // Event handlers
  const handleReadBook = useCallback((bookId: string) => {
    router.push(`/my-library/read?id=${bookId}`);
  }, [router]);

  const handleDeleteBook = useCallback((bookId: string) => {
    // For purchased books, this would be "hide from library" in a real app
    if (window.confirm('Are you sure you want to remove this book from your library view?')) {
      console.log(`Would remove book ${bookId} from library view`);
    }
  }, []);

  const handleSearchChange = useCallback((newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
  }, [setSearchTerm]);

  const handleFilterChange = useCallback((newFilterType: string) => {
    setFilterType(newFilterType);
  }, [setFilterType]);

  const handleSortChange = useCallback((newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  }, [setSortBy, setSortOrder]);

  const handleViewModeChange = useCallback((newViewMode: 'grid' | 'list') => {
    setViewMode(newViewMode);
  }, [setViewMode]);

  // Loading states
  if (isSessionLoading || !isClient) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h3" gutterBottom sx={{ color: '#641B2E', fontWeight: 700 }}>
          Bookshelf
        </Typography>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!session) {
    return null;
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h3" gutterBottom sx={{ color: '#641B2E', fontWeight: 700 }}>
          Bookshelf
        </Typography>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography color="error" variant="h6">{error}</Typography>
        </Box>
      </Container>
    );
  }



  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        ...BACKGROUND_STYLES,
      }}
    >
      <Container 
        maxWidth="xl" 
        sx={{ 
          py: 4,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <BookshelfHeader books={books} isMobile={isMobile} theme={theme} />

        {isLoading ? (
          <LoadingBookshelf />
        ) : books.length === 0 ? (
          <EmptyBookshelf onUploadClick={() => router.push('/books')} />
        ) : (
          <>
            <SearchAndFilter
              books={books}
              onSearchChange={handleSearchChange}
              onFilterChange={handleFilterChange}
              onSortChange={handleSortChange}
              onViewModeChange={handleViewModeChange}
              searchTerm={searchTerm}
              filterType={filterType}
              sortBy={sortBy}
              sortOrder={sortOrder}
              viewMode={viewMode}
            />

            <BookshelfGrid
              books={filteredBooks}
              loading={false}
              onReadBook={handleReadBook}
              onDeleteBook={handleDeleteBook}
              searchTerm={searchTerm}
              filterType={filterType}
            />
          </>
        )}
      </Container>
    </Box>
  );
} 
