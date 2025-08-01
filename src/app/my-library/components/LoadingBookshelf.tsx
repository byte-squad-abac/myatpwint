'use client';

import React from 'react';
import {
  Box,
  Skeleton,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';

export default function LoadingBookshelf() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Calculate number of skeleton cards based on screen size
  const getSkeletonCount = () => {
    if (isMobile) return 2;
    if (isTablet) return 4;
    return 6;
  };

  const skeletonCount = getSkeletonCount();

  return (
    <Box 
      sx={{ 
        width: '100%',
        position: 'relative',
        perspective: '2000px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 3D Environment Background */}
      <Box
        sx={{
          position: 'absolute',
          top: '-50px',
          left: '-30px',
          right: '-30px',
          bottom: '-50px',
          background: `
            radial-gradient(ellipse at center, rgba(139, 69, 19, 0.05) 0%, transparent 70%),
            linear-gradient(135deg, rgba(222, 184, 135, 0.03) 0%, transparent 100%)
          `,
          borderRadius: '30px',
          zIndex: -1,
        }}
      />

      {/* Loading header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton
          variant="text"
          width={300}
          height={40}
          sx={{ 
            borderRadius: 2,
            background: 'linear-gradient(90deg, rgba(139, 69, 19, 0.1) 25%, rgba(160, 82, 45, 0.15) 50%, rgba(139, 69, 19, 0.1) 75%)',
            animation: 'shimmer 1.5s ease-in-out infinite',
            '@keyframes shimmer': {
              '0%': { backgroundPosition: '-200px 0' },
              '100%': { backgroundPosition: '200px 0' },
            },
          }}
        />
        <Skeleton
          variant="text"
          width={120}
          height={24}
          sx={{ 
            borderRadius: 1,
            background: 'linear-gradient(90deg, rgba(205, 133, 63, 0.1) 25%, rgba(222, 184, 135, 0.15) 50%, rgba(205, 133, 63, 0.1) 75%)',
          }}
        />
      </Box>

      {/* Enhanced 3D Loading Grid */}
      <Box
        sx={{
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: 'rotateX(2deg)',
          padding: '20px 0',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 4,
          }}
        >
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <Box
              key={index}
              sx={{
                height: 380,
                perspective: '1000px',
                transformStyle: 'preserve-3d',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  bottom: '-15px',
                  left: '10%',
                  right: '10%',
                  height: '8px',
                  background: 'rgba(139, 69, 19, 0.3)',
                  borderRadius: '50%',
                  filter: 'blur(4px)',
                  transform: 'rotateX(60deg)',
                  zIndex: -1,
                }
              }}
            >
              {/* 3D Book Skeleton */}
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  transformStyle: 'preserve-3d',
                  transform: 'rotateY(-8deg) rotateX(3deg)',
                  animation: 'loadingFloat 2s ease-in-out infinite',
                  '@keyframes loadingFloat': {
                    '0%, 100%': { transform: 'rotateY(-8deg) rotateX(3deg)' },
                    '50%': { transform: 'rotateY(-12deg) rotateX(5deg) translateY(-5px)' },
                  },
                }}
              >
                {/* Book spine skeleton */}
                <Box
                  sx={{
                    position: 'absolute',
                    width: '15px',
                    height: '100%',
                    right: 0,
                    background: `linear-gradient(180deg, 
                      rgba(139, 69, 19, 0.3) 0%, 
                      rgba(160, 82, 45, 0.4) 50%, 
                      rgba(139, 69, 19, 0.3) 100%
                    )`,
                    transform: 'rotateY(90deg) translateZ(8px)',
                    transformOrigin: 'left center',
                    borderRadius: '0 4px 4px 0',
                    animation: 'spineShimmer 1.5s ease-in-out infinite',
                    '@keyframes spineShimmer': {
                      '0%, 100%': { opacity: 0.6 },
                      '50%': { opacity: 0.9 },
                    },
                  }}
                />

                {/* Book front cover skeleton */}
                <Skeleton
                  variant="rectangular"
                  sx={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '8px 4px 4px 8px',
                    transform: 'translateZ(0px)',
                    background: `linear-gradient(135deg,
                      rgba(139, 69, 19, 0.2) 0%,
                      rgba(160, 82, 45, 0.3) 25%,
                      rgba(205, 133, 63, 0.2) 50%,
                      rgba(222, 184, 135, 0.15) 75%,
                      rgba(139, 69, 19, 0.2) 100%
                    )`,
                    backgroundSize: '400% 400%',
                    animation: 'coverGradient 3s ease infinite',
                    '@keyframes coverGradient': {
                      '0%': { backgroundPosition: '0% 50%' },
                      '50%': { backgroundPosition: '100% 50%' },
                      '100%': { backgroundPosition: '0% 50%' },
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: '15px',
                      left: '15px',
                      right: '15px',
                      bottom: '15px',
                      border: '2px solid rgba(139, 69, 19, 0.1)',
                      borderRadius: '4px',
                    },
                  }}
                />

                {/* Pages effect skeleton */}
                {[...Array(3)].map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      position: 'absolute',
                      width: 'calc(100% - 4px)',
                      height: 'calc(100% - 4px)',
                      top: '2px',
                      left: '2px',
                      background: 'rgba(248, 249, 250, 0.8)',
                      borderRadius: '6px 2px 2px 6px',
                      transform: `translateZ(-${(i + 1) * 2}px) translateX(-${i}px)`,
                      border: '1px solid rgba(233, 236, 239, 0.5)',
                      opacity: 0.6 - (i * 0.15),
                      animation: `pageFloat-${i} ${2 + i * 0.5}s ease-in-out infinite`,
                      '@keyframes pageFloat-0': {
                        '0%, 100%': { transform: `translateZ(-2px) translateX(0px)` },
                        '50%': { transform: `translateZ(-2px) translateX(-1px)` },
                      },
                      '@keyframes pageFloat-1': {
                        '0%, 100%': { transform: `translateZ(-4px) translateX(-1px)` },
                        '50%': { transform: `translateZ(-4px) translateX(-2px)` },
                      },
                      '@keyframes pageFloat-2': {
                        '0%, 100%': { transform: `translateZ(-6px) translateX(-2px)` },
                        '50%': { transform: `translateZ(-6px) translateX(-3px)` },
                      },
                    }}
                  />
                ))}
              </Box>

              {/* Loading text inside book */}
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                  textAlign: 'center',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(139, 69, 19, 0.7)',
                    fontWeight: 600,
                    fontSize: '10px',
                    textShadow: '0 1px 2px rgba(255,255,255,0.8)',
                    animation: 'loadingPulse 1.5s ease-in-out infinite',
                    '@keyframes loadingPulse': {
                      '0%, 100%': { opacity: 0.5 },
                      '50%': { opacity: 1 },
                    },
                  }}
                >
                  Loading...
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Enhanced Loading message */}
      <Box
        sx={{
          mt: 6,
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          p: 3,
          borderRadius: 3,
          background: 'rgba(139, 69, 19, 0.05)',
          border: '1px solid rgba(139, 69, 19, 0.1)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            border: `4px solid rgba(139, 69, 19, 0.2)`,
            borderTop: `4px solid rgba(139, 69, 19, 0.8)`,
            borderRadius: '50%',
            animation: 'bookSpin 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            '@keyframes bookSpin': {
              '0%': { transform: 'rotate(0deg) scale(1)' },
              '50%': { transform: 'rotate(180deg) scale(1.1)' },
              '100%': { transform: 'rotate(360deg) scale(1)' },
            },
          }}
        />
        <Box>
          <Typography
            variant="h6"
            sx={{ 
              fontWeight: 700,
              color: 'rgba(139, 69, 19, 0.8)',
              mb: 0.5,
            }}
          >
            Loading your immersive library...
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ 
              fontWeight: 400,
              opacity: 0.7,
            }}
          >
            Preparing your 3D bookshelf experience
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}