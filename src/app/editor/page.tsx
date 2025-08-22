'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';

type Manuscript = {
  id: string;
  title: string;
  description: string;
  file_url: string;
  cover_image_url: string;
  tags: string[];
  category: string;
  suggested_price: number | null;
  wants_physical: boolean;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'published';
  editor_feedback: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  author_id: string;
  editor_id: string | null;
  author?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export default function EditorPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const router = useRouter();

  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [selectedManuscript, setSelectedManuscript] = useState<Manuscript | null>(null);
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!session) return;
      
      // Check if user is editor
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.role) {
        setRole(profile.role);
        if (profile.role === 'editor' || profile.role === 'publisher') {
          fetchManuscripts();
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, [session]);

  const fetchManuscripts = async () => {
    try {
      // First, try to fetch manuscripts with author details
      const { data: manuscriptsData, error: manuscriptsError } = await supabase
        .from('manuscripts')
        .select('*')
        .order('submitted_at', { ascending: true });
      
      if (manuscriptsError) {
        console.error('Error fetching manuscripts:', manuscriptsError);
        setManuscripts([]);
        return;
      }

      if (!manuscriptsData || manuscriptsData.length === 0) {
        setManuscripts([]);
        return;
      }

      // Fetch author details separately
      const authorIds = manuscriptsData.map(m => m.author_id);
      const { data: authorsData } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', authorIds);

      // Combine data
      const manuscriptsWithAuthors = manuscriptsData.map(manuscript => ({
        ...manuscript,
        author: authorsData?.find(author => author.id === manuscript.author_id)
      }));

      setManuscripts(manuscriptsWithAuthors);
    } catch (error) {
      console.error('Error in fetchManuscripts:', error);
      setManuscripts([]);
    }
  };

  const formatDuration = (submittedAt: string) => {
    const now = new Date();
    const submitted = new Date(submittedAt);
    const diffTime = Math.abs(now.getTime() - submitted.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h ago`;
    } else {
      return `${diffHours}h ago`;
    }
  };

  const startReview = async (manuscript: Manuscript) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('manuscripts')
        .update({
          status: 'under_review',
          editor_id: session?.user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', manuscript.id);

      if (error) throw error;
      
      setSelectedManuscript({...manuscript, status: 'under_review', editor_id: session?.user.id || null});
      fetchManuscripts();
    } catch (error) {
      console.error('Error starting review:', error);
      alert('Failed to start review. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const submitReview = async (approved: boolean) => {
    if (!selectedManuscript || !session) return;
    
    if (!approved && !feedback.trim()) {
      alert('Please provide feedback when rejecting a manuscript.');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('manuscripts')
        .update({
          status: approved ? 'approved' : 'rejected',
          editor_feedback: feedback.trim() || null,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', selectedManuscript.id);

      if (error) throw error;
      
      setSelectedManuscript(null);
      setFeedback('');
      fetchManuscripts();
      alert(`Manuscript ${approved ? 'approved' : 'rejected'} successfully.`);
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return '#6c757d';
      case 'under_review': return '#ffc107';
      case 'approved': return '#28a745';
      case 'rejected': return '#dc3545';
      case 'published': return '#007bff';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted': return 'Pending Review';
      case 'under_review': return 'Under Review';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'published': return 'Published';
      default: return status;
    }
  };

  const getPriorityColor = (submittedAt: string, status: string) => {
    if (status !== 'submitted') return 'transparent';
    
    const daysSinceSubmission = Math.floor(
      (new Date().getTime() - new Date(submittedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceSubmission >= 7) return '#dc3545'; // Red - high priority
    if (daysSinceSubmission >= 3) return '#ffc107'; // Yellow - medium priority
    return '#28a745'; // Green - normal priority
  };

  if (loading || !session) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Loading...</h1>
      </div>
    );
  }

  if (!['editor', 'publisher'].includes(role || '')) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Access Denied</h1>
        <p>This page is for editors only.</p>
        <button onClick={() => router.push('/profile')}>Go to Profile</button>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ marginBottom: '30px', borderBottom: '1px solid #dee2e6', paddingBottom: '20px' }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#212529' }}>Editor Dashboard</h1>
        <p style={{ margin: 0, color: '#6c757d' }}>Review and approve manuscript submissions</p>
      </div>

      {/* Statistics */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px', 
        marginBottom: '30px' 
      }}>
        <div style={{
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#495057' }}>
            {manuscripts.filter(m => m.status === 'submitted').length}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>Pending Review</p>
        </div>
        
        <div style={{
          padding: '16px',
          backgroundColor: '#fff3cd',
          borderRadius: '8px',
          border: '1px solid #ffeaa7',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#856404' }}>
            {manuscripts.filter(m => m.status === 'under_review').length}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>Under Review</p>
        </div>
        
        <div style={{
          padding: '16px',
          backgroundColor: '#d4edda',
          borderRadius: '8px',
          border: '1px solid #c3e6cb',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#155724' }}>
            {manuscripts.filter(m => m.status === 'approved').length}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#155724' }}>Approved</p>
        </div>
        
        <div style={{
          padding: '16px',
          backgroundColor: '#d1ecf1',
          borderRadius: '8px',
          border: '1px solid #bee5eb',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#0c5460' }}>
            {manuscripts.filter(m => m.status === 'published').length}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#0c5460' }}>Published</p>
        </div>
      </div>

      {/* Manuscripts List */}
      <div>
        <h2 style={{ margin: '0 0 20px 0', color: '#212529' }}>Manuscripts Queue</h2>
        
        {manuscripts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <p style={{ margin: 0, color: '#6c757d' }}>No manuscripts to review.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {manuscripts.map((manuscript) => (
              <div
                key={manuscript.id}
                style={{
                  border: '1px solid #dee2e6',
                  borderLeft: `4px solid ${getPriorityColor(manuscript.submitted_at, manuscript.status)}`,
                  borderRadius: '8px',
                  padding: '20px',
                  backgroundColor: 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#212529' }}>{manuscript.title}</h3>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#6c757d', marginBottom: '8px' }}>
                      <span>Author: {manuscript.author?.name || 'Unknown'}</span>
                      <span>Category: {manuscript.category}</span>
                      <span>Submitted: {formatDuration(manuscript.submitted_at)}</span>
                    </div>
                    {manuscript.editor_id === session?.user.id && manuscript.status === 'under_review' && (
                      <div style={{ fontSize: '12px', color: '#007bff', fontWeight: 'bold' }}>
                        You are reviewing this manuscript
                      </div>
                    )}
                  </div>
                  
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: getStatusColor(manuscript.status),
                      color: 'white'
                    }}
                  >
                    {getStatusText(manuscript.status)}
                  </span>
                </div>

                <p style={{ margin: '0 0 12px 0', color: '#495057' }}>{manuscript.description}</p>

                {manuscript.tags.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    {manuscript.tags.map((tag, index) => (
                      <span
                        key={index}
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          margin: '2px 4px 2px 0',
                          backgroundColor: '#e9ecef',
                          color: '#495057',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '14px', color: '#6c757d', marginBottom: '12px' }}>
                  {manuscript.suggested_price && (
                    <span>Suggested Price: {manuscript.suggested_price.toLocaleString()} MMK</span>
                  )}
                  {manuscript.wants_physical && <span>Physical Book Requested</span>}
                </div>

                {manuscript.editor_feedback && (
                  <div style={{
                    marginBottom: '12px',
                    padding: '12px',
                    backgroundColor: '#f8d7da',
                    borderRadius: '4px',
                    border: '1px solid #f5c6cb'
                  }}>
                    <strong style={{ color: '#721c24' }}>Editor Feedback:</strong>
                    <p style={{ margin: '4px 0 0 0', color: '#721c24' }}>{manuscript.editor_feedback}</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <a
                    href={manuscript.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Download DOCX
                  </a>
                  
                  <a
                    href={manuscript.cover_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  >
                    View Cover
                  </a>

                  {manuscript.status === 'submitted' && (
                    <button
                      onClick={() => startReview(manuscript)}
                      disabled={processing}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#ffc107',
                        color: '#212529',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '14px',
                        cursor: processing ? 'not-allowed' : 'pointer',
                        opacity: processing ? 0.6 : 1
                      }}
                    >
                      Start Review
                    </button>
                  )}

                  {manuscript.status === 'under_review' && manuscript.editor_id === session?.user.id && (
                    <button
                      onClick={() => setSelectedManuscript(manuscript)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      Complete Review
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedManuscript && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#212529' }}>
              Complete Review: {selectedManuscript.title}
            </h3>
            
            <div style={{ marginBottom: '16px', fontSize: '14px', color: '#6c757d' }}>
              Author: {selectedManuscript.author?.name} | Category: {selectedManuscript.category}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Feedback (required for rejection)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Provide detailed feedback for the author..."
                rows={6}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setSelectedManuscript(null);
                  setFeedback('');
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={() => submitReview(false)}
                disabled={processing}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing ? 0.6 : 1
                }}
              >
                Reject
              </button>
              
              <button
                onClick={() => submitReview(true)}
                disabled={processing}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing ? 0.6 : 1
                }}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}