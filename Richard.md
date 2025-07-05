# Myat Pwint Publishing Platform — Project Documentation

**Date:** 2024-06-10
**Update:** Netlify SSR Build Fixes & Deployment Readiness
**Latest Update:** 2025-07-05

---

## 2025-07-05 — PDF Viewer Scroll Navigation Improvements

- **Enhanced scroll-based navigation** in PDFViewer component with smooth, controlled scrolling for both mouse wheels and touchpads
- **Implemented intelligent input detection** to differentiate between touchpad and mouse wheel inputs, applying appropriate thresholds and multipliers
- **Added visual scroll progress indicator** showing real-time feedback during scrolling with percentage completion
- **Improved scroll accumulator logic** with:
  - Delta value capping to prevent huge jumps from fast scrolling
  - Direction change detection and state reset
  - Cooldown period after page changes (1200ms) to prevent accidental multi-page jumps
  - Adaptive thresholds: 250 for touchpad, 150 for mouse wheel
- **Enhanced user experience** with:
  - Smooth animations and transitions
  - Clear visual feedback when page change is about to occur (progress bar fills to 100%)
  - Automatic indicator hiding after 500ms of inactivity
  - Prevented default scroll behavior to avoid page jumping
- **Maintained existing features**: Click navigation zones, touch/swipe support, zoom controls, and error recovery
- **Code documentation**: Added comprehensive JSDoc comment explaining the scroll handler implementation

## 2024-06-10 — Netlify SSR Build Fixes & Deployment Readiness

- **Fixed Netlify build errors** caused by SSR (server-side rendering) issues with browser-only APIs (`location`, `DOMMatrix`, etc.) and usage of `useSearchParams` outside a Suspense boundary.
- **Updated `/my-library/read` page** to use a `<Suspense>` boundary and dynamic imports for PDF/EPUB readers, ensuring all browser APIs only run on the client.
- **Upgraded Supabase client usage** to the new `createPagesBrowserClient` API (replacing deprecated `createBrowserSupabaseClient`).
- **Removed unused/incompatible packages** (e.g., `react-epub-viewer`) and updated the Netlify Next.js plugin to the latest version.
- **Added guards for `localStorage` usage** to avoid SSR errors in all relevant files.
- **Tested local build:** All routes, including `/my-library/read`, now build and render without errors or SSR warnings.
- **Deployment:** Project is now ready for Netlify preview deployment. All SSR issues are resolved, and the codebase is clean and up-to-date.

---

## Project Overview
This project is a modern publishing platform built with Next.js, React, and Supabase. It serves authors, publishers, editors, and readers, providing a seamless experience for book discovery, reading, publishing, and management.

---

## Key Features
- **User Authentication:** Secure login/signup with Supabase Auth, supporting multiple roles (reader, author, publisher, editor).
- **Book Marketplace:** Browse, search, and view detailed information about books.
- **My Library:** Readers can upload, store, and read their own book files (TXT, PDF, EPUB) locally.
- **Book Reader:** Advanced in-browser reading experience for TXT, PDF, and EPUB files, with support for zoom, navigation, and (planned) bookmarks and font controls.
- **Role-Based Dashboards:**
  - **Author Portal:** Submit manuscripts, track sales, and communicate with publishers.
  - **Publisher Dashboard:** Manage manuscripts, approve/reject submissions, and oversee catalog.
  - **Editor Dashboard:** (Planned) Editorial workflow and review tools.
- **Checkout & Orders:** Purchase and rent books (integration in progress).

---

## Technical Stack
- **Frontend:** Next.js (App Router), React, TypeScript, Material UI
- **Backend:** Supabase (Postgres, Auth, Storage)
- **PDF Rendering:** `react-pdf` (with local PDF worker)
- **EPUB Rendering:** `epubjs`
- **State Management:** React hooks, local storage, and context

---

## Project Process & Milestones

### 1. Initial Setup
- Initialized Next.js project with TypeScript.
- Set up Supabase for authentication and database.
- Established project structure under `src/app/` for modular routing and feature separation.

### 2. Authentication & Roles
- Integrated Supabase Auth for user management.
- Implemented role-based navigation and access control (reader, author, publisher, editor).

### 3. Book Marketplace
- Built book listing, search, and detail pages.
- Connected to Supabase database for dynamic book data.

### 4. My Library & Book Reader (Current Focus)
- Created "My Library" for users to upload and read their own books.
- Supported file types: `.txt`, `.pdf`, `.epub`.
- Implemented advanced PDF reading with `react-pdf` (zoom, navigation, local worker).
- Integrated `epubjs` for EPUB support (with plans for advanced features).
- Debugged and fixed PDF text layer rendering issue by importing required CSS in `layout.tsx`.

### 5. Author/Publisher/Editor Workflows
- Author portal for manuscript submission and tracking.
- Publisher dashboard for manuscript management.
- Editor dashboard planned for future editorial tools.

### 6. Checkout & Orders
- Implemented checkout flow and order confirmation (integration ongoing).

---

## Notable Debugging & Lessons Learned
- **PDF Text Layer Issue:**
  - Problem: PDF pages rendered twice due to missing CSS for `react-pdf` text/annotation layers.
  - Solution: Import CSS in `src/app/layout.tsx` instead of `globals.css` (per Next.js app directory requirements).
- **EPUB Library Compatibility:**
  - `react-epubjs` not compatible with React 19; switched to direct `epubjs` integration.
- **File Type Detection:**
  - Ensured robust detection and handling for `.txt`, `.pdf`, `.epub` files.

---

## References
- [`react-pdf` documentation](https://github.com/wojtekmaj/react-pdf)
- [`epubjs` documentation](https://github.com/futurepress/epub.js/)
- [Supabase docs](https://supabase.com/docs)
- [Next.js docs](https://nextjs.org/docs)

---

## Next Steps / TODO
- Add advanced EPUB features (TOC, bookmarks, font size controls).
- Complete checkout and order management integration.
- Improve mobile responsiveness and accessibility.
- Add cloud storage for user libraries (optional).
- Build out editor dashboard and workflow.

---

**End of documentation.** 