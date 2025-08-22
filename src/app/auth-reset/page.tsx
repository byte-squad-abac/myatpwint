'use client';

import React from 'react';
import { Container, Typography, Button, Paper, Box } from '@mui/material';
import { clearAllAuthData } from '@/lib/supabaseClient';

export default function AuthResetPage() {
  const handleClearAuth = async () => {
    if (confirm('This will clear all authentication data and reload the page. Continue?')) {
      await clearAllAuthData();
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom color="primary">
          Authentication Reset
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3 }}>
          If you're experiencing authentication issues (like "Invalid Refresh Token" errors), 
          you can use this tool to clear all stored authentication data and start fresh.
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          This will sign you out and clear all cached authentication tokens.
        </Typography>
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleClearAuth}
          sx={{ 
            bgcolor: '#641B2E', 
            '&:hover': { bgcolor: '#4a1421' },
            px: 4,
            py: 1.5
          }}
        >
          Clear Authentication Data
        </Button>
        
        <Box sx={{ mt: 3 }}>
          <Typography variant="caption" color="text.secondary">
            This page can be accessed at: /auth-reset
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}