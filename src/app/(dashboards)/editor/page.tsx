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
import { ChatModal, ChatIcon } from '@/components/ManuscriptChat'

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
  status: 'submitted' | 'pending_review' | 'under_review' | 'approved' | 'rejected' | 'published'
  editor_feedback: string | null
  submitted_at: string
  reviewed_at: string | null
  author_id: string
  editor_id: string | null
  submission_count: number
  feedback_history: FeedbackHistory[]
  last_resubmitted_at: string | null
  author?: {
    id: string
    name: string
    email: string
  } | null
}

export default function EditorPage() {
  const { user, profile, loading: authLoading } = useAuthContext()
  const router = useRouter()

  const [pageLoading, setPageLoading] = useState(false)
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([])
  const [selectedManuscript, setSelectedManuscript] = useState<Manuscript | null>(null)
  const [feedback, setFeedback] = useState('')
  const [processing, setProcessing] = useState(false)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAuthor, setFilterAuthor] = useState('')
  const [filterPhysicalOnly, setFilterPhysicalOnly] = useState(false)
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [activeStatusTab, setActiveStatusTab] = useState<string>('all')
  
  // Feedback modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  
  // Chat modal
  const [showChatModal, setShowChatModal] = useState(false)
  const [selectedChatManuscript, setSelectedChatManuscript] = useState<Manuscript | null>(null)
  const [selectedFeedbackManuscript, setSelectedFeedbackManuscript] = useState<Manuscript | null>(null)

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedDetailManuscript, setSelectedDetailManuscript] = useState<Manuscript | null>(null)

  const fetchManuscripts = useCallback(async () => {
    if (!user) return
    
    try {
      // Fetch manuscripts
      const { data: manuscriptsData, error: manuscriptsError } = await supabase
        .from('manuscripts')
        .select('*')
        .order('submitted_at', { ascending: true })

      if (manuscriptsError) {
        console.error('Error fetching manuscripts:', manuscriptsError)
        setManuscripts([])
        return
      }

      if (!manuscriptsData || manuscriptsData.length === 0) {
        setManuscripts([])
        return
      }

      // Fetch author details separately
      const authorIds = manuscriptsData.map(m => m.author_id)
      const { data: authorsData } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', authorIds)

      // Combine data
      const manuscriptsWithAuthors = manuscriptsData.map(manuscript => ({
        ...manuscript,
        author: authorsData?.find(author => author.id === manuscript.author_id)
      }))

      setManuscripts(manuscriptsWithAuthors)
      
      // Fetch unread counts for all manuscripts
      const manuscriptIds = manuscriptsWithAuthors.map(m => m.id)
      if (manuscriptIds.length > 0) {
        fetchUnreadCounts(manuscriptIds)
      }
    } catch (error) {
      console.error('Error in fetchManuscripts:', error)
      setManuscripts([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]) // fetchUnreadCounts is stable and doesn't need to be in dependencies

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

  useEffect(() => {
    // Don't check auth while still loading
    if (authLoading) return
    
    console.log('Editor auth check - User:', !!user, 'Profile:', profile?.role)
    
    if (!user) {
      console.log('No user, redirecting to login')
      router.push('/login')
      return
    }
    
    if (profile && !['editor', 'publisher'].includes(profile.role)) {
      console.log('User role is not editor/publisher:', profile.role, 'redirecting to home')
      router.push('/')
      return
    }

    // Only fetch data if user is authenticated and has proper role
    if (user && (!profile || ['editor', 'publisher'].includes(profile.role))) {
      setPageLoading(true)
      fetchManuscripts()
      setPageLoading(false)
    }
  }, [user, profile, router, authLoading, fetchManuscripts])


  const formatDuration = (submittedAt: string) => {
    const now = new Date()
    const submitted = new Date(submittedAt)
    const diffTime = Math.abs(now.getTime() - submitted.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h ago`
    } else {
      return `${diffHours}h ago`
    }
  }

  const startReview = async (manuscript: Manuscript) => {
    setProcessing(true)
    try {
      const { error } = await supabase
        .from('manuscripts')
        .update({
          status: 'under_review',
          editor_id: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', manuscript.id)

      if (error) throw error
      
      setSelectedManuscript({...manuscript, status: 'under_review', editor_id: user?.id || null})
      fetchManuscripts()
    } catch (error) {
      console.error('Error starting review:', error)
      alert('Failed to start review. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const submitReview = async (approved: boolean) => {
    if (!selectedManuscript || !user) return
    
    if (!approved && !feedback.trim()) {
      alert('Please provide feedback when rejecting a manuscript.')
      return
    }

    setProcessing(true)
    try {
      // Get current editor info for feedback history
      const { data: editorData } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()

      // Create new feedback history entry
      const newFeedbackEntry: FeedbackHistory = {
        feedback: feedback.trim() || 'No feedback provided',
        editor_id: user.id,
        editor_name: editorData?.name || 'Unknown Editor',
        timestamp: new Date().toISOString(),
        action: approved ? 'approved' : 'rejected'
      }

      // Add to existing feedback history
      const updatedFeedbackHistory = [
        ...(selectedManuscript.feedback_history || []),
        newFeedbackEntry
      ]

      // Get publisher ID if approving
      let publisherId: string | undefined = undefined
      if (approved) {
        const { data: publisherData } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'publisher')
          .single()
        
        if (publisherData) {
          publisherId = publisherData.id
        }
      }

      // Create update data object
      const updateData: {
        status: string
        editor_feedback: string | null
        reviewed_at: string
        feedback_history: FeedbackHistory[]
        publisher_id?: string
      } = {
        status: approved ? 'approved' : 'rejected',
        editor_feedback: feedback.trim() || null,
        reviewed_at: new Date().toISOString(),
        feedback_history: updatedFeedbackHistory,
        ...(publisherId && { publisher_id: publisherId })
      }

      const { error } = await supabase
        .from('manuscripts')
        .update(updateData)
        .eq('id', selectedManuscript.id)

      if (error) throw error
      
      setSelectedManuscript(null)
      setFeedback('')
      fetchManuscripts()
      alert(`Manuscript ${approved ? 'approved' : 'rejected'} successfully.`)
    } catch (error) {
      console.error('Error submitting review:', error)
      alert('Failed to submit review. Please try again.')
    } finally {
      setProcessing(false)
    }
  }


  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted': return 'Pending Review'
      case 'pending_review': return 'Pending Review'
      case 'under_review': return 'Under Review'
      case 'approved': return 'Approved'
      case 'rejected': return 'Rejected'
      case 'published': return 'Published'
      default: return status
    }
  }


  const clearAllFilters = () => {
    setSearchQuery('')
    setFilterStatus('')
    setFilterCategory('')
    setFilterAuthor('')
    setFilterPhysicalOnly(false)
    setFilterDateFrom('')
    setFilterDateTo('')
    setActiveStatusTab('all')
  }

  const handleStatusCardClick = (status: string) => {
    setActiveStatusTab(status)
    setFilterStatus('') // Clear dropdown filter when using status cards
  }

  const getUniqueCategories = () => {
    const allCategories = manuscripts
      .flatMap(m => m.category.split(', ').map(cat => cat.trim()))
      .filter(cat => cat)
      .filter((cat, index, arr) => arr.indexOf(cat) === index)
      .sort()
    return allCategories
  }

  const getUniqueAuthors = () => {
    const allAuthors = manuscripts
      .map(m => m.author?.name || 'Unknown')
      .filter((author, index, arr) => arr.indexOf(author) === index)
      .sort()
    return allAuthors
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (searchQuery.trim()) count++
    if (filterStatus) count++
    if (filterCategory) count++
    if (filterAuthor) count++
    if (filterPhysicalOnly) count++
    if (filterUnreadOnly) count++
    if (filterDateFrom) count++
    if (filterDateTo) count++
    return count
  }

  const getFilteredManuscripts = () => {
    let filtered = manuscripts

    // Filter by status tab first
    if (activeStatusTab !== 'all') {
      switch (activeStatusTab) {
        case 'pending':
          filtered = filtered.filter(m => m.status === 'submitted')
          break
        case 'review':
          filtered = filtered.filter(m => m.status === 'under_review')
          break
        case 'approved':
          filtered = filtered.filter(m => m.status === 'approved')
          break
        case 'rejected':
          filtered = filtered.filter(m => m.status === 'rejected')
          break
        case 'published':
          filtered = filtered.filter(m => m.status === 'published')
          break
      }
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        m.category.toLowerCase().includes(query) ||
        m.tags.some(tag => tag.toLowerCase().includes(query)) ||
        (m.author?.name || 'Unknown').toLowerCase().includes(query)
      )
    }

    // Filter by status dropdown (only if no status tab is active)
    if (filterStatus && activeStatusTab === 'all') {
      filtered = filtered.filter(m => m.status === filterStatus)
    }

    // Filter by category
    if (filterCategory) {
      filtered = filtered.filter(m => 
        m.category.split(', ').some(cat => cat.trim() === filterCategory)
      )
    }

    // Filter by author
    if (filterAuthor) {
      filtered = filtered.filter(m => 
        (m.author?.name || 'Unknown') === filterAuthor
      )
    }

    // Filter by physical books only
    if (filterPhysicalOnly) {
      filtered = filtered.filter(m => m.wants_physical === true)
    }

    // Unread messages filter - show only manuscripts with unread messages
    // Only apply to manuscripts where editor-author communication is relevant
    if (filterUnreadOnly) {
      filtered = filtered.filter(m => {
        // Only show manuscripts with unread messages AND in statuses where editor-author chat is available
        const hasEditorAuthorChat = ['submitted', 'under_review', 'rejected'].includes(m.status)
        return hasEditorAuthorChat && (unreadCounts[m.id] || 0) > 0
      })
    }

    // Filter by date range
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom)
      filtered = filtered.filter(m => 
        new Date(m.submitted_at) >= fromDate
      )
    }

    if (filterDateTo) {
      const toDate = new Date(filterDateTo)
      toDate.setHours(23, 59, 59, 999) // End of day
      filtered = filtered.filter(m => 
        new Date(m.submitted_at) <= toDate
      )
    }

    return filtered
  }

  if (authLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Editor Dashboard</h1>
        <p className="text-gray-600 mt-2">Review and approve manuscript submissions</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card 
          className={`cursor-pointer transition-all duration-200 ${
            activeStatusTab === 'all' 
              ? 'ring-2 ring-gray-500 bg-gray-50' 
              : 'hover:bg-gray-50'
          }`}
          onClick={() => handleStatusCardClick('all')}
        >
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {manuscripts.length}
            </h3>
            <p className="text-sm text-gray-600">All Books</p>
          </div>
        </Card>

        <Card 
          className={`cursor-pointer transition-all duration-200 ${
            activeStatusTab === 'pending' 
              ? 'ring-2 ring-orange-500 bg-orange-50' 
              : 'hover:bg-orange-50'
          }`}
          onClick={() => handleStatusCardClick('pending')}
        >
          <div className="text-center">
            <h3 className="text-2xl font-bold text-orange-600 mb-1">
              {manuscripts.filter(m => m.status === 'submitted').length}
            </h3>
            <p className="text-sm text-gray-600">Pending Review</p>
          </div>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all duration-200 ${
            activeStatusTab === 'review' 
              ? 'ring-2 ring-yellow-500 bg-yellow-50' 
              : 'hover:bg-yellow-50'
          }`}
          onClick={() => handleStatusCardClick('review')}
        >
          <div className="text-center">
            <h3 className="text-2xl font-bold text-yellow-600 mb-1">
              {manuscripts.filter(m => m.status === 'under_review').length}
            </h3>
            <p className="text-sm text-gray-600">Under Review</p>
          </div>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all duration-200 ${
            activeStatusTab === 'approved' 
              ? 'ring-2 ring-green-500 bg-green-50' 
              : 'hover:bg-green-50'
          }`}
          onClick={() => handleStatusCardClick('approved')}
        >
          <div className="text-center">
            <h3 className="text-2xl font-bold text-green-600 mb-1">
              {manuscripts.filter(m => m.status === 'approved').length}
            </h3>
            <p className="text-sm text-gray-600">Approved</p>
          </div>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all duration-200 ${
            activeStatusTab === 'rejected' 
              ? 'ring-2 ring-red-500 bg-red-50' 
              : 'hover:bg-red-50'
          }`}
          onClick={() => handleStatusCardClick('rejected')}
        >
          <div className="text-center">
            <h3 className="text-2xl font-bold text-red-600 mb-1">
              {manuscripts.filter(m => m.status === 'rejected').length}
            </h3>
            <p className="text-sm text-gray-600">Rejected</p>
          </div>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all duration-200 ${
            activeStatusTab === 'published' 
              ? 'ring-2 ring-blue-500 bg-blue-50' 
              : 'hover:bg-blue-50'
          }`}
          onClick={() => handleStatusCardClick('published')}
        >
          <div className="text-center">
            <h3 className="text-2xl font-bold text-blue-600 mb-1">
              {manuscripts.filter(m => m.status === 'published').length}
            </h3>
            <p className="text-sm text-gray-600">Published</p>
          </div>
        </Card>
      </div>

      {/* Manuscripts Queue */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Manuscripts Queue</h2>
        
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
                placeholder="Search by title, author, category..."
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                <select
                  value={filterAuthor}
                  onChange={(e) => setFilterAuthor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                >
                  <option value="">All Authors</option>
                  {getUniqueAuthors().map((author) => (
                    <option key={author} value={author}>
                      {author}
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
                      📦 Physical books only
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
                      💬 Unread messages only
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
            {(getActiveFiltersCount() > 0 || activeStatusTab !== 'all') && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm text-gray-600">
                Showing {getFilteredManuscripts().length} of {manuscripts.length} manuscripts
                {activeStatusTab !== 'all' && ` in ${activeStatusTab} status`}
                {getActiveFiltersCount() > 0 && ` with ${getActiveFiltersCount()} filter(s) applied`}
              </div>
            )}
          </Card>
        )}
        
        {getFilteredManuscripts().length === 0 ? (
          <Card>
            <p className="text-center text-gray-500 py-8">
              No manuscripts to review.
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {getFilteredManuscripts().map((manuscript) => {
              // Status-based theming (matching author dashboard)
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
                  {/* Priority/Status Accent Bar */}
                  <div className={`absolute top-0 left-0 right-0 h-2 ${config.accent}`}></div>
                  
                  {/* Status Icon in Top Right */}
                  <div className="absolute top-4 right-4 z-10">
                    <div className={`w-8 h-8 rounded-full ${config.iconBg} text-white flex items-center justify-center text-sm font-bold shadow-lg`}>
                      {config.iconSymbol}
                    </div>
                  </div>

                  <div className="p-6 pt-8">
                    {/* Book Cover and Title Section */}
                    <div className="flex gap-4 mb-4">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-20 bg-white rounded-lg shadow-md border-2 border-white overflow-hidden">
                          <Image
                            src={manuscript.cover_image_url || '/book-placeholder.png'}
                            alt={manuscript.title}
                            width={64}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-gray-900 line-clamp-2 mb-1">
                          {manuscript.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">{manuscript.author?.name || 'Unknown Author'}</span>
                        </div>
                        {(manuscript.submission_count || 1) > 1 && (
                          <div className="mt-1 text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full inline-block">
                            Resubmission #{manuscript.submission_count || 1}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mb-4">
                      <p className="text-gray-700 text-sm line-clamp-3 leading-relaxed">
                        {manuscript.description}
                      </p>
                    </div>

                    {/* Categories and Tags */}
                    <div className="space-y-3 mb-4">
                      {/* Categories */}
                      <div>
                        <div className="flex flex-wrap gap-2">
                          {manuscript.category.split(', ').slice(0, 2).map((category, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                            >
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                              {category.trim()}
                            </span>
                          ))}
                          {manuscript.category.split(', ').length > 2 && (
                            <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm">
                              +{manuscript.category.split(', ').length - 2} more
                            </span>
                          )}
                        </div>
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
                    </div>

                    {/* Editor-specific info */}
                    <div className="space-y-3 mb-4">
                      {/* Submission time and priority */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-gray-400 rounded-sm flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-sm"></div>
                          </div>
                          <span>{formatDuration(manuscript.submitted_at)}</span>
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
                            <span className="text-xs">Physical Ed.</span>
                          </div>
                        )}
                      </div>

                      {/* Editor assignment indicator */}
                      {manuscript.editor_id === user?.id && manuscript.status === 'under_review' && (
                        <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-sm font-medium text-blue-700">You are reviewing this manuscript</span>
                          </div>
                        </div>
                      )}
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

                        {/* Chat button - show for manuscripts where editor can chat with author */}
                        {['submitted', 'under_review', 'rejected'].includes(manuscript.status) && (
                          <ChatIcon
                            manuscriptId={manuscript.id}
                            manuscriptStatus={manuscript.status}
                            authorId={manuscript.author_id}
                            editorId={manuscript.editor_id}
                            publisherId={null}
                            onClick={() => {
                              setSelectedChatManuscript(manuscript)
                              setShowChatModal(true)
                            }}
                            className="text-sm"
                          />
                        )}

                        {/* Status-specific actions */}
                        {(manuscript.status === 'submitted' || manuscript.status === 'under_review') && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => router.push(`/manuscript-editor?id=${manuscript.id}`)}
                            className="inline-flex items-center space-x-2"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Edit</span>
                          </Button>
                        )}

                        {manuscript.status === 'submitted' && (
                          <Button
                            size="sm"
                            variant="warning"
                            onClick={() => startReview(manuscript)}
                            disabled={processing}
                            className="inline-flex items-center space-x-2"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span>Start Review</span>
                          </Button>
                        )}

                        {manuscript.status === 'under_review' && manuscript.editor_id === user?.id && (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => setSelectedManuscript(manuscript)}
                            className="inline-flex items-center space-x-2"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Complete</span>
                          </Button>
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

      {/* Review Modal */}
      <Modal
        isOpen={!!selectedManuscript}
        onClose={() => {
          setSelectedManuscript(null)
          setFeedback('')
        }}
        title={`Complete Review: ${selectedManuscript?.title || ''}`}
        size="lg"
      >
        {selectedManuscript && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Author: {selectedManuscript.author?.name} | Category: {selectedManuscript.category}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feedback (required for rejection)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Provide detailed feedback for the author..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedManuscript(null)
                  setFeedback('')
                }}
              >
                Cancel
              </Button>
              
              <Button
                variant="error"
                onClick={() => submitReview(false)}
                disabled={processing}
              >
                Reject
              </Button>
              
              <Button
                variant="success"
                onClick={() => submitReview(true)}
                disabled={processing}
              >
                Approve
              </Button>
            </div>
          </div>
        )}
      </Modal>

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
                      💡 Author can edit and resubmit this manuscript
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
                  No feedback available yet. Manuscript is {selectedFeedbackManuscript.status === 'submitted' ? 'awaiting review' : selectedFeedbackManuscript.status}.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Manuscript Detail Modal */}
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

                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Author</h4>
                  <p className="text-gray-700">{selectedDetailManuscript.author?.name || 'Unknown Author'}</p>
                </div>

                <div className="prose prose-sm text-gray-700">
                  <h4 className="font-medium text-gray-800 mb-2">Description</h4>
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
                    <span className="text-gray-600">Physical Edition:</span>
                    <span className="font-medium">
                      {selectedDetailManuscript.wants_physical ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
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

                {(selectedDetailManuscript.status === 'submitted' || selectedDetailManuscript.status === 'under_review') && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setShowDetailModal(false)
                      router.push(`/manuscript-editor?id=${selectedDetailManuscript.id}`)
                    }}
                  >
                    Edit Manuscript
                  </Button>
                )}

                {selectedDetailManuscript.status === 'submitted' && (
                  <Button
                    size="sm"
                    variant="warning"
                    onClick={() => {
                      setShowDetailModal(false)
                      startReview(selectedDetailManuscript)
                    }}
                  >
                    Start Review
                  </Button>
                )}

                {selectedDetailManuscript.status === 'under_review' && selectedDetailManuscript.editor_id === user?.id && (
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => {
                      setShowDetailModal(false)
                      setSelectedManuscript(selectedDetailManuscript)
                    }}
                  >
                    Complete Review
                  </Button>
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
                  {selectedDetailManuscript.feedback_history && selectedDetailManuscript.feedback_history.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-white/40 rounded-full text-xs font-bold">
                      {selectedDetailManuscript.feedback_history.length + (selectedDetailManuscript.editor_feedback ? 1 : 0)}
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

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
          publisherId={null}
        />
      )}
    </div>
  )
}