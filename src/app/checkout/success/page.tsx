'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('transaction');

  useEffect(() => {
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
          Order Placed Successfully!
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Thank you for your purchase. Your order has been received and is being processed.
        </Typography>

        <Typography variant="body2" color="text.secondary" paragraph>
          You will receive an email confirmation shortly with your order details.
        </Typography>

        {transactionId && (
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