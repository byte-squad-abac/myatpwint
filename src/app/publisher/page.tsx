'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import { BooksService } from '@/lib/services/books.service';

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
  profiles?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export default function PublisherPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const router = useRouter();

  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [selectedManuscript, setSelectedManuscript] = useState<Manuscript | null>(null);
  const [publishData, setPublishData] = useState({
    finalPrice: '',
    edition: 'First Edition'
  });
  const [publishing, setPublishing] = useState(false);
  const [publishingProgress, setPublishingProgress] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      if (!session) return;
      
      // Check if user is publisher
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.role) {
        setRole(profile.role);
        if (profile.role === 'publisher') {
          fetchManuscripts();
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, [session]);

  const fetchManuscripts = async () => {
    try {
      // Fetch manuscripts with approved/published status
      const { data: manuscriptsData, error: manuscriptsError } = await supabase
        .from('manuscripts')
        .select('*')
        .in('status', ['approved', 'published'])
        .order('reviewed_at', { ascending: true });
      
      if (manuscriptsError) {
        console.error('Error fetching manuscripts:', manuscriptsError);
        setManuscripts([]);
        return;
      }

      if (!manuscriptsData || manuscriptsData.length === 0) {
        setManuscripts([]);
        return;
      }

      // Check which published manuscripts have corresponding books
      const publishedManuscriptIds = manuscriptsData
        .filter(m => m.status === 'published')
        .map(m => m.id);

      let existingBooks: { manuscript_id: string }[] = [];
      if (publishedManuscriptIds.length > 0) {
        const { data: booksData } = await supabase
          .from('books')
          .select('manuscript_id')
          .in('manuscript_id', publishedManuscriptIds);
        
        existingBooks = booksData || [];
      }

      // Filter out published manuscripts that don't have corresponding books
      const validManuscripts = manuscriptsData.filter(manuscript => {
        if (manuscript.status === 'approved') return true;
        if (manuscript.status === 'published') {
          return existingBooks.some(book => book.manuscript_id === manuscript.id);
        }
        return false;
      });

      // Reset orphaned published manuscripts back to approved
      const orphanedManuscripts = manuscriptsData.filter(manuscript => 
        manuscript.status === 'published' && 
        !existingBooks.some(book => book.manuscript_id === manuscript.id)
      );

      if (orphanedManuscripts.length > 0) {
        console.log(`Found ${orphanedManuscripts.length} orphaned published manuscripts, resetting to approved...`);
        
        for (const orphaned of orphanedManuscripts) {
          await supabase
            .from('manuscripts')
            .update({ 
              status: 'approved',
              published_at: null 
            })
            .eq('id', orphaned.id);
        }

        // Add the reset manuscripts back as approved
        validManuscripts.push(...orphanedManuscripts.map(m => ({ ...m, status: 'approved', published_at: null })));
      }

      // Fetch author details separately
      const authorIds = validManuscripts.map(m => m.author_id);
      const { data: authorsData } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', authorIds);

      // Combine data
      const manuscriptsWithAuthors = validManuscripts.map(manuscript => ({
        ...manuscript,
        profiles: authorsData?.find(author => author.id === manuscript.author_id)
      }));

      setManuscripts(manuscriptsWithAuthors);
    } catch (error) {
      console.error('Error in fetchManuscripts:', error);
      setManuscripts([]);
    }
  };

  const formatDuration = (reviewedAt: string) => {
    const now = new Date();
    const reviewed = new Date(reviewedAt);
    const diffTime = Math.abs(now.getTime() - reviewed.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h ago`;
    } else {
      return `${diffHours}h ago`;
    }
  };

  const generateEmailSubject = (manuscript: Manuscript) => {
    return `Price Negotiation: "${manuscript.title}" - MyatPwint Publishing`;
  };

  const generateEmailBody = (manuscript: Manuscript) => {
    const suggestedPriceText = manuscript.suggested_price 
      ? `Your suggested price: ${manuscript.suggested_price.toLocaleString()} MMK`
      : 'No suggested price provided';
    
    return `Dear ${manuscript.profiles?.name || 'Author'},

Congratulations! Your manuscript "${manuscript.title}" has been approved by our editorial team.

Manuscript Details:
- Title: ${manuscript.title}
- Category: ${manuscript.category}
- ${suggestedPriceText}
- Physical book requested: ${manuscript.wants_physical ? 'Yes' : 'No'}

We would like to discuss the final pricing and publishing terms for your book. Please reply to this email with your preferred price or any questions you may have.

We look forward to publishing your work!

Best regards,
MyatPwint Publishing Team`;
  };

  const createMailtoLink = (manuscript: Manuscript) => {
    const subject = encodeURIComponent(generateEmailSubject(manuscript));
    const body = encodeURIComponent(generateEmailBody(manuscript));
    return `mailto:${manuscript.profiles?.email}?subject=${subject}&body=${body}`;
  };

  const publishBook = async () => {
    if (!selectedManuscript || !publishData.finalPrice) {
      alert('Please enter the final price.');
      return;
    }

    setPublishing(true);
    setPublishingProgress('Preparing book data...');

    try {
      // Prepare book data for publishing
      const bookData = {
        manuscript_id: selectedManuscript.id,
        name: selectedManuscript.title,
        author: selectedManuscript.profiles?.name || 'Unknown Author',
        description: selectedManuscript.description,
        category: selectedManuscript.category,
        tags: selectedManuscript.tags,
        price: parseInt(publishData.finalPrice),
        edition: publishData.edition,
        image_url: selectedManuscript.cover_image_url,
        published_date: new Date().toISOString()
      };

      setPublishingProgress('Publishing book and triggering marketing automation...');
      
      // Use the existing books service to publish
      const result = await BooksService.publishBook(bookData);
      
      setPublishingProgress('Updating manuscript status...');
      
      // Update manuscript status to published
      const { error: updateError } = await supabase
        .from('manuscripts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          publisher_id: session?.user.id || null
        })
        .eq('id', selectedManuscript.id);

      if (updateError) throw updateError;

      setPublishingProgress('Complete!');
      setSelectedManuscript(null);
      setPublishData({ finalPrice: '', edition: 'First Edition' });
      fetchManuscripts();
      
      alert('Book published successfully! Marketing automation has been triggered.');

    } catch (error) {
      console.error('Publishing error:', error);
      alert('Failed to publish book. Please try again.');
      setPublishingProgress('');
    } finally {
      setPublishing(false);
      setTimeout(() => setPublishingProgress(''), 3000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#28a745';
      case 'published': return '#007bff';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Ready to Publish';
      case 'published': return 'Published';
      default: return status;
    }
  };

  const getPriorityColor = (reviewedAt: string, status: string) => {
    if (status !== 'approved') return 'transparent';
    
    const daysSinceReview = Math.floor(
      (new Date().getTime() - new Date(reviewedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceReview >= 7) return '#dc3545'; // Red - high priority
    if (daysSinceReview >= 3) return '#ffc107'; // Yellow - medium priority
    return '#28a745'; // Green - normal priority
  };

  if (loading || !session) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Loading...</h1>
      </div>
    );
  }

  if (role !== 'publisher') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Access Denied</h1>
        <p>This page is for publishers only.</p>
        <button onClick={() => router.push('/profile')}>Go to Profile</button>
      </div>
    );
  }

  const approvedCount = manuscripts.filter(m => m.status === 'approved').length;
  const publishedCount = manuscripts.filter(m => m.status === 'published').length;

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ marginBottom: '30px', borderBottom: '1px solid #dee2e6', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: '0 0 10px 0', color: '#212529' }}>Publisher Dashboard</h1>
            <p style={{ margin: 0, color: '#6c757d' }}>Manage approved manuscripts and publish books</p>
          </div>
          <a
            href="/admin"
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Admin Panel
          </a>
        </div>
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
          backgroundColor: '#d4edda',
          borderRadius: '8px',
          border: '1px solid #c3e6cb',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#155724' }}>
            {approvedCount}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#155724' }}>Awaiting Publication</p>
        </div>
        
        <div style={{
          padding: '16px',
          backgroundColor: '#d1ecf1',
          borderRadius: '8px',
          border: '1px solid #bee5eb',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#0c5460' }}>
            {publishedCount}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#0c5460' }}>Published</p>
        </div>
        
        <div style={{
          padding: '16px',
          backgroundColor: '#fff3cd',
          borderRadius: '8px',
          border: '1px solid #ffeaa7',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#856404' }}>
            {manuscripts.filter(m => m.status === 'approved' && m.reviewed_at && 
              Math.floor((new Date().getTime() - new Date(m.reviewed_at).getTime()) / (1000 * 60 * 60 * 24)) >= 3
            ).length}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>High Priority (3+ days)</p>
        </div>
      </div>

      {/* Publishing Progress */}
      {publishingProgress && (
        <div style={{
          padding: '16px',
          backgroundColor: '#d1ecf1',
          borderRadius: '8px',
          border: '1px solid #bee5eb',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, color: '#0c5460', fontWeight: 'bold' }}>
            {publishingProgress}
          </p>
        </div>
      )}

      {/* Manuscripts List */}
      <div>
        <h2 style={{ margin: '0 0 20px 0', color: '#212529' }}>Approved Manuscripts</h2>
        
        {manuscripts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <p style={{ margin: 0, color: '#6c757d' }}>No approved manuscripts to publish.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {manuscripts.map((manuscript) => (
              <div
                key={manuscript.id}
                style={{
                  border: '1px solid #dee2e6',
                  borderLeft: `4px solid ${getPriorityColor(manuscript.reviewed_at || '', manuscript.status)}`,
                  borderRadius: '8px',
                  padding: '20px',
                  backgroundColor: 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#212529' }}>{manuscript.title}</h3>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#6c757d', marginBottom: '8px' }}>
                      <span>Author: {manuscript.profiles?.name || 'Unknown'}</span>
                      <span>Email: {manuscript.profiles?.email || 'Unknown'}</span>
                      <span>Category: {manuscript.category}</span>
                      {manuscript.reviewed_at && (
                        <span>Approved: {formatDuration(manuscript.reviewed_at)}</span>
                      )}
                    </div>
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
                    backgroundColor: '#d4edda',
                    borderRadius: '4px',
                    border: '1px solid #c3e6cb'
                  }}>
                    <strong style={{ color: '#155724' }}>Editor Feedback:</strong>
                    <p style={{ margin: '4px 0 0 0', color: '#155724' }}>{manuscript.editor_feedback}</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
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

                  {manuscript.status === 'approved' && (
                    <>
                      <a
                        href={createMailtoLink(manuscript)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#17a2b8',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      >
                        Email Price Negotiation
                      </a>

                      <button
                        onClick={() => setSelectedManuscript(manuscript)}
                        disabled={publishing}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '14px',
                          cursor: publishing ? 'not-allowed' : 'pointer',
                          opacity: publishing ? 0.6 : 1
                        }}
                      >
                        Publish Book
                      </button>
                    </>
                  )}

                  {manuscript.status === 'published' && (
                    <span style={{
                      padding: '8px 16px',
                      backgroundColor: '#e9ecef',
                      color: '#495057',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}>
                      Published & Marketing Active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Publish Modal */}
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
              Publish: {selectedManuscript.title}
            </h3>
            
            <div style={{ marginBottom: '16px', fontSize: '14px', color: '#6c757d' }}>
              Author: {selectedManuscript.profiles?.name} | Category: {selectedManuscript.category}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Final Price (MMK) *
              </label>
              <input
                type="number"
                value={publishData.finalPrice}
                onChange={(e) => setPublishData(prev => ({ ...prev, finalPrice: e.target.value }))}
                placeholder={selectedManuscript.suggested_price?.toString() || 'Enter final price'}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Edition
              </label>
              <select
                value={publishData.edition}
                onChange={(e) => setPublishData(prev => ({ ...prev, edition: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="First Edition">First Edition</option>
                <option value="Second Edition">Second Edition</option>
                <option value="Revised Edition">Revised Edition</option>
                <option value="Special Edition">Special Edition</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setSelectedManuscript(null);
                  setPublishData({ finalPrice: '', edition: 'First Edition' });
                }}
                disabled={publishing}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: publishing ? 'not-allowed' : 'pointer',
                  opacity: publishing ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={publishBook}
                disabled={publishing || !publishData.finalPrice}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (publishing || !publishData.finalPrice) ? 'not-allowed' : 'pointer',
                  opacity: (publishing || !publishData.finalPrice) ? 0.6 : 1
                }}
              >
                {publishing ? 'Publishing...' : 'Publish & Trigger Marketing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}