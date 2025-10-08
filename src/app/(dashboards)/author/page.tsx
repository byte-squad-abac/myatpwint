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
import { MetadataEditor } from '@/components/MetadataEditor'
import { ChatModal, ChatIcon } from '@/components/ManuscriptChat'

type FeedbackHistory = {
  feedback: string
  editor_id: string
  editor_name?: string
  timestamp: string
  action: 'rejected' | 'approved' | 'under_review'
}

type BookSales = {
  book_id: string
  manuscript_id: string
  total_sales: number
  digital_sales: number
  physical_sales: number
  total_revenue: number
  digital_revenue: number
  physical_revenue: number
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
  wants_digital: boolean
  wants_physical: boolean
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'published'
  editor_feedback: string | null
  submitted_at: string
  reviewed_at: string | null
  submission_count: number
  feedback_history: FeedbackHistory[]
  last_resubmitted_at: string | null
  author_id: string
  editor_id: string | null
  publisher_id: string | null
}

export default function AuthorPage() {
  const { user, profile, loading: authLoading } = useAuthContext()
  const router = useRouter()

  const [pageLoading, setPageLoading] = useState(false)
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([])
  const [bookSales, setBookSales] = useState<BookSales[]>([])
  const [showSubmissionForm, setShowSubmissionForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'approved' | 'rejected' | 'pending'>('all')

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    suggested_price: '',
    wants_digital: true,
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
  const [filterPhysicalOnly, setFilterPhysicalOnly] = useState(false)
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Feedback modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [selectedFeedbackManuscript, setSelectedFeedbackManuscript] = useState<Manuscript | null>(null)

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedDetailManuscript, setSelectedDetailManuscript] = useState<Manuscript | null>(null)

  // Metadata editor modal
  const [showMetadataEditor, setShowMetadataEditor] = useState(false)
  const [selectedMetadataManuscript, setSelectedMetadataManuscript] = useState<Manuscript | null>(null)

  // Chat modal
  const [showChatModal, setShowChatModal] = useState(false)
  const [selectedChatManuscript, setSelectedChatManuscript] = useState<Manuscript | null>(null)

  const fetchBookSales = useCallback(async () => {
    if (!user) return
    
    try {
      const { data } = await supabase.rpc('get_author_book_sales', {
        author_user_id: user.id
      })
      
      setBookSales(data || [])
    } catch (error) {
      console.error('Error fetching book sales:', error)
      setBookSales([])
    }
  }, [user])

  const fetchUnreadCounts = useCallback(async (manuscriptIds: string[]) => {
    if (!user || manuscriptIds.length === 0) {
      setUnreadCounts({})
      return
    }

    try {
      const response = await fetch('/api/manuscripts/bulk-unread-counts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ manuscriptIds }),
      })

      if (response.ok) {
        const data = await response.json()
        setUnreadCounts(data.unreadCounts || {})
      } else {
        console.error('Failed to fetch unread counts')
        setUnreadCounts({})
      }
    } catch (error) {
      console.error('Error fetching unread counts:', error)
      setUnreadCounts({})
    }
  }, [user])

  const fetchManuscripts = useCallback(async () => {
    if (!user) return
    
    const { data } = await supabase
      .from('manuscripts')
      .select('*')
      .eq('author_id', user.id)
      .order('submitted_at', { ascending: false })
    
    setManuscripts(data || [])
    
    // Fetch unread counts for all manuscripts
    const manuscriptIds = (data || []).map(m => m.id)
    if (manuscriptIds.length > 0) {
      fetchUnreadCounts(manuscriptIds)
    }
  }, [user, fetchUnreadCounts])

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
      fetchBookSales()
      setPageLoading(false)
    }
  }, [user, profile, router, authLoading, fetchManuscripts, fetchExistingData, fetchBookSales])

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
    if (filterPhysicalOnly) count++
    if (filterUnreadOnly) count++
    if (filterDateFrom) count++
    if (filterDateTo) count++
    return count
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setFilterCategory('')
    setFilterTag('')
    setFilterPhysicalOnly(false)
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

    // Apply physical books filter
    if (filterPhysicalOnly) {
      filtered = filtered.filter(m => m.wants_physical === true)
    }

    // Unread messages filter - show only manuscripts with unread messages
    if (filterUnreadOnly) {
      filtered = filtered.filter(m => (unreadCounts[m.id] || 0) > 0)
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

  const getSalesData = (manuscriptId: string) => {
    const sale = bookSales.find(s => s.manuscript_id === manuscriptId)
    return sale ? { 
      totalSales: sale.total_sales, 
      digitalSales: sale.digital_sales,
      physicalSales: sale.physical_sales,
      totalRevenue: sale.total_revenue,
      digitalRevenue: sale.digital_revenue,
      physicalRevenue: sale.physical_revenue
    } : { 
      totalSales: 0, 
      digitalSales: 0,
      physicalSales: 0,
      totalRevenue: 0,
      digitalRevenue: 0,
      physicalRevenue: 0
    }
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
      await fetchBookSales()
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
          wants_digital: formData.wants_digital,
          wants_physical: formData.wants_physical,
          status: 'submitted'
        })

      if (insertError) throw insertError

      // Reset form and refresh data
      setFormData({
        title: '',
        description: '',
        suggested_price: '',
        wants_digital: true,
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
      fetchBookSales()
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

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Publishing Options *
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Choose how you want your book to be published. At least one option must be selected.
              </p>

              <div className="space-y-2">
                <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                  <input
                    type="checkbox"
                    name="wants_digital"
                    checked={formData.wants_digital}
                    onChange={handleInputChange}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="flex-1 cursor-pointer">
                    <div className="font-medium text-gray-900 text-sm">Digital Edition</div>
                    <div className="text-xs text-gray-600">Available for digital download</div>
                  </label>
                </div>

                <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                  <input
                    type="checkbox"
                    name="wants_physical"
                    checked={formData.wants_physical}
                    onChange={handleInputChange}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="flex-1 cursor-pointer">
                    <div className="font-medium text-gray-900 text-sm">Physical Edition</div>
                    <div className="text-xs text-gray-600">Printed and available for physical delivery</div>
                  </label>
                </div>
              </div>
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
            {showFilters ? 'Hide Filters' : 'Show Filters & Search'}
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

              <div>
                <div className="space-y-2 pt-6">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filterPhysicalOnly}
                      onChange={(e) => setFilterPhysicalOnly(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Physical books only
                    </span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filterUnreadOnly}
                      onChange={(e) => setFilterUnreadOnly(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Unread messages only
                    </span>
                  </label>
                </div>
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
          <div className="grid gap-6 lg:grid-cols-2">
            {getFilteredManuscripts().map((manuscript) => {
              // Status-based theming
              const statusConfig = {
                published: { 
                  bg: 'bg-gradient-to-br from-blue-50 to-blue-100', 
                  border: 'border-blue-200', 
                  accent: 'bg-blue-500',
                  text: 'text-blue-700',
                  iconBg: 'bg-blue-500',
                  iconSymbol: '•'
                },
                approved: { 
                  bg: 'bg-gradient-to-br from-green-50 to-green-100', 
                  border: 'border-green-200', 
                  accent: 'bg-green-500',
                  text: 'text-green-700',
                  iconBg: 'bg-green-500',
                  iconSymbol: '✓'
                },
                rejected: { 
                  bg: 'bg-gradient-to-br from-red-50 to-red-100', 
                  border: 'border-red-200', 
                  accent: 'bg-red-500',
                  text: 'text-red-700',
                  iconBg: 'bg-red-500',
                  iconSymbol: '×'
                },
                submitted: { 
                  bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100', 
                  border: 'border-yellow-200', 
                  accent: 'bg-yellow-500',
                  text: 'text-yellow-700',
                  iconBg: 'bg-yellow-500',
                  iconSymbol: '○'
                },
                under_review: { 
                  bg: 'bg-gradient-to-br from-orange-50 to-orange-100', 
                  border: 'border-orange-200', 
                  accent: 'bg-orange-500',
                  text: 'text-orange-700',
                  iconBg: 'bg-orange-500',
                  iconSymbol: '◐'
                }
              }

              const config = statusConfig[manuscript.status as keyof typeof statusConfig] || statusConfig.submitted

              return (
                <div 
                  key={manuscript.id} 
                  className={`relative overflow-hidden rounded-xl border-2 ${config.border} ${config.bg} hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer`}
                  onClick={() => {
                    setSelectedDetailManuscript(manuscript)
                    setShowDetailModal(true)
                  }}
                >
                  {/* Status accent bar */}
                  <div className={`absolute top-0 left-0 right-0 h-2 ${config.accent}`}></div>
                  
                  <div className="p-6">
                    {/* Header with title and status */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-gray-900 truncate mb-1">
                          {manuscript.title}
                        </h3>
                        <div className="flex items-center space-x-3">
                          <div className={`w-6 h-6 ${config.iconBg} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                            {config.iconSymbol}
                          </div>
                          <span className={`font-medium ${config.text}`}>
                            {getStatusText(manuscript.status)}
                          </span>
                          {manuscript.submission_count > 1 && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                              Resubmission #{manuscript.submission_count}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Large cover image */}
                      <div className="ml-4 flex-shrink-0">
                        <Image
                          src={manuscript.cover_image_url || '/book-placeholder.png'}
                          alt={manuscript.title}
                          width={120}
                          height={160}
                          className="w-24 h-32 object-cover rounded-lg shadow-md border-2 border-white"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-700 mb-4 line-clamp-3 leading-relaxed">
                      {manuscript.description}
                    </p>

                    {/* Metadata section */}
                    <div className="space-y-3 mb-4">
                      {/* Categories */}
                      <div className="flex flex-wrap gap-2">
                        {manuscript.category.split(', ').slice(0, 2).map((category, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 bg-white/70 text-blue-800 rounded-full text-sm font-medium border border-blue-200"
                          >
                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                            {category.trim()}
                          </span>
                        ))}
                        {manuscript.category.split(', ').length > 2 && (
                          <span className="inline-flex items-center px-3 py-1 bg-white/50 text-gray-600 rounded-full text-sm">
                            +{manuscript.category.split(', ').length - 2} more
                          </span>
                        )}
                      </div>

                      {/* Tags */}
                      {manuscript.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {manuscript.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs border border-gray-300"
                            >
                              <span className="w-1.5 h-1.5 bg-gray-400 mr-1.5" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></span>
                              {tag}
                            </span>
                          ))}
                          {manuscript.tags.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-gray-50 text-gray-500 rounded text-xs">
                              +{manuscript.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-gray-400 rounded-sm flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-sm"></div>
                          </div>
                          <span>{new Date(manuscript.submitted_at).toLocaleDateString()}</span>
                        </div>
                        {manuscript.suggested_price && (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
                              $
                            </div>
                            <span className="font-medium">{manuscript.suggested_price.toLocaleString()} MMK</span>
                          </div>
                        )}
                        {manuscript.wants_physical && (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-purple-500 rounded flex items-center justify-center">
                              <div className="w-2 h-3 bg-white rounded-sm"></div>
                            </div>
                            <span className="text-xs">Physical Edition</span>
                          </div>
                        )}
                        
                      </div>
                      
                      {/* Sales Performance Section - Only for Published Books */}
                      {manuscript.status === 'published' && (() => {
                        const salesData = getSalesData(manuscript.id)
                        return (
                          <div className="mt-4 pt-4 border-t border-white/40">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-600">Sales Performance</span>
                              {salesData.totalSales > 0 && (
                                <div className="flex items-center space-x-1">
                                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                  <span className="text-xs text-green-600 font-medium">Active</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-3 space-y-3">
                              {/* Total Sales Summary */}
                              <div className="bg-white/60 rounded-lg p-3 border border-white/80">
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Copies Sold</p>
                                    <p className="text-lg font-bold text-gray-900">{salesData.totalSales}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Revenue</p>
                                    <p className="text-lg font-bold text-gray-900">{Number(salesData.totalRevenue).toLocaleString()} <span className="text-sm font-normal text-gray-600">MMK</span></p>
                                  </div>
                                </div>
                              </div>

                              {/* Digital vs Physical Breakdown */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/40 rounded-lg p-3 border border-white/60">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center">
                                      <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500 font-medium">Digital</p>
                                      <p className="text-sm font-bold text-gray-900">{salesData.digitalSales}</p>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="bg-white/40 rounded-lg p-3 border border-white/60">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 bg-orange-100 rounded-md flex items-center justify-center">
                                      <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                      </svg>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500 font-medium">Physical</p>
                                      <p className="text-sm font-bold text-gray-900">{salesData.physicalSales}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {salesData.totalSales === 0 && (
                              <div className="mt-3 text-center py-2">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <p className="text-sm text-gray-500">No sales recorded yet</p>
                                <p className="text-xs text-gray-400 mt-1">Sales will appear here once customers purchase your book</p>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>

                    {/* Action buttons */}
                    <div 
                      className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center space-x-2">
                        {/* View DOCX */}
                        <a
                          href={manuscript.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 px-3 py-2 bg-white/80 hover:bg-white text-blue-700 rounded-lg text-sm font-medium border border-blue-200 transition-colors"
                        >
                          <div className="w-4 h-4 bg-blue-500 rounded flex items-center justify-center">
                            <div className="w-2 h-2.5 bg-white rounded-sm"></div>
                          </div>
                          <span>View DOCX</span>
                        </a>

                        {/* Chat button - show for manuscripts where chat is available */}
                        {['submitted', 'under_review', 'rejected', 'approved', 'published'].includes(manuscript.status) && (
                          <ChatIcon
                            manuscriptId={manuscript.id}
                            manuscriptStatus={manuscript.status}
                            authorId={manuscript.author_id}
                            editorId={manuscript.editor_id}
                            publisherId={manuscript.publisher_id}
                            onClick={() => {
                              setSelectedChatManuscript(manuscript)
                              setShowChatModal(true)
                            }}
                            className="text-sm"
                          />
                        )}

                        {/* Status-specific actions */}
                        {manuscript.status === 'rejected' && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setSelectedMetadataManuscript(manuscript)
                                setShowMetadataEditor(true)
                              }}
                              className="inline-flex items-center space-x-2"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Edit Info</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => router.push(`/manuscript-editor?id=${manuscript.id}`)}
                              className="inline-flex items-center space-x-2"
                            >
                              <div className="w-3 h-3 border border-current rounded-sm flex items-center justify-center">
                                <div className="w-1 h-1 bg-current"></div>
                              </div>
                              <span>Edit Text</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => resubmitManuscript(manuscript)}
                              disabled={submitting}
                              className="inline-flex items-center space-x-2"
                            >
                              <div className="w-3 h-3 border border-current rounded-full flex items-center justify-center">
                                <div className="w-1.5 h-0.5 bg-current rounded"></div>
                              </div>
                              <span>Resubmit</span>
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Feedback button */}
                      {(manuscript.editor_feedback || (manuscript.feedback_history && manuscript.feedback_history.length > 0)) && (
                        <Button
                          size="sm"
                          variant={manuscript.status === 'rejected' ? 'error' : 
                                 manuscript.status === 'approved' || manuscript.status === 'published' ? 'success' : 'secondary'}
                          onClick={() => {
                            setSelectedFeedbackManuscript(manuscript)
                            setShowFeedbackModal(true)
                          }}
                          className="inline-flex items-center space-x-2"
                        >
                          <div className="w-4 h-4 border border-current rounded flex items-center justify-center">
                            <div className="w-2 h-1 bg-current rounded-sm"></div>
                          </div>
                          <span>Feedback</span>
                          {manuscript.feedback_history && manuscript.feedback_history.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 bg-white/40 rounded-full text-xs font-bold">
                              {manuscript.feedback_history.length + (manuscript.editor_feedback ? 1 : 0)}
                            </span>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
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
                    {selectedFeedbackManuscript.status === 'rejected' ? 'Latest Rejection' :
                     selectedFeedbackManuscript.status === 'approved' ? 'Approval' :
                     selectedFeedbackManuscript.status === 'published' ? 'Published' : 'Latest Feedback'}
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
                      Tip: You can edit and resubmit this manuscript
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Feedback History */}
            {selectedFeedbackManuscript.feedback_history && selectedFeedbackManuscript.feedback_history.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Previous Feedback History ({selectedFeedbackManuscript.feedback_history.length})
                </h4>
                <div className="space-y-4">
                  {selectedFeedbackManuscript.feedback_history
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((feedback, index) => (
                    <div key={index} className="border-l-4 border-gray-300 pl-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span>
                            {feedback.action === 'rejected' ? 'REJECTED' :
                             feedback.action === 'approved' ? 'APPROVED' : 'REVIEW'}
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
              <h4 className="font-medium text-blue-900 mb-2">Manuscript Details</h4>
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
                <div className="text-gray-400 text-5xl mb-4">MS</div>
                <p className="text-gray-500">
                  No feedback available yet. Your manuscript is {selectedFeedbackManuscript.status === 'submitted' ? 'awaiting review' : selectedFeedbackManuscript.status}.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal 
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={selectedDetailManuscript?.title || "Manuscript Details"}
        size="lg"
      >
        {selectedDetailManuscript && (
          <div className="space-y-6">
            {/* Book Cover and Basic Info */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Cover Image */}
              <div className="flex-shrink-0">
                <Image
                  src={selectedDetailManuscript.cover_image_url || '/book-placeholder.png'}
                  alt={selectedDetailManuscript.title}
                  width={200}
                  height={280}
                  className="w-48 h-64 object-cover rounded-lg shadow-lg border-4 border-white"
                />
              </div>
              
              {/* Basic Details */}
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedDetailManuscript.title}
                  </h2>
                  <div className="flex items-center space-x-4 mb-4">
                    {/* Status badge */}
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedDetailManuscript.status === 'published' ? 'bg-blue-500' :
                        selectedDetailManuscript.status === 'approved' ? 'bg-green-500' :
                        selectedDetailManuscript.status === 'rejected' ? 'bg-red-500' :
                        selectedDetailManuscript.status === 'under_review' ? 'bg-orange-500' :
                        'bg-gray-500'
                      }`}></div>
                      <span className={`font-medium ${
                        selectedDetailManuscript.status === 'published' ? 'text-blue-700' :
                        selectedDetailManuscript.status === 'approved' ? 'text-green-700' :
                        selectedDetailManuscript.status === 'rejected' ? 'text-red-700' :
                        selectedDetailManuscript.status === 'under_review' ? 'text-orange-700' :
                        'text-gray-700'
                      }`}>
                        {getStatusText(selectedDetailManuscript.status)}
                      </span>
                    </div>
                    
                    {selectedDetailManuscript.submission_count > 1 && (
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                        Resubmission #{selectedDetailManuscript.submission_count}
                      </span>
                    )}
                  </div>
                </div>

                <div className="prose prose-sm text-gray-700">
                  <p className="leading-relaxed">{selectedDetailManuscript.description}</p>
                </div>

                {/* Categories and Tags */}
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Categories</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDetailManuscript.category.split(', ').map((category, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                        >
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          {category.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedDetailManuscript.tags.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedDetailManuscript.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm"
                          >
                            <span className="w-1.5 h-1.5 bg-gray-400 mr-1.5" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></span>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Submission Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Submission Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">First Submitted:</span>
                    <span className="font-medium">{new Date(selectedDetailManuscript.submitted_at).toLocaleDateString()}</span>
                  </div>
                  {selectedDetailManuscript.last_resubmitted_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Resubmitted:</span>
                      <span className="font-medium">{new Date(selectedDetailManuscript.last_resubmitted_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedDetailManuscript.reviewed_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reviewed:</span>
                      <span className="font-medium">{new Date(selectedDetailManuscript.reviewed_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Submission Count:</span>
                    <span className="font-medium">#{selectedDetailManuscript.submission_count || 1}</span>
                  </div>
                </div>
              </div>

              {/* Publishing Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Publishing Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Suggested Price:</span>
                    <span className="font-medium">
                      {selectedDetailManuscript.suggested_price 
                        ? `${selectedDetailManuscript.suggested_price.toLocaleString()} MMK`
                        : 'Not specified'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Publishing Format:</span>
                    <span className="font-medium">
                      {selectedDetailManuscript.wants_digital && selectedDetailManuscript.wants_physical
                        ? 'Digital & Physical'
                        : selectedDetailManuscript.wants_digital
                        ? 'Digital Only'
                        : 'Physical Only'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Sales Performance */}
              {selectedDetailManuscript.status === 'published' && (() => {
                const salesData = getSalesData(selectedDetailManuscript.id)
                return (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-800 text-lg">Sales Performance</h3>
                      {salesData.totalSales > 0 && (
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-sm text-green-600 font-medium">Active Sales</span>
                        </div>
                      )}
                    </div>
                    
                    {salesData.totalSales > 0 ? (
                      <div className="space-y-6">
                        {/* Total Summary */}
                        <div className="grid grid-cols-2 gap-6">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                              </svg>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 mb-1">{salesData.totalSales}</p>
                            <p className="text-sm text-gray-600 font-medium uppercase tracking-wide">Total Copies</p>
                          </div>
                          
                          <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 mb-1">{Number(salesData.totalRevenue).toLocaleString()}</p>
                            <p className="text-sm text-gray-600 font-medium uppercase tracking-wide">MMK Revenue</p>
                          </div>
                        </div>

                        {/* Digital vs Physical Breakdown */}
                        <div className="border-t pt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Sales Breakdown</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/70 rounded-lg p-4 border border-blue-100">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-lg font-bold text-gray-900">{salesData.digitalSales}</p>
                                  <p className="text-xs text-gray-600 font-medium">Digital Copies</p>
                                  <p className="text-xs text-gray-500">{Number(salesData.digitalRevenue).toLocaleString()} MMK</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-white/70 rounded-lg p-4 border border-blue-100">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-lg font-bold text-gray-900">{salesData.physicalSales}</p>
                                  <p className="text-xs text-gray-600 font-medium">Physical Copies</p>
                                  <p className="text-xs text-gray-500">{Number(salesData.physicalRevenue).toLocaleString()} MMK</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-lg font-medium text-gray-600 mb-2">No sales recorded yet</p>
                        <p className="text-sm text-gray-500">Your sales data will appear here once customers purchase your book</p>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <a
                  href={selectedDetailManuscript.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <div className="w-4 h-4 bg-blue-400 rounded flex items-center justify-center">
                    <div className="w-2 h-2.5 bg-white rounded-sm"></div>
                  </div>
                  <span>View DOCX</span>
                </a>

                {selectedDetailManuscript.status === 'rejected' && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedMetadataManuscript(selectedDetailManuscript)
                        setShowMetadataEditor(true)
                      }}
                    >
                      Edit Metadata
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setShowDetailModal(false)
                        router.push(`/manuscript-editor?id=${selectedDetailManuscript.id}`)
                      }}
                    >
                      Edit Manuscript
                    </Button>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => {
                        setShowDetailModal(false)
                        resubmitManuscript(selectedDetailManuscript)
                      }}
                      disabled={submitting}
                    >
                      Resubmit
                    </Button>
                  </>
                )}
              </div>

              {/* Feedback button */}
              {(selectedDetailManuscript.editor_feedback || 
                (selectedDetailManuscript.feedback_history && selectedDetailManuscript.feedback_history.length > 0)) && (
                <Button
                  size="sm"
                  variant={selectedDetailManuscript.status === 'rejected' ? 'error' : 
                         selectedDetailManuscript.status === 'approved' || selectedDetailManuscript.status === 'published' ? 'success' : 'secondary'}
                  onClick={() => {
                    setSelectedFeedbackManuscript(selectedDetailManuscript)
                    setShowFeedbackModal(true)
                    setShowDetailModal(false)
                  }}
                >
                  View Feedback
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Metadata Editor Modal */}
      {showMetadataEditor && selectedMetadataManuscript && (
        <MetadataEditor
          manuscript={{
            id: selectedMetadataManuscript.id,
            title: selectedMetadataManuscript.title,
            description: selectedMetadataManuscript.description,
            category: selectedMetadataManuscript.category,
            tags: selectedMetadataManuscript.tags,
            cover_image_url: selectedMetadataManuscript.cover_image_url,
            suggested_price: selectedMetadataManuscript.suggested_price,
            wants_digital: selectedMetadataManuscript.wants_digital,
            wants_physical: selectedMetadataManuscript.wants_physical
          }}
          onClose={() => {
            setShowMetadataEditor(false)
            setSelectedMetadataManuscript(null)
          }}
          onUpdate={() => {
            fetchManuscripts()
            fetchBookSales()
          }}
        />
      )}

      {/* Chat Modal */}
      {showChatModal && selectedChatManuscript && (
        <ChatModal
          isOpen={showChatModal}
          onClose={() => {
            setShowChatModal(false)
            setSelectedChatManuscript(null)
          }}
          manuscriptId={selectedChatManuscript.id}
          manuscriptStatus={selectedChatManuscript.status}
          manuscriptTitle={selectedChatManuscript.title}
          authorId={selectedChatManuscript.author_id}
          editorId={selectedChatManuscript.editor_id}
          publisherId={selectedChatManuscript.publisher_id}
        />
      )}
    </div>
  )
}