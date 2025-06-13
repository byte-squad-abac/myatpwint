'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import {
  Container, Grid, Typography, Button, Chip, Box,
  CardMedia, Tabs, Tab, Paper, CircularProgress,
  IconButton, Popover, Divider
} from '@mui/material';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MenuBookIcon from '@mui/icons-material/MenuBook';

interface Book {
  id: string;
  name: string;
  price: number;
  author: string;
  description: string;
  category: string;
  published_date: string;
  edition: string;
  tags: string[];
  image_url: string;
  created_at: string;
}

export default function BookDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [cart, setCart] = useState<Book[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleAddToCart = () => {
    if (!book) return;
    const exists = cart.find((b) => b.id === book.id);
    if (!exists) setCart([...cart, book]);
  };

  const handleCartClick = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleCartClose = () => setAnchorEl(null);
  const cartOpen = Boolean(anchorEl);

  useEffect(() => {
    const fetchBook = async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', id)
        .single();

      if (!error) setBook(data);
      else console.error('Error fetching book:', error.message);

      setLoading(false);
    };

    if (id) fetchBook();
  }, [id]);

  if (loading) return <Container sx={{ py: 5 }}><CircularProgress /></Container>;
  if (!book) return <Container sx={{ py: 5 }}><Typography>Book not found.</Typography></Container>;

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, ml: 2, mt: 1, mb: 2 }}>
        <IconButton onClick={() => router.push('/books')}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <IconButton onClick={handleCartClick}>
          <ShoppingCartIcon fontSize="small" />
        </IconButton>
      </Box>

      <Popover open={cartOpen} anchorEl={anchorEl} onClose={handleCartClose}>
        <Box sx={{ p: 2, minWidth: 250 }}>
          <Typography variant="h6">🛒 Cart</Typography>
          <Divider sx={{ my: 1 }} />
          {cart.length === 0 ? (
            <Typography variant="body2">Your cart is empty.</Typography>
          ) : (
            cart.map((item) => (
              <Box key={item.id} sx={{ mb: 1 }}>
                <Typography variant="subtitle2">{item.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.price.toLocaleString()} MMK
                </Typography>
              </Box>
            ))
          )}
        </Box>
      </Popover>

      <Container sx={{ py: 5 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <CardMedia
              component="img"
              height="500"
              image={book.image_url}
              alt={book.name}
              sx={{ borderRadius: 2 }}
            />
            <Box mt={2}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleAddToCart}
                sx={{ height: 48, textTransform: 'none' }}
              >
                🛒 Add to Cart
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<MenuBookIcon />}
                sx={{ mt: 1, height: 48 }}
              >
                Read Online (Rental)
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12} md={8}>
            <Typography variant="h5">by {book.author}</Typography>
            <Typography variant="h4" fontWeight="bold">{book.name}</Typography>
            <Typography variant="h6" color="error">{book.price.toLocaleString()} MMK</Typography>
            <Chip label={book.category} color="warning" sx={{ my: 2 }} />

            <Paper sx={{ mb: 2 }}>
              <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                <Tab label="Description" />
                <Tab label="Details" />
                <Tab label="Reviews" />
              </Tabs>
            </Paper>

            {tab === 0 && <Typography>{book.description}</Typography>}
            {tab === 1 && (
              <Box>
                <Typography><strong>Edition:</strong> {book.edition}</Typography>
                <Typography><strong>Published Date:</strong> {book.published_date}</Typography>
                <Typography><strong>Tags:</strong> {book.tags.join(', ')}</Typography>
              </Box>
            )}
            {tab === 2 && (
              <Typography color="text.secondary">⭐ 4.5 (120 reviews)</Typography>
            )}
          </Grid>
        </Grid>
      </Container>
    </>
  );
}