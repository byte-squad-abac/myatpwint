'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Fade,
  Grow,
  useTheme,
  useMediaQuery,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload,
  FileUpload,
  AutoStories,
  TrendingUp,
} from '@mui/icons-material';
import { bookStorage, BookRecord } from '@/lib/storage';

// Import new components
import BookshelfGrid from './components/BookshelfGrid';
import SearchAndFilter from './components/SearchAndFilter';
import { LibraryBook } from './components/BookCard';


export default function BookshelfPage() {
  const session = useSession();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<LibraryBook[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('uploadDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load books from both Supabase and IndexedDB
  useEffect(() => {
    if (!isClient || !session) return;
    
    const loadBooks = async () => {
      setIsLoading(true);
      try {
        const userId = session.user.id;
        const bookRecords = await bookStorage.getAllBooksHybrid(userId);
        
        const books: LibraryBook[] = [];
        
        for (const record of bookRecords) {
          if (record.source === 'supabase') {
            // For Supabase books, we don't need to load the file data immediately
            books.push({
              id: record.id,
              name: record.name,
              fileName: record.fileName,
              size: record.size,
              uploadDate: record.uploadDate,
              file: null, // We'll load this on demand
              source: 'supabase',
              fileUrl: record.fileUrl
            });
          } else {
            // For IndexedDB books, load the file data
            const storedBook = await bookStorage.getBook(record.id);
            if (storedBook) {
              books.push({
                id: storedBook.id,
                name: storedBook.name,
                fileName: storedBook.fileName,
                size: storedBook.size,
                uploadDate: storedBook.uploadDate,
                file: new File([storedBook.fileData], storedBook.fileName, { type: storedBook.fileType }),
                source: 'indexeddb'
              });
            }
          }
        }
        
        // Remove any potential duplicates based on book ID
        const uniqueBooks = books.filter((book, index, self) => 
          index === self.findIndex(b => b.id === book.id)
        );
        
        setBooks(uniqueBooks);
      } catch (error) {
        console.error('Error loading books:', error);
        setError('Failed to load your bookshelf. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadBooks();
  }, [isClient, session]);

  // Filter and sort books based on current criteria
  useEffect(() => {
    let filtered = [...books];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(book => 
        book.name.toLowerCase().includes(searchLower) ||
        book.fileName.toLowerCase().includes(searchLower)
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(book => {
        const fileExtension = book.fileName.split('.').pop()?.toLowerCase();
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
        case 'size':
          aValue = parseFloat(a.size.replace(/[^\d.]/g, ''));
          bValue = parseFloat(b.size.replace(/[^\d.]/g, ''));
          break;
        case 'fileName':
          aValue = a.fileName.toLowerCase();
          bValue = b.fileName.toLowerCase();
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

  // Event handlers - defined before any early returns
  const handleReadBook = useCallback((bookId: string) => {
    router.push(`/my-library/read?id=${bookId}`);
  }, [router]);

  const handleDeleteBook = useCallback(async (bookId: string) => {
    try {
      await bookStorage.deleteBookHybrid(bookId);
      setBooks(prev => prev.filter(book => book.id !== bookId));
    } catch (error) {
      console.error('Error deleting book:', error);
      setError('Failed to delete book. Please try again.');
    }
  }, []);

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Search and filter handlers
  const handleSearchChange = useCallback((newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
  }, []);

  const handleFilterChange = useCallback((newFilterType: string) => {
    setFilterType(newFilterType);
  }, []);

  const handleSortChange = useCallback((newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  }, []);

  const handleViewModeChange = useCallback((newViewMode: 'grid' | 'list') => {
    setViewMode(newViewMode);
  }, []);

  // Handle session loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSessionLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!isSessionLoading && !session) {
      router.push('/login');
    }
  }, [session, router, isSessionLoading]);

  // Show loading while session is loading
  if (isSessionLoading) {
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

  // Don't render until we're on the client
  if (!isClient) {
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

  // Event handlers
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && session) {
      // Check file type
      const allowedTypes = ['.txt', '.pdf', '.epub'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        setError('Please select a .txt, .pdf, or .epub file');
        return;
      }

      // Check file size (50MB limit for Supabase storage)
      if (file.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB');
        return;
      }

      setError(null);
      setIsLoading(true);
      
      try {
        const userId = session.user.id;
        
        // Use hybrid storage - tries Supabase first, falls back to IndexedDB
        const bookRecord = await bookStorage.saveBookHybrid(file, userId);
        
        const newBook: LibraryBook = {
          id: bookRecord.id,
          name: bookRecord.name,
          fileName: bookRecord.fileName,
          size: bookRecord.size,
          uploadDate: bookRecord.uploadDate,
          source: bookRecord.source,
          fileUrl: bookRecord.fileUrl,
          file: bookRecord.source === 'indexeddb' ? file : null
        };

        // Add to books list
        setBooks(prev => [...prev, newBook]);
        
        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        setError('Failed to save book. Please try again.');
        console.error('Error saving book:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };


  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `
          radial-gradient(ellipse at top left, rgba(139, 69, 19, 0.15) 0%, transparent 50%),
          radial-gradient(ellipse at top right, rgba(160, 82, 45, 0.1) 0%, transparent 50%),
          radial-gradient(ellipse at bottom center, rgba(205, 133, 63, 0.08) 0%, transparent 70%),
          linear-gradient(135deg, 
            ${theme.palette.background.default} 0%, 
            rgba(245, 245, 220, 0.3) 25%,
            ${theme.palette.background.default} 50%,
            rgba(222, 184, 135, 0.2) 75%,
            ${theme.palette.background.default} 100%
          )
        `,
        position: 'relative',
        overflow: 'hidden',
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
        '&::after': {
          content: '""',
          position: 'absolute',
          top: '10%',
          left: '5%',
          width: '90%',
          height: '80%',
          background: 'radial-gradient(ellipse, rgba(255, 248, 220, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          zIndex: 0,
          animation: 'ambientGlow 8s ease-in-out infinite',
          '@keyframes ambientGlow': {
            '0%, 100%': { opacity: 0.3, transform: 'scale(1)' },
            '50%': { opacity: 0.6, transform: 'scale(1.1)' },
          },
        },
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
      {/* Header Section */}
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
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: '-10px',
                    left: '-10px',
                    right: '-10px',
                    bottom: '-10px',
                    background: 'radial-gradient(ellipse, rgba(139, 69, 19, 0.1) 0%, transparent 70%)',
                    borderRadius: '20px',
                    zIndex: -1,
                    filter: 'blur(10px)',
                  }
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
                Your personal digital library • {books.length} book{books.length !== 1 ? 's' : ''} collected
              </Typography>
            </Box>

            {/* Quick Stats */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {[
                { icon: <AutoStories />, label: 'Total Books', value: books.length },
                { icon: <TrendingUp />, label: 'This Month', value: books.filter(b => 
                  new Date(b.uploadDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                ).length },
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

      {/* Upload Section (Temporary) */}
      <Fade in={true} timeout={800}>
        <Paper 
          elevation={3}
          sx={{ 
            p: 3, 
            mb: 4,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`,
            border: `2px dashed ${theme.palette.divider}`,
            transition: 'all 0.3s ease',
            '&:hover': {
              borderColor: theme.palette.primary.main,
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <FileUpload sx={{ fontSize: 28, color: theme.palette.primary.main }} />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Add New Book
            </Typography>
            <Tooltip title="Temporary upload feature - will be replaced with purchase integration">
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                (Temporary Feature)
              </Typography>
            </Tooltip>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Upload your personal documents and ebooks. Supported: PDF, EPUB, TXT • Max 50MB • Cloud + Local Storage
          </Typography>
          
          <input
            ref={fileInputRef}
            accept=".txt,.pdf,.epub"
            style={{ display: 'none' }}
            type="file"
            onChange={handleFileSelect}
          />
          
          <Button
            variant="contained"
            size="large"
            startIcon={<CloudUpload />}
            onClick={triggerFileUpload}
            disabled={isLoading}
            sx={{ 
              px: 4,
              py: 1.5,
              fontSize: '16px',
              fontWeight: 600,
              background: 'linear-gradient(45deg, #8B4513, #D2691E)',
              '&:hover': {
                background: 'linear-gradient(45deg, #A0522D, #CD853F)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 20px rgba(139, 69, 19, 0.3)',
              },
              '&:disabled': {
                background: theme.palette.action.disabledBackground,
              },
              transition: 'all 0.3s ease',
              borderRadius: 2,
            }}
          >
            {isLoading ? 'Uploading...' : 'Choose Book File'}
          </Button>

          {error && (
            <Fade in={true}>
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            </Fade>
          )}
        </Paper>
      </Fade>

      {/* Search and Filter Controls */}
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

      {/* Main Bookshelf Grid */}
      <BookshelfGrid
        books={filteredBooks}
        loading={isLoading}
        onReadBook={handleReadBook}
        onDeleteBook={handleDeleteBook}
        searchTerm={searchTerm}
        filterType={filterType}
      />

      {/* Footer Information */}
      <Fade in={true} timeout={1000}>
        <Paper 
          elevation={1}
          sx={{ 
            p: 3, 
            mt: 6,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <AutoStories sx={{ fontSize: 28, color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              About Your Bookshelf
            </Typography>
          </Box>
          
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: 3 
          }}>
            {[
              {
                title: '☁️ Cloud Storage',
                desc: 'Books stored securely in Supabase with automatic backup'
              },
              {
                title: '📱 Cross-Device Access',
                desc: 'Read your books on any device, anywhere'
              },
              {
                title: '🔄 Smart Sync',
                desc: 'Automatic fallback to local storage when offline'
              },
              {
                title: '📖 Multi-Format',
                desc: 'Support for PDF, EPUB, and TXT files'
              },
              {
                title: '🎨 Beautiful Reading',
                desc: 'Immersive reader with dark mode and zoom controls'
              },
              {
                title: '🔍 Smart Search',
                desc: 'Find books quickly by title, author, or content'
              },
            ].map((feature, index) => (
              <Box key={index}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.desc}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Fade>
      </Container>
    </Box>
  );
} 
