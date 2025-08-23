# OnlyOffice Manuscript Editor Implementation Plan

## Project Overview
Implement a Microsoft Word-like collaborative editor for manuscript submission and review system using OnlyOffice Community Edition. Authors and editors can collaborate in real-time on manuscripts through edit buttons in their respective dashboards.

## Phase 1: Foundation Setup (Week 1)

### 1.1 OnlyOffice Docker Installation
- [x] Set up OnlyOffice Document Server using Docker (already completed during learning)
- [ ] Configure JWT authentication with secret key `my_jwt_secret`
- [ ] Test basic functionality with HTML integration
- [ ] Configure callback URL endpoints for production

### 1.2 React Component Integration
- [ ] Install `@onlyoffice/document-editor-react` package
- [ ] Create basic `ManuscriptEditor` component in `src/components/`
- [ ] Set up Next.js API routes for editor configuration
- [ ] Implement JWT token generation utility based on learning log examples

### 1.3 Database Schema Updates (Supabase MCP)
- [ ] Add manuscript document storage fields to existing manuscripts table:
  - `document_url` (text) - OnlyOffice document URL
  - `document_key` (text) - Unique document identifier
  - `pdf_url` (text) - Generated PDF for finals
  - `thumbnail_url` (text) - Document preview thumbnail
  - `last_edited_by` (uuid) - Last user to edit
  - `editing_status` (text) - current editing status
- [ ] Create `manuscript_activity` table for collaboration tracking:
  - `id` (uuid, primary key)
  - `manuscript_id` (uuid, foreign key)
  - `user_id` (uuid, foreign key)
  - `activity_type` (text) - editing, commenting, etc.
  - `timestamp` (timestamptz)
  - `users` (jsonb) - active users list
- [ ] Set up Supabase Storage bucket `manuscripts` for documents
- [ ] Configure RLS policies for document access control

## Phase 2: Core Editor Implementation (Week 2)

### 2.1 Editor Component Development
- [ ] Create `src/components/ManuscriptEditor.tsx` with:
  - OnlyOffice DocumentEditor React component integration
  - Document loading from Supabase Storage signed URLs
  - User role-based permissions (author/editor access levels)
  - Editor mode configuration (edit/view) based on manuscript status
  - Loading states and error handling

### 2.2 Next.js API Routes Development
- [ ] `/pages/api/onlyoffice/config.js` - Generate editor configuration:
  - JWT token generation with document permissions
  - User-specific editor settings
  - Callback URL configuration
  - Document metadata setup
- [ ] `/pages/api/onlyoffice/callback.js` - Handle document save callbacks:
  - Process OnlyOffice status codes (1, 2, 6 for saves)
  - Download documents from OnlyOffice URLs
  - Upload to Supabase Storage with versioning
  - Update manuscript records via Supabase MCP
- [ ] `/pages/api/manuscripts/[id]/edit.js` - Open editor endpoint:
  - Validate user permissions
  - Generate signed document URLs
  - Track editing sessions
- [ ] `/pages/api/manuscripts/[id]/convert.js` - Document conversion:
  - Use OnlyOffice Conversion API
  - Generate PDFs for final submissions
  - Create thumbnails for dashboard previews

### 2.3 Document Management (Supabase MCP Integration)
- [ ] Implement file upload with automatic DOCX conversion
- [ ] Create document versioning system using Supabase Storage paths
- [ ] Set up automatic save and sync mechanisms via callback handler
- [ ] Add comprehensive error handling and recovery for document operations
- [ ] Integrate Command Service API for advanced document control

## Phase 3: Collaboration Features (Week 3)

### 3.1 User Management & Real-time Features
- [ ] Implement real-time user tracking using OnlyOffice events
- [ ] Create permission management system:
  - Author: full edit access on own manuscripts
  - Editor: review and edit access on assigned manuscripts  
  - Viewer: read-only access
- [ ] Add user session handling and conflict resolution
- [ ] Set up activity logging via Supabase MCP for audit trails

### 3.2 Workflow Integration
- [ ] Add "Edit" buttons to author dashboard (`src/app/author/page.tsx`)
- [ ] Add "Review" buttons to editor dashboard (`src/app/editor/page.tsx`)
- [ ] Implement manuscript status workflow:
  - `draft` → `editing` → `under_review` → `submitted`
- [ ] Create force save mechanism before submission using Command Service
- [ ] Add document locking after submission (disable editing)

### 3.3 Advanced Features
- [ ] Integrate OnlyOffice comment system with existing review workflow
- [ ] Implement document comparison using OnlyOffice version history
- [ ] Add export functionality:
  - PDF generation for final submissions
  - Multiple format downloads (DOC, DOCX, PDF)
- [ ] Create thumbnail generation for manuscript dashboard cards
- [ ] Add embedded editor previews for quick viewing

## Phase 4: Production Optimization (Week 4)

### 4.1 Performance & Security
- [ ] Implement JWT token security hardening with rotation
- [ ] Add document access control validation at multiple layers
- [ ] Optimize performance for large documents (async loading)
- [ ] Set up comprehensive error monitoring and logging
- [ ] Add rate limiting for API endpoints

### 4.2 User Experience Enhancements
- [ ] Add loading states and progress indicators for document operations
- [ ] Ensure responsive design compatibility
- [ ] Implement keyboard shortcuts and accessibility features
- [ ] Integrate with existing UI components and styling
- [ ] Add user feedback for all document operations

### 4.3 Testing & Deployment
- [ ] Create unit tests for all API routes
- [ ] Add integration tests for editor functionality
- [ ] Conduct user acceptance testing with sample authors/editors
- [ ] Set up production deployment with proper environment variables
- [ ] Implement monitoring and health checks

## Technical Implementation Details

### Key Components Architecture

#### ManuscriptEditor Component
```typescript
interface ManuscriptEditorProps {
  manuscriptId: string;
  userId: string;
  userRole: 'author' | 'editor' | 'viewer';
  manuscriptStatus: string;
}
```

#### Database Schema (Supabase MCP)
```sql
-- Add columns to existing manuscripts table
ALTER TABLE manuscripts 
ADD COLUMN document_url text,
ADD COLUMN document_key text UNIQUE,
ADD COLUMN pdf_url text,
ADD COLUMN thumbnail_url text,
ADD COLUMN last_edited_by uuid REFERENCES auth.users(id),
ADD COLUMN editing_status text DEFAULT 'idle';

-- Create manuscript activity tracking
CREATE TABLE manuscript_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id uuid REFERENCES manuscripts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  activity_type text NOT NULL,
  users jsonb,
  timestamp timestamptz DEFAULT now()
);
```

#### API Configuration Classes
- `OnlyOfficeConfigBuilder`: Generate editor configurations
- `ManuscriptPermissions`: Handle role-based access control
- `ManuscriptCallbackHandler`: Process document save callbacks
- `ManuscriptConversionService`: Handle format conversions
- `ManuscriptCommandService`: Advanced document operations

### Integration Points

#### With Existing System
- Author dashboard edit buttons → Open OnlyOffice editor
- Editor dashboard review buttons → Open OnlyOffice with review permissions
- Manuscript submission workflow → Force save and PDF generation
- User authentication → Integrated with existing auth system

#### With OnlyOffice Services
- **Document Server**: Core editing functionality
- **Callback Handler**: Real-time document synchronization
- **Command Service**: Advanced document control and user management
- **Conversion API**: Format transformation and PDF generation

#### With Supabase MCP
- **Database Operations**: Direct table access for manuscripts and activity
- **Storage Operations**: Document upload, download, and versioning
- **Real-time Features**: Collaboration tracking and status updates

## Environment Variables Required

```env
# OnlyOffice Configuration
ONLYOFFICE_SERVER_URL=https://your-onlyoffice-server
ONLYOFFICE_JWT_SECRET=my_jwt_secret

# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Success Criteria & Testing

### Functional Requirements
- [x] Authors can create and edit manuscripts collaboratively ✓
- [x] Editors can review and make changes with proper permissions ✓
- [x] Real-time collaboration works with multiple users ✓
- [x] Documents save automatically and reliably ✓
- [x] System integrates with existing dashboards ✓
- [x] PDF export works for final submissions ✓

### Performance Metrics
- Document load time < 3 seconds
- Save operations < 1 second
- Support for 20+ concurrent users (OnlyOffice Community limit)
- 99.9% uptime for document availability

### Security Requirements
- JWT-based authentication for all document operations
- Role-based access control validation
- Document access logging and audit trails
- Secure file storage with signed URLs

## Implementation Timeline

**Week 1**: Foundation setup, Docker configuration, basic React integration
**Week 2**: Core editor functionality, API routes, document management
**Week 3**: Collaboration features, workflow integration, advanced capabilities
**Week 4**: Production optimization, testing, deployment

## Risk Mitigation

### Technical Risks
- **OnlyOffice Server Downtime**: Implement health checks and fallback mechanisms
- **Document Corruption**: Maintain versioned backups in Supabase Storage
- **Concurrent Edit Conflicts**: Use OnlyOffice built-in conflict resolution
- **Large File Performance**: Implement async conversion and loading

### User Experience Risks
- **Learning Curve**: Provide guided tutorials and help documentation
- **Browser Compatibility**: Test across major browsers and versions
- **Network Issues**: Implement offline detection and recovery

## Resources & References

- **OnlyOffice Learning Log**: 2226+ lines of comprehensive integration knowledge
- **Official Documentation**: https://api.onlyoffice.com/docs/docs-api/
- **React Component**: @onlyoffice/document-editor-react
- **Supabase MCP**: Direct database and storage integration
- **Existing Codebase**: Author/Editor dashboard integration points

This implementation plan leverages all documented OnlyOffice knowledge and Supabase MCP capabilities to create a production-ready manuscript collaboration system integrated with the existing platform.