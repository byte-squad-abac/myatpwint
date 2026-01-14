'use client';

import { useState, useCallback } from 'react';
import { EditorConfig } from '../types';

export function useEditorConfig() {
  const [editorConfig, setEditorConfig] = useState<EditorConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEditorConfig = useCallback(async (
    manuscriptId: string,
    userId: string,
    userRole: string,
    manuscriptStatus: string,
    editorId: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      // Force destroy existing editor instances globally
      const existingEditor = document.getElementById(editorId);
      if (existingEditor) {
        existingEditor.innerHTML = '';
      }
      
      // Clear any global OnlyOffice instances
      if (typeof window !== 'undefined' && window.DocsAPI) {
        try {
          // Clear OnlyOffice instances if available
          if ('instances' in window.DocsAPI && window.DocsAPI.DocEditor && 'instances' in window.DocsAPI.DocEditor) {
            (window.DocsAPI.DocEditor as { instances: Record<string, unknown> }).instances = {};
          }
        } catch {
          // OnlyOffice instances cleared
        }
      }
      
      const response = await fetch(`/api/onlyoffice/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          manuscriptId,
          userId,
          userRole,
          manuscriptStatus
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Editor config API error:', response.status, errorData);
        throw new Error(errorData.error || `Failed to load editor configuration (${response.status})`);
      }

      const config = await response.json();
      setEditorConfig(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load editor');
      console.error('Editor config error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    editorConfig,
    loading,
    error,
    fetchEditorConfig,
    setError
  };
}