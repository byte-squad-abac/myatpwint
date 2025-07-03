'use client';

import { useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
// import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
// import 'react-pdf/dist/esm/Page/TextLayer.css';
import Epub from 'epubjs';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

export default function MyLibraryReadPage() {
  const searchParams = useSearchParams();
  const fileUrl = searchParams.get('file');
  const bookName = searchParams.get('name') || 'My Book';
  const fileName = searchParams.get('fileName') || bookName;
  const [content, setContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // PDF state
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfScale, setPdfScale] = useState<number>(1.2);

  // EPUB state
  const [epubLoaded, setEpubLoaded] = useState(false);
  const [epubError, setEpubError] = useState<string | null>(null);
  const [epubInstance, setEpubInstance] = useState<any>(null);
  const [epubRendition, setEpubRendition] = useState<any>(null);
  const [epubLocation, setEpubLocation] = useState<string | null>(null);
  const [epubToc, setEpubToc] = useState<any[]>([]);

  // Helper to check file type
  const isTxtFile = (name: string) => name.toLowerCase().trim().endsWith('.txt');
  const isPdfFile = (name: string) => name.toLowerCase().trim().endsWith('.pdf');
  const isEpubFile = (name: string) => name.toLowerCase().trim().endsWith('.epub');

  // TXT logic
  useEffect(() => {
    if (!fileUrl || !isTxtFile(fileName)) return;
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
  }, [fileUrl, fileName]);

  // EPUB logic
  useEffect(() => {
    if (!fileUrl || !isEpubFile(fileName)) return;
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
  }, [fileUrl, fileName]);

  // Renderers
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
    return (
      <div style={{ padding: '40px', maxWidth: 900, margin: '0 auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>{bookName}</h2>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}>Prev</button>
          <span style={{ margin: '0 16px' }}>Page {pageNumber} of {numPages}</span>
          <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}>Next</button>
          <button style={{ marginLeft: 16 }} onClick={() => setPdfScale(s => Math.max(0.5, s - 0.2))}>-</button>
          <span style={{ margin: '0 8px' }}>Zoom</span>
          <button onClick={() => setPdfScale(s => Math.min(3, s + 0.2))}>+</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={err => setError('Failed to load PDF.')}
            loading={<div>Loading PDF...</div>}
            error={<div>Failed to load PDF.</div>}
          >
            <Page pageNumber={pageNumber} scale={pdfScale} />
          </Document>
        </div>
        {error && <div style={{ color: 'red', textAlign: 'center', marginTop: 16 }}>{error}</div>}
      </div>
    );
  }

  if (isEpubFile(fileName)) {
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