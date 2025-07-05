# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Myat Pwint Publishing House is a comprehensive digital publishing platform for Myanmar, built with Next.js 15 and TypeScript. It serves readers, authors, editors, and publishers with features for book browsing, purchasing, digital reading, and manuscript management.

## Essential Commands

```bash
# Development
npm run dev          # Start development server on http://localhost:3000

# Build & Production
npm run build        # Build for production (TypeScript/ESLint errors are ignored)
npm start            # Start production server

# Code Quality
npm run lint         # Run Next.js linting
```

## Architecture & Key Patterns

### Tech Stack
- **Framework**: Next.js 15.3.3 with App Router
- **UI**: Material-UI (MUI) + Emotion for styling
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **State**: Zustand with localStorage persistence
- **PDF/EPUB**: react-pdf and epubjs
- **Deployment**: Netlify with SSR support

### Directory Structure
```
/src/app/           # Next.js pages (App Router)
  /author/          # Author manuscript submission
  /editor/          # Editor review dashboard
  /publisher/       # Publisher management
  /my-library/      # User's purchased books with readers
  /books/           # Book catalog and details
  /checkout/        # Cart and payment flow
/src/components/    # Shared UI components
/src/lib/          # Core utilities
  /hooks/          # Custom React hooks
  /store/          # Zustand stores
  /supabaseClient.ts # Supabase initialization
```

### Key Implementation Patterns

1. **Client Components**: Most interactive features use 'use client' directive
2. **Authentication**: Wrapped in SessionContextProvider at root layout
3. **Role Detection**: Check user email against publishers table
4. **Cart State**: Zustand store with persistence (useCartStore)
5. **Real-time**: Supabase subscriptions for chat features

### PDF Viewer Implementation
- **Scroll-based navigation** with smooth transitions and intelligent input detection
  - Differentiates between touchpad (smaller deltas) and mouse wheel (larger deltas)
  - Uses accumulator pattern with adaptive thresholds (250 for touchpad, 150 for mouse)
  - Implements cooldown period (1200ms) after page changes to prevent accidental jumps
  - Delta value capping to handle fast scrolling gracefully
- **Visual progress indicator** showing scroll accumulation in real-time
  - Displays direction (↑ Previous / ↓ Next) and percentage
  - Changes color when page change is imminent (blue to white at 100%)
  - Auto-hides after 500ms of inactivity
- **Touch/swipe support** for mobile devices with 50px threshold
- **Click zones** for page navigation (left half = previous, right half = next)
- **Error recovery mechanisms** with helpful messages for blob URL expiration

## Development Guidelines

### Environment Variables
Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### TypeScript Configuration
- Strict mode enabled
- Path alias: `@/*` → `./src/*`
- Build errors intentionally ignored for rapid development

### Component Patterns
- Use MUI components for consistency
- Follow existing styling patterns (Emotion/styled-components)
- Implement error boundaries for reader components
- Use Suspense for dynamic imports

### State Management
- Local UI state: React hooks
- Global client state: Zustand stores
- Server state: Supabase queries/subscriptions
- Cart persistence: localStorage via Zustand

## Important Notes

1. **No Test Setup**: Currently no testing framework configured
2. **Build Warnings**: TypeScript and ESLint errors are ignored during builds
3. **SSR Deployment**: Configured for Netlify SSR, not static export
4. **Role-Based Access**: UI-level checks must be validated server-side
5. **Real-time Features**: Chat system uses Supabase subscriptions

## Common Development Tasks

When implementing new features:
1. Check existing patterns in similar components
2. Use MUI components and follow design system
3. Add proper loading states and error handling
4. Ensure mobile responsiveness
5. Test with different user roles (reader/author/editor/publisher)