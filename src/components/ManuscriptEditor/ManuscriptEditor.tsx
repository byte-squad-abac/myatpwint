'use client';

import { useEffect, useState, useCallback } from 'react';
import { DocumentEditor, IConfig } from '@onlyoffice/document-editor-react';

import { ManuscriptEditorProps } from './types';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { EditorControls } from './EditorControls';
import { useEditorConfig } from './hooks/useEditorConfig';

export default function ManuscriptEditor({
  manuscriptId,
  userId,
  userRole,
  manuscriptStatus,
  onClose
}: ManuscriptEditorProps) {
  const [editorId] = useState(`manuscriptEditor-${Date.now()}`);
  
  const {
    editorConfig,
    loading,
    error,
    fetchEditorConfig
  } = useEditorConfig();

  const handleFetchConfig = useCallback(() => {
    fetchEditorConfig(manuscriptId, userId, userRole, manuscriptStatus, editorId);
  }, [fetchEditorConfig, manuscriptId, userId, userRole, manuscriptStatus, editorId]);

  useEffect(() => {
    // Force clear any cached editor instances on mount
    if (window.DocsAPI) {
      window.DocsAPI.DocEditor.instances = {};
    }
    
    handleFetchConfig();
  }, [manuscriptId, userId, userRole, manuscriptStatus, handleFetchConfig]);

  useEffect(() => {
    // Cleanup function to destroy editor when component unmounts
    return () => {
      const existingEditor = document.getElementById(editorId);
      if (existingEditor) {
        existingEditor.innerHTML = '';
      }
    };
  }, [editorId]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={handleFetchConfig} />;
  }

  if (!editorConfig) {
    return null;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-white">
      <EditorControls
        userRole={userRole}
        saving={false}
        onClose={onClose}
      />

      {/* OnlyOffice DocumentEditor */}
      <div className="w-full h-full">
        <DocumentEditor
          id={editorId}
          documentServerUrl={process.env.NEXT_PUBLIC_ONLYOFFICE_SERVER_URL || 'http://localhost'}
          config={editorConfig as unknown as IConfig}
        />
      </div>
    </div>
  );
}