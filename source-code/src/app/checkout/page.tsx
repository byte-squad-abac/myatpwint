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
  Grid,
  TextField,
  Divider,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  Card,
  CardContent,
} from '@mui/material';
import { useCartStore } from '@/lib/store/cartStore';

const steps = ['Delivery Type', 'Shipping Information', 'Payment Details', 'Review Order'];

export default function CheckoutPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { items, getTotal, deliveryType, setDeliveryType, placeOrder } = useCartStore();

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
        await placeOrder(shippingInfo, {
          cardNumber: paymentInfo.cardNumber,
          cardName: paymentInfo.cardName,
          expiryDate: paymentInfo.expiryDate,
        });
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

        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Choose Delivery Type
            </Typography>
            <RadioGroup
              value={deliveryType}
              onChange={(e) => setDeliveryType(e.target.value as 'physical' | 'digital')}
            >
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <FormControlLabel
                    value="physical"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="subtitle1">Physical Book</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Get the physical book delivered to your address
                        </Typography>
                        <Typography variant="body2" color="error">
                          +5,000 MMK shipping fee
                        </Typography>
                      </Box>
                    }
                  />
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <FormControlLabel
                    value="digital"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="subtitle1">Digital Book</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Get instant access to the digital version
                        </Typography>
                        <Typography variant="body2" color="success.main">
                          No shipping fee
                        </Typography>
                      </Box>
                    }
                  />
                </CardContent>
              </Card>
            </RadioGroup>
          </Box>
        )}

        {activeStep === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Full Name"
                value={shippingInfo.fullName}
                onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Email"
                type="email"
                value={shippingInfo.email}
                onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })}
              />
            </Grid>
            {deliveryType === 'physical' && (
              <>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    label="Address"
                    value={shippingInfo.address}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="City"
                    value={shippingInfo.city}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="State"
                    value={shippingInfo.state}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, state: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="Postal Code"
                    value={shippingInfo.postalCode}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, postalCode: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="Phone Number"
                    value={shippingInfo.phone}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                  />
                </Grid>
              </>
            )}
          </Grid>
        )}

        {activeStep === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Card Number"
                value={paymentInfo.cardNumber}
                onChange={(e) => setPaymentInfo({ ...paymentInfo, cardNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Name on Card"
                value={paymentInfo.cardName}
                onChange={(e) => setPaymentInfo({ ...paymentInfo, cardName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Expiry Date"
                placeholder="MM/YY"
                value={paymentInfo.expiryDate}
                onChange={(e) => setPaymentInfo({ ...paymentInfo, expiryDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="CVV"
                value={paymentInfo.cvv}
                onChange={(e) => setPaymentInfo({ ...paymentInfo, cvv: e.target.value })}
              />
            </Grid>
          </Grid>
        )}

        {activeStep === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>
            {items.map((item) => (
              <Box key={item.id} sx={{ mb: 2 }}>
                <Typography variant="subtitle1">{item.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.price.toLocaleString()} MMK
                </Typography>
              </Box>
            ))}
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1">
              Delivery Type: {deliveryType === 'physical' ? 'Physical Book' : 'Digital Book'}
            </Typography>
            {deliveryType === 'physical' && (
              <Typography variant="body2" color="text.secondary">
                Shipping Fee: 5,000 MMK
              </Typography>
            )}
            <Typography variant="h6" sx={{ mt: 2 }}>
              Total: {getTotal().toLocaleString()} MMK
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