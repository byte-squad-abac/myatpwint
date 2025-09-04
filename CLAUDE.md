# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production version with Turbopack
- `npm start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

## Project Architecture

This is **MyatPwint v2**, a Myanmar digital publishing platform built with Next.js 15.5 and React 19. The application facilitates a complete manuscript-to-publication workflow for authors, editors, and publishers.

### Core Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL with RLS, Auth, Storage)
- **Payments**: Stripe integration with webhooks
- **AI/ML**: Hugging Face Transformers for embeddings, semantic search
- **Document Editing**: OnlyOffice integration for collaborative manuscript editing
- **State Management**: Zustand for client-side state, React Context for themes
- **Marketing Automation**: N8N webhook integration

### Application Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes (login, register)
│   ├── (dashboards)/      # Role-based dashboards (author, editor, publisher, library)
│   ├── api/               # API routes for AI, payments, OnlyOffice
│   ├── books/            # Book catalog and detail pages
│   ├── checkout/         # Stripe checkout flow
│   ├── manuscript-editor/ # OnlyOffice manuscript editor
│   └── read/             # Book reading interface
├── components/           # Reusable React components
│   ├── ui/              # Base UI components (Button, Card, Modal, etc.)
│   ├── ManuscriptEditor/ # OnlyOffice integration components
│   ├── BookReader/       # Book reading components
│   └── [feature components] # Feature-specific components
├── lib/                  # Core utilities and services
│   ├── ai/              # AI/ML services (embeddings, search)
│   ├── supabase/        # Database client and types
│   ├── stripe/          # Payment processing
│   ├── services/        # Business logic services
│   ├── store/           # Zustand state management
│   ├── contexts/        # React contexts
│   └── utils/           # Utility functions
├── hooks/               # Custom React hooks
├── types/              # TypeScript type definitions
└── config/             # Application configuration
```

### Database Schema (Supabase)

The application uses a comprehensive PostgreSQL schema with Row Level Security (RLS):

**Core Tables:**
- `profiles` - User profiles with role-based access (user/author/editor/publisher)
- `manuscripts` - Author submissions with workflow status tracking
- `books` - Published books with vector embeddings for search
- `purchases` - Order management supporting digital/physical delivery
- `reading_progress` - User reading session tracking

**Supporting Tables:**
- `stripe_products` - Payment processing mappings
- `editor_sessions` - OnlyOffice collaboration tracking  
- `manuscript_activity` - Audit trail for manuscript changes
- `manuscript_comments` - External commenting system
- `document_revisions` - Version control for manuscripts
- `n8n_marketing_analytics` - Marketing automation tracking

### Key Features & Workflows

**1. Manuscript Submission & Review Workflow**
- Authors upload DOCX manuscripts via `ManuscriptEditor`
- Multi-stage review process: submitted → under_review → editor_approved → published
- OnlyOffice integration for collaborative editing with real-time collaboration
- Version control and revision tracking

**2. AI-Powered Book Discovery**
- Vector embeddings generated via Hugging Face API (`/api/ai/generate-embeddings`)
- Semantic search for book recommendations (`/api/ai/search`, `/api/ai/similar`)
- Content-based matching for personalized discovery

**3. E-commerce & Payment Processing**
- Stripe integration with webhook handling (`/api/stripe/webhooks`)
- Support for both digital and physical book delivery
- Shopping cart with persistent state management
- Automatic product sync between books and Stripe

**4. Reading Experience**
- OnlyOffice-powered book reader with progress tracking
- Session management and reading analytics
- Multiple format support (PDF, EPUB planned)

**5. Role-Based Dashboards**
- Author dashboard: manuscript management and submissions
- Editor dashboard: review workflow and collaboration tools  
- Publisher dashboard: publication management and analytics
- Library dashboard: user's purchased books and reading progress

### Important Integration Details

**OnlyOffice Configuration:**
- Server URL: `ONLYOFFICE_SERVER_URL` (localhost for development)
- JWT authentication with `ONLYOFFICE_JWT_SECRET`
- Callback system for document state synchronization
- Document keys and session management for concurrent editing

**Supabase Integration:**
- Project ID: `bsmbqekevilajlapldan` (myat-pwint_polish)
- RLS policies enabled for data security
- Vector extension enabled for AI search capabilities
- Storage buckets for manuscript and book files

**AI Services:**
- Hugging Face token required for embedding generation
- Embedding models used for content similarity matching
- Search service provides semantic book discovery

### Development Notes

- Uses TypeScript with strict mode enabled
- Path aliases configured: `@/*` maps to `src/*`
- Tailwind CSS v4 with custom configuration
- ESLint configured with Next.js recommended rules
- Environment variables stored in `.env.local`
- Marketing automation via N8N webhooks for book promotions

### Critical Dependencies

- `@supabase/ssr` and `@supabase/supabase-js` for database operations
- `@onlyoffice/document-editor-react` for manuscript editing
- `@stripe/stripe-js` and `stripe` for payments
- `@huggingface/inference` for AI capabilities
- `zustand` for state management
- `jsonwebtoken` for OnlyOffice JWT handling