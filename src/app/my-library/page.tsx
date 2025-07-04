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
  Grid,
} from '@mui/material';
import {
  CloudUpload,
  Book,
  Delete,
  Visibility,
} from '@mui/icons-material';

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load books from localStorage on component mount
  useEffect(() => {
    if (!isClient) return;
    
    const savedBooks = localStorage.getItem('myLibraryBooks');
    if (savedBooks) {
      try {
        const parsedBooks = JSON.parse(savedBooks);
        // Note: We can't restore File objects from localStorage, so we'll need to handle this differently
        // For now, we'll just show the book names and ask user to re-upload if they want to read
        setBooks(parsedBooks.map((book: any) => ({
          ...book,
          file: null as any, // File objects can't be serialized
        })));
      } catch (error) {
        console.error('Error loading books from localStorage:', error);
      }
    }
  }, [isClient]);

  // Redirect if not logged in
  if (!session) {
    router.push('/login');
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file type
      const allowedTypes = ['.txt', '.pdf', '.epub'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        setError('Please select a .txt, .pdf, or .epub file');
        return;
      }

      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB');
        return;
      }

      setError(null);
      
      // Create book object
      const newBook: LibraryBook = {
        id: Date.now().toString(),
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension for display
        fileName: file.name, // Store original file name with extension
        file: file,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        uploadDate: new Date().toLocaleDateString(),
      };

      // Add to books list
      setBooks(prev => {
        const updatedBooks = [...prev, newBook];
        // Save to localStorage (without the File object)
        const booksToSave = updatedBooks.map(book => ({
          id: book.id,
          name: book.name,
          fileName: book.fileName,
          size: book.size,
          uploadDate: book.uploadDate,
        }));
        localStorage.setItem('myLibraryBooks', JSON.stringify(booksToSave));
        return updatedBooks;
      });
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleReadBook = (book: LibraryBook) => {
    if (!book.file) {
      setError('This book was loaded from storage. Please re-upload the file to read it.');
      return;
    }
    
    // Create a temporary URL for the file
    const fileUrl = URL.createObjectURL(book.file);
    
    // Pass fileName (with extension) to the reader
    router.push(`/my-library/read?file=${encodeURIComponent(fileUrl)}&name=${encodeURIComponent(book.name)}&fileName=${encodeURIComponent(book.fileName)}`);
  };

  const handleDeleteBook = (bookId: string) => {
    setBooks(prev => {
      const updatedBooks = prev.filter(book => book.id !== bookId);
      // Update localStorage
      const booksToSave = updatedBooks.map(book => ({
        id: book.id,
        name: book.name,
        fileName: book.fileName,
        size: book.size,
        uploadDate: book.uploadDate,
      }));
      localStorage.setItem('myLibraryBooks', JSON.stringify(booksToSave));
      return updatedBooks;
    });
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
        <Grid container spacing={3}>
          {books.map((book) => (
            <Grid item xs={12} sm={6} md={4} key={book.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
                  {book.file ? (
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => handleReadBook(book)}
                      sx={{ color: '#641B2E' }}
                    >
                      Read
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      startIcon={<CloudUpload />}
                      onClick={() => {
                        setError('Please re-upload this book file to read it.');
                        triggerFileUpload();
                      }}
                      sx={{ color: '#f39c12' }}
                    >
                      Re-upload
                    </Button>
                  )}
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
            </Grid>
          ))}
        </Grid>
      )}

      {/* Info Box */}
      <Paper sx={{ p: 3, mt: 4, bgcolor: '#f8f9fa' }}>
        <Typography variant="h6" gutterBottom>
          ℹ️ About My Library
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Books are stored locally in your browser for privacy<br/>
          • Supported formats: TXT, PDF, EPUB<br/>
          • Maximum file size: 50MB<br/>
          • Your books will be cleared when you clear browser data
        </Typography>
      </Paper>
    </Container>
  );
} 