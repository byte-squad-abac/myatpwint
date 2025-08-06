'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  CircularProgress
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('transaction');
  const sessionId = searchParams.get('session_id');
  const isStripePayment = !!sessionId;

  useEffect(() => {
    // Clear cart on successful payment
    // Note: This will be cleared automatically by webhook for Stripe payments
    
    // Redirect to home if accessed directly
    const timeout = setTimeout(() => {
      router.push('/');
    }, 10000); // Redirect after 10 seconds

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
        
        <Typography variant="h4" gutterBottom>
          {isStripePayment ? 'Payment Successful!' : 'Order Placed Successfully!'}
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Thank you for your purchase. Your order has been received and is being processed.
        </Typography>

        <Typography variant="body2" color="text.secondary" paragraph>
          {isStripePayment 
            ? 'Your payment has been processed securely by Stripe. You will receive an email confirmation shortly.'
            : 'You will receive an email confirmation shortly with your order details.'
          }
        </Typography>

        {isStripePayment && (
          <Box sx={{ p: 2, bgcolor: 'success.50', borderRadius: 1, mb: 2 }}>
            <Typography variant="body2" color="success.dark" sx={{ fontWeight: 'medium' }}>
              ✅ Payment processed by Stripe
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Session ID: {sessionId}
            </Typography>
          </Box>
        )}

        {transactionId && !isStripePayment && (
          <Typography variant="body2" color="text.secondary" paragraph sx={{ fontFamily: 'monospace', backgroundColor: 'grey.100', p: 1, borderRadius: 1 }}>
            Transaction ID: {transactionId}
          </Typography>
        )}

        <Box sx={{ mt: 4 }}>
          <Button
            variant="contained"
            onClick={() => router.push('/')}
            sx={{ mr: 2 }}
          >
            Continue Shopping
          </Button>
          <Button
            variant="outlined"
            onClick={() => router.push('/my-library')}
          >
            View My Library
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 4 }}>
          You will be redirected to the home page in 10 seconds...
        </Typography>
      </Paper>
    </Container>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <Container maxWidth="sm" sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}