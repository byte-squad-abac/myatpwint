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

const steps = ['Shipping Information', 'Payment Details', 'Review Order'];

export default function CheckoutPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { items, getTotal } = useCartStore();

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

  const handleNext = async () => {
    try {
      if (activeStep === steps.length - 1) {
        // Process order
        // await placeOrder(shippingInfo, paymentInfo); // Uncomment when implementing
        router.push('/checkout/success');
      } else {
        setActiveStep((prevStep) => prevStep + 1);
      }
    } catch (err) {
      setError('Failed to process order. Please try again.');
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

        {/* Payment Details Step (not implemented) */}
        {activeStep === 1 && (
          <Box sx={{ display: 'grid', gap: 3 }}>
            {/* Payment fields can go here in the future */}
            <Alert severity="info">Payment step coming soon.</Alert>
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
          >
            {activeStep === steps.length - 1 ? 'Place Order' : 'Next'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
// TODO: Show delivery fee on book details page if book is physical 