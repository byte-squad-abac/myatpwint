'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
} from '@mui/material';
import { PlayArrow } from '@mui/icons-material';
import supabaseClient from '@/lib/supabaseClient';
import { LibraryBook } from '@/lib/types';

export default function MyLibraryPage() {
  const session = useSession();
  const router = useRouter();
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      router.push('/login');
      return;
    }
    loadBooks();
  }, [session?.user?.id, router]);

  const loadBooks = async () => {
    try {
      setIsLoading(true);
      const { data: purchases, error } = await supabaseClient
        .from('purchases')
        .select(`
          *,
          books (
            id,
            name,
            author,
            description,
            image_url,
            manuscript_id
          )
        `)
        .eq('user_id', session?.user?.id);

      if (error) throw error;

      const libraryBooks: LibraryBook[] = purchases?.map((purchase: any) => ({
        id: purchase.books.id,
        name: purchase.books.name,
        author: purchase.books.author || 'Unknown Author',
        description: purchase.books.description || '',
        image_url: purchase.books.image_url || '',
        fileName: `${purchase.books.name}.docx`,
        file: null,
        size: '',
        uploadDate: purchase.purchased_at,
        source: 'supabase',
        price: 0,
        category: '',
        published_date: '',
        edition: '',
        tags: [],
        created_at: purchase.purchased_at,
      })) || [];

      setBooks(libraryBooks);
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReadBook = (bookId: string) => {
    router.push(`/my-library/read?id=${bookId}`);
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
        My Library ({books.length} {books.length === 1 ? 'book' : 'books'})
      </Typography>

      {books.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No books in your library yet
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Purchase books from our store to start reading
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => router.push('/books')}
            sx={{ bgcolor: '#641B2E', '&:hover': { bgcolor: '#4a1421' } }}
          >
            Browse Books
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {books.map((book) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={book.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  '&:hover': { 
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                    transition: 'all 0.3s ease'
                  }
                }}
              >
                <CardMedia
                  component="div"
                  sx={{
                    height: 200,
                    bgcolor: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundImage: book.image_url ? `url(${book.image_url})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {!book.image_url && (
                    <Typography variant="h6" color="text.secondary">
                      📚
                    </Typography>
                  )}
                </CardMedia>
                
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="h2" gutterBottom sx={{ 
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {book.name}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    by {book.author}
                  </Typography>
                  
                  {book.description && (
                    <Typography variant="body2" color="text.secondary" sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {book.description}
                    </Typography>
                  )}
                </CardContent>
                
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button 
                    variant="contained" 
                    startIcon={<PlayArrow />}
                    onClick={() => handleReadBook(book.id)}
                    fullWidth
                    sx={{ 
                      bgcolor: '#641B2E', 
                      '&:hover': { bgcolor: '#4a1421' },
                      textTransform: 'none',
                      fontWeight: 500
                    }}
                  >
                    Read
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}