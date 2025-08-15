'use client';

import React, { useState } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

export default function AISetupPage() {
  const session = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateEmbeddings = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ai/generate-embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate embeddings');
      }

      const data = await response.json();
      setResult(data.results);
    } catch (err) {
      console.error('Error generating embeddings:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Check if user has permission (you might want to add proper role checking)
  if (!session) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          You must be logged in as an admin to access this page.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          AI Setup - Generate Book Embeddings
        </Typography>
        
        <Typography variant="body1" paragraph color="text.secondary">
          This tool generates AI embeddings for all books in the database using the E5 multilingual model.
          Embeddings are required for semantic search and book recommendations to work.
        </Typography>

        <Box sx={{ my: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            How it works:
          </Typography>
          <Typography variant="body2" component="ul">
            <li>Fetches all books without embeddings from the database</li>
            <li>Generates embeddings using HuggingFace E5 model (97.3% accuracy)</li>
            <li>Stores embeddings in Supabase pgvector for fast similarity search</li>
            <li>Enables AI-powered semantic search in Myanmar and English</li>
            <li>Powers content-based book recommendations</li>
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="body2">{error}</Typography>
          </Alert>
        )}

        {result && (
          <Alert 
            severity={result.failed > 0 ? 'warning' : 'success'} 
            sx={{ mb: 3 }}
            icon={result.failed > 0 ? <ErrorIcon /> : <CheckCircleIcon />}
          >
            <Typography variant="body2">
              <strong>Embedding Generation Complete!</strong>
            </Typography>
            <Typography variant="body2">
              ✅ Success: {result.success} books
            </Typography>
            {result.failed > 0 && (
              <>
                <Typography variant="body2">
                  ❌ Failed: {result.failed} books
                </Typography>
                {result.errors.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" component="div">
                      Errors:
                    </Typography>
                    {result.errors.slice(0, 5).map((err, idx) => (
                      <Typography key={idx} variant="caption" component="div" sx={{ ml: 2 }}>
                        • {err}
                      </Typography>
                    ))}
                    {result.errors.length > 5 && (
                      <Typography variant="caption" component="div" sx={{ ml: 2 }}>
                        ... and {result.errors.length - 5} more errors
                      </Typography>
                    )}
                  </Box>
                )}
              </>
            )}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerateEmbeddings}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
            sx={{ minWidth: 200 }}
          >
            {loading ? 'Generating...' : 'Generate Embeddings'}
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => router.push('/books')}
            disabled={loading}
          >
            Test Search
          </Button>
        </Box>

        {loading && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              This may take a few minutes depending on the number of books...
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 4, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" color="info.contrastText">
            <strong>Note:</strong> Make sure you have added your HuggingFace API token to the .env.local file.
            You only need to run this once for existing books. New books will automatically get embeddings when added.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}