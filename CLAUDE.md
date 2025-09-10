# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production version with Turbopack
- `npm start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

**Note**: This project does not have a formal testing framework configured. Manual testing is performed through the application interfaces.

## Project Architecture

This is **MyatPwint v2**, a Myanmar digital publishing platform built with Next.js 15.5 and React 19. The application facilitates a complete manuscript-to-publication workflow for authors, editors, and publishers.

### Core Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL 17.4 with RLS, Auth, Storage, Realtime)
- **Payments**: Stripe integration with webhooks for digital/physical book sales
- **AI/ML**: Hugging Face Transformers for embeddings, semantic search
- **Document Editing**: OnlyOffice integration for collaborative manuscript editing
- **Communication**: Realtime chat system with read status tracking
- **State Management**: Zustand for client-side state, React Context for themes
- **Marketing Automation**: N8N webhook integration

### Application Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes (login, register)
│   ├── (dashboards)/      # Role-based dashboards (author, editor, publisher, library)
│   ├── api/               # API routes for AI, payments, OnlyOffice, author applications, manuscripts
│   ├── books/            # Book catalog and detail pages
│   ├── checkout/         # Stripe checkout flow
│   ├── manuscript-editor/ # OnlyOffice manuscript editor
│   ├── apply-as-author/  # Author application process
│   ├── first-manuscript-upload/ # Initial manuscript upload for approved authors
│   └── read/             # Book reading interface
├── components/           # Reusable React components
│   ├── ui/              # Base UI components (Button, Card, Modal, FileUpload, etc.)
│   ├── ManuscriptEditor/ # OnlyOffice integration components
│   ├── BookReader/       # Book reading components
│   ├── AuthorApplication/ # Author application form and status components
│   └── [feature components] # Feature-specific components
├── lib/                  # Core utilities and services
│   ├── ai/              # AI/ML services (embeddings, search)
│   ├── supabase/        # Database client and types
│   ├── stripe/          # Payment processing
│   ├── services/        # Business logic services
│   ├── store/           # Zustand state management
│   ├── contexts/        # React contexts
│   └── utils/           # Utility functions
├── hooks/               # Custom React hooks (useAuth, etc.)
├── types/              # TypeScript type definitions
└── config/             # Application configuration
```

### Database Schema (Supabase)

The application uses a comprehensive PostgreSQL schema with Row Level Security (RLS):

**Core Tables:**
- `profiles` - User profiles with role-based access (user/author/editor/publisher) and ban system
- `author_applications` - Author application submissions with permanent ban enforcement
- `manuscripts` - Author submissions with comprehensive workflow status tracking
- `books` - Published books with vector embeddings for search
- `purchases` - Order management supporting digital/physical delivery
- `reading_progress` - User reading session tracking

**Supporting Tables:**
- `stripe_products` - Payment processing mappings
- `editor_sessions` - OnlyOffice collaboration tracking  
- `manuscript_activity` - Audit trail for manuscript changes
- `manuscript_comments` - External commenting system (separate from OnlyOffice)
- `document_revisions` - Version control for manuscripts
- `n8n_marketing_analytics` - Marketing automation tracking
- `tags` - Global tag management
- `manuscript_chats` - Realtime chat system for author↔editor and author↔publisher communication
- `chat_read_status` - Message read tracking for chat system
- `notifications` - System notifications with email support
- `notification_preferences` - User notification preferences

### Key Features & Workflows

**1. Author Application System**
- New users register as 'user' role only (no role selection during registration)
- Author applications require: legal name, author name, book pitch, association membership proof
- Publisher review with approve/reject decisions
- **Permanent ban system**: Rejected applications result in permanent account ban from future applications
- Approved authors are promoted to 'author' role and can upload their first manuscript

**2. Manuscript Submission & Review Workflow**
- Authors upload DOCX manuscripts only (security validated with magic numbers)
- Multi-stage review process: submitted → under_review → editor_approved → published
- OnlyOffice integration for collaborative editing with real-time collaboration
- Version control and revision tracking with feedback history
- File upload security: user-specific paths, RLS policies, size limits (50MB)

**3. AI-Powered Book Discovery**
- Vector embeddings generated via Hugging Face API (`/api/ai/generate-embeddings`)
- Semantic search for book recommendations (`/api/ai/search`, `/api/ai/similar`)
- Content-based matching for personalized discovery

**4. E-commerce & Payment Processing**
- Stripe integration with webhook handling (`/api/stripe/webhooks`)
- Support for both digital and physical book delivery
- Shopping cart with persistent state management
- Automatic product sync between books and Stripe

**5. Reading Experience**
- OnlyOffice-powered book reader with progress tracking
- Session management and reading analytics
- Multiple format support (PDF, EPUB planned)

**6. Role-Based Dashboards**
- Author dashboard: manuscript management and submissions
- Editor dashboard: review workflow and collaboration tools  
- Publisher dashboard: publication management, author applications, and analytics
- Library dashboard: user's purchased books and reading progress

**7. Realtime Communication System**
- Integrated chat system between authors, editors, and publishers
- Context-aware chat availability based on manuscript status
- Real-time message delivery with read status tracking
- Workflow-based chat routing (author↔editor during review, author↔publisher post-approval)

### Important Integration Details

**Supabase Integration:**
- Project ID: `bsmbqekevilajlapldan` (myat-pwint_polish)
- PostgreSQL 17.4 with comprehensive RLS policies enabled for data security
- Vector extension enabled for AI search capabilities (768-dimensional embeddings)
- Realtime subscriptions enabled for chat system
- Storage buckets:
  - `documents` (50MB, DOCX + images for applications/manuscripts)
  - `manuscripts` (50MB, DOCX only) 
  - `covers` (10MB, images only)
- Database trigger `handle_new_user()` creates profile with 'user' role automatically
- 17 tables with proper foreign key relationships and constraints

**OnlyOffice Configuration:**
- Server URL: `ONLYOFFICE_SERVER_URL` (localhost for development)
- JWT authentication with `ONLYOFFICE_JWT_SECRET`
- Callback system for document state synchronization
- Document keys and session management for concurrent editing

**AI Services:**
- Hugging Face token required for embedding generation
- Embedding models used for content similarity matching
- Search service provides semantic book discovery

**File Upload Security:**
- Magic number validation for file type verification
- User-specific folder structure: `{user_id}/manuscripts/{type}s/{filename}`
- Comprehensive MIME type validation
- RLS policies restrict access to user's own files

### Critical Security Features

**Author Application Security:**
- Permanent ban system prevents reapplication after rejection
- Profile names automatically set from approved applications
- Role-based access controls throughout the application
- Storage policies enforce user-specific file access

**Registration Security:**
- Users cannot self-assign Editor/Publisher roles
- Duplicate email detection with helpful error messaging
- Automatic profile creation via database triggers

### Development Notes

- Uses TypeScript with strict mode enabled
- Path aliases configured: `@/*` maps to `src/*`
- Tailwind CSS v4 with custom configuration
- ESLint configured with Next.js recommended rules
- Environment variables stored in `.env.local` (requires Supabase, Stripe, OnlyOffice, Hugging Face, and N8N configuration)
- Marketing automation via N8N webhooks for book promotions
- MCP integration available for Supabase operations

### Critical Dependencies

- `@supabase/ssr` and `@supabase/supabase-js` for database operations
- `@onlyoffice/document-editor-react` for manuscript editing
- `@stripe/stripe-js` and `stripe` for payments
- `@huggingface/inference` for AI capabilities
- `zustand` for state management
- `jsonwebtoken` for OnlyOffice JWT handling
- `mammoth` for document processing

### Recent Major Changes

- **Realtime Chat System**: Implemented comprehensive chat system for author↔editor and author↔publisher communication
- **Permanent Ban System**: Rejected author applications result in permanent account bans from future applications
- **Enhanced Security**: Removed role selection from registration (users default to 'user' role)
- **File Upload Security**: Restricted manuscript uploads to DOCX only with magic number validation
- **Database Optimization**: Implemented comprehensive RLS policies and foreign key constraints
- **Communication Enhancement**: Added notification system with email preferences
- **Physical Inventory**: Added physical book inventory management for publishers

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.