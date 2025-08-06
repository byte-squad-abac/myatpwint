'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Box,
  Button,
  TextField,
  Divider,
  Alert,
  Card,
  CardContent,
  IconButton,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useCartStore, CartItem } from '@/lib/store/cartStore';
import supabaseClient from '@/lib/supabaseClient';
import { useSession } from '@supabase/auth-helpers-react';

const steps = ['Shipping Information', 'Payment Details', 'Review Order'];

export default function CheckoutPage() {
  const router = useRouter();
  const session = useSession();
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { items, getTotal, clearCart, removeItem, updateQuantity } = useCartStore();

  // Form states
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    phone: '',
    email: '',
  });

  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  });

  const processFakePayment = async () => {
    if (!session?.user?.id) {
      throw new Error('Please log in to complete purchase');
    }

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate fake transaction ID
    const transactionId = `FAKE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Save each purchase to database
    const purchases = items.map(item => ({
      user_id: session.user.id,
      book_id: item.book.id,
      purchase_price: item.book.price * item.quantity,
      purchase_type: 'purchase',
      payment_method: 'fake_payment',
      transaction_id: transactionId,
    }));

    const { error } = await supabaseClient
      .from('purchases')
      .insert(purchases);

    if (error) {
      throw new Error(`Payment failed: ${error.message}`);
    }

    return transactionId;
  };

  const handleNext = async () => {
    try {
      if (activeStep === steps.length - 1) {
        setIsProcessing(true);
        setError(null);
        
        // Process fake payment and save to database
        const transactionId = await processFakePayment();
        
        // Clear cart after successful purchase
        clearCart();
        
        // Redirect to success page
        router.push(`/checkout/success?transaction=${transactionId}`);
      } else {
        setActiveStep((prevStep) => prevStep + 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
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

  const CartSummary = () => (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Cart Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
        </Typography>
        {items.map((item: CartItem, idx: number) => (
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
                      {item.book.price.toLocaleString()} MMK
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
            </CardContent>
          </Card>
        ))}
        <Divider sx={{ my: 2 }} />
        {items.some((item: CartItem) => item.deliveryType === 'physical') && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Shipping Fee: 5,000 MMK
          </Typography>
        )}
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Total: {getTotal().toLocaleString()} MMK
        </Typography>
      </CardContent>
    </Card>
  );

  if (items.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="info">
          Your cart is empty. <Button onClick={() => router.push('/books')}>Continue Shopping</Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Checkout
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Cart Summary - shown on all steps */}
        <CartSummary />

        {/* Shipping Information Step */}
        {activeStep === 0 && (
          <Box sx={{ display: 'grid', gap: 3 }}>
            <Box>
              <TextField
                required
                fullWidth
                label="Full Name"
                value={shippingInfo.fullName}
                onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })}
              />
            </Box>
            <Box>
              <TextField
                required
                fullWidth
                label="Email"
                type="email"
                value={shippingInfo.email}
                onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })}
              />
            </Box>
            {/* If the book is physical, show address fields. For now, always show for demo. */}
            <Box>
              <TextField
                required
                fullWidth
                label="Address"
                value={shippingInfo.address}
                onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
              <TextField
                required
                fullWidth
                label="City"
                value={shippingInfo.city}
                onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
              />
              <TextField
                required
                fullWidth
                label="State"
                value={shippingInfo.state}
                onChange={(e) => setShippingInfo({ ...shippingInfo, state: e.target.value })}
              />
              <TextField
                required
                fullWidth
                label="Postal Code"
                value={shippingInfo.postalCode}
                onChange={(e) => setShippingInfo({ ...shippingInfo, postalCode: e.target.value })}
              />
              <TextField
                required
                fullWidth
                label="Phone Number"
                value={shippingInfo.phone}
                onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
              />
            </Box>
          </Box>
        )}

        {/* Payment Details Step */}
        {activeStep === 1 && (
          <Box sx={{ display: 'grid', gap: 3 }}>
            <Typography variant="h6" gutterBottom>
              Choose Payment Method
            </Typography>

            {/* Payment Method Selection */}
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => router.push('/checkout/stripe')}
                sx={{ 
                  p: 3,
                  bgcolor: '#635bff',
                  '&:hover': { bgcolor: '#5248e8' },
                  textTransform: 'none'
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    🔒 Pay with Stripe (Recommended)
                  </Typography>
                  <Typography variant="body2">
                    Secure payment with cards, digital wallets, and more
                  </Typography>
                </Box>
              </Button>

              <Button
                variant="outlined"
                size="large"
                onClick={() => setActiveStep(2)} // Skip to fake payment flow
                sx={{ 
                  p: 3,
                  textTransform: 'none',
                  borderStyle: 'dashed'
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    💳 Demo Payment (Testing Only)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Fake payment system for demonstration
                  </Typography>
                </Box>
              </Button>
            </Box>

            {/* Legacy fake payment form (hidden by default) */}
            <Box sx={{ display: 'none' }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                This is a fake payment system for demonstration. No real payment is processed.
              </Alert>
              
              <Typography variant="h6" gutterBottom>
                Payment Information
              </Typography>
              
              <TextField
                fullWidth
                label="Card Number"
                placeholder="1234 5678 9012 3456"
                value={paymentInfo.cardNumber}
                onChange={(e) => setPaymentInfo({ ...paymentInfo, cardNumber: e.target.value })}
              />
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Cardholder Name"
                  value={paymentInfo.cardName}
                  onChange={(e) => setPaymentInfo({ ...paymentInfo, cardName: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Expiry Date"
                  placeholder="MM/YY"
                  value={paymentInfo.expiryDate}
                  onChange={(e) => setPaymentInfo({ ...paymentInfo, expiryDate: e.target.value })}
                />
              </Box>
              
              <TextField
                fullWidth
                label="CVV"
                placeholder="123"
                value={paymentInfo.cvv}
                onChange={(e) => setPaymentInfo({ ...paymentInfo, cvv: e.target.value })}
                sx={{ maxWidth: 120 }}
              />
            </Box>
          </Box>
        )}

        {/* Review Order Step */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Your Order
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Please review your order details above. You can still modify quantities or remove items before proceeding to payment.
            </Alert>
            <Typography variant="body1" color="text.secondary">
              Your order summary is displayed above. Click "Place Order" to proceed with the Demo Payment, or go back to choose Stripe Payment.
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing Payment...' : (activeStep === steps.length - 1 ? 'Place Order' : 'Next')}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
// TODO: Show delivery fee on book details page if book is physical 