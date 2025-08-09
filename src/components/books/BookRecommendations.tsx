import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Divider,
} from '@mui/material';
import { AutoAwesome, TrendingUp } from '@mui/icons-material';
import { Book } from '@/lib/types';

interface RecommendedBook extends Book {
  similarity_score: number;
}

interface BookRecommendationsProps {
  bookId: string;
  bookTitle?: string;
}

export default function BookRecommendations({ bookId, bookTitle }: BookRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<RecommendedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) return;

    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('🤖 Fetching AI recommendations for book:', bookId);
        
        const response = await fetch(`/api/recommendations/similar?bookId=${bookId}&limit=6`);
        const data = await response.json();
        
        if (data.success) {
          setRecommendations(data.recommendations);
          console.log('✅ Got', data.recommendations.length, 'recommendations');
        } else {
          throw new Error(data.error || 'Failed to get recommendations');
        }
      } catch (err: any) {
        console.error('❌ Recommendation error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [bookId]);

  if (!bookId) {
    return null;
  }

  return (
    <Paper elevation={2} sx={{ mt: 4, p: 3, borderRadius: 2 }}>
      {/* Header Section */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AutoAwesome sx={{ color: 'primary.main', mr: 1, fontSize: 28 }} />
        <Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            AI Recommendations
          </Typography>
          {bookTitle && (
            <Typography variant="body2" color="text.secondary">
              Based on "{bookTitle}"
            </Typography>
          )}
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Typography color="text.secondary">
            Finding similar books with AI...
          </Typography>
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Empty State */}
      {!loading && !error && recommendations.length === 0 && (
        <Alert severity="info">
          No similar books found. Try processing more books with AI!
        </Alert>
      )}

      {/* Recommendations Grid */}
      {!loading && !error && recommendations.length > 0 && (
        <>
          <Grid container spacing={2}>
            {recommendations.map((book) => (
              <Grid item xs={12} sm={6} md={4} key={book.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    }
                  }}
                >
                  {/* Book Cover */}
                  {book.image_url && (
                    <CardMedia
                      component="img"
                      height="160"
                      image={book.image_url}
                      alt={book.name}
                      sx={{ 
                        objectFit: 'cover',
                        borderRadius: '4px 4px 0 0'
                      }}
                    />
                  )}
                  
                  <CardContent sx={{ flexGrow: 1, p: 2 }}>
                    {/* Book Title */}
                    <Typography 
                      variant="h6" 
                      component="h3" 
                      sx={{ 
                        fontWeight: 'bold',
                        mb: 1,
                        fontSize: '1rem',
                        lineHeight: 1.3,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {book.name}
                    </Typography>
                    
                    {/* Author */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      by {book.author}
                    </Typography>
                    
                    {/* Category Chip */}
                    <Chip 
                      label={book.category} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                      sx={{ mb: 2, fontSize: '0.75rem' }}
                    />
                    
                    {/* Price and Match Score */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" color="success.main" sx={{ fontWeight: 'bold' }}>
                        {book.price.toLocaleString()} MMK
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TrendingUp sx={{ fontSize: 16, color: 'warning.main', mr: 0.5 }} />
                        <Typography variant="caption" color="warning.main" sx={{ fontWeight: 'bold' }}>
                          {Math.round(book.similarity_score * 100)}% match
                        </Typography>
                      </Box>
                    </Box>
                    
                    {/* View Details Button */}
                    <Link href={`/books/${book.id}`} passHref>
                      <Button 
                        variant="contained" 
                        color="primary" 
                        size="small" 
                        fullWidth
                        sx={{ 
                          textTransform: 'none',
                          fontWeight: 'bold'
                        }}
                      >
                        View Details
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Paper>
  );
}