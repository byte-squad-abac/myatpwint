'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { ManuscriptEditor } from '@/components/ManuscriptEditor';

function ManuscriptEditorContent() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const [manuscript, setManuscript] = useState<{
    id: string;
    title: string;
    author_id: string;
    status: string;
  } | null>(null);
  const [userRole, setUserRole] = useState<'author' | 'editor' | 'publisher' | 'viewer' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const manuscriptId = searchParams.get('id');

  useEffect(() => {
    const initializeEditor = async () => {
      if (authLoading) return;
      
      if (!user || !manuscriptId) {
        router.push('/login');
        return;
      }

      if (!profile) {
        setError('User profile not found');
        setLoading(false);
        return;
      }

      try {
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
          (profile.role === 'author' && manuscriptData.author_id === user.id) ||
          (profile.role === 'editor') ||
          (profile.role === 'publisher')
        );

        if (!canAccess) {
          setError('You do not have permission to access this manuscript');
          return;
        }

        // Determine user role for this manuscript
        let effectiveRole: 'author' | 'editor' | 'publisher' | 'viewer';
        if (profile.role === 'author' && manuscriptData.author_id === user.id) {
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
  }, [user, profile, authLoading, manuscriptId, supabase, router]);

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

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading manuscript editor...</h2>
        </div>
      </div>
    );
  }

  if (error || !manuscript || !userRole || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error || 'Failed to load manuscript'}</p>
          <button
            onClick={handleClose}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden">
      <ManuscriptEditor
        manuscriptId={manuscriptId!}
        userId={user.id}
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
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading manuscript editor...</h2>
        </div>
      </div>
    }>
      <ManuscriptEditorContent />
    </Suspense>
  );
}