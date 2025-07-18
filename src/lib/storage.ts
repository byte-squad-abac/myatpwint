// Storage utility for both IndexedDB and Supabase
import supabase from './supabaseClient';

export interface StoredBook {
  id: string;
  name: string;
  fileName: string;
  size: string;
  uploadDate: string;
  fileData: ArrayBuffer;
  fileType: string;
}

export interface SupabaseBook {
  id: string;
  name: string;
  fileName: string;
  size: string;
  uploadDate: string;
  fileUrl: string;
  fileType: string;
  source: 'reader_upload' | 'publisher';
  user_id?: string;
}

export interface BookRecord {
  id: string;
  name: string;
  fileName: string;
  size: string;
  uploadDate: string;
  fileType: string;
  source: 'indexeddb' | 'supabase';
  fileUrl?: string;
  user_id?: string;
}

class BookStorage {
  private dbName = 'MyLibraryBooks';
  private dbVersion = 1;
  private storeName = 'books';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  async saveBook(book: StoredBook): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(book);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getBook(id: string): Promise<StoredBook | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getAllBooks(): Promise<StoredBook[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async deleteBook(id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Supabase Storage Methods
  async uploadToSupabase(file: File, userId: string): Promise<string> {
    // Sanitize filename to remove invalid characters
    const sanitizedFileName = this.sanitizeFileName(file.name);
    const fileName = `${userId}/${crypto.randomUUID()}-${sanitizedFileName}`;
    
    console.log('Upload attempt:', {
      originalName: file.name,
      sanitizedName: sanitizedFileName,
      fileName,
      fileSize: file.size,
      fileType: file.type,
      userId
    });
    
    const { data, error } = await supabase.storage
      .from('book-files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    console.log('Upload result:', { data, error });

    if (error) {
      console.error('Upload error details:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('book-files')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }

  async saveBookToDatabase(book: SupabaseBook): Promise<void> {
    const { error } = await supabase
      .from('books')
      .insert({
        id: book.id,
        name: book.name,
        author: 'Reader Upload', // Default author for reader uploads
        price: 0, // Free for reader uploads
        description: `Original filename: ${book.fileName}`, // Store original filename for display
        file_url: book.fileUrl,
        source: book.source,
        user_id: book.user_id,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to save book to database: ${error.message}`);
    }
  }

  async getBookFromDatabase(id: string): Promise<SupabaseBook | null> {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .eq('source', 'reader_upload')
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      fileName: data.description?.split(': ')[1] || data.name,
      size: '0 MB', // Size not stored in database
      uploadDate: new Date(data.created_at).toLocaleDateString(),
      fileUrl: data.file_url,
      fileType: this.getFileTypeFromUrl(data.file_url),
      source: 'reader_upload',
      user_id: data.user_id
    };
  }

  async getAllBooksFromDatabase(userId: string): Promise<SupabaseBook[]> {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('source', 'reader_upload')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching books from database:', error);
      return [];
    }

    return data?.map(book => ({
      id: book.id,
      name: book.name,
      fileName: book.description?.split(': ')[1] || book.name,
      size: '0 MB', // Size not stored in database
      uploadDate: new Date(book.created_at).toLocaleDateString(),
      fileUrl: book.file_url,
      fileType: this.getFileTypeFromUrl(book.file_url),
      source: 'reader_upload',
      user_id: book.user_id
    })) || [];
  }

  async deleteBookFromDatabase(id: string): Promise<void> {
    const { error } = await supabase
      .from('books')
      .delete()
      .eq('id', id)
      .eq('source', 'reader_upload');

    if (error) {
      throw new Error(`Failed to delete book from database: ${error.message}`);
    }
  }

  async deleteFromSupabaseStorage(fileUrl: string): Promise<void> {
    // Extract file path from URL
    const urlParts = fileUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const userFolder = urlParts[urlParts.length - 2];
    const filePath = `${userFolder}/${fileName}`;

    const { error } = await supabase.storage
      .from('book-files')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file from storage:', error);
      // Don't throw error for storage deletion failures
    }
  }

  // Hybrid Methods
  async saveBookHybrid(file: File, userId: string): Promise<BookRecord> {
    const bookId = crypto.randomUUID();
    const bookName = file.name.replace(/\.[^/.]+$/, '');
    const uploadDate = new Date().toLocaleDateString();
    const fileSize = (file.size / 1024 / 1024).toFixed(2) + ' MB';

    try {
      console.log('🚀 Attempting Supabase upload...');
      
      // Try to save to Supabase first
      const fileUrl = await this.uploadToSupabase(file, userId);
      console.log('✅ File uploaded to Supabase:', fileUrl);
      
      const supabaseBook: SupabaseBook = {
        id: bookId,
        name: bookName,
        fileName: file.name,
        size: fileSize,
        uploadDate,
        fileUrl,
        fileType: file.type,
        source: 'reader_upload',
        user_id: userId
      };

      console.log('💾 Saving to database...');
      await this.saveBookToDatabase(supabaseBook);
      console.log('✅ Database record saved');

      return {
        id: bookId,
        name: bookName,
        fileName: file.name,
        size: fileSize,
        uploadDate,
        fileType: file.type,
        source: 'supabase',
        fileUrl,
        user_id: userId
      };
    } catch (error) {
      console.error('❌ Failed to save to Supabase, falling back to IndexedDB:', error);
      
      // Fallback to IndexedDB
      const fileData = await file.arrayBuffer();
      const storedBook: StoredBook = {
        id: bookId, // Already a UUID
        name: bookName,
        fileName: file.name,
        size: fileSize,
        uploadDate,
        fileData,
        fileType: file.type
      };

      await this.saveBook(storedBook);

      return {
        id: bookId,
        name: bookName,
        fileName: file.name,
        size: fileSize,
        uploadDate,
        fileType: file.type,
        source: 'indexeddb'
      };
    }
  }

  async getBookHybrid(id: string): Promise<BookRecord | null> {
    // Try Supabase first
    const supabaseBook = await this.getBookFromDatabase(id);
    if (supabaseBook) {
      return {
        id: supabaseBook.id,
        name: supabaseBook.name,
        fileName: supabaseBook.fileName,
        size: supabaseBook.size,
        uploadDate: supabaseBook.uploadDate,
        fileType: supabaseBook.fileType,
        source: 'supabase',
        fileUrl: supabaseBook.fileUrl,
        user_id: supabaseBook.user_id
      };
    }

    // Fallback to IndexedDB
    const indexedBook = await this.getBook(id);
    if (indexedBook) {
      return {
        id: indexedBook.id,
        name: indexedBook.name,
        fileName: indexedBook.fileName,
        size: indexedBook.size,
        uploadDate: indexedBook.uploadDate,
        fileType: indexedBook.fileType,
        source: 'indexeddb'
      };
    }

    return null;
  }

  async getAllBooksHybrid(userId: string): Promise<BookRecord[]> {
    const books: BookRecord[] = [];

    // Get books from Supabase
    try {
      const supabaseBooks = await this.getAllBooksFromDatabase(userId);
      books.push(...supabaseBooks.map(book => ({
        id: book.id,
        name: book.name,
        fileName: book.fileName,
        size: book.size,
        uploadDate: book.uploadDate,
        fileType: book.fileType,
        source: 'supabase' as const,
        fileUrl: book.fileUrl,
        user_id: book.user_id
      })));
    } catch (error) {
      console.error('Error fetching books from Supabase:', error);
    }

    // Get books from IndexedDB
    try {
      const indexedBooks = await this.getAllBooks();
      books.push(...indexedBooks.map(book => ({
        id: book.id,
        name: book.name,
        fileName: book.fileName,
        size: book.size,
        uploadDate: book.uploadDate,
        fileType: book.fileType,
        source: 'indexeddb' as const
      })));
    } catch (error) {
      console.error('Error fetching books from IndexedDB:', error);
    }

    return books;
  }

  async deleteBookHybrid(id: string): Promise<void> {
    // Try to delete from Supabase first
    try {
      const supabaseBook = await this.getBookFromDatabase(id);
      if (supabaseBook) {
        await this.deleteFromSupabaseStorage(supabaseBook.fileUrl);
        await this.deleteBookFromDatabase(id);
        return;
      }
    } catch (error) {
      console.error('Error deleting from Supabase:', error);
    }

    // Fallback to IndexedDB
    await this.deleteBook(id);
  }

  async fetchFileFromUrl(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    return await response.arrayBuffer();
  }

  async fetchTextFromUrl(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    return await response.text();
  }

  private sanitizeFileName(fileName: string): string {
    // Get file extension first
    const extension = fileName.split('.').pop() || '';
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
    
    // Remove or replace invalid characters for storage
    let sanitized = nameWithoutExt
      // Replace Myanmar/Unicode characters with transliteration or remove them
      .replace(/[\u1000-\u109F\u1040-\u1049\uAA60-\uAA7F]/g, '') // Remove Myanmar Unicode
      .replace(/[^a-zA-Z0-9.\-_]/g, '_') // Replace other invalid chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .substring(0, 50); // Limit filename length
    
    // If sanitized name is empty, use a default
    if (!sanitized || sanitized.length === 0) {
      sanitized = 'uploaded_book';
    }
    
    // Return with extension
    return extension ? `${sanitized}.${extension}` : sanitized;
  }

  private getFileTypeFromUrl(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'epub':
        return 'application/epub+zip';
      case 'txt':
        return 'text/plain';
      default:
        return 'application/octet-stream';
    }
  }
}

export const bookStorage = new BookStorage();