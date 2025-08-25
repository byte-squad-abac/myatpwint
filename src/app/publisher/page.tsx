'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import { BooksService } from '@/lib/services/books.service';

type FeedbackHistory = {
  feedback: string;
  editor_id: string;
  editor_name?: string;
  timestamp: string;
  action: 'rejected' | 'approved' | 'under_review';
};

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
  submission_count: number;
  feedback_history: FeedbackHistory[];
  last_resubmitted_at: string | null;
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
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAuthor, setFilterAuthor] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeStatusTab, setActiveStatusTab] = useState<string>('all');
  
  // Publishing states
  const [publishData, setPublishData] = useState({
    finalPrice: '',
    edition: 'First Edition'
  });
  const [publishing, setPublishing] = useState(false);
  const [publishingProgress, setPublishingProgress] = useState('');

  // Available categories and authors for filters
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [existingAuthors, setExistingAuthors] = useState<{ id: string; name: string }[]>([]);

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
          fetchExistingData();
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, [session]);

  const fetchExistingData = async () => {
    try {
      // Fetch existing categories and authors for filter options
      const { data: categoriesData } = await supabase
        .from('manuscripts')
        .select('category')
        .not('category', 'is', null);

      const { data: authorsData } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'author');

      if (categoriesData) {
        const categories = categoriesData
          .map(item => item.category)
          .filter(Boolean)
          .filter((category, index, arr) => arr.indexOf(category) === index)
          .sort();
        setExistingCategories(categories);
      }

      if (authorsData) {
        setExistingAuthors(authorsData);
      }
    } catch (error) {
      console.error('Error fetching filter data:', error);
    }
  };

  const fetchManuscripts = async () => {
    try {
      // Fetch manuscripts with approved/published status - using simple approach
      const { data: manuscriptsData, error: manuscriptsError } = await supabase
        .from('manuscripts')
        .select('*')
        .in('status', ['approved', 'published'])
        .order('reviewed_at', { ascending: false });
      
      if (manuscriptsError) {
        console.error('Error fetching manuscripts:', manuscriptsError);
        setManuscripts([]);
        return;
      }

      if (!manuscriptsData || manuscriptsData.length === 0) {
        setManuscripts([]);
        return;
      }

      // Fetch author profiles separately
      const authorIds = [...new Set(manuscriptsData.map(m => m.author_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', authorIds);

      // Map profiles to manuscripts
      const manuscriptsWithProfiles = manuscriptsData.map(manuscript => ({
        ...manuscript,
        profiles: profilesData?.find(profile => profile.id === manuscript.author_id) || null
      }));

      // Check which published manuscripts have corresponding books
      const publishedManuscriptIds = manuscriptsWithProfiles
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
      const validManuscripts = manuscriptsWithProfiles.filter(manuscript => {
        if (manuscript.status === 'approved') return true;
        if (manuscript.status === 'published') {
          return existingBooks.some(book => book.manuscript_id === manuscript.id);
        }
        return false;
      });

      // Reset orphaned published manuscripts back to approved
      const orphanedManuscripts = manuscriptsWithProfiles.filter(manuscript => 
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
        validManuscripts.push(...orphanedManuscripts.map(m => ({ 
          ...m, 
          status: 'approved' as const, 
          published_at: null 
        })));
      }

      setManuscripts(validManuscripts);
    } catch (error) {
      console.error('Error in fetchManuscripts:', error);
      setManuscripts([]);
    }
  };

  // Filter manuscripts based on search and filter criteria
  const filteredManuscripts = manuscripts.filter(manuscript => {
    // Search query filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        manuscript.title.toLowerCase().includes(searchLower) ||
        manuscript.description.toLowerCase().includes(searchLower) ||
        manuscript.profiles?.name?.toLowerCase().includes(searchLower) ||
        manuscript.tags.some(tag => tag.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filterStatus && manuscript.status !== filterStatus) return false;

    // Category filter
    if (filterCategory && manuscript.category !== filterCategory) return false;

    // Author filter
    if (filterAuthor && manuscript.author_id !== filterAuthor) return false;

    // Date range filter
    if (filterDateFrom) {
      const submittedDate = new Date(manuscript.submitted_at);
      const fromDate = new Date(filterDateFrom);
      if (submittedDate < fromDate) return false;
    }

    if (filterDateTo) {
      const submittedDate = new Date(manuscript.submitted_at);
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      if (submittedDate > toDate) return false;
    }

    return true;
  });

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterStatus('');
    setFilterCategory('');
    setFilterAuthor('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const formatDuration = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h ago`;
    } else {
      return `${diffHours}h ago`;
    }
  };

  const handleStatusCardClick = (status: string) => {
    setActiveStatusTab(status);
    setFilterStatus(''); // Clear dropdown filter when using status cards
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchQuery) count++;
    if (filterStatus) count++;
    if (filterCategory) count++;
    if (filterAuthor) count++;
    if (filterDateFrom) count++;
    if (filterDateTo) count++;
    return count;
  };

  const getFilteredManuscripts = () => {
    return filteredManuscripts.filter(manuscript => {
      if (activeStatusTab === 'all') return true;
      if (activeStatusTab === 'approved') return manuscript.status === 'approved';
      if (activeStatusTab === 'published') return manuscript.status === 'published';
      return false;
    });
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

  const isFiltered = searchQuery || filterStatus || filterCategory || filterAuthor || filterDateFrom || filterDateTo;
  const finalFilteredManuscripts = getFilteredManuscripts();

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
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

      {/* Manuscripts Queue Title and Filter Toggle */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', color: '#333' }}>Manuscripts Queue</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <button
            onClick={toggleFilters}
            style={{
              padding: '8px 16px',
              backgroundColor: showFilters ? '#dc3545' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
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
                fontSize: '12px'
              }}>
                {getActiveFiltersCount()}
              </span>
            )}
          </button>
        </div>

        {/* Results Counter */}
        {getFilteredManuscripts().length !== manuscripts.length && (
          <div style={{
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

        {/* Collapsible Filters & Search */}
        {showFilters && (
          <div style={{
            marginTop: '16px',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#495057' }}>Filters & Search</h4>
            
            {/* Search Bar */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Search
              </label>
              <input
                type="text"
                placeholder="Search by title, author, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Filter Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '16px',
              marginBottom: '16px'
            }}>
              {/* Status Filter */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="approved">Approved</option>
                  <option value="published">Published</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">All Categories</option>
                  {existingCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Author Filter */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Author
                </label>
                <select
                  value={filterAuthor}
                  onChange={(e) => setFilterAuthor(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">All Authors</option>
                  {existingAuthors.map(author => (
                    <option key={author.id} value={author.id}>{author.name}</option>
                  ))}
                </select>
              </div>

              {/* Date From Filter */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Date To Filter */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {getActiveFiltersCount() > 0 && (
              <button
                onClick={clearAllFilters}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Status Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px', 
        marginBottom: '30px' 
      }}>
        <div 
          onClick={() => handleStatusCardClick('all')}
          style={{
            padding: '16px',
            backgroundColor: activeStatusTab === 'all' ? '#e9ecef' : '#f8f9fa',
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
          onClick={() => handleStatusCardClick('published')}
          style={{
            padding: '16px',
            backgroundColor: activeStatusTab === 'published' ? '#d1ecf1' : '#f8f9fa',
            borderRadius: '8px',
            border: activeStatusTab === 'published' ? '2px solid #17a2b8' : '1px solid #dee2e6',
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

      {/* Manuscripts Grid - Book Card Style */}
      <div>
        <h2 style={{ margin: '0 0 20px 0', color: '#212529' }}>Manuscripts</h2>
        
        {finalFilteredManuscripts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <p style={{ margin: 0, color: '#6c757d' }}>
              {isFiltered || activeStatusTab !== 'all' ? 'No manuscripts match your filters.' : 'No manuscripts to review.'}
            </p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
            gap: '20px' 
          }}>
            {finalFilteredManuscripts.map((manuscript) => (
              <div
                key={manuscript.id}
                style={{
                  border: '1px solid #dee2e6',
                  borderLeft: `4px solid ${getPriorityColor(manuscript.reviewed_at || '', manuscript.status)}`,
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  overflow: 'hidden',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
              >
                {/* Cover Image */}
                {manuscript.cover_image_url && (
                  <div style={{ 
                    height: '200px', 
                    backgroundImage: `url(${manuscript.cover_image_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px'
                    }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: getStatusColor(manuscript.status),
                          color: 'white'
                        }}
                      >
                        {getStatusText(manuscript.status)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div style={{ padding: '16px' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#212529', fontSize: '16px', fontWeight: '600' }}>
                    {manuscript.title}
                  </h3>
                  
                  <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '8px' }}>
                    <div>Author: {manuscript.profiles?.name || 'Unknown'}</div>
                    <div>Category: {manuscript.category}</div>
                    {manuscript.reviewed_at && (
                      <div>Approved: {formatDuration(manuscript.reviewed_at)}</div>
                    )}
                  </div>

                  <p style={{ 
                    margin: '0 0 12px 0', 
                    color: '#495057', 
                    fontSize: '14px',
                    lineHeight: '1.4',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {manuscript.description}
                  </p>

                  {/* Tags */}
                  {manuscript.tags.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      {manuscript.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            margin: '2px 4px 2px 0',
                            backgroundColor: '#e9ecef',
                            color: '#495057',
                            borderRadius: '8px',
                            fontSize: '11px'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                      {manuscript.tags.length > 3 && (
                        <span style={{ fontSize: '11px', color: '#6c757d' }}>
                          +{manuscript.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Price and Physical Book Info */}
                  <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '12px' }}>
                    {manuscript.suggested_price && (
                      <div>Suggested Price: {manuscript.suggested_price.toLocaleString()} MMK</div>
                    )}
                    {manuscript.wants_physical && <div>Physical Book Requested</div>}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    >
                      DOCX
                    </a>
                    
                    {/* View Button - Opens manuscript editor */}
                    <button
                      onClick={() => router.push(`/manuscript-editor?id=${manuscript.id}`)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      ✏️ View
                    </button>

                    {manuscript.status === 'approved' && (
                      <>
                        <a
                          href={createMailtoLink(manuscript)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          📧 Email
                        </a>

                        <button
                          onClick={() => setSelectedManuscript(manuscript)}
                          disabled={publishing}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: publishing ? 'not-allowed' : 'pointer',
                            opacity: publishing ? 0.6 : 1
                          }}
                        >
                          📚 Publish
                        </button>
                      </>
                    )}

                    {manuscript.status === 'published' && (
                      <span style={{
                        padding: '6px 12px',
                        backgroundColor: '#e9ecef',
                        color: '#495057',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        ✅ Published
                      </span>
                    )}
                  </div>
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