'use client';

import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

interface PDFViewerProps {
  fileUrl: string;
  bookName: string;
}

export default function PDFViewer({ fileUrl, bookName }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfScale, setPdfScale] = useState<number>(1.2);
  const [error, setError] = useState<string | null>(null);

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