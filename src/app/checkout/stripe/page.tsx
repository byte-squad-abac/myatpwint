'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useCartStore, CartItem } from '@/lib/store/cartStore';
import { redirectToCheckout } from '@/lib/stripe/client';
import { useSession } from '@supabase/auth-helpers-react';

export default function StripeCheckoutPage() {
  const router = useRouter();
  const session = useSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { items, getTotal, clearCart, removeItem, updateQuantity } = useCartStore();

  const handleStripeCheckout = async () => {
    if (!session?.user?.id) {
      setError('Please log in to complete purchase');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Convert cart items to Stripe format
      const checkoutItems = items.map(item => ({
        bookId: item.book.id,
        quantity: item.quantity,
        deliveryType: item.deliveryType,
      }));

      // Redirect to Stripe Checkout
      await redirectToCheckout(checkoutItems);

    } catch (err: any) {
      setError(err.message || 'Failed to process checkout. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveItem = (bookId: string, deliveryType: 'physical' | 'digital') => {
    removeItem(bookId, deliveryType);
  };

  const handleUpdateQuantity = (bookId: string, deliveryType: 'physical' | 'digital', newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(bookId, deliveryType);
    } else {
      updateQuantity(bookId, deliveryType, newQuantity);
    }
  };

  if (items.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="info">
          Your cart is empty. <Button onClick={() => router.push('/books')}>Continue Shopping</Button>
        </Alert>
      </Container>
    );
  }

  if (!session?.user) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="warning">
          Please log in to complete your purchase. 
          <Button onClick={() => router.push('/login')}>Login</Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Secure Checkout with Stripe
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          Review your order and proceed to secure payment with Stripe.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Order Summary with Edit Controls */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
          </Typography>
          
          {items.map((item: CartItem) => (
            <Card key={`${item.book.id}-${item.deliveryType}`} variant="outlined" sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {item.book.image_url && (
                    <img 
                      src={item.book.image_url} 
                      alt={item.book.name}
                      style={{ width: 60, height: 80, objectFit: 'cover', borderRadius: 4 }}
                    />
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {item.book.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      by {item.book.author}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <Chip 
                        label={item.deliveryType === 'physical' ? 'Physical' : 'Digital'} 
                        size="small"
                        color={item.deliveryType === 'physical' ? 'primary' : 'secondary'}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {item.book.price.toLocaleString()} MMK each
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton 
                      size="small" 
                      onClick={() => handleUpdateQuantity(item.book.id, item.deliveryType, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <RemoveIcon />
                    </IconButton>
                    <Typography variant="body1" sx={{ minWidth: 20, textAlign: 'center' }}>
                      {item.quantity}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => handleUpdateQuantity(item.book.id, item.deliveryType, item.quantity + 1)}
                    >
                      <AddIcon />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleRemoveItem(item.book.id, item.deliveryType)}
                      sx={{ ml: 1 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Subtotal: {(item.book.price * item.quantity).toLocaleString()} MMK
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}

          <Divider sx={{ my: 2 }} />
          
          {/* Shipping Fee */}
          {items.some((item: CartItem) => item.deliveryType === 'physical') && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                Shipping Fee
              </Typography>
              <Typography variant="body2">
                5,000 MMK
              </Typography>
            </Box>
          )}

          {/* Total */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '2px solid', borderColor: 'primary.main' }}>
            <Typography variant="h6" fontWeight="bold">
              Total
            </Typography>
            <Typography variant="h6" fontWeight="bold" color="primary.main">
              {getTotal().toLocaleString()} MMK
            </Typography>
          </Box>
        </Box>

        {/* Payment Info */}
        <Box sx={{ mb: 4, p: 3, bgcolor: 'info.50', borderRadius: 2, borderLeft: '4px solid', borderColor: 'info.main' }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            🔒 Secure Payment with Stripe
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your payment will be processed securely by Stripe. You'll be redirected to complete your purchase with your preferred payment method.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              ✅ SSL encrypted checkout
            </Typography>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              ✅ Multiple payment methods supported
            </Typography>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              ✅ International cards accepted
            </Typography>
          </Box>
        </Box>

        {/* Checkout Actions */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="outlined"
            onClick={() => router.back()}
            disabled={isProcessing}
            size="large"
          >
            Back to Cart
          </Button>
          
          <Button
            variant="contained"
            size="large"
            onClick={handleStripeCheckout}
            disabled={isProcessing}
            sx={{ 
              minWidth: 200,
              bgcolor: '#635bff', // Stripe brand color
              '&:hover': { bgcolor: '#5248e8' }
            }}
          >
            {isProcessing ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                Processing...
              </Box>
            ) : (
              <>
                Pay with Stripe
              </>
            )}
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
          By proceeding, you agree to our terms of service and privacy policy.
        </Typography>
      </Paper>
    </Container>
  );
}