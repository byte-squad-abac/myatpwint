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
};

export default function AuthorPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const router = useRouter();

  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'approved' | 'rejected' | 'pending'>('all');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categories: '',
    tags: '',
    suggested_price: '',
    wants_physical: false
  });
  const [manuscriptFile, setManuscriptFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!session) return;
      
      // Check if user is author
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.role) {
        setRole(profile.role);
        if (profile.role === 'author') {
          fetchManuscripts();
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, [session]);

  const fetchManuscripts = async () => {
    if (!session) return;
    
    const { data } = await supabase
      .from('manuscripts')
      .select('*')
      .eq('author_id', session.user.id)
      .order('submitted_at', { ascending: false });
    
    setManuscripts(data || []);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'manuscript' | 'cover') => {
    const file = e.target.files?.[0];
    if (fileType === 'manuscript') {
      // Validate DOCX file
      if (file && !file.name.toLowerCase().endsWith('.docx')) {
        alert('Please upload a DOCX file only.');
        return;
      }
      setManuscriptFile(file || null);
    } else {
      // Validate image file
      if (file && !file.type.startsWith('image/')) {
        alert('Please upload an image file for the cover.');
        return;
      }
      setCoverImage(file || null);
    }
  };

  const submitManuscript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !manuscriptFile || !coverImage) {
      alert('Please fill all required fields and upload both DOCX file and cover image.');
      return;
    }

    setSubmitting(true);

    try {
      // Upload manuscript file
      const manuscriptPath = `manuscripts/${session.user.id}/${Date.now()}-${manuscriptFile.name}`;
      const { error: manuscriptUploadError } = await supabase.storage
        .from('manuscripts')
        .upload(manuscriptPath, manuscriptFile);

      if (manuscriptUploadError) throw manuscriptUploadError;

      // Upload cover image
      const coverPath = `covers/${session.user.id}/${Date.now()}-${coverImage.name}`;
      const { error: coverUploadError } = await supabase.storage
        .from('covers')
        .upload(coverPath, coverImage);

      if (coverUploadError) throw coverUploadError;

      // Get public URLs
      const { data: { publicUrl: manuscriptUrl } } = supabase.storage
        .from('manuscripts')
        .getPublicUrl(manuscriptPath);

      const { data: { publicUrl: coverUrl } } = supabase.storage
        .from('covers')
        .getPublicUrl(coverPath);

      // Insert manuscript record
      const { error: insertError } = await supabase
        .from('manuscripts')
        .insert({
          author_id: session.user.id,
          title: formData.title,
          description: formData.description,
          file_url: manuscriptUrl,
          cover_image_url: coverUrl,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          category: formData.categories.split(',').map(cat => cat.trim()).filter(Boolean).join(', '),
          suggested_price: formData.suggested_price ? parseInt(formData.suggested_price) : null,
          wants_physical: formData.wants_physical,
          status: 'submitted'
        });

      if (insertError) throw insertError;

      // Reset form and refresh data
      setFormData({
        title: '',
        description: '',
        categories: '',
        tags: '',
        suggested_price: '',
        wants_physical: false
      });
      setManuscriptFile(null);
      setCoverImage(null);
      setShowSubmissionForm(false);
      fetchManuscripts();
      alert('Manuscript submitted successfully!');

    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit manuscript. Please try again.');
    } finally {
      setSubmitting(false);
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
      case 'submitted': return 'Submitted';
      case 'under_review': return 'Under Review';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'published': return 'Published';
      default: return status;
    }
  };

  const getFilteredManuscripts = () => {
    if (activeTab === 'all') return manuscripts;
    
    switch (activeTab) {
      case 'published':
        return manuscripts.filter(m => m.status === 'published');
      case 'approved':
        return manuscripts.filter(m => m.status === 'approved');
      case 'rejected':
        return manuscripts.filter(m => m.status === 'rejected');
      case 'pending':
        return manuscripts.filter(m => m.status === 'submitted' || m.status === 'under_review');
      default:
        return manuscripts;
    }
  };

  const getTabCount = (tabType: typeof activeTab) => {
    if (tabType === 'all') return manuscripts.length;
    
    switch (tabType) {
      case 'published':
        return manuscripts.filter(m => m.status === 'published').length;
      case 'approved':
        return manuscripts.filter(m => m.status === 'approved').length;
      case 'rejected':
        return manuscripts.filter(m => m.status === 'rejected').length;
      case 'pending':
        return manuscripts.filter(m => m.status === 'submitted' || m.status === 'under_review').length;
      default:
        return 0;
    }
  };

  if (loading || !session) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Loading...</h1>
      </div>
    );
  }

  if (role !== 'author') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Access Denied</h1>
        <p>This page is for authors only.</p>
        <button onClick={() => router.push('/profile')}>Go to Profile</button>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '1000px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ marginBottom: '30px', borderBottom: '1px solid #dee2e6', paddingBottom: '20px' }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#212529' }}>Author Dashboard</h1>
        <p style={{ margin: 0, color: '#6c757d' }}>Submit and manage your manuscripts</p>
      </div>

      {/* Submit New Manuscript Button */}
      <div style={{ marginBottom: '30px' }}>
        <button
          onClick={() => setShowSubmissionForm(true)}
          disabled={showSubmissionForm}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: showSubmissionForm ? 'not-allowed' : 'pointer',
            opacity: showSubmissionForm ? 0.6 : 1
          }}
        >
          Submit New Manuscript
        </button>
      </div>

      {/* Submission Form */}
      {showSubmissionForm && (
        <div style={{
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '30px',
          backgroundColor: '#f8f9fa'
        }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#212529' }}>Submit New Manuscript</h2>
          
          <form onSubmit={submitManuscript}>
            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Title */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Categories and Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                    Categories (comma-separated) *
                  </label>
                  <input
                    type="text"
                    name="categories"
                    value={formData.categories}
                    onChange={handleInputChange}
                    placeholder="e.g., Fiction, Literature, History"
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  <small style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px', display: 'block' }}>
                    Enter multiple categories separated by commas. You can create custom categories.
                  </small>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                    Suggested Price (MMK)
                  </label>
                  <input
                    type="number"
                    name="suggested_price"
                    value={formData.suggested_price}
                    onChange={handleInputChange}
                    placeholder="Optional - for negotiation"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="e.g., myanmar, history, culture"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* File Uploads */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                    Manuscript File (DOCX only) *
                  </label>
                  <input
                    type="file"
                    accept=".docx"
                    onChange={(e) => handleFileChange(e, 'manuscript')}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                    Book Cover Image *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'cover')}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Physical Book Option */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    name="wants_physical"
                    checked={formData.wants_physical}
                    onChange={handleInputChange}
                  />
                  <span>I want a physical book version</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowSubmissionForm(false)}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit Manuscript'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Manuscripts List */}
      <div>
        <h2 style={{ margin: '0 0 20px 0', color: '#212529' }}>Your Manuscripts</h2>
        
        {/* Status Tabs */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '2px solid #dee2e6', 
          marginBottom: '20px',
          gap: '0'
        }}>
          {[
            { key: 'all', label: 'All', color: '#6c757d' },
            { key: 'published', label: 'Published', color: '#007bff' },
            { key: 'approved', label: 'Approved', color: '#28a745' },
            { key: 'rejected', label: 'Rejected', color: '#dc3545' },
            { key: 'pending', label: 'Pending', color: '#ffc107' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                color: activeTab === tab.key ? tab.color : '#6c757d',
                borderBottom: activeTab === tab.key ? `3px solid ${tab.color}` : '3px solid transparent',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              {tab.label}
              {getTabCount(tab.key as typeof activeTab) > 0 && (
                <span
                  style={{
                    marginLeft: '6px',
                    padding: '2px 6px',
                    backgroundColor: activeTab === tab.key ? tab.color : '#e9ecef',
                    color: activeTab === tab.key ? 'white' : '#6c757d',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  {getTabCount(tab.key as typeof activeTab)}
                </span>
              )}
            </button>
          ))}
        </div>
        
        {getFilteredManuscripts().length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <p style={{ margin: 0, color: '#6c757d' }}>
              {manuscripts.length === 0 
                ? 'No manuscripts submitted yet.' 
                : `No manuscripts found for ${activeTab === 'pending' ? 'pending status' : `${activeTab} status`}.`
              }
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {getFilteredManuscripts().map((manuscript) => (
              <div
                key={manuscript.id}
                style={{
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  padding: '20px',
                  backgroundColor: 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', color: '#212529' }}>{manuscript.title}</h3>
                    <div style={{ margin: '0 0 8px 0' }}>
                      {manuscript.category.split(', ').map((category, index) => (
                        <span
                          key={index}
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            margin: '2px 4px 2px 0',
                            backgroundColor: '#007bff',
                            color: 'white',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          {category.trim()}
                        </span>
                      ))}
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

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '14px', color: '#6c757d' }}>
                  <span>Submitted: {new Date(manuscript.submitted_at).toLocaleDateString()}</span>
                  {manuscript.suggested_price && (
                    <span>Suggested Price: {manuscript.suggested_price.toLocaleString()} MMK</span>
                  )}
                  {manuscript.wants_physical && <span>Physical Book Requested</span>}
                </div>

                {manuscript.editor_feedback && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: (manuscript.status === 'approved' || manuscript.status === 'published') ? '#d4edda' : '#f8d7da',
                    borderRadius: '4px',
                    border: (manuscript.status === 'approved' || manuscript.status === 'published') ? '1px solid #c3e6cb' : '1px solid #f5c6cb'
                  }}>
                    <strong style={{ color: (manuscript.status === 'approved' || manuscript.status === 'published') ? '#155724' : '#721c24' }}>Editor Feedback:</strong>
                    <p style={{ margin: '4px 0 0 0', color: (manuscript.status === 'approved' || manuscript.status === 'published') ? '#155724' : '#721c24' }}>{manuscript.editor_feedback}</p>
                  </div>
                )}

                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <a
                    href={manuscript.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  >
                    Download DOCX
                  </a>
                  <a
                    href={manuscript.cover_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  >
                    View Cover
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}