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
  RadioGroup,
  FormControlLabel,
  Radio,
  Card,
  CardContent,
} from '@mui/material';
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
  const { items, getTotal, clearCart } = useCartStore();

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
        )}

        {/* Review Order Step */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>
            {items.map((item: CartItem, idx: number) => (
              <Box key={item.book.id ?? idx} sx={{ mb: 2 }}>
                <Typography variant="subtitle1">{item.book.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {typeof item.book.price === 'number' ? item.book.price.toLocaleString() : 'N/A'} MMK
                </Typography>
              </Box>
            ))}
            <Divider sx={{ my: 2 }} />
            {/* Show shipping fee if any item is physical */}
            {items.some((item: CartItem) => item.deliveryType === 'physical') && (
              <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                Shipping Fee: 5,000 MMK
              </Typography>
            )}
            <Typography variant="h6" sx={{ mt: 2 }}>
              Total: {(() => {
                let total = getTotal() || 0;
                return total ? total.toLocaleString() : 'N/A';
              })()} MMK
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