'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuthContext } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'

type FeedbackHistory = {
  feedback: string
  editor_id: string
  editor_name?: string
  timestamp: string
  action: 'rejected' | 'approved' | 'under_review'
}

type Manuscript = {
  id: string
  title: string
  description: string
  file_url: string
  cover_image_url: string
  tags: string[]
  category: string
  suggested_price: number | null
  wants_physical: boolean
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'published'
  editor_feedback: string | null
  submitted_at: string
  reviewed_at: string | null
  submission_count: number
  feedback_history: FeedbackHistory[]
  last_resubmitted_at: string | null
}

export default function AuthorPage() {
  const { user, profile, loading: authLoading } = useAuthContext()
  const router = useRouter()

  const [pageLoading, setPageLoading] = useState(false)
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([])
  const [showSubmissionForm, setShowSubmissionForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'approved' | 'rejected' | 'pending'>('all')

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    suggested_price: '',
    wants_physical: false
  })
  const [manuscriptFile, setManuscriptFile] = useState<File | null>(null)
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [existingCategories, setExistingCategories] = useState<string[]>([])
  const [existingTags, setExistingTags] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [categorySearchTerm, setCategorySearchTerm] = useState('')
  const [tagSearchTerm, setTagSearchTerm] = useState('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showTagDropdown, setShowTagDropdown] = useState(false)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Feedback modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [selectedFeedbackManuscript, setSelectedFeedbackManuscript] = useState<Manuscript | null>(null)

  const fetchManuscripts = useCallback(async () => {
    if (!user) return
    
    const { data } = await supabase
      .from('manuscripts')
      .select('*')
      .eq('author_id', user.id)
      .order('submitted_at', { ascending: false })
    
    setManuscripts(data || [])
  }, [user])

  const fetchExistingData = useCallback(async () => {
    try {
      // Fetch existing categories
      const { data: booksData } = await supabase
        .from('books')
        .select('category')
        .not('category', 'is', null)

      const { data: manuscriptsData } = await supabase
        .from('manuscripts')
        .select('category')
        .not('category', 'is', null)

      if (booksData || manuscriptsData) {
        const allCategoryStrings = [
          ...(booksData || []).map(item => item.category),
          ...(manuscriptsData || []).map(item => item.category)
        ]
        
        const allCategories = allCategoryStrings
          .flatMap(catString => catString.split(',').map((cat: string) => cat.trim()))
          .filter((cat: string) => cat)
          .filter((cat: string, index: number, arr: string[]) => arr.indexOf(cat) === index)
          .sort()
        
        setExistingCategories(allCategories)
      }

      // Fetch existing tags
      const { data: bookTagsData } = await supabase
        .from('books')
        .select('tags')
        .not('tags', 'is', null)

      const { data: manuscriptTagsData } = await supabase
        .from('manuscripts')
        .select('tags')
        .not('tags', 'is', null)

      if (bookTagsData || manuscriptTagsData) {
        const allTagArrays = [
          ...(bookTagsData || []).map(item => item.tags || []),
          ...(manuscriptTagsData || []).map(item => item.tags || [])
        ]
        
        const allTags = allTagArrays
          .flat()
          .filter((tag: string) => tag)
          .filter((tag: string, index: number, arr: string[]) => arr.indexOf(tag) === index)
          .sort()
        
        setExistingTags(allTags)
      }
    } catch (error) {
      console.error('Error fetching existing data:', error)
      setExistingCategories(['Education', 'Fiction', 'Literature'])
      setExistingTags(['Animation Comedy', 'coding', 'computer', 'google', 'hacking', 'technology'])
    }
  }, [])

  useEffect(() => {
    // Don't check auth while still loading
    if (authLoading) return
    
    console.log('Auth check - User:', !!user, 'Profile:', profile?.role)
    
    if (!user) {
      console.log('No user, redirecting to login')
      router.push('/login')
      return
    }
    
    if (profile && profile.role !== 'author') {
      console.log('User role is not author:', profile.role, 'redirecting to home')
      router.push('/')
      return
    }

    // Only fetch data if user is authenticated and has author role
    if (user && (!profile || profile.role === 'author')) {
      setPageLoading(true)
      fetchManuscripts()
      fetchExistingData()
      setPageLoading(false)
    }
  }, [user, profile, router, authLoading, fetchManuscripts, fetchExistingData])

  // Handle clicking outside dropdowns to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // Close category dropdown if clicking outside
      if (showCategoryDropdown && !target.closest('.category-dropdown-container')) {
        setShowCategoryDropdown(false)
      }
      
      // Close tag dropdown if clicking outside
      if (showTagDropdown && !target.closest('.tag-dropdown-container')) {
        setShowTagDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCategoryDropdown, showTagDropdown])


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'manuscript' | 'cover') => {
    const file = e.target.files?.[0]
    if (fileType === 'manuscript') {
      if (file && !file.name.toLowerCase().endsWith('.docx')) {
        alert('Please upload a DOCX file only.')
        return
      }
      setManuscriptFile(file || null)
    } else {
      if (file && !file.type.startsWith('image/')) {
        alert('Please upload an image file for the cover.')
        return
      }
      setCoverImage(file || null)
    }
  }

  // Helper Functions
  const getActiveFiltersCount = () => {
    let count = 0
    if (searchQuery) count++
    if (filterCategory) count++
    if (filterTag) count++
    if (filterDateFrom) count++
    if (filterDateTo) count++
    return count
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setFilterCategory('')
    setFilterTag('')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  const getFilteredManuscripts = () => {
    let filtered = manuscripts

    // Filter by active tab
    if (activeTab === 'pending') {
      filtered = filtered.filter(m => m.status === 'submitted' || m.status === 'under_review')
    } else if (activeTab !== 'all') {
      filtered = filtered.filter(m => m.status === activeTab)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        m.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Apply category filter
    if (filterCategory) {
      filtered = filtered.filter(m => 
        m.category.toLowerCase().includes(filterCategory.toLowerCase())
      )
    }

    // Apply tag filter
    if (filterTag) {
      filtered = filtered.filter(m => 
        m.tags.some(tag => tag.toLowerCase().includes(filterTag.toLowerCase()))
      )
    }

    // Apply date filters
    if (filterDateFrom) {
      filtered = filtered.filter(m => new Date(m.submitted_at) >= new Date(filterDateFrom))
    }
    if (filterDateTo) {
      filtered = filtered.filter(m => new Date(m.submitted_at) <= new Date(filterDateTo))
    }

    return filtered
  }

  const getTabCount = (tab: typeof activeTab) => {
    if (tab === 'all') return manuscripts.length
    if (tab === 'pending') {
      return manuscripts.filter(m => m.status === 'submitted' || m.status === 'under_review').length
    }
    return manuscripts.filter(m => m.status === tab).length
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted': return 'Submitted'
      case 'under_review': return 'Under Review'
      case 'approved': return 'Approved'
      case 'rejected': return 'Rejected'
      case 'published': return 'Published'
      default: return status
    }
  }

  const getUniqueCategories = () => {
    const categories = new Set<string>()
    manuscripts.forEach(m => {
      m.category.split(', ').forEach(cat => {
        if (cat.trim()) categories.add(cat.trim())
      })
    })
    return Array.from(categories).sort()
  }

  const getUniqueTags = () => {
    const tags = new Set<string>()
    manuscripts.forEach(m => {
      m.tags.forEach(tag => {
        if (tag.trim()) tags.add(tag.trim())
      })
    })
    return Array.from(tags).sort()
  }

  const resubmitManuscript = async (manuscript: Manuscript) => {
    if (!manuscript.editor_feedback) {
      alert('No feedback available for resubmission')
      return
    }

    const confirmResubmit = window.confirm(
      `Are you sure you want to resubmit "${manuscript.title}"?\n\nThis will reset the manuscript status to 'submitted' and increment the submission count. The previous feedback will be preserved in the feedback history.`
    )

    if (!confirmResubmit) return

    setSubmitting(true)

    try {
      // Add current feedback to feedback history
      const updatedFeedbackHistory = [...(manuscript.feedback_history || [])]
      if (manuscript.editor_feedback) {
        updatedFeedbackHistory.push({
          feedback: manuscript.editor_feedback,
          editor_id: 'unknown',
          editor_name: 'Editor',
          timestamp: manuscript.reviewed_at || new Date().toISOString(),
          action: 'rejected'
        })
      }

      // Update manuscript
      const { error } = await supabase
        .from('manuscripts')
        .update({
          status: 'submitted',
          editor_feedback: null,
          reviewed_at: null,
          submission_count: (manuscript.submission_count || 1) + 1,
          feedback_history: updatedFeedbackHistory,
          last_resubmitted_at: new Date().toISOString()
        })
        .eq('id', manuscript.id)

      if (error) throw error

      await fetchManuscripts()
      alert('Manuscript resubmitted successfully!')

    } catch (error) {
      console.error('Resubmission error:', error)
      alert('Failed to resubmit manuscript. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const submitManuscript = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !manuscriptFile || !coverImage) {
      alert('Please fill all required fields and upload both DOCX file and cover image.')
      return
    }

    if (selectedCategories.length === 0) {
      alert('Please select or add at least one category.')
      return
    }

    setSubmitting(true)

    try {
      // Upload manuscript file
      const manuscriptPath = `manuscripts/${user.id}/${Date.now()}-${manuscriptFile.name}`
      const { error: manuscriptUploadError } = await supabase.storage
        .from('manuscripts')
        .upload(manuscriptPath, manuscriptFile)

      if (manuscriptUploadError) throw manuscriptUploadError

      // Upload cover image
      const coverPath = `covers/${user.id}/${Date.now()}-${coverImage.name}`
      const { error: coverUploadError } = await supabase.storage
        .from('covers')
        .upload(coverPath, coverImage)

      if (coverUploadError) throw coverUploadError

      // Get public URLs
      const { data: { publicUrl: manuscriptUrl } } = supabase.storage
        .from('manuscripts')
        .getPublicUrl(manuscriptPath)

      const { data: { publicUrl: coverUrl } } = supabase.storage
        .from('covers')
        .getPublicUrl(coverPath)

      // Insert manuscript record
      const { error: insertError } = await supabase
        .from('manuscripts')
        .insert({
          author_id: user.id,
          title: formData.title,
          description: formData.description,
          file_url: manuscriptUrl,
          cover_image_url: coverUrl,
          tags: selectedTags,
          category: selectedCategories.join(', '),
          suggested_price: formData.suggested_price ? parseInt(formData.suggested_price) : null,
          wants_physical: formData.wants_physical,
          status: 'submitted'
        })

      if (insertError) throw insertError

      // Reset form and refresh data
      setFormData({
        title: '',
        description: '',
        suggested_price: '',
        wants_physical: false
      })
      setManuscriptFile(null)
      setCoverImage(null)
      setSelectedCategories([])
      setSelectedTags([])
      setCategorySearchTerm('')
      setTagSearchTerm('')
      setShowCategoryDropdown(false)
      setShowTagDropdown(false)
      setShowSubmissionForm(false)
      fetchManuscripts()
      alert('Manuscript submitted successfully!')

    } catch (error) {
      console.error('Submission error:', error)
      alert('Failed to submit manuscript. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Author Dashboard</h1>
        <p className="text-gray-600 mt-2">Submit and manage your manuscripts</p>
      </div>

      {/* Submit New Manuscript Button */}
      <div className="mb-6">
        <Button
          onClick={() => setShowSubmissionForm(true)}
          disabled={showSubmissionForm}
        >
          Submit New Manuscript
        </Button>
      </div>

      {/* Submission Form */}
      {showSubmissionForm && (
        <Card className="mb-8">
          <h2 className="text-xl font-semibold mb-6">Submit New Manuscript</h2>
          
          <form onSubmit={submitManuscript} className="space-y-6">
            <Input
              label="Title *"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Categories with Advanced Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories *
              </label>
              
              {/* Search Input */}
              <div className="relative mb-3 category-dropdown-container">
                <input
                  type="text"
                  value={categorySearchTerm}
                  onChange={(e) => {
                    setCategorySearchTerm(e.target.value)
                    setShowCategoryDropdown(true)
                  }}
                  onFocus={() => setShowCategoryDropdown(true)}
                  placeholder="Search or add categories..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const filteredCategories = existingCategories.filter(category => 
                        category.toLowerCase().includes(categorySearchTerm.toLowerCase()) &&
                        !selectedCategories.includes(category)
                      )
                      if (filteredCategories.length > 0) {
                        setSelectedCategories(prev => [...prev, filteredCategories[0]])
                        setCategorySearchTerm('')
                        setShowCategoryDropdown(false)
                      } else if (categorySearchTerm.trim() && !selectedCategories.includes(categorySearchTerm.trim())) {
                        setSelectedCategories(prev => [...prev, categorySearchTerm.trim()])
                        setCategorySearchTerm('')
                        setShowCategoryDropdown(false)
                      }
                    }
                  }}
                />
                
                {/* Dropdown */}
                {showCategoryDropdown && (categorySearchTerm || existingCategories.length > 0) && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 border-t-0 rounded-b-md max-h-48 overflow-y-auto z-50 shadow-lg">
                    {/* Filtered existing categories */}
                    {existingCategories
                      .filter(category => 
                        category.toLowerCase().includes(categorySearchTerm.toLowerCase()) &&
                        !selectedCategories.includes(category)
                      )
                      .map((category) => (
                      <div
                        key={category}
                        onClick={() => {
                          setSelectedCategories(prev => [...prev, category])
                          setCategorySearchTerm('')
                          setShowCategoryDropdown(false)
                        }}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100"
                      >
                        {category}
                      </div>
                    ))}
                    
                    {/* Add custom category option */}
                    {categorySearchTerm && 
                     !existingCategories.includes(categorySearchTerm) && 
                     !selectedCategories.includes(categorySearchTerm) && (
                      <div
                        onClick={() => {
                          setSelectedCategories(prev => [...prev, categorySearchTerm.trim()])
                          setCategorySearchTerm('')
                          setShowCategoryDropdown(false)
                        }}
                        className="px-3 py-2 cursor-pointer bg-blue-50 text-blue-700 hover:bg-blue-100 italic"
                      >
                        + Add &quot;{categorySearchTerm}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Categories Display */}
              {selectedCategories.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm text-gray-600 mb-2">Selected categories:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategories.map((category) => (
                      <span
                        key={category}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {category}
                        <button
                          type="button"
                          onClick={() => setSelectedCategories(prev => prev.filter(c => c !== category))}
                          className="hover:bg-blue-200 rounded-full p-1 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tags with Advanced Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              
              {/* Search Input */}
              <div className="relative mb-3 tag-dropdown-container">
                <input
                  type="text"
                  value={tagSearchTerm}
                  onChange={(e) => {
                    setTagSearchTerm(e.target.value)
                    setShowTagDropdown(true)
                  }}
                  onFocus={() => setShowTagDropdown(true)}
                  placeholder="Search or add tags..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const filteredTags = existingTags.filter(tag => 
                        tag.toLowerCase().includes(tagSearchTerm.toLowerCase()) &&
                        !selectedTags.includes(tag)
                      )
                      if (filteredTags.length > 0) {
                        setSelectedTags(prev => [...prev, filteredTags[0]])
                        setTagSearchTerm('')
                        setShowTagDropdown(false)
                      } else if (tagSearchTerm.trim() && !selectedTags.includes(tagSearchTerm.trim())) {
                        setSelectedTags(prev => [...prev, tagSearchTerm.trim()])
                        setTagSearchTerm('')
                        setShowTagDropdown(false)
                      }
                    }
                  }}
                />
                
                {/* Dropdown */}
                {showTagDropdown && (tagSearchTerm || existingTags.length > 0) && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 border-t-0 rounded-b-md max-h-48 overflow-y-auto z-50 shadow-lg">
                    {/* Filtered existing tags */}
                    {existingTags
                      .filter(tag => 
                        tag.toLowerCase().includes(tagSearchTerm.toLowerCase()) &&
                        !selectedTags.includes(tag)
                      )
                      .map((tag) => (
                      <div
                        key={tag}
                        onClick={() => {
                          setSelectedTags(prev => [...prev, tag])
                          setTagSearchTerm('')
                          setShowTagDropdown(false)
                        }}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100"
                      >
                        {tag}
                      </div>
                    ))}
                    
                    {/* Add custom tag option */}
                    {tagSearchTerm && 
                     !existingTags.includes(tagSearchTerm) && 
                     !selectedTags.includes(tagSearchTerm) && (
                      <div
                        onClick={() => {
                          setSelectedTags(prev => [...prev, tagSearchTerm.trim()])
                          setTagSearchTerm('')
                          setShowTagDropdown(false)
                        }}
                        className="px-3 py-2 cursor-pointer bg-green-50 text-green-700 hover:bg-green-100 italic"
                      >
                        + Add &quot;{tagSearchTerm}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Tags Display */}
              {selectedTags.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm text-gray-600 mb-2">Selected tags:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                          className="hover:bg-green-200 rounded-full p-1 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Input
              label="Suggested Price (MMK)"
              name="suggested_price"
              type="number"
              value={formData.suggested_price}
              onChange={handleInputChange}
              helperText="Optional - for negotiation"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manuscript File (DOCX only) *
                </label>
                <input
                  type="file"
                  accept=".docx"
                  onChange={(e) => handleFileChange(e, 'manuscript')}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Book Cover Image *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'cover')}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="wants_physical"
                  checked={formData.wants_physical}
                  onChange={handleInputChange}
                />
                <span>I want a physical book version</span>
              </label>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowSubmissionForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={submitting}
                disabled={submitting}
              >
                Submit Manuscript
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Manuscripts List */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Manuscripts</h2>
        
        {/* Filter Toggle Button */}
        <div className="mb-4">
          <Button
            variant={showFilters ? 'error' : 'primary'}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? '✕ Hide Filters' : '🔍 Show Filters & Search'}
            {getActiveFiltersCount() > 0 && (
              <span className="ml-2 px-2 py-1 bg-white/30 rounded-full text-xs">
                {getActiveFiltersCount()}
              </span>
            )}
          </Button>
        </div>

        {/* Collapsible Filters */}
        {showFilters && (
          <Card className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                Filters & Search
                {getActiveFiltersCount() > 0 && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {getActiveFiltersCount()}
                  </span>
                )}
              </h3>
              {getActiveFiltersCount() > 0 && (
                <Button variant="secondary" size="sm" onClick={clearAllFilters}>
                  Clear All
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                label="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, description..."
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  {getUniqueCategories().map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tag</label>
                <select
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                >
                  <option value="">All Tags</option>
                  {getUniqueTags().map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="From Date"
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />

              <Input
                label="To Date"
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
              />
            </div>

            {/* Results Summary */}
            {(getActiveFiltersCount() > 0 || activeTab !== 'all') && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm text-gray-600">
                Showing {getFilteredManuscripts().length} of {manuscripts.length} manuscripts
                {activeTab !== 'all' && ` in ${activeTab} status`}
                {getActiveFiltersCount() > 0 && ` with ${getActiveFiltersCount()} filter(s) applied`}
              </div>
            )}
          </Card>
        )}
        
        {/* Status Tabs */}
        <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
          {[
            { key: 'all', label: 'All', color: 'gray' },
            { key: 'published', label: 'Published', color: 'blue' },
            { key: 'approved', label: 'Approved', color: 'green' },
            { key: 'rejected', label: 'Rejected', color: 'red' },
            { key: 'pending', label: 'Pending', color: 'yellow' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.key
                  ? `border-${tab.color}-500 text-${tab.color}-600`
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {getTabCount(tab.key as typeof activeTab) > 0 && (
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  activeTab === tab.key
                    ? `bg-${tab.color}-100 text-${tab.color}-800`
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {getTabCount(tab.key as typeof activeTab)}
                </span>
              )}
            </button>
          ))}
        </div>
        
        {getFilteredManuscripts().length === 0 ? (
          <Card>
            <p className="text-center text-gray-500">
              {manuscripts.length === 0 
                ? 'No manuscripts submitted yet.' 
                : `No manuscripts found for ${activeTab === 'pending' ? 'pending status' : `${activeTab} status`}.`
              }
            </p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {getFilteredManuscripts().map((manuscript) => (
              <Card key={manuscript.id}>
                <div className="flex gap-4">
                  <Image
                    src={manuscript.cover_image_url || '/book-placeholder.png'}
                    alt={manuscript.title}
                    width={80}
                    height={112}
                    className="w-20 h-28 object-cover rounded border flex-shrink-0"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg truncate pr-2">{manuscript.title}</h3>
                      <Badge 
                        variant={manuscript.status === 'published' ? 'primary' : 
                                manuscript.status === 'approved' ? 'success' : 
                                manuscript.status === 'rejected' ? 'error' : 'secondary'}
                      >
                        {getStatusText(manuscript.status)}
                      </Badge>
                    </div>

                    {/* Categories and Meta Info */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {manuscript.category.split(', ').slice(0, 1).map((category, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs"
                        >
                          {category.trim()}
                        </span>
                      ))}
                      {manuscript.category.split(', ').length > 1 && (
                        <span className="text-xs text-gray-500">
                          +{manuscript.category.split(', ').length - 1}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(manuscript.submitted_at).toLocaleDateString()}
                      </span>
                      {manuscript.suggested_price && (
                        <span className="text-xs text-gray-500">
                          {manuscript.suggested_price.toLocaleString()} MMK
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-3 line-clamp-2">{manuscript.description}</p>

                    {/* Tags */}
                    {manuscript.tags.length > 0 && (
                      <div className="mb-3">
                        {manuscript.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                        {manuscript.tags.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{manuscript.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Submitted: {new Date(manuscript.submitted_at).toLocaleDateString()}
                        {manuscript.submission_count > 1 && (
                          <span className="ml-2 text-orange-600">
                            (Submission #{manuscript.submission_count})
                          </span>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <a
                          href={manuscript.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                        >
                          View DOCX
                        </a>
                        
                        {manuscript.status === 'rejected' && (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => router.push(`/manuscript-editor?id=${manuscript.id}`)}
                            >
                              ✏️ Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => resubmitManuscript(manuscript)}
                              disabled={submitting}
                            >
                              Resubmit
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Feedback Button */}
                    {(manuscript.editor_feedback || (manuscript.feedback_history && manuscript.feedback_history.length > 0)) && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant={manuscript.status === 'rejected' ? 'error' : 
                                 manuscript.status === 'approved' || manuscript.status === 'published' ? 'success' : 'secondary'}
                          onClick={() => {
                            setSelectedFeedbackManuscript(manuscript)
                            setShowFeedbackModal(true)
                          }}
                        >
                          {manuscript.status === 'rejected' ? '❌' : 
                           manuscript.status === 'approved' || manuscript.status === 'published' ? '✅' : '📝'} 
                          View Feedback
                          {manuscript.feedback_history && manuscript.feedback_history.length > 0 && (
                            <span className="ml-1 px-1 py-0.5 bg-white/30 rounded text-xs">
                              {manuscript.feedback_history.length + (manuscript.editor_feedback ? 1 : 0)}
                            </span>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Feedback History Modal */}
      <Modal
        isOpen={showFeedbackModal}
        onClose={() => {
          setShowFeedbackModal(false)
          setSelectedFeedbackManuscript(null)
        }}
        title={`Feedback History: ${selectedFeedbackManuscript?.title || ''}`}
        size="lg"
      >
        {selectedFeedbackManuscript && (
          <div className="space-y-6">
            {/* Current/Latest Feedback */}
            {selectedFeedbackManuscript.editor_feedback && (
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">
                    {selectedFeedbackManuscript.status === 'rejected' ? '❌ Latest Rejection' :
                     selectedFeedbackManuscript.status === 'approved' ? '✅ Approval' :
                     selectedFeedbackManuscript.status === 'published' ? '✅ Published' : '📝 Latest Feedback'}
                  </h4>
                  <span className="text-sm text-gray-500">
                    {selectedFeedbackManuscript.reviewed_at ? 
                      new Date(selectedFeedbackManuscript.reviewed_at).toLocaleString() : 
                      'Recent'
                    }
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {selectedFeedbackManuscript.editor_feedback}
                  </p>
                </div>
                {selectedFeedbackManuscript.status === 'rejected' && (
                  <div className="mt-3">
                    <p className="text-sm text-orange-600 font-medium">
                      💡 You can edit and resubmit this manuscript
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Feedback History */}
            {selectedFeedbackManuscript.feedback_history && selectedFeedbackManuscript.feedback_history.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  📚 Previous Feedback History ({selectedFeedbackManuscript.feedback_history.length})
                </h4>
                <div className="space-y-4">
                  {selectedFeedbackManuscript.feedback_history
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((feedback, index) => (
                    <div key={index} className="border-l-4 border-gray-300 pl-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span>
                            {feedback.action === 'rejected' ? '❌' :
                             feedback.action === 'approved' ? '✅' : '📝'}
                          </span>
                          <span className="font-medium text-gray-900">
                            {feedback.action === 'rejected' ? 'Rejected' :
                             feedback.action === 'approved' ? 'Approved' : 'Reviewed'}
                          </span>
                          {feedback.editor_name && (
                            <span className="text-sm text-gray-500">
                              by {feedback.editor_name}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(feedback.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                          {feedback.feedback}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manuscript Metadata */}
            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="font-medium text-blue-900 mb-2">📋 Manuscript Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-800">Status:</span>
                  <span className="ml-2">{getStatusText(selectedFeedbackManuscript.status)}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Submissions:</span>
                  <span className="ml-2">#{selectedFeedbackManuscript.submission_count || 1}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-800">First Submitted:</span>
                  <span className="ml-2">{new Date(selectedFeedbackManuscript.submitted_at).toLocaleDateString()}</span>
                </div>
                {selectedFeedbackManuscript.last_resubmitted_at && (
                  <div>
                    <span className="font-medium text-blue-800">Last Resubmitted:</span>
                    <span className="ml-2">{new Date(selectedFeedbackManuscript.last_resubmitted_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* No Feedback Message */}
            {!selectedFeedbackManuscript.editor_feedback && 
             (!selectedFeedbackManuscript.feedback_history || selectedFeedbackManuscript.feedback_history.length === 0) && (
              <div className="text-center py-8">
                <div className="text-gray-400 text-5xl mb-4">📝</div>
                <p className="text-gray-500">
                  No feedback available yet. Your manuscript is {selectedFeedbackManuscript.status === 'submitted' ? 'awaiting review' : selectedFeedbackManuscript.status}.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}