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
  /ai/             # AI semantic search services
  /hooks/          # Custom React hooks
  /store/          # Zustand stores
  /types/          # Centralized TypeScript types
  /supabaseClient.ts # Supabase initialization
```

### Authentication Architecture
- **Dual Supabase Client Pattern**: SessionContextProvider in root layout + singleton client in lib
- **Role-Based Access**: Email-based role detection via publishers table
- **Protected Routes**: Client-side checks (validate server-side for production)
- **Profile Management**: Automatic profile creation on signup

### State Management Patterns
- **Cart Store**: Zustand with persist middleware, handles physical/digital items
- **Server State**: Direct Supabase queries, no abstraction layer
- **Real-time State**: Supabase subscriptions for chat/live updates
- **Computed Values**: Store methods like getTotal() and isInCart()

### Real-time Implementation
- **Chat System**: Room-based with deterministic IDs, encapsulated in useConversation hook
- **Subscription Pattern**: Channel-based with proper cleanup
- **Database Tables**: messages, manuscripts, profiles, publishers

### PDF Viewer Architecture
- **Modular Hooks**: Separate hooks for gestures, controls, keyboard, touch
- **Page-Internal Scrolling**: Scroll within pages before changing
- **Gesture Navigation**: 500-unit threshold with touchpad sensitivity (3x multiplier)
- **Keyboard Support**: Arrow keys with preventDefault for browser scroll
- **UI Design**: Floating controls, auto-hide after 3s, lock mode for immersion
- **Component Structure**: GestureIndicator and ControlBar separation

### PDF Reader Performance Optimization (Large Files)
- **Window Virtualization**: Only renders visible pages + 5 page buffer to handle 3000+ pages
- **PageManager Class**: Handles page lifecycle, heights, positioning, and cleanup
- **Dynamic Memory Management**: Automatically cleans up off-screen pages
- **Throttled Scroll**: Uses requestAnimationFrame for smooth performance
- **Absolute Positioning**: Maintains scroll position while reducing DOM elements
- **Memory Usage**: Reduced from ~3GB to ~50MB for large documents
- **Performance**: Prevents browser freezing on large PDFs

### Bookshelf (My Library) Design System
- **3D Book Cards**: Realistic book spine design with CSS 3D transforms and perspective
- **Placeholder Thumbnails**: Unsplash book images as temporary cover placeholders
- **Responsive Grid**: CSS Grid layout replacing MUI Grid for better performance
- **Component Architecture**: Modular BookCard, BookshelfGrid, SearchAndFilter components
- **Visual Design**: Clean "Bookshelf" branding, immersive backgrounds, floating particles
- **User Experience**: Book titles under books, hover animations, loading skeletons
- **File Type Support**: PDF, EPUB, TXT with color-coded badges
- **Hybrid Storage**: Supabase cloud + IndexedDB local fallback
- **Clean Architecture**: Custom hooks (usePurchasedBooks, useBookFiltering) for separation of concerns
- **Type Safety**: Centralized LibraryBook interface, no duplicate type definitions
- **Performance**: Memoized calculations, debounced search, optimized component structure

### Stripe Payment System Architecture
- **Full Integration**: Complete Stripe Checkout + Webhooks implementation
- **Currency Support**: USD (Stripe) with MMK display (Myanmar Kyat not supported by Stripe)
- **Product Sync**: Books automatically synced to Stripe as products/prices
- **Authentication**: Real user session parsing from Supabase auth cookies (array format)
- **Webhook Handling**: Service role client bypasses RLS for purchase record creation
- **Development**: Stripe CLI webhook forwarding required for local testing
- **Payment Flow**: Cart → Stripe Checkout → Webhook → Purchase Record → Bookshelf
- **Database**: Extended purchases table with Stripe fields, separate stripe_products mapping table

### AI-Powered Semantic Search System
- **Multilingual Embeddings**: E5 model (`intfloat/multilingual-e5-base`) with Myanmar language support
- **Vector Database**: Supabase pgvector extension for semantic similarity search
- **Search Architecture**: Query embeddings → Vector similarity → Ranked results
- **API Endpoints**: `/api/ai/search` for semantic search, `/api/ai/similar` for recommendations
- **Performance**: HuggingFace Inference Providers for reliable embedding generation
- **Type Safety**: Comprehensive TypeScript interfaces for all AI components

### Critical Implementation Notes
1. **Supabase Auth Cookie Format**: Array format `["jwt_token", "refresh_token", null, null, null]` not object
2. **Webhook Authentication**: Must use service role client to bypass RLS policies  
3. **Local Development**: Requires `stripe listen --forward-to localhost:3000/api/stripe/webhooks`
4. **User Matching**: JWT token verification via `supabaseAuthClient.auth.getUser(jwt)`
5. **Currency Conversion**: MMK to USD at 0.00048 rate for Stripe, display as MMK to users
6. **AI Search Function**: PostgreSQL function `match_books_semantic` requires proper UUID casting for book IDs

## Development Guidelines

### Environment Variables
Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# AI Configuration
HUGGING_FACE_TOKEN=

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### TypeScript Configuration
- Strict mode enabled
- Path alias: `@/*` → `./src/*`
- Build errors intentionally ignored for rapid development

### Key Implementation Notes
1. **Client-Heavy Architecture**: Most logic runs client-side with direct Supabase access
2. **No Test Framework**: Testing not configured
3. **Mixed Styling**: MUI components + inline styles + CSS modules
4. **Build Configuration**: TypeScript/ESLint errors ignored in next.config.ts
5. **SSR Deployment**: Netlify plugin configured, not static export