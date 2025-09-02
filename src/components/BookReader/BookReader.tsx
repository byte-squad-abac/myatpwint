'use client';

import { useEffect, useState, useCallback } from 'react';
import { DocumentEditor, IConfig } from '@onlyoffice/document-editor-react';

import { BookReaderProps } from './types';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { ReaderControls } from './ReaderControls';
import { useBookConfig } from './hooks/useBookConfig';
import { useReadingProgress } from './hooks/useReadingProgress';

export default function BookReader({
  bookId,
  userId,
  onClose
}: BookReaderProps) {
  const [readerId] = useState(`bookReader-${Date.now()}`);
  const [bookInfo, setBookInfo] = useState<{
    title?: string;
    author?: string;
  }>({});
  
  const {
    bookConfig,
    loading,
    error,
    fetchBookConfig
  } = useBookConfig();

  const {
    startSession,
    endSession,
  } = useReadingProgress(userId, bookId);

  const handleFetchConfig = useCallback(() => {
    fetchBookConfig(bookId, userId, readerId);
  }, [fetchBookConfig, bookId, userId, readerId]);

  const handleBackToLibrary = useCallback(async () => {
    // End reading session before closing
    await endSession();
    
    if (onClose) {
      onClose();
    } else {
      // Fallback navigation
      window.location.href = '/library';
    }
  }, [onClose, endSession]);

  useEffect(() => {
    // Force clear any cached editor instances on mount
    if (window.DocsAPI) {
      window.DocsAPI.DocEditor.instances = {};
    }
    
    handleFetchConfig();
  }, [bookId, userId, handleFetchConfig]);

  useEffect(() => {
    // Start reading session when component mounts and config is loaded
    if (bookConfig && !loading && !error) {
      startSession();
    }
  }, [bookConfig, loading, error, startSession]);

  useEffect(() => {
    // Extract book info from config when it loads
    if (bookConfig?.document?.title) {
      const title = bookConfig.document.title;
      // Try to split "BookName - AuthorName" format
      if (title.includes(' - ')) {
        const [bookTitle, authorName] = title.split(' - ');
        setBookInfo({ title: bookTitle, author: authorName });
      } else {
        setBookInfo({ title });
      }
    }
  }, [bookConfig]);

  useEffect(() => {
    // Cleanup function to destroy reader and end session when component unmounts
    return () => {
      const existingReader = document.getElementById(readerId);
      if (existingReader) {
        existingReader.innerHTML = '';
      }
      
      // End reading session on cleanup
      endSession();
    };
  }, [readerId, endSession]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <ErrorState 
        error={error} 
        onRetry={handleFetchConfig}
        onBackToLibrary={handleBackToLibrary}
      />
    );
  }

  if (!bookConfig) {
    return null;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-white">
      {/* Reader Controls Header */}
      <ReaderControls
        bookTitle={bookInfo.title}
        author={bookInfo.author}
        onClose={handleBackToLibrary}
      />

      {/* OnlyOffice Document Reader */}
      <div className="w-full h-full pt-14"> {/* pt-14 to account for header */}
        <DocumentEditor
          id={readerId}
          documentServerUrl={process.env.NEXT_PUBLIC_ONLYOFFICE_SERVER_URL || 'http://localhost'}
          config={bookConfig as unknown as IConfig}
        />
      </div>
    </div>
  );
}