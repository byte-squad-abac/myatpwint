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
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [activeStatusTab, setActiveStatusTab] = useState<string>('all')
  
  // Feedback modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [selectedFeedbackManuscript, setSelectedFeedbackManuscript] = useState<Manuscript | null>(null)

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
    } catch (error) {
      console.error('Error in fetchManuscripts:', error)
      setManuscripts([])
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
      const newFeedbackEntry = {
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

      const { error } = await supabase
        .from('manuscripts')
        .update({
          status: approved ? 'approved' : 'rejected',
          editor_feedback: feedback.trim() || null,
          reviewed_at: new Date().toISOString(),
          feedback_history: updatedFeedbackHistory
        })
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

  const getStatusColor = (status: string): 'primary' | 'secondary' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'submitted': 
      case 'pending_review': 
        return 'secondary'
      case 'under_review': 
        return 'warning'
      case 'approved': 
        return 'success'
      case 'rejected': 
        return 'error'
      case 'published': 
        return 'primary'
      default: 
        return 'secondary'
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

  const getPriorityColor = (submittedAt: string, status: string) => {
    if (status !== 'submitted') return 'transparent'
    
    const daysSinceSubmission = Math.floor(
      (new Date().getTime() - new Date(submittedAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysSinceSubmission >= 7) return '#dc3545' // Red - high priority
    if (daysSinceSubmission >= 3) return '#ffc107' // Yellow - medium priority
    return '#28a745' // Green - normal priority
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setFilterStatus('')
    setFilterCategory('')
    setFilterAuthor('')
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
          <div className="grid gap-6 lg:grid-cols-2">
            {getFilteredManuscripts().map((manuscript) => (
              <Card 
                key={manuscript.id} 
                className={`relative overflow-hidden`}
                style={{
                  borderLeft: `4px solid ${getPriorityColor(manuscript.submitted_at, manuscript.status)}`
                }}
              >
                <div className="flex gap-4">
                  {/* Book Cover */}
                  <div className="flex-shrink-0 w-20 h-28 rounded border overflow-hidden bg-gray-100">
                    <Image
                      src={manuscript.cover_image_url || '/book-placeholder.png'}
                      alt={`${manuscript.title} cover`}
                      width={80}
                      height={112}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title and Status */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 pr-2">
                        <h3 className="font-semibold text-lg text-gray-900 truncate">
                          {manuscript.title}
                        </h3>
                        {(manuscript.submission_count || 1) > 1 && (
                          <div className="text-xs text-orange-600 font-medium">
                            Resubmission #{manuscript.submission_count || 1}
                          </div>
                        )}
                      </div>
                      <Badge variant={getStatusColor(manuscript.status)}>
                        {getStatusText(manuscript.status)}
                      </Badge>
                    </div>

                    {/* Author, Category, Time */}
                    <div className="flex items-center gap-2 mb-2 text-sm text-gray-600 flex-wrap">
                      <span>{manuscript.author?.name || 'Unknown'}</span>
                      <span className="text-blue-600">
                        {manuscript.category.split(', ')[0]}
                      </span>
                      <span>{formatDuration(manuscript.submitted_at)}</span>
                      {manuscript.suggested_price && (
                        <span>{manuscript.suggested_price.toLocaleString()} MMK</span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                      {manuscript.description}
                    </p>

                    {/* Under Review Indicator */}
                    {manuscript.editor_id === user?.id && manuscript.status === 'under_review' && (
                      <div className="text-xs text-blue-600 font-bold mb-2">
                        You are reviewing
                      </div>
                    )}

                    {/* Tags */}
                    {manuscript.tags.length > 0 && (
                      <div className="mb-3">
                        {manuscript.tags.slice(0, 2).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                        {manuscript.tags.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{manuscript.tags.length - 2} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <a
                          href={manuscript.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          DOCX
                        </a>

                        {/* Edit Button - Show for submitted and under_review manuscripts */}
                        {(manuscript.status === 'submitted' || manuscript.status === 'under_review') && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => router.push(`/manuscript-editor?id=${manuscript.id}`)}
                          >
                            ✏️ Edit
                          </Button>
                        )}

                        {manuscript.status === 'submitted' && (
                          <Button
                            size="sm"
                            variant="warning"
                            onClick={() => startReview(manuscript)}
                            disabled={processing}
                          >
                            Review
                          </Button>
                        )}

                        {manuscript.status === 'under_review' && manuscript.editor_id === user?.id && (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => setSelectedManuscript(manuscript)}
                          >
                            Complete
                          </Button>
                        )}
                      </div>

                      {/* Feedback History Button */}
                      {(manuscript.editor_feedback || (manuscript.feedback_history && manuscript.feedback_history.length > 0)) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedFeedbackManuscript(manuscript)
                            setShowFeedbackModal(true)
                          }}
                        >
                          📝 Feedback
                          {manuscript.feedback_history && manuscript.feedback_history.length > 0 && (
                            <span className="ml-1 px-1 py-0.5 bg-white/30 rounded text-xs">
                              {manuscript.feedback_history.length + (manuscript.editor_feedback ? 1 : 0)}
                            </span>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
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
    </div>
  )
}