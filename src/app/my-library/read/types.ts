// Shared types for the book reader system

export interface ReaderState {
  currentPage: number;
  totalPages: number;
  progress: number;
  isLoading: boolean;
  error: string | null;
}

export interface ReaderStateChange {
  currentPage?: number;
  totalPages?: number;
  progress?: number;
  isLoading?: boolean;
  error?: string | null;
}

export type FileType = 'pdf' | 'epub' | 'txt';

export interface BookFile {
  id: string;
  name: string;
  fileName: string;
  fileData: ArrayBuffer | string;
  fileType: FileType;
  size: string;
  uploadDate: string;
}

export interface LibraryBook {
  id: string;
  name: string;
  fileName: string;
  file: File | null;
  size: string;
  uploadDate: string;
}

export interface StoredBook {
  id: string;
  name: string;
  fileName: string;
  size: string;
  uploadDate: string;
  fileData: ArrayBuffer;
  fileType: string;
}

// Base props for all readers
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

// Theme types
export type Theme = 'light' | 'dark';

export interface ThemeConfig {
  theme: Theme;
  colors: {
    background: string;
    surface: string;
    text: string;
    border: string;
    scrollbar: {
      track: string;
      thumb: string;
      thumbHover: string;
    };
  };
}

// Reading progress and bookmarks (for future implementation)
export interface ReadingProgress {
  id: string;
  userId: string;
  bookId: string;
  currentPage: number;
  totalPages: number;
  progress: number;
  lastPosition: {
    scrollTop?: number;
    pageNumber?: number;
    cfi?: string; // For EPUB
  };
  lastReadAt: string;
  readingTime: number; // seconds
}

export interface Bookmark {
  id: string;
  userId: string;
  bookId: string;
  pageNumber: number;
  position: {
    scrollTop?: number;
    cfi?: string; // For EPUB
    selection?: {
      start: number;
      end: number;
      text: string;
    };
  };
  title: string;
  note?: string;
  highlightColor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReadingSession {
  id: string;
  userId: string;
  bookId: string;
  startTime: string;
  endTime?: string;
  pagesRead: number;
  duration: number; // seconds
}

// Error types
export interface ReaderError {
  type: 'pdf' | 'epub' | 'txt' | 'general';
  message: string;
  details?: any;
  timestamp: string;
}

// Performance monitoring
export interface ReaderPerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
  pageRenderTimes: number[];
}

// Accessibility
export interface A11ySettings {
  fontSize: number;
  lineHeight: number;
  contrast: 'normal' | 'high';
  reducedMotion: boolean;
  screenReader: boolean;
}

// Export utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;