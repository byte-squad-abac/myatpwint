'use client';

import { useSearchParams } from 'next/navigation';
import React, { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import PDF and EPUB components to avoid SSR issues
const PDFViewer = dynamic(() => import('./PDFViewer'), { 
  ssr: false,
  loading: () => <div>Loading PDF viewer...</div>
});

const EPUBViewer = dynamic(() => import('./EPUBViewer'), { 
  ssr: false,
  loading: () => <div>Loading EPUB viewer...</div>
});

function MyLibraryReadContent() {
  const searchParams = useSearchParams();
  const fileUrl = searchParams.get('file');
  const bookName = searchParams.get('name') || 'My Book';
  const fileName = searchParams.get('fileName') || bookName;
  const [content, setContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Helper to check file type
  const isTxtFile = (name: string) => name.toLowerCase().trim().endsWith('.txt');
  const isPdfFile = (name: string) => name.toLowerCase().trim().endsWith('.pdf');
  const isEpubFile = (name: string) => name.toLowerCase().trim().endsWith('.epub');

  // TXT logic
  useEffect(() => {
    if (!fileUrl || !isTxtFile(fileName) || !isClient) return;
    setLoading(true);
    fetch(fileUrl)
      .then(res => res.text())
      .then(text => {
        setContent(text);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load file.');
        setLoading(false);
      });
  }, [fileUrl, fileName, isClient]);

  // Don't render until we're on the client
  if (!isClient) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (!fileUrl) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>No file provided</h2>
        <p>Please select a book from your library to read.</p>
      </div>
    );
  }

  if (isTxtFile(fileName)) {
    if (loading) {
      return <div style={{ padding: '40px', textAlign: 'center' }}><h2>Loading...</h2></div>;
    }
    if (error) {
      return <div style={{ padding: '40px', textAlign: 'center' }}><h2>Error</h2><p>{error}</p></div>;
    }
    return (
      <div style={{ padding: '40px', maxWidth: 800, margin: '0 auto', fontFamily: 'serif', whiteSpace: 'pre-wrap', background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>{bookName}</h2>
        <div style={{ fontSize: 18, lineHeight: 1.7 }}>{content}</div>
      </div>
    );
  }

  if (isPdfFile(fileName)) {
    return <PDFViewer fileUrl={fileUrl} bookName={bookName} />;
  }

  if (isEpubFile(fileName)) {
    return <EPUBViewer fileUrl={fileUrl} bookName={bookName} />;
  }

  // Fallback for unsupported files
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h2>Cannot open this file</h2>
      <p>
        Only .txt, .pdf, and .epub files are supported.<br/>
        File: <code>{fileName}</code>
      </p>
    </div>
  );
}

export default function MyLibraryReadPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Loading...</h2>
      </div>
    }>
      <MyLibraryReadContent />
    </Suspense>
  );
} 