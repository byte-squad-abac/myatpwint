'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { useRouter, useSearchParams } from 'next/navigation';
import ManuscriptEditor from '../../components/ManuscriptEditor';

function ManuscriptEditorContent() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [manuscript, setManuscript] = useState<any>(null);
  const [userRole, setUserRole] = useState<'author' | 'editor' | 'publisher' | 'viewer' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const manuscriptId = searchParams.get('id');

  useEffect(() => {
    const initializeEditor = async () => {
      if (!session || !manuscriptId) {
        router.push('/login');
        return;
      }

      try {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError || !profile) {
          setError('User profile not found');
          return;
        }

        // Get manuscript data
        const { data: manuscriptData, error: manuscriptError } = await supabase
          .from('manuscripts')
          .select('*')
          .eq('id', manuscriptId)
          .single();

        if (manuscriptError || !manuscriptData) {
          setError('Manuscript not found');
          return;
        }

        // Check access permissions
        const canAccess = (
          (profile.role === 'author' && manuscriptData.author_id === session.user.id) ||
          (profile.role === 'editor') ||
          (profile.role === 'publisher')
        );

        if (!canAccess) {
          setError('You do not have permission to access this manuscript');
          return;
        }

        // Determine user role for this manuscript
        let effectiveRole: 'author' | 'editor' | 'publisher' | 'viewer';
        if (profile.role === 'author' && manuscriptData.author_id === session.user.id) {
          effectiveRole = 'author';
        } else if (profile.role === 'editor') {
          effectiveRole = 'editor';
        } else if (profile.role === 'publisher') {
          effectiveRole = 'publisher';
        } else {
          effectiveRole = 'viewer';
        }

        // Check if manuscript can be edited
        if (manuscriptData.status === 'published' || manuscriptData.status === 'archived') {
          effectiveRole = 'viewer';
        }

        setManuscript(manuscriptData);
        setUserRole(effectiveRole);

      } catch (err) {
        console.error('Editor initialization error:', err);
        setError('Failed to initialize editor');
      } finally {
        setLoading(false);
      }
    };

    initializeEditor();
  }, [session, manuscriptId, supabase, router]);

  const handleClose = () => {
    // Navigate back to appropriate dashboard
    if (userRole === 'author') {
      router.push('/author');
    } else if (userRole === 'editor') {
      router.push('/editor');
    } else if (userRole === 'publisher') {
      router.push('/publisher');
    } else {
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <h2 style={{ color: '#6c757d' }}>Loading manuscript editor...</h2>
        </div>
      </div>
    );
  }

  if (error || !manuscript || !userRole) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          textAlign: 'center',
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          maxWidth: '500px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ color: '#dc3545', marginBottom: '16px' }}>Error</h2>
          <p style={{ color: '#6c757d', marginBottom: '24px' }}>
            {error || 'Failed to load manuscript'}
          </p>
          <button
            onClick={handleClose}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999,
      backgroundColor: 'white'
    }}>
      <ManuscriptEditor
        manuscriptId={manuscriptId!}
        userId={session!.user.id}
        userRole={userRole}
        manuscriptStatus={manuscript.status}
        onClose={handleClose}
      />
    </div>
  );
}

export default function ManuscriptEditorPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <h2 style={{ color: '#6c757d' }}>Loading manuscript editor...</h2>
        </div>
      </div>
    }>
      <ManuscriptEditorContent />
    </Suspense>
  );
}