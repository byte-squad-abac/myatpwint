'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';

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
  submission_count: number;
  feedback_history: FeedbackHistory[];
  last_resubmitted_at: string | null;
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
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState('');
  const [customTag, setCustomTag] = useState('');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedFeedbackManuscript, setSelectedFeedbackManuscript] = useState<Manuscript | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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
          fetchExistingData();
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, [session]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-dropdown="category"]')) {
        setShowCategoryDropdown(false);
      }
      if (!target.closest('[data-dropdown="tag"]')) {
        setShowTagDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchManuscripts = async () => {
    if (!session) return;
    
    const { data } = await supabase
      .from('manuscripts')
      .select('*')
      .eq('author_id', session.user.id)
      .order('submitted_at', { ascending: false });
    
    setManuscripts(data || []);
  };

  const fetchExistingData = async () => {
    try {
      // Fetch existing categories from both books and manuscripts
      const { data: booksData } = await supabase
        .from('books')
        .select('category')
        .not('category', 'is', null);

      const { data: manuscriptsData } = await supabase
        .from('manuscripts')
        .select('category')
        .not('category', 'is', null);

      if (booksData || manuscriptsData) {
        const allCategoryStrings = [
          ...(booksData || []).map(item => item.category),
          ...(manuscriptsData || []).map(item => item.category)
        ];
        
        // Parse comma-separated categories and flatten unique ones
        const allCategories = allCategoryStrings
          .flatMap(catString => catString.split(',').map((cat: string) => cat.trim()))
          .filter((cat: string) => cat)
          .filter((cat: string, index: number, arr: string[]) => arr.indexOf(cat) === index)
          .sort();
        
        setExistingCategories(allCategories);
      }

      // Fetch existing tags from both books and manuscripts
      const { data: bookTagsData } = await supabase
        .from('books')
        .select('tags')
        .not('tags', 'is', null);

      const { data: manuscriptTagsData } = await supabase
        .from('manuscripts')
        .select('tags')
        .not('tags', 'is', null);

      if (bookTagsData || manuscriptTagsData) {
        const allTagArrays = [
          ...(bookTagsData || []).map(item => item.tags || []),
          ...(manuscriptTagsData || []).map(item => item.tags || [])
        ];
        
        const allTags = allTagArrays
          .flat()
          .filter((tag: string) => tag)
          .filter((tag: string, index: number, arr: string[]) => arr.indexOf(tag) === index)
          .sort();
        
        setExistingTags(allTags);
      }
    } catch (error) {
      console.error('Error fetching existing data:', error);
      // Fallback to default categories
      setExistingCategories(['Education', 'Fiction', 'Literature']);
      setExistingTags(['Animation Comedy', 'coding', 'computer', 'google', 'hacking', 'technology']);
    }
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const addCustomCategory = () => {
    if (customCategory.trim() && !selectedCategories.includes(customCategory.trim())) {
      setSelectedCategories(prev => [...prev, customCategory.trim()]);
      setCustomCategory('');
    }
  };

  const addCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags(prev => [...prev, customTag.trim()]);
      setCustomTag('');
    }
  };

  const getFilteredCategories = () => {
    return existingCategories.filter(category => 
      category.toLowerCase().includes(categorySearchTerm.toLowerCase()) &&
      !selectedCategories.includes(category)
    );
  };

  const getFilteredTags = () => {
    return existingTags.filter(tag => 
      tag.toLowerCase().includes(tagSearchTerm.toLowerCase()) &&
      !selectedTags.includes(tag)
    );
  };

  const handleCategorySearch = (searchTerm: string) => {
    setCategorySearchTerm(searchTerm);
    setShowCategoryDropdown(true);
  };

  const handleTagSearch = (searchTerm: string) => {
    setTagSearchTerm(searchTerm);
    setShowTagDropdown(true);
  };

  const selectCategoryFromDropdown = (category: string) => {
    if (!selectedCategories.includes(category)) {
      setSelectedCategories(prev => [...prev, category]);
    }
    setCategorySearchTerm('');
    setShowCategoryDropdown(false);
  };

  const selectTagFromDropdown = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag]);
    }
    setTagSearchTerm('');
    setShowTagDropdown(false);
  };

  const addCategoryFromSearch = () => {
    const trimmedTerm = categorySearchTerm.trim();
    if (trimmedTerm && !selectedCategories.includes(trimmedTerm)) {
      setSelectedCategories(prev => [...prev, trimmedTerm]);
      setCategorySearchTerm('');
      setShowCategoryDropdown(false);
    }
  };

  const addTagFromSearch = () => {
    const trimmedTerm = tagSearchTerm.trim();
    if (trimmedTerm && !selectedTags.includes(trimmedTerm)) {
      setSelectedTags(prev => [...prev, trimmedTerm]);
      setTagSearchTerm('');
      setShowTagDropdown(false);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterCategory('');
    setFilterTag('');
    setFilterDateFrom('');
    setFilterDateTo('');
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

  const getUniqueTags = () => {
    const allTags = manuscripts
      .flatMap(m => m.tags)
      .filter(tag => tag)
      .filter((tag, index, arr) => arr.indexOf(tag) === index)
      .sort();
    return allTags;
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (filterCategory) count++;
    if (filterTag) count++;
    if (filterDateFrom) count++;
    if (filterDateTo) count++;
    return count;
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

    if (selectedCategories.length === 0) {
      alert('Please select or add at least one category.');
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
          tags: selectedTags,
          category: selectedCategories.join(', '),
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
      setSelectedCategories([]);
      setSelectedTags([]);
      setCustomCategory('');
      setCustomTag('');
      setCategorySearchTerm('');
      setTagSearchTerm('');
      setShowCategoryDropdown(false);
      setShowTagDropdown(false);
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

  const resubmitManuscript = async (manuscript: Manuscript) => {
    if (!session?.user?.id) return;
    
    const confirmed = confirm(
      `Are you sure you want to resubmit "${manuscript.title}"? This will send it back to the editor for review.`
    );
    
    if (!confirmed) return;
    
    setSubmitting(true);
    try {
      // Get current editor info for feedback history
      const { data: editorData } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', manuscript.editor_id)
        .single();

      // Create new feedback history entry with current rejection
      const newFeedbackEntry = {
        feedback: manuscript.editor_feedback || 'No feedback provided',
        editor_id: manuscript.editor_id || '',
        editor_name: editorData?.name || 'Unknown Editor',
        timestamp: new Date().toISOString(),
        action: 'rejected' as const
      };

      // Update manuscript for resubmission
      const { error } = await supabase
        .from('manuscripts')
        .update({
          status: 'submitted',
          submission_count: manuscript.submission_count + 1,
          feedback_history: [...manuscript.feedback_history, newFeedbackEntry],
          last_resubmitted_at: new Date().toISOString(),
          editor_feedback: null, // Clear current feedback
          editor_id: null, // Clear current editor
          reviewed_at: null // Clear review timestamp
        })
        .eq('id', manuscript.id);

      if (error) throw error;

      fetchManuscripts();
      alert('Manuscript resubmitted successfully! It will appear in the editor\'s pending review queue.');

    } catch (error) {
      console.error('Resubmission error:', error);
      alert('Failed to resubmit manuscript. Please try again.');
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
      case 'submitted': return 'Pending Review';
      case 'under_review': return 'Under Review';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'published': return 'Published';
      default: return status;
    }
  };

  const getFilteredManuscripts = () => {
    let filtered = manuscripts;

    // Filter by tab status first
    if (activeTab !== 'all') {
      switch (activeTab) {
        case 'published':
          filtered = filtered.filter(m => m.status === 'published');
          break;
        case 'approved':
          filtered = filtered.filter(m => m.status === 'approved');
          break;
        case 'rejected':
          filtered = filtered.filter(m => m.status === 'rejected');
          break;
        case 'pending':
          filtered = filtered.filter(m => m.status === 'submitted' || m.status === 'under_review');
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
        m.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (filterCategory) {
      filtered = filtered.filter(m => 
        m.category.split(', ').some(cat => cat.trim() === filterCategory)
      );
    }

    // Filter by tag
    if (filterTag) {
      filtered = filtered.filter(m => 
        m.tags.includes(filterTag)
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

              {/* Categories */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Categories *
                </label>
                
                {/* Search Input */}
                <div data-dropdown="category" style={{ position: 'relative', marginBottom: '12px' }}>
                  <input
                    type="text"
                    value={categorySearchTerm}
                    onChange={(e) => handleCategorySearch(e.target.value)}
                    onFocus={() => setShowCategoryDropdown(true)}
                    placeholder="Search or add categories..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (getFilteredCategories().length > 0) {
                          selectCategoryFromDropdown(getFilteredCategories()[0]);
                        } else {
                          addCategoryFromSearch();
                        }
                      }
                    }}
                  />
                  
                  {/* Dropdown */}
                  {showCategoryDropdown && (categorySearchTerm || getFilteredCategories().length > 0) && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #ced4da',
                      borderTop: 'none',
                      borderRadius: '0 0 4px 4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      {/* Filtered existing categories */}
                      {getFilteredCategories().map((category) => (
                        <div
                          key={category}
                          onClick={() => selectCategoryFromDropdown(category)}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f8f9fa',
                            backgroundColor: 'white',
                            fontSize: '14px'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                        >
                          {category}
                        </div>
                      ))}
                      
                      {/* Add custom category option */}
                      {categorySearchTerm && !existingCategories.includes(categorySearchTerm) && !selectedCategories.includes(categorySearchTerm) && (
                        <div
                          onClick={addCategoryFromSearch}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            backgroundColor: '#f8f9fa',
                            fontSize: '14px',
                            fontStyle: 'italic',
                            color: '#007bff'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#e9ecef'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                        >
                          + Add "{categorySearchTerm}"
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Categories Display */}
                {selectedCategories.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>
                      Selected categories:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {selectedCategories.map((category) => (
                        <span
                          key={category}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}
                        >
                          {category}
                          <button
                            type="button"
                            onClick={() => setSelectedCategories(prev => prev.filter(c => c !== category))}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'white',
                              cursor: 'pointer',
                              padding: '0',
                              marginLeft: '2px'
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Tags
                </label>
                
                {/* Search Input */}
                <div data-dropdown="tag" style={{ position: 'relative', marginBottom: '12px' }}>
                  <input
                    type="text"
                    value={tagSearchTerm}
                    onChange={(e) => handleTagSearch(e.target.value)}
                    onFocus={() => setShowTagDropdown(true)}
                    placeholder="Search or add tags..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (getFilteredTags().length > 0) {
                          selectTagFromDropdown(getFilteredTags()[0]);
                        } else {
                          addTagFromSearch();
                        }
                      }
                    }}
                  />
                  
                  {/* Dropdown */}
                  {showTagDropdown && (tagSearchTerm || getFilteredTags().length > 0) && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #ced4da',
                      borderTop: 'none',
                      borderRadius: '0 0 4px 4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      {/* Filtered existing tags */}
                      {getFilteredTags().map((tag) => (
                        <div
                          key={tag}
                          onClick={() => selectTagFromDropdown(tag)}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f8f9fa',
                            backgroundColor: 'white',
                            fontSize: '14px'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                        >
                          {tag}
                        </div>
                      ))}
                      
                      {/* Add custom tag option */}
                      {tagSearchTerm && !existingTags.includes(tagSearchTerm) && !selectedTags.includes(tagSearchTerm) && (
                        <div
                          onClick={addTagFromSearch}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            backgroundColor: '#f8f9fa',
                            fontSize: '14px',
                            fontStyle: 'italic',
                            color: '#28a745'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#e9ecef'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                        >
                          + Add "{tagSearchTerm}"
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Tags Display */}
                {selectedTags.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>
                      Selected tags:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {selectedTags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'white',
                              cursor: 'pointer',
                              padding: '0',
                              marginLeft: '2px'
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Suggested Price */}
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
            marginBottom: '20px',
            animation: 'slideDown 0.3s ease-out'
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {/* Search Input */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, description, category..."
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

              {/* Tag Filter */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Tag
                </label>
                <select
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">All Tags</option>
                  {getUniqueTags().map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
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
            {(getActiveFiltersCount() > 0 || activeTab !== 'all') && (
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                backgroundColor: '#e9ecef',
                borderRadius: '4px',
                fontSize: '14px',
                color: '#495057'
              }}>
                Showing {getFilteredManuscripts().length} of {manuscripts.length} manuscripts
                {activeTab !== 'all' && ` in ${activeTab} status`}
                {getActiveFiltersCount() > 0 && ` with ${getActiveFiltersCount()} filter(s) applied`}
              </div>
            )}
          </div>
        )}
        
        {/* Status Tabs */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '2px solid #dee2e6', 
          marginBottom: '20px',
          gap: '0',
          overflowX: 'auto',
          flexWrap: 'nowrap'
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
                padding: '12px 16px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                color: activeTab === tab.key ? tab.color : '#6c757d',
                borderBottom: activeTab === tab.key ? `3px solid ${tab.color}` : '3px solid transparent',
                transition: 'all 0.2s ease',
                position: 'relative',
                whiteSpace: 'nowrap',
                minWidth: 'auto'
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
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', 
            gap: '24px' 
          }}>
            {getFilteredManuscripts().map((manuscript) => (
              <div
                key={manuscript.id}
                style={{
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  padding: '20px',
                  backgroundColor: 'white',
                  height: 'fit-content',
                  position: 'relative'
                }}
              >
                {/* Cover Image and Content Layout */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  {/* Book Cover */}
                  <div style={{ 
                    flexShrink: 0,
                    width: '80px',
                    height: '100px',
                    borderRadius: '4px',
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

                    {/* Categories and Info in one line */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      {manuscript.category.split(', ').slice(0, 1).map((category, index) => (
                        <span
                          key={index}
                          style={{
                            display: 'inline-block',
                            padding: '1px 4px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            borderRadius: '8px',
                            fontSize: '9px',
                            fontWeight: '500'
                          }}
                        >
                          {category.trim()}
                        </span>
                      ))}
                      {manuscript.category.split(', ').length > 1 && (
                        <span style={{ fontSize: '9px', color: '#6c757d' }}>
                          +{manuscript.category.split(', ').length - 1}
                        </span>
                      )}
                      <span style={{ fontSize: '10px', color: '#6c757d' }}>
                        {new Date(manuscript.submitted_at).toLocaleDateString()}
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
                  </div>
                </div>

                {/* Tags and Additional Info */}
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
                              padding: '4px 8px',
                              margin: '0 4px 0 0',
                              backgroundColor: '#f8f9fa',
                              color: '#495057',
                              borderRadius: '12px',
                              fontSize: '12px',
                              border: '1px solid #e9ecef',
                              fontWeight: '500'
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                        {manuscript.tags.length > 2 && (
                          <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '500' }}>
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
                        padding: '3px 8px',
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
                    
                    {manuscript.status === 'rejected' && (
                      <button
                        onClick={() => resubmitManuscript(manuscript)}
                        disabled={submitting}
                        style={{
                          padding: '3px 8px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          fontSize: '9px',
                          cursor: submitting ? 'not-allowed' : 'pointer',
                          opacity: submitting ? 0.6 : 1,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Resubmit
                      </button>
                    )}
                  </div>
                </div>

                {/* Feedback History Button */}
                {(manuscript.editor_feedback || (manuscript.feedback_history && manuscript.feedback_history.length > 0)) && (
                  <div style={{ marginTop: '8px' }}>
                    <button
                      onClick={() => {
                        setSelectedFeedbackManuscript(manuscript);
                        setShowFeedbackModal(true);
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: manuscript.status === 'rejected' ? '#dc3545' : 
                                       (manuscript.status === 'approved' || manuscript.status === 'published') ? '#28a745' : '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {manuscript.status === 'rejected' ? '❌' : 
                       (manuscript.status === 'approved' || manuscript.status === 'published') ? '✅' : '📝'} 
                      View Feedback
                      {manuscript.feedback_history && manuscript.feedback_history.length > 0 && (
                        <span style={{
                          backgroundColor: 'rgba(255,255,255,0.3)',
                          padding: '1px 4px',
                          borderRadius: '8px',
                          fontSize: '9px'
                        }}>
                          {manuscript.feedback_history.length + (manuscript.editor_feedback ? 1 : 0)}
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feedback History Modal */}
      {showFeedbackModal && selectedFeedbackManuscript && (
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
          zIndex: 1001
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '700px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#212529', fontSize: '20px' }}>
                📝 Feedback History: {selectedFeedbackManuscript.title}
              </h3>
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  setSelectedFeedbackManuscript(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#6c757d'
                }}
              >
                ✕
              </button>
            </div>

            {/* Current Status & Feedback */}
            {selectedFeedbackManuscript.editor_feedback && (
              <div style={{
                padding: '16px',
                backgroundColor: selectedFeedbackManuscript.status === 'rejected' ? '#f8d7da' : 
                               (selectedFeedbackManuscript.status === 'approved' || selectedFeedbackManuscript.status === 'published') ? '#d4edda' : '#d1ecf1',
                borderRadius: '8px',
                marginBottom: '16px',
                border: `1px solid ${selectedFeedbackManuscript.status === 'rejected' ? '#f5c6cb' : 
                                    (selectedFeedbackManuscript.status === 'approved' || selectedFeedbackManuscript.status === 'published') ? '#c3e6cb' : '#bee5eb'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '16px' }}>
                    {selectedFeedbackManuscript.status === 'rejected' ? '❌' : 
                     (selectedFeedbackManuscript.status === 'approved' || selectedFeedbackManuscript.status === 'published') ? '✅' : '📝'}
                  </span>
                  <strong style={{ 
                    color: selectedFeedbackManuscript.status === 'rejected' ? '#721c24' : 
                           (selectedFeedbackManuscript.status === 'approved' || selectedFeedbackManuscript.status === 'published') ? '#155724' : '#0c5460',
                    fontSize: '16px'
                  }}>
                    Current Status: {getStatusText(selectedFeedbackManuscript.status)}
                  </strong>
                </div>
                <p style={{ 
                  margin: 0, 
                  color: selectedFeedbackManuscript.status === 'rejected' ? '#721c24' : 
                         (selectedFeedbackManuscript.status === 'approved' || selectedFeedbackManuscript.status === 'published') ? '#155724' : '#0c5460',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                  {selectedFeedbackManuscript.editor_feedback}
                </p>
                {selectedFeedbackManuscript.reviewed_at && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: selectedFeedbackManuscript.status === 'rejected' ? '#5a1a20' : 
                           (selectedFeedbackManuscript.status === 'approved' || selectedFeedbackManuscript.status === 'published') ? '#6c7b0b' : '#436c82',
                    marginTop: '8px'
                  }}>
                    Reviewed on: {new Date(selectedFeedbackManuscript.reviewed_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}

            {/* Resubmit Info for Rejected Books */}
            {selectedFeedbackManuscript.status === 'rejected' && (
              <div style={{
                padding: '16px',
                backgroundColor: '#fff3cd',
                borderRadius: '8px',
                marginBottom: '16px',
                border: '1px solid #ffeeba'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '16px' }}>💡</span>
                  <strong style={{ color: '#856404', fontSize: '14px' }}>
                    You can fix the issues and resubmit this manuscript
                  </strong>
                </div>
                <p style={{ margin: 0, color: '#856404', fontSize: '12px' }}>
                  Use the "Resubmit" button above to send your revised manuscript back for review.
                </p>
              </div>
            )}

            {/* Previous Feedback History */}
            {selectedFeedbackManuscript.feedback_history && selectedFeedbackManuscript.feedback_history.length > 0 && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#495057', fontSize: '16px' }}>
                  📚 Previous Reviews ({selectedFeedbackManuscript.feedback_history.length})
                </h4>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {selectedFeedbackManuscript.feedback_history
                    .slice()
                    .reverse()
                    .map((feedback, index) => (
                    <div key={index} style={{
                      padding: '16px',
                      backgroundColor: feedback.action === 'approved' ? '#d1f2eb' : '#fadbd8',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      border: `1px solid ${feedback.action === 'approved' ? '#a3e4d7' : '#f5b7b1'}`,
                      borderLeft: `4px solid ${feedback.action === 'approved' ? '#28a745' : '#dc3545'}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px' }}>
                          {feedback.action === 'approved' ? '✅' : '❌'}
                        </span>
                        <strong style={{ 
                          color: feedback.action === 'approved' ? '#0e5e3e' : '#a42e2e',
                          fontSize: '14px'
                        }}>
                          {feedback.editor_name || 'Unknown Editor'} - {feedback.action.toUpperCase()}
                        </strong>
                      </div>
                      <p style={{ 
                        margin: '0 0 8px 0', 
                        color: feedback.action === 'approved' ? '#0e5e3e' : '#a42e2e',
                        fontSize: '14px',
                        lineHeight: '1.5'
                      }}>
                        {feedback.feedback}
                      </p>
                      <div style={{ 
                        fontSize: '12px', 
                        color: feedback.action === 'approved' ? '#52854c' : '#c65d5d'
                      }}>
                        {new Date(feedback.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Submission Count Info */}
            {selectedFeedbackManuscript.submission_count > 1 && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#e9ecef',
                borderRadius: '6px',
                border: '1px solid #ced4da',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '14px', color: '#495057', fontWeight: 'bold' }}>
                  📊 You have submitted this manuscript {selectedFeedbackManuscript.submission_count} times
                </span>
                {selectedFeedbackManuscript.last_resubmitted_at && (
                  <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                    Last submitted: {new Date(selectedFeedbackManuscript.last_resubmitted_at).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}