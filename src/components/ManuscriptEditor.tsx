'use client';

import { useEffect, useState, useCallback } from 'react';
import { DocumentEditor } from '@onlyoffice/document-editor-react';

interface ManuscriptEditorProps {
  manuscriptId: string;
  userId: string;
  userRole: 'author' | 'editor' | 'viewer';
  manuscriptStatus: string;
  onClose?: () => void;
}

interface EditorConfig {
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
    permissions: {
      edit: boolean;
      download: boolean;
      print: boolean;
      review: boolean;
      comment: boolean;
      chat: boolean;
    };
    info: {
      owner: string;
      folder: string;
      uploaded: string;
    };
  };
  documentType: string;
  editorConfig: {
    mode: 'edit' | 'view';
    lang: string;
    callbackUrl: string;
    user: {
      id: string;
      name: string;
    };
    customization: {
      about: boolean;
      feedback: boolean;
      goback: {
        url: string;
        text: string;
      };
    };
  };
  height: string;
  width: string;
  token?: string;
}

export default function ManuscriptEditor({
  manuscriptId,
  userId,
  userRole,
  manuscriptStatus,
  onClose
}: ManuscriptEditorProps) {
  const [editorConfig, setEditorConfig] = useState<EditorConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchEditorConfig = useCallback(async () => {
    try {
      setLoading(true);
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
        throw new Error('Failed to load editor configuration');
      }

      const config = await response.json();
      setEditorConfig(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load editor');
      console.error('Editor config error:', err);
    } finally {
      setLoading(false);
    }
  }, [manuscriptId, userId, userRole, manuscriptStatus]);

  useEffect(() => {
    fetchEditorConfig();
  }, [fetchEditorConfig]);

  const onDocumentReady = useCallback(() => {
    console.log('Document is ready for editing');
  }, []);

  const onLoadComponentError = useCallback((error: any) => {
    console.error('OnlyOffice component load error:', error);
    setError('Failed to load document editor');
  }, []);

  const onRequestClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  const onRequestSaveAs = useCallback((event: any) => {
    console.log('Save as requested:', event);
  }, []);

  const onRequestEditRights = useCallback(() => {
    // Check if user can edit
    if (userRole === 'viewer' || manuscriptStatus === 'published') {
      return false;
    }
    return true;
  }, [userRole, manuscriptStatus]);

  const events = {
    onAppReady: () => {
      console.log('OnlyOffice app is ready');
    },
    onDocumentReady,
    onLoadComponentError,
    onRequestClose,
    onRequestSaveAs,
    onRequestEditRights,
    onCollaborativeChanges: () => {
      setSaving(true);
      setTimeout(() => setSaving(false), 1000);
    },
    onError: (event: any) => {
      console.error('OnlyOffice error:', event);
      setError('An error occurred in the document editor');
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '600px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ margin: 0, color: '#6c757d' }}>Loading document editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '600px',
        backgroundColor: '#f8d7da',
        borderRadius: '8px',
        border: '1px solid #f5c6cb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>⚠️</div>
          <h3 style={{ color: '#721c24', margin: '0 0 8px 0' }}>Error Loading Editor</h3>
          <p style={{ color: '#721c24', margin: '0 0 16px 0' }}>{error}</p>
          <button
            onClick={fetchEditorConfig}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!editorConfig) {
    return null;
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Save indicator */}
      {saving && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '20px',
          backgroundColor: '#28a745',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          💾 Saving...
        </div>
      )}

      {/* User role indicator */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '20px',
        backgroundColor: userRole === 'author' ? '#007bff' : userRole === 'editor' ? '#28a745' : '#6c757d',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 1000,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {userRole === 'author' ? '📝' : userRole === 'editor' ? '✏️' : '👁️'} {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
      </div>

      {/* OnlyOffice DocumentEditor */}
      <DocumentEditor
        id="manuscriptEditor"
        documentServerUrl={process.env.NEXT_PUBLIC_ONLYOFFICE_SERVER_URL || 'http://localhost'}
        config={editorConfig}
        events={events}
      />

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}