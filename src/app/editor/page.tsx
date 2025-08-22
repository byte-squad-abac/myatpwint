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
  status: 'submitted' | 'pending_review' | 'under_review' | 'approved' | 'rejected' | 'published';
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
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAuthor, setFilterAuthor] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeStatusTab, setActiveStatusTab] = useState<string>('all');

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
      case 'pending_review': return '#fd7e14';
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
      case 'pending_review': return 'Pending Review';
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

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterStatus('');
    setFilterCategory('');
    setFilterAuthor('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setActiveStatusTab('all');
  };

  const handleStatusCardClick = (status: string) => {
    setActiveStatusTab(status);
    setFilterStatus(''); // Clear dropdown filter when using status cards
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const getUniqueCategories = () => {
    const allCategories = manuscripts
      .flatMap(m => m.category.split(', ').map(cat => cat.trim()))
      .filter(cat => cat)
      .filter((cat, index, arr) => arr.indexOf(cat) === index)
      .sort();
    return allCategories;
  };

  const getUniqueAuthors = () => {
    const allAuthors = manuscripts
      .map(m => m.author?.name || 'Unknown')
      .filter((author, index, arr) => arr.indexOf(author) === index)
      .sort();
    return allAuthors;
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (filterStatus) count++;
    if (filterCategory) count++;
    if (filterAuthor) count++;
    if (filterDateFrom) count++;
    if (filterDateTo) count++;
    return count;
  };

  const getFilteredManuscripts = () => {
    let filtered = manuscripts;

    // Filter by status tab first
    if (activeStatusTab !== 'all') {
      switch (activeStatusTab) {
        case 'pending':
          filtered = filtered.filter(m => m.status === 'submitted');
          break;
        case 'review':
          filtered = filtered.filter(m => m.status === 'under_review');
          break;
        case 'approved':
          filtered = filtered.filter(m => m.status === 'approved');
          break;
        case 'rejected':
          filtered = filtered.filter(m => m.status === 'rejected');
          break;
        case 'published':
          filtered = filtered.filter(m => m.status === 'published');
          break;
      }
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        m.category.toLowerCase().includes(query) ||
        m.tags.some(tag => tag.toLowerCase().includes(query)) ||
        (m.author?.name || 'Unknown').toLowerCase().includes(query)
      );
    }

    // Filter by status dropdown (only if no status tab is active)
    if (filterStatus && activeStatusTab === 'all') {
      filtered = filtered.filter(m => m.status === filterStatus);
    }

    // Filter by category
    if (filterCategory) {
      filtered = filtered.filter(m => 
        m.category.split(', ').some(cat => cat.trim() === filterCategory)
      );
    }

    // Filter by author
    if (filterAuthor) {
      filtered = filtered.filter(m => 
        (m.author?.name || 'Unknown') === filterAuthor
      );
    }

    // Filter by date range
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      filtered = filtered.filter(m => 
        new Date(m.submitted_at) >= fromDate
      );
    }

    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(m => 
        new Date(m.submitted_at) <= toDate
      );
    }

    return filtered;
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '16px', 
        marginBottom: '30px' 
      }}>
        <div 
          onClick={() => handleStatusCardClick('all')}
          style={{
            padding: '16px',
            backgroundColor: activeStatusTab === 'all' ? '#e2e3e5' : '#f8f9fa',
            borderRadius: '8px',
            border: activeStatusTab === 'all' ? '2px solid #6c757d' : '1px solid #dee2e6',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', color: activeStatusTab === 'all' ? '#495057' : '#495057' }}>
            {manuscripts.length}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: activeStatusTab === 'all' ? '#495057' : '#6c757d' }}>All Books</p>
        </div>

        <div 
          onClick={() => handleStatusCardClick('pending')}
          style={{
            padding: '16px',
            backgroundColor: activeStatusTab === 'pending' ? '#ffeaa7' : '#f8f9fa',
            borderRadius: '8px',
            border: activeStatusTab === 'pending' ? '2px solid #fd7e14' : '1px solid #dee2e6',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', color: activeStatusTab === 'pending' ? '#e17055' : '#495057' }}>
            {manuscripts.filter(m => m.status === 'submitted').length}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: activeStatusTab === 'pending' ? '#e17055' : '#6c757d' }}>Pending Review</p>
        </div>
        
        <div 
          onClick={() => handleStatusCardClick('review')}
          style={{
            padding: '16px',
            backgroundColor: activeStatusTab === 'review' ? '#fff3cd' : '#f8f9fa',
            borderRadius: '8px',
            border: activeStatusTab === 'review' ? '2px solid #ffc107' : '1px solid #dee2e6',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', color: activeStatusTab === 'review' ? '#856404' : '#495057' }}>
            {manuscripts.filter(m => m.status === 'under_review').length}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: activeStatusTab === 'review' ? '#856404' : '#6c757d' }}>Under Review</p>
        </div>
        
        <div 
          onClick={() => handleStatusCardClick('approved')}
          style={{
            padding: '16px',
            backgroundColor: activeStatusTab === 'approved' ? '#d4edda' : '#f8f9fa',
            borderRadius: '8px',
            border: activeStatusTab === 'approved' ? '2px solid #28a745' : '1px solid #dee2e6',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', color: activeStatusTab === 'approved' ? '#155724' : '#495057' }}>
            {manuscripts.filter(m => m.status === 'approved').length}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: activeStatusTab === 'approved' ? '#155724' : '#6c757d' }}>Approved</p>
        </div>
        
        <div 
          onClick={() => handleStatusCardClick('rejected')}
          style={{
            padding: '16px',
            backgroundColor: activeStatusTab === 'rejected' ? '#f8d7da' : '#f8f9fa',
            borderRadius: '8px',
            border: activeStatusTab === 'rejected' ? '2px solid #dc3545' : '1px solid #dee2e6',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', color: activeStatusTab === 'rejected' ? '#721c24' : '#495057' }}>
            {manuscripts.filter(m => m.status === 'rejected').length}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: activeStatusTab === 'rejected' ? '#721c24' : '#6c757d' }}>Rejected</p>
        </div>
        
        <div 
          onClick={() => handleStatusCardClick('published')}
          style={{
            padding: '16px',
            backgroundColor: activeStatusTab === 'published' ? '#d1ecf1' : '#f8f9fa',
            borderRadius: '8px',
            border: activeStatusTab === 'published' ? '2px solid #007bff' : '1px solid #dee2e6',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', color: activeStatusTab === 'published' ? '#0c5460' : '#495057' }}>
            {manuscripts.filter(m => m.status === 'published').length}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: activeStatusTab === 'published' ? '#0c5460' : '#6c757d' }}>Published</p>
        </div>
      </div>

      {/* Manuscripts List */}
      <div>
        <h2 style={{ margin: '0 0 20px 0', color: '#212529' }}>Manuscripts Queue</h2>
        
        {/* Filter Toggle Button */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={toggleFilters}
            style={{
              backgroundColor: showFilters ? '#dc3545' : '#007bff',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {showFilters ? '✕ Hide Filters' : '🔍 Show Filters & Search'}
            {getActiveFiltersCount() > 0 && (
              <span style={{
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {getActiveFiltersCount()}
              </span>
            )}
          </button>
        </div>

        {/* Collapsible Filters and Search */}
        {showFilters && (
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#495057' }}>
                Filters & Search {getActiveFiltersCount() > 0 && (
                  <span style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    marginLeft: '8px'
                  }}>
                    {getActiveFiltersCount()}
                  </span>
                )}
              </h3>
              {getActiveFiltersCount() > 0 && (
                <button
                  onClick={clearAllFilters}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Clear All
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {/* Search Input */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, author, category..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Status Filter */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="published">Published</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">All Categories</option>
                  {getUniqueCategories().map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Author Filter */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Author
                </label>
                <select
                  value={filterAuthor}
                  onChange={(e) => setFilterAuthor(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">All Authors</option>
                  {getUniqueAuthors().map((author) => (
                    <option key={author} value={author}>
                      {author}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Date To */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Results Summary */}
            {getActiveFiltersCount() > 0 && (
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                backgroundColor: '#e9ecef',
                borderRadius: '4px',
                fontSize: '14px',
                color: '#495057'
              }}>
                Showing {getFilteredManuscripts().length} of {manuscripts.length} manuscripts
                {getActiveFiltersCount() > 0 && ` with ${getActiveFiltersCount()} filter(s) applied`}
              </div>
            )}
          </div>
        )}
        
        {getFilteredManuscripts().length === 0 ? (
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
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', 
            gap: '20px' 
          }}>
            {getFilteredManuscripts().map((manuscript) => (
              <div
                key={manuscript.id}
                style={{
                  border: '1px solid #dee2e6',
                  borderLeft: `4px solid ${getPriorityColor(manuscript.submitted_at, manuscript.status)}`,
                  borderRadius: '8px',
                  padding: '16px',
                  backgroundColor: 'white',
                  height: 'fit-content',
                  position: 'relative'
                }}
              >
                {/* Cover Image and Content Layout */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  {/* Book Cover */}
                  <div style={{ 
                    flexShrink: 0,
                    width: '60px',
                    height: '75px',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    border: '1px solid #e9ecef',
                    backgroundColor: '#f8f9fa'
                  }}>
                    <img
                      src={manuscript.cover_image_url}
                      alt={`${manuscript.title} cover`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center'
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:9px;color:#6c757d;text-align:center;">No Cover</div>';
                        }
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title and Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <h3 style={{ 
                        margin: '0', 
                        color: '#212529', 
                        fontSize: '14px',
                        lineHeight: '1.2',
                        wordWrap: 'break-word',
                        flex: 1,
                        paddingRight: '6px'
                      }}>
                        {manuscript.title}
                      </h3>
                      
                      {/* Status Badge */}
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          backgroundColor: getStatusColor(manuscript.status),
                          color: 'white',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        {getStatusText(manuscript.status)}
                      </span>
                    </div>

                    {/* Author, Category, Time inline */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', color: '#6c757d' }}>
                        {manuscript.author?.name || 'Unknown'}
                      </span>
                      <span style={{ fontSize: '9px', color: '#007bff' }}>
                        {manuscript.category.split(', ')[0]}
                      </span>
                      <span style={{ fontSize: '10px', color: '#6c757d' }}>
                        {formatDuration(manuscript.submitted_at)}
                      </span>
                      {manuscript.suggested_price && (
                        <span style={{ fontSize: '10px', color: '#6c757d' }}>
                          {manuscript.suggested_price.toLocaleString()} MMK
                        </span>
                      )}
                    </div>

                    {/* Description - Truncated */}
                    <p style={{ 
                      margin: '0', 
                      color: '#495057', 
                      fontSize: '11px',
                      lineHeight: '1.3',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {manuscript.description}
                    </p>

                    {/* Under Review Indicator */}
                    {manuscript.editor_id === session?.user.id && manuscript.status === 'under_review' && (
                      <div style={{ fontSize: '9px', color: '#007bff', fontWeight: 'bold', marginTop: '2px' }}>
                        You are reviewing
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags and Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  {/* Tags */}
                  <div style={{ flex: 1 }}>
                    {manuscript.tags.length > 0 && (
                      <div>
                        {manuscript.tags.slice(0, 2).map((tag, index) => (
                          <span
                            key={index}
                            style={{
                              display: 'inline-block',
                              padding: '1px 4px',
                              margin: '0 2px 0 0',
                              backgroundColor: '#f8f9fa',
                              color: '#495057',
                              borderRadius: '6px',
                              fontSize: '8px',
                              border: '1px solid #e9ecef'
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                        {manuscript.tags.length > 2 && (
                          <span style={{ fontSize: '8px', color: '#6c757d' }}>
                            +{manuscript.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <a
                      href={manuscript.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '3px 6px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '3px',
                        fontSize: '9px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      DOCX
                    </a>

                    {manuscript.status === 'submitted' && (
                      <button
                        onClick={() => startReview(manuscript)}
                        disabled={processing}
                        style={{
                          padding: '3px 6px',
                          backgroundColor: '#ffc107',
                          color: '#212529',
                          border: 'none',
                          borderRadius: '3px',
                          fontSize: '9px',
                          cursor: processing ? 'not-allowed' : 'pointer',
                          opacity: processing ? 0.6 : 1,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Review
                      </button>
                    )}

                    {manuscript.status === 'under_review' && manuscript.editor_id === session?.user.id && (
                      <button
                        onClick={() => setSelectedManuscript(manuscript)}
                        style={{
                          padding: '3px 6px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          fontSize: '9px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>

                {/* Editor Feedback - Very Compact */}
                {manuscript.editor_feedback && (
                  <div style={{
                    padding: '4px 6px',
                    backgroundColor: manuscript.status === 'approved' ? '#d4edda' : '#f8d7da',
                    borderRadius: '3px',
                    marginTop: '6px',
                    fontSize: '10px'
                  }}>
                    <strong style={{ 
                      color: manuscript.status === 'approved' ? '#155724' : '#721c24',
                      fontSize: '9px'
                    }}>
                      Editor:
                    </strong>
                    <span style={{ 
                      color: manuscript.status === 'approved' ? '#155724' : '#721c24',
                      marginLeft: '4px'
                    }}>
                      {manuscript.editor_feedback.length > 50 
                        ? manuscript.editor_feedback.substring(0, 50) + '...'
                        : manuscript.editor_feedback
                      }
                    </span>
                  </div>
                )}
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