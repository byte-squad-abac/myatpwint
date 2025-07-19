'use client';

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  useTheme,
  Fade,
} from '@mui/material';
import {
  LibraryBooks,
  CloudUpload,
  AutoStories,
} from '@mui/icons-material';

interface EmptyBookshelfProps {
  onUploadClick?: () => void;
}

export default function EmptyBookshelf({ onUploadClick }: EmptyBookshelfProps) {
  const theme = useTheme();

  return (
    <Fade in={true} timeout={800}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
          px: 4,
          textAlign: 'center',
          minHeight: '400px',
        }}
      >
        {/* Bookshelf Illustration */}
        <Paper
          elevation={2}
          sx={{
            width: 280,
            height: 180,
            mb: 4,
            position: 'relative',
            background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 100%)',
            borderRadius: 2,
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '8px',
              background: 'linear-gradient(90deg, #654321 0%, #8B4513 50%, #654321 100%)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '8px',
              background: 'linear-gradient(90deg, #654321 0%, #8B4513 50%, #654321 100%)',
            },
          }}
        >
          {/* Empty shelf slots */}
          {[1, 2, 3, 4, 5].map((slot) => (
            <Box
              key={slot}
              sx={{
                position: 'absolute',
                left: `${slot * 50 - 40}px`,
                top: '20px',
                width: '30px',
                height: '120px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '2px',
                border: '1px dashed rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AutoStories
                sx={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 20,
                  transform: 'rotate(-5deg)',
                }}
              />
            </Box>
          ))}

          {/* Decorative elements */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: 0.6,
            }}
          >
            <LibraryBooks
              sx={{
                fontSize: 60,
                color: 'rgba(255,255,255,0.3)',
              }}
            />
          </Box>
        </Paper>

        {/* Empty State Content */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: theme.palette.text.primary,
            mb: 2,
            background: 'linear-gradient(45deg, #8B4513, #D2691E)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          📚 Your Bookshelf is Empty
        </Typography>

        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ mb: 2, maxWidth: 400 }}
        >
          Start building your personal digital library
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 4, maxWidth: 500, lineHeight: 1.6 }}
        >
          Upload your favorite books, documents, and reading materials to create your own 
          digital bookshelf. Your books will be stored securely in the cloud and locally 
          for offline access.
        </Typography>

        {/* Call to Action */}
        {onUploadClick && (
          <Button
            variant="contained"
            size="large"
            startIcon={<CloudUpload />}
            onClick={onUploadClick}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '16px',
              fontWeight: 600,
              background: 'linear-gradient(45deg, #8B4513, #D2691E)',
              '&:hover': {
                background: 'linear-gradient(45deg, #A0522D, #CD853F)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 20px rgba(139, 69, 19, 0.3)',
              },
              transition: 'all 0.3s ease',
              borderRadius: 2,
            }}
          >
            Upload Your First Book
          </Button>
        )}

        {/* Feature highlights */}
        <Box
          sx={{
            mt: 6,
            display: 'flex',
            gap: 4,
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: 600,
          }}
        >
          {[
            { icon: '📄', text: 'PDF Support' },
            { icon: '📖', text: 'EPUB Reader' },
            { icon: '📝', text: 'Text Files' },
            { icon: '☁️', text: 'Cloud Sync' },
            { icon: '📱', text: 'Mobile Ready' },
            { icon: '🌙', text: 'Dark Mode' },
          ].map((feature, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                minWidth: '80px',
              }}
            >
              <Typography variant="h5" sx={{ fontSize: '24px' }}>
                {feature.icon}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                {feature.text}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Fade>
  );
}