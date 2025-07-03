'use client';

import React, { useState, useEffect } from 'react';
import Epub from 'epubjs';

interface EPUBViewerProps {
  fileUrl: string;
  bookName: string;
}

export default function EPUBViewer({ fileUrl, bookName }: EPUBViewerProps) {
  const [epubLoaded, setEpubLoaded] = useState(false);
  const [epubError, setEpubError] = useState<string | null>(null);
  const [epubInstance, setEpubInstance] = useState<any>(null);
  const [epubRendition, setEpubRendition] = useState<any>(null);
  const [epubLocation, setEpubLocation] = useState<string | null>(null);
  const [epubToc, setEpubToc] = useState<any[]>([]);

  // EPUB logic
  useEffect(() => {
    if (!fileUrl) return;
    setEpubLoaded(false);
    setEpubError(null);
    try {
      const book = Epub(fileUrl);
      setEpubInstance(book);
      book.loaded.navigation.then(nav => {
        setEpubToc(nav.toc);
      });
      setEpubLoaded(true);
    } catch (err) {
      setEpubError('Failed to load EPUB.');
    }
  }, [fileUrl]);

  return (
    <div style={{ padding: '40px', maxWidth: 900, margin: '0 auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 24 }}>{bookName}</h2>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <b>EPUB Reader (Preview)</b><br/>
        <span>Advanced features (TOC, bookmarks, font size, etc.) coming soon.</span>
      </div>
      <div id="epub-viewer" style={{ width: '100%', height: 600, border: '1px solid #ccc', borderRadius: 8, background: '#fafafa' }}></div>
      {epubError && <div style={{ color: 'red', textAlign: 'center', marginTop: 16 }}>{epubError}</div>}
    </div>
  );
} 