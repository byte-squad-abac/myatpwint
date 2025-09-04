# Author Application Feature Implementation Plan

## Overview
Implement a comprehensive author onboarding system where first-time authors must apply with their profile + first book pitch before accessing the regular manuscript submission system.

## User Flow

### For New Authors
1. **Signup/Register** → Option to "Apply as Author" 
2. **Author Application Form** → Submit profile + first book details
3. **Wait for Approval** → View status in profile page
4. **If Approved** → Upload manuscript cover & file for first book
5. **Future Submissions** → Use existing manuscript submission flow

### For Publishers  
1. **Authors Tab** → View pending applications and approved authors
2. **Review Applications** → Approve/reject with feedback
3. **Manage Authors** → View author history and manage status

---

## Database Schema Changes

### New Table: `author_applications`
```sql
- id (UUID, primary key)
- user_id (UUID, references auth.users)
- legal_name (TEXT)
- author_name (TEXT) 
- association_name (TEXT)
- membership_id (TEXT)
- association_proof_url (TEXT)
- association_verified (BOOLEAN)
- why_publish_with_us (TEXT)
- book_title (TEXT)
- book_synopsis (TEXT)
- book_tags (TEXT[])
- book_category (TEXT)
- preferred_price (DECIMAL)
- status ('pending'|'approved'|'rejected')
- publisher_feedback (TEXT)
- reviewed_by (UUID)
- reviewed_at (TIMESTAMP)
- submission_count (INTEGER)
- last_resubmitted_at (TIMESTAMP)
- created_at, updated_at (TIMESTAMP)
```

### RLS Policies
- Authors: view/update own applications (pending/rejected only)
- Publishers: view/update all applications

---

## File Structure & Components

### New Files to Create

#### Pages
- `src/app/profile/page.tsx` - User profile with application status
- `src/app/(dashboards)/publisher/authors/page.tsx` - Publisher authors dashboard
- `src/app/api/author-applications/route.ts` - CRUD operations
- `src/app/api/author-applications/[id]/route.ts` - Individual application operations

#### Components
- `src/components/AuthorApplication/ApplicationForm.tsx` - Main application form
- `src/components/AuthorApplication/ApplicationStatus.tsx` - Status display in profile
- `src/components/AuthorApplication/FileUpload.tsx` - Association proof upload
- `src/components/PublisherDashboard/ApplicationsList.tsx` - Pending applications list
- `src/components/PublisherDashboard/ApprovedAuthorsList.tsx` - Approved authors list
- `src/components/PublisherDashboard/ApplicationReview.tsx` - Review modal/form

#### Types
- Add to `src/types/index.ts`:
  - `AuthorApplication` interface
  - `ApplicationStatus` enum
  - Form validation types

---

## Implementation Steps

### Phase 1: Database & API Setup
1. Create `author_applications` table with RLS policies
2. Build API routes for CRUD operations
3. Add file upload handling for association proof
4. Update TypeScript types

### Phase 2: Author-Facing Features
1. Create author application form component
2. Build profile page with application status
3. Add "Apply as Author" option to signup/navigation
4. Implement resubmission flow for rejected applications
5. Add first manuscript upload after approval

### Phase 3: Publisher Dashboard
1. Add "Authors" tab to publisher navigation
2. Create applications list (pending) 
3. Create approved authors list
4. Build application review interface
5. Implement approve/reject functionality with feedback

### Phase 4: Integration & Polish
1. Connect approved authors to existing manuscript flow
2. Add email notifications (optional)
3. Implement file validation and security
4. Add loading states and error handling
5. Testing and bug fixes

---

## UI/UX Approach

### Author Application Form
- Clean, step-by-step form (could be single page or wizard)
- File upload with drag-and-drop for association proof
- Rich text editor for synopsis
- Tags and category selection (reuse existing components)
- Clear validation and error messages

### Profile Page  
- Dashboard-style layout matching existing dashboards
- Application status card with clear states:
  - **Pending**: "Application under review"
  - **Approved**: "Welcome! Upload your first manuscript"  
  - **Rejected**: Feedback + "Resubmit" button

### Publisher Authors Dashboard
- Two-tab interface: "Applications" and "Authors"
- Table-based layout matching existing dashboard style
- Modal or side panel for application review
- Bulk actions for managing multiple applications

---

## Technical Considerations

### File Upload
- Store association proof in Supabase Storage
- Implement proper file validation (size, type)
- Secure file access with RLS

### Form Management
- Use existing form patterns from the app
- Implement proper validation (client + server)
- Handle form state management with React Hook Form or similar

### State Management
- Use existing Zustand patterns if needed
- Leverage React Query/SWR for API state management
- Maintain consistency with existing data fetching patterns

### Security
- Strict RLS policies for application data
- Proper file upload validation and sanitization
- Role-based access control for publisher features

---

## Integration Points

### Existing Systems
- **Auth**: Leverage existing user roles and profile system
- **Manuscripts**: Connect approved authors to manuscript submission
- **File Upload**: Reuse existing file handling patterns
- **Dashboard**: Match existing dashboard UI patterns

### Future Enhancements
- Email notifications for status changes
- Advanced search/filtering in publisher dashboard
- Analytics on application conversion rates
- Bulk approval/rejection tools

---

## Success Metrics

### For Authors
- Clear application status visibility
- Smooth onboarding experience  
- Easy resubmission process

### For Publishers
- Efficient application review workflow
- Good overview of author pipeline
- Easy approve/reject with feedback

### Technical
- Clean, maintainable code structure
- Proper error handling and validation
- Secure file handling
- Consistent with existing app patterns