'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  CloudUpload,
  Book,
  Delete,
  Visibility,
} from '@mui/icons-material';
import { bookStorage, BookRecord } from '@/lib/storage';

interface LibraryBook {
  id: string;
  name: string;
  fileName: string;
  file: File | null;
  size: string;
  uploadDate: string;
  source: 'indexeddb' | 'supabase';
  fileUrl?: string;
}


export default function MyLibraryPage() {
  const session = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load books from both Supabase and IndexedDB
  useEffect(() => {
    if (!isClient || !session) return;
    
    const loadBooks = async () => {
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
        
        setBooks(books);
      } catch (error) {
        console.error('Error loading books:', error);
      }
    };
    
    loadBooks();
  }, [isClient, session]);

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
          📚 My Library
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
          📚 My Library
        </Typography>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

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
      }
    }
  };

  const handleReadBook = (bookId: string) => {
    // Navigate to the reader page with the book ID
    router.push(`/my-library/read?id=${bookId}`);
  };

  const handleDeleteBook = async (bookId: string) => {
    try {
      await bookStorage.deleteBookHybrid(bookId);
      setBooks(prev => prev.filter(book => book.id !== bookId));
    } catch (error) {
      console.error('Error deleting book:', error);
      setError('Failed to delete book. Please try again.');
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom sx={{ color: '#641B2E', fontWeight: 700 }}>
        📚 My Library
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Upload and read your personal book collection. Your books are stored in the cloud with local backup.
      </Typography>

      {/* Upload Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Add New Book
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Supported formats: .txt, .pdf, .epub (max 50MB)
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
          startIcon={<CloudUpload />}
          onClick={triggerFileUpload}
          sx={{ 
            bgcolor: '#641B2E',
            '&:hover': { bgcolor: '#BE5B50' }
          }}
        >
          Upload Book File
        </Button>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {/* Books List */}
      {books.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Book sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Your library is empty
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload your first book to get started!
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: 3 
        }}>
          {books.map((book) => (
            <Card key={book.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {book.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Size: {book.size}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Added: {book.uploadDate}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() => handleReadBook(book.id)}
                  sx={{ color: '#641B2E' }}
                >
                  Read
                </Button>
                <Button
                  size="small"
                  startIcon={<Delete />}
                  onClick={() => handleDeleteBook(book.id)}
                  sx={{ color: '#e74c3c' }}
                >
                  Delete
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      {/* Info Box */}
      <Paper sx={{ p: 3, mt: 4, bgcolor: '#f8f9fa' }}>
        <Typography variant="h6" gutterBottom>
          ℹ️ About My Library
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Books are stored in the cloud with Supabase (with local backup)<br/>
          • Supported formats: TXT, PDF, EPUB<br/>
          • Maximum file size: 50MB<br/>
          • Access your books from any device<br/>
          • Automatic fallback to local storage if needed
        </Typography>
      </Paper>
    </Container>
  );
} 
