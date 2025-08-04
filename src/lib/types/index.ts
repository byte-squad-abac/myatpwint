/**
 * Centralized Type Definitions for Myat Pwint Publishing House
 * 
 * This file consolidates all shared types across the application
 * to ensure consistency and maintainability.
 */

// ============================================================================
// CORE ENTITY TYPES
// ============================================================================

export interface Book {
  id: string;
  name: string;
  author: string;
  price: number;
  description: string;
  category: string;
  published_date: string;
  edition: string;
  tags: string[];
  image_url: string;
  file_url?: string;
  manuscript_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface LibraryBook extends Book {
  fileName: string;
  file: File | null;
  size: string;
  uploadDate: string;
  source: 'indexeddb' | 'supabase' | 'purchased';
  fileUrl?: string;
  imageUrl?: string;
  purchasePrice?: number;
  purchaseDate?: string;
}

export interface OfflineBook {
  id: string;
  title: string;
  author: string;
  fileUrl: string;
  fileSize: number;
  downloadDate: Date;
  lastAccessed: Date;
  progress?: {
    currentPage: number;
    totalPages: number;
    percentage: number;
  };
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface Purchase {
  id: string;
  user_id: string;
  book_id: string;
  purchase_price: number;
  delivery_type: DeliveryType;
  purchased_at: string;
  books?: Book;
}

export interface Publisher {
  id: string;
  name: string;
  email: string;
  description?: string;
  website_url?: string;
  created_at: string;
}

export interface Manuscript {
  id: string;
  title: string;
  author: string;
  content: string;
  status: ManuscriptStatus;
  submitted_by: string;
  assigned_editor?: string;
  created_at: string;
  updated_at?: string;
}

// ============================================================================
// ENUM TYPES
// ============================================================================

export type DeliveryType = 'physical' | 'digital';

export type ManuscriptStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'published';

export type UserRole = 'reader' | 'author' | 'editor' | 'publisher' | 'admin';

export type BookSource = 'indexeddb' | 'supabase' | 'purchased';

export type FileType = 'pdf' | 'epub' | 'txt';

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  totalPages: number;
}

export interface SupabaseResponse<T> {
  data: T | null;
  error: {
    message: string;
    details: string;
    hint: string;
    code: string;
  } | null;
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

export interface BookCardProps {
  book: LibraryBook;
  onClick?: (book: LibraryBook) => void;
  showDownloadButton?: boolean;
  isDownloading?: boolean;
  isOffline?: boolean;
}

export interface SearchAndFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterType: string;
  onFilterChange: (type: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

// ============================================================================
// STATE MANAGEMENT TYPES
// ============================================================================

export interface CartItem {
  book: Book;
  deliveryType: DeliveryType;
  addedAt: string;
}

export interface CartState {
  items: CartItem[];
  isOpen: boolean;
  total: number;
}

export interface ReaderState {
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  progress: number;
  isFullscreen: boolean;
  zoomLevel: number;
}

// ============================================================================
// PWA & OFFLINE TYPES
// ============================================================================

export interface PWAState {
  isInstalled: boolean;
  isOffline: boolean;
  hasUpdate: boolean;
  showInstallPrompt: boolean;
}

export interface SyncItem {
  id: string;
  type: 'purchase' | 'cart' | 'reading-progress';
  data: any;
  timestamp: number;
  attempts: number;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  acceptTerms: boolean;
}

export interface ManuscriptSubmissionData {
  title: string;
  author: string;
  content: string;
  genre: string;
  description: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type BookFilters = {
  category?: string;
  author?: string;
  priceRange?: [number, number];
  tags?: string[];
  search?: string;
};

export type SortOptions = {
  field: 'name' | 'author' | 'price' | 'created_at' | 'published_date';
  direction: 'asc' | 'desc';
};

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

export interface PDFNavigationProps {
  onNavigateNext?: () => void;
  onNavigatePrevious?: () => void;
  onNavigateToPage?: (page: number) => void;
  onNavigateFirst?: () => void;
  onNavigateLast?: () => void;
}

// ============================================================================
// READER COMPONENT TYPES
// ============================================================================

export interface ReaderStateChange {
  currentPage?: number;
  totalPages?: number;
  progress?: number;
  isLoading?: boolean;
  error?: string | null;
}

// Base props for all reader components
export interface BaseReaderProps {
  zoomLevel: number;
  onStateChange: (state: ReaderStateChange) => void;
}

export interface PDFReaderProps extends BaseReaderProps {
  fileData: ArrayBuffer;
}

export interface EPUBReaderProps extends BaseReaderProps {
  fileData: ArrayBuffer;
}

export interface TXTReaderProps extends BaseReaderProps {
  fileData: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface AppConfig {
  app: {
    name: string;
    version: string;
    description: string;
  };
  supabase: {
    url: string;
    anonKey: string;
  };
  features: {
    offline: boolean;
    realtime: boolean;
    pwa: boolean;
  };
  constants: {
    maxFileSize: number;
    supportedFormats: FileType[];
    defaultPageSize: number;
  };
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

// Re-export commonly used types for convenience
export type {
  Book as BookType,
  LibraryBook as LibraryBookType,
  User as UserType,
  Purchase as PurchaseType,
};