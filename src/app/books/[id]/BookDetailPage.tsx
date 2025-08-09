'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useCartStore } from '@/lib/store/cartStore';
import { useSession } from '@supabase/auth-helpers-react';
import supabaseClient from '@/lib/supabaseClient';
import { Book, DeliveryType } from '@/lib/types';
import BookRecommendations from '../../../components/books/BookRecommendations';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';

interface BookDetailPageProps {
  book: Book;
}

export default function BookDetailPage({ book }: BookDetailPageProps) {
  const router = useRouter();
  const session = useSession();
  const [mounted, setMounted] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('physical');
  const [tab, setTab] = useState(0);
  const [isOwned, setIsOwned] = useState(false);
  const [checkingOwnership, setCheckingOwnership] = useState(false);
  const { addItem, removeItem, isInCart, getItemQuantity, updateQuantity } = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if user already owns this book
  useEffect(() => {
    if (!session?.user?.id) return;
    
    const checkOwnership = async () => {
      setCheckingOwnership(true);
      try {
        const { data, error } = await supabaseClient
          .from('purchases')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('book_id', book.id)
          .limit(1);
        
        if (!error && data && data.length > 0) {
          setIsOwned(true);
        }
      } catch (error) {
        console.error('Error checking book ownership:', error);
      } finally {
        setCheckingOwnership(false);
      }
    };
    
    checkOwnership();
  }, [session?.user?.id, book.id]);

  const handleAddToCart = () => {
    if (isInCart(book.id, deliveryType)) {
      removeItem(book.id, deliveryType);
    } else {
      addItem(book, deliveryType, deliveryType === 'physical' ? quantity : 1);
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
      if (isInCart(book.id, deliveryType)) {
        updateQuantity(book.id, deliveryType, newQuantity);
      }
    }
  };

  const handleCheckout = () => {
    if (!isInCart(book.id, deliveryType)) {
      addItem(book, deliveryType, deliveryType === 'physical' ? quantity : 1);
    }
    router.push('/checkout');
  };

  // Pre-compute button text and state to avoid hydration mismatch
  const getButtonState = () => {
    if (!mounted) return { text: 'Add to Cart', color: 'primary' as const, disabled: false };
    if (isOwned) return { text: 'Already Owned', color: 'success' as const, disabled: true };
    if (isInCart(book.id, deliveryType)) return { text: 'Remove from Cart', color: 'error' as const, disabled: false };
    return { text: 'Add to Cart', color: 'primary' as const, disabled: false };
  };

  const buttonState = getButtonState();
  const currentQuantity = mounted ? getItemQuantity(book.id, deliveryType) : 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 4 }}>
          {/* Book Cover */}
          <Box>
            <Box
              component="img"
              src={book.image_url}
              alt={book.name}
              sx={{
                width: '100%',
                maxWidth: 280,
                height: 'auto',
                maxHeight: 400,
                objectFit: 'cover',
                borderRadius: 2,
                boxShadow: 3,
                mx: 'auto',
                display: 'block',
              }}
            />
          </Box>

          {/* Book Details */}
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {book.name}
            </Typography>
            
            <Typography variant="h6" color="primary" gutterBottom>
              {book.author}
            </Typography>

            <Box sx={{ my: 2, display: 'flex', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h5" color="primary" component="span">
                  {book.price.toLocaleString()} MMK
                </Typography>
                {deliveryType === 'physical' && (
                  <Typography variant="body2" color="error" component="span">
                    +5,000 MMK shipping fee
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 3 }}>
                <Chip 
                  label={book.category} 
                  color="primary" 
                  variant="outlined" 
                  size="small" 
                />
                <Chip 
                  label={`Edition ${book.edition}`} 
                  color="secondary" 
                  variant="outlined" 
                  size="small" 
                />
              </Box>
            </Box>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
              <Tab label="Description" />
              <Tab label="Details" />
              <Tab label="Reviews" />
            </Tabs>

            {tab === 0 && (
              <Typography variant="body1" paragraph>
                {book.description}
              </Typography>
            )}
            {tab === 1 && (
              <Box>
                <Typography><strong>Author:</strong> {book.author}</Typography>
                <Typography><strong>Edition:</strong> {book.edition}</Typography>
                <Typography><strong>Published Date:</strong> {new Date(book.published_date).toLocaleDateString()}</Typography>
                <Typography><strong>Category:</strong> {book.category}</Typography>
                <Typography><strong>Tags:</strong> {book.tags?.join(', ') || 'No tags'}</Typography>
              </Box>
            )}
            {tab === 2 && (
              <Typography color="text.secondary">No reviews yet. (Reviews feature coming soon!)</Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Choose Type:
              </Typography>
              <RadioGroup
                row
                value={deliveryType}
                onChange={e => setDeliveryType(e.target.value as DeliveryType)}
              >
                <FormControlLabel value="physical" control={<Radio />} label="Physical" />
                <FormControlLabel value="digital" control={<Radio />} label="Digital" />
              </RadioGroup>
            </Box>

            {deliveryType === 'physical' && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Quantity:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton 
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                    size="small"
                  >
                    <RemoveIcon />
                  </IconButton>
                  <TextField
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                    type="number"
                    inputProps={{ min: 1 }}
                    size="small"
                    sx={{ width: '80px' }}
                  />
                  <IconButton 
                    onClick={() => handleQuantityChange(quantity + 1)}
                    size="small"
                  >
                    <AddIcon />
                  </IconButton>
                </Box>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                variant="contained"
                color={buttonState.color}
                onClick={isOwned ? () => router.push('/my-library') : handleAddToCart}
                disabled={buttonState.disabled}
                sx={{ 
                  py: 1.5,
                  cursor: buttonState.disabled ? 'default' : 'pointer',
                  '&:hover': {
                    transform: buttonState.disabled ? 'none' : 'translateY(-2px)',
                    transition: 'transform 0.2s ease-in-out'
                  }
                }}
              >
                {isOwned ? 'Go to Library' : buttonState.text}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={isOwned ? () => router.push('/my-library') : handleCheckout}
                disabled={isOwned}
                sx={{ 
                  py: 1.5,
                  cursor: isOwned ? 'default' : 'pointer',
                  '&:hover': {
                    transform: isOwned ? 'none' : 'translateY(-2px)',
                    transition: 'transform 0.2s ease-in-out'
                  }
                }}
              >
                {isOwned ? 'Read Now' : 'Buy Now'}
              </Button>
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Published: {new Date(book.published_date).toLocaleDateString()}
              </Typography>
              <Box sx={{ mt: 1 }}>
                {book.tags?.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                )) || (
                  <Typography variant="body2" color="text.secondary">
                    No tags available
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* AI Recommendations Section */}
      <BookRecommendations 
        bookId={book.id} 
        bookTitle={book.name} 
      />
    </Container>
  );
}