export interface BookReaderProps {
  bookId: string;
  userId: string;
  onClose?: () => void;
  onProgress?: (progress: ReadingProgress) => void; // Optional progress tracking
}

export interface ReadingProgress {
  bookId: string;
  userId: string;
  lastPosition: number;
  totalPages: number;
  readingTime: number; // in seconds
  lastReadAt: string;
}

export interface BookConfig {
  document: {
    fileType: 'docx';
    key: string;
    title: string;
    url: string;
    permissions: {
      edit: false;                    // Always false for reading
      download: boolean;              // Based on purchase type
      print: boolean;                 // Based on purchase type
      review: false;                  // No review for books
      comment: false;                 // No commenting for books
      chat: false;                    // No chat for books
      fillForms: false;              // No form filling
      modifyFilter: false;           // No modifications
      modifyContentControl: false;   // No modifications
    };
    info: {
      owner: string;                 // Book title/author
      folder: string;                // "My Library"
      uploaded: string;              // Published date
    };
  };
  documentType: 'word';
  editorConfig: {
    mode: 'view';                    // Always view mode
    lang: 'en';
    user: {
      id: string;
      name: string;
    };
    customization: {
      about: false;
      feedback: false;
      toolbar: boolean;              // Minimal reading toolbar
      header: boolean;               // Clean reading experience
      leftMenu: boolean;             // Navigation panel
      rightMenu: boolean;            // Table of contents
      statusBar: boolean;            // Page info
      goback: {
        url: string;                 // Back to library
        text: string;                // "Back to Library"
      };
    };
  };
  token?: string;
}

// OnlyOffice reader event types (simplified for viewing)
export interface OnlyOfficeErrorEvent {
  data?: {
    error?: string;
    message?: string;
  };
}

export interface ReaderEvents {
  onAppReady: () => void;
  onDocumentReady: () => void;
  onLoadComponentError: (error: OnlyOfficeErrorEvent) => void;
  onRequestClose: () => void;
  onError: (error: OnlyOfficeErrorEvent) => void;
}