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
import { bookStorage } from '@/lib/storage';

interface LibraryBook {
  id: string;
  name: string;
  fileName: string;
  file: File | null;
  size: string;
  uploadDate: string;
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

  // Load books from IndexedDB on component mount
  useEffect(() => {
    if (!isClient) return;
    
    const loadBooks = async () => {
      try {
        const storedBooks = await bookStorage.getAllBooks();
        const books = storedBooks.map(storedBook => ({
          id: storedBook.id,
          name: storedBook.name,
          fileName: storedBook.fileName,
          size: storedBook.size,
          uploadDate: storedBook.uploadDate,
          file: new File([storedBook.fileData], storedBook.fileName, { type: storedBook.fileType }),
        }));
        setBooks(books);
      } catch (error) {
        console.error('Error loading books from IndexedDB:', error);
      }
    };
    
    loadBooks();
  }, [isClient]);

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
    if (file) {
      // Check file type
      const allowedTypes = ['.txt', '.pdf', '.epub'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        setError('Please select a .txt, .pdf, or .epub file');
        return;
      }

      // Check file size (100MB limit for IndexedDB storage)
      if (file.size > 100 * 1024 * 1024) {
        setError('File size must be less than 100MB');
        return;
      }

      setError(null);
      
      try {
        const newBook: LibraryBook = {
          id: Date.now().toString(),
          name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension for display
          fileName: file.name, // Store original file name with extension
          file: file, // Keep file object in memory
          size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
          uploadDate: new Date().toLocaleDateString(),
        };

        // Store file in IndexedDB
        try {
          const fileData = await file.arrayBuffer();
          await bookStorage.saveBook({
            id: newBook.id,
            name: newBook.name,
            fileName: newBook.fileName,
            size: newBook.size,
            uploadDate: newBook.uploadDate,
            fileData: fileData,
            fileType: file.type,
          });

          // Add to books list
          setBooks(prev => [...prev, newBook]);
        } catch (storageError: any) {
          console.error('Could not save to IndexedDB:', storageError);
          setError('Failed to save book. Please try again.');
        }
        
        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        setError('Error reading file. Please try again.');
        console.error('Error reading file:', error);
      }
    }
  };

  const handleReadBook = (bookId: string) => {
    // Navigate to the reader page with the book ID
    router.push(`/my-library/read?id=${bookId}`);
  };

  const handleDeleteBook = async (bookId: string) => {
    try {
      await bookStorage.deleteBook(bookId);
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
        Upload and read your personal book collection. Your books are stored locally for privacy.
      </Typography>

      {/* Upload Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Add New Book
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Supported formats: .txt, .pdf, .epub (max 100MB)
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
          • Books are stored persistently in your browser using IndexedDB<br/>
          • Supported formats: TXT, PDF, EPUB<br/>
          • Maximum file size: 100MB<br/>
          • Files persist after page refresh<br/>
          • Large files are supported with efficient storage
        </Typography>
      </Paper>
    </Container>
  );
} 
