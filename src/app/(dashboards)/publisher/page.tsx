'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  author_id: string
  editor_id: string | null
  submission_count: number
  feedback_history: FeedbackHistory[]
  last_resubmitted_at: string | null
  published_at: string | null
  publisher_id: string | null
  profiles?: {
    id: string
    name: string
    email: string
  } | null
}

export default function PublisherPage() {
  const { user, profile, loading: authLoading } = useAuthContext()
  const router = useRouter()

  const [pageLoading, setPageLoading] = useState(false)
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([])
  const [selectedManuscript, setSelectedManuscript] = useState<Manuscript | null>(null)
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAuthor, setFilterAuthor] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [activeStatusTab, setActiveStatusTab] = useState<string>('all')
  
  // Publishing states
  const [publishData, setPublishData] = useState({
    finalPrice: '',
    edition: 'First Edition'
  })
  const [publishing, setPublishing] = useState(false)
  const [publishingProgress, setPublishingProgress] = useState('')

  // Available categories and authors for filters
  const [existingCategories, setExistingCategories] = useState<string[]>([])
  const [existingAuthors, setExistingAuthors] = useState<{ id: string; name: string }[]>([])

  const fetchExistingData = async () => {
    try {
      // Fetch existing categories and authors for filter options
      const { data: categoriesData } = await supabase
        .from('manuscripts')
        .select('category')
        .not('category', 'is', null)

      const { data: authorsData } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'author')

      if (categoriesData) {
        const categories = categoriesData
          .map(item => item.category)
          .filter(Boolean)
          .filter((category, index, arr) => arr.indexOf(category) === index)
          .sort()
        setExistingCategories(categories)
      }

      if (authorsData) {
        setExistingAuthors(authorsData)
      }
    } catch (error) {
      console.error('Error fetching filter data:', error)
    }
  }

  const fetchManuscripts = useCallback(async () => {
    if (!user) return
    
    try {
      // Fetch manuscripts with approved/published status
      const { data: manuscriptsData, error: manuscriptsError } = await supabase
        .from('manuscripts')
        .select('*')
        .in('status', ['approved', 'published'])
        .order('reviewed_at', { ascending: false })
      
      if (manuscriptsError) {
        console.error('Error fetching manuscripts:', manuscriptsError)
        setManuscripts([])
        return
      }

      if (!manuscriptsData || manuscriptsData.length === 0) {
        setManuscripts([])
        return
      }

      // Fetch author profiles separately
      const authorIds = [...new Set(manuscriptsData.map(m => m.author_id))]
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', authorIds)

      // Map profiles to manuscripts
      const manuscriptsWithProfiles = manuscriptsData.map(manuscript => ({
        ...manuscript,
        profiles: profilesData?.find(profile => profile.id === manuscript.author_id) || null
      }))

      // Check which published manuscripts have corresponding books
      const publishedManuscriptIds = manuscriptsWithProfiles
        .filter(m => m.status === 'published')
        .map(m => m.id)

      let existingBooks: { manuscript_id: string }[] = []
      if (publishedManuscriptIds.length > 0) {
        const { data: booksData } = await supabase
          .from('books')
          .select('manuscript_id')
          .in('manuscript_id', publishedManuscriptIds)
        
        existingBooks = booksData || []
      }

      // Filter out published manuscripts that don't have corresponding books
      const validManuscripts = manuscriptsWithProfiles.filter(manuscript => {
        if (manuscript.status === 'approved') return true
        if (manuscript.status === 'published') {
          return existingBooks.some(book => book.manuscript_id === manuscript.id)
        }
        return false
      })

      // Reset orphaned published manuscripts back to approved
      const orphanedManuscripts = manuscriptsWithProfiles.filter(manuscript => 
        manuscript.status === 'published' && 
        !existingBooks.some(book => book.manuscript_id === manuscript.id)
      )

      if (orphanedManuscripts.length > 0) {
        console.log(`Found ${orphanedManuscripts.length} orphaned published manuscripts, resetting to approved...`)
        
        for (const orphaned of orphanedManuscripts) {
          await supabase
            .from('manuscripts')
            .update({ 
              status: 'approved',
              published_at: null,
              publisher_id: null
            })
            .eq('id', orphaned.id)
        }

        // Add the reset manuscripts back as approved
        validManuscripts.push(...orphanedManuscripts.map(m => ({ 
          ...m, 
          status: 'approved' as const, 
          published_at: null,
          publisher_id: null
        })))
      }

      setManuscripts(validManuscripts)
    } catch (error) {
      console.error('Error in fetchManuscripts:', error)
      setManuscripts([])
    }
  }, [user])

  useEffect(() => {
    // Don't check auth while still loading
    if (authLoading) return
    
    console.log('Publisher auth check - User:', !!user, 'Profile:', profile?.role)
    
    if (!user) {
      console.log('No user, redirecting to login')
      router.push('/login')
      return
    }
    
    if (profile && profile.role !== 'publisher') {
      console.log('User role is not publisher:', profile.role, 'redirecting to home')
      router.push('/')
      return
    }

    // Only fetch data if user is authenticated and has publisher role
    if (user && (!profile || profile.role === 'publisher')) {
      setPageLoading(true)
      fetchManuscripts()
      fetchExistingData()
      setPageLoading(false)
    }
  }, [user, profile, router, authLoading, fetchManuscripts])


  const formatDuration = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h ago`
    } else {
      return `${diffHours}h ago`
    }
  }

  const handleStatusCardClick = (status: string) => {
    setActiveStatusTab(status)
    setFilterStatus('') // Clear dropdown filter when using status cards
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setFilterStatus('')
    setFilterCategory('')
    setFilterAuthor('')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (searchQuery) count++
    if (filterStatus) count++
    if (filterCategory) count++
    if (filterAuthor) count++
    if (filterDateFrom) count++
    if (filterDateTo) count++
    return count
  }

  const getFilteredManuscripts = () => {
    let filtered = manuscripts

    // Filter by active tab first
    if (activeStatusTab !== 'all') {
      if (activeStatusTab === 'approved') filtered = filtered.filter(m => m.status === 'approved')
      if (activeStatusTab === 'published') filtered = filtered.filter(m => m.status === 'published')
    }

    // Search query filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      filtered = filtered.filter(manuscript =>
        manuscript.title.toLowerCase().includes(searchLower) ||
        manuscript.description.toLowerCase().includes(searchLower) ||
        manuscript.profiles?.name?.toLowerCase().includes(searchLower) ||
        manuscript.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    // Status filter
    if (filterStatus) {
      filtered = filtered.filter(m => m.status === filterStatus)
    }

    // Category filter
    if (filterCategory) {
      filtered = filtered.filter(m => m.category === filterCategory)
    }

    // Author filter
    if (filterAuthor) {
      filtered = filtered.filter(m => m.author_id === filterAuthor)
    }

    // Date range filter
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom)
      filtered = filtered.filter(m => new Date(m.submitted_at) >= fromDate)
    }

    if (filterDateTo) {
      const toDate = new Date(filterDateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(m => new Date(m.submitted_at) <= toDate)
    }

    return filtered
  }

  const generateEmailSubject = (manuscript: Manuscript) => {
    return `Price Negotiation: "${manuscript.title}" - MyatPwint Publishing`
  }

  const generateEmailBody = (manuscript: Manuscript) => {
    const suggestedPriceText = manuscript.suggested_price 
      ? `Your suggested price: ${manuscript.suggested_price.toLocaleString()} MMK`
      : 'No suggested price provided'
    
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
MyatPwint Publishing Team`
  }

  const createMailtoLink = (manuscript: Manuscript) => {
    const subject = encodeURIComponent(generateEmailSubject(manuscript))
    const body = encodeURIComponent(generateEmailBody(manuscript))
    return `mailto:${manuscript.profiles?.email}?subject=${subject}&body=${body}`
  }

  const publishBook = async () => {
    if (!selectedManuscript || !publishData.finalPrice || !user) {
      alert('Please enter the final price.')
      return
    }

    setPublishing(true)
    setPublishingProgress('Preparing book data...')

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
      }

      setPublishingProgress('Creating book record...')
      
      // Create book record directly in database (excluding N8N marketing)
      const { data: bookData_result, error: bookError } = await supabase
        .from('books')
        .insert(bookData)
        .select()
        .single()

      if (bookError) throw bookError
      
      setPublishingProgress('Updating manuscript status...')
      
      // Update manuscript status to published
      const { error: updateError } = await supabase
        .from('manuscripts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          publisher_id: user.id
        })
        .eq('id', selectedManuscript.id)

      if (updateError) throw updateError

      // Generate AI embedding for the new book
      setPublishingProgress('Generating AI embeddings...')
      
      try {
        const response = await fetch('/api/ai/generate-single-embedding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookId: bookData_result.id
          })
        })

        if (!response.ok) {
          console.warn('Failed to generate embedding, but book was published successfully')
        } else {
          console.log('AI embedding generated successfully for new book')
        }
      } catch (embeddingError) {
        console.warn('Embedding generation error (book still published):', embeddingError)
      }

      setPublishingProgress('Complete!')
      setSelectedManuscript(null)
      setPublishData({ finalPrice: '', edition: 'First Edition' })
      fetchManuscripts()
      
      alert('Book published successfully!')

    } catch (error) {
      console.error('Publishing error:', error)
      alert('Failed to publish book. Please try again.')
      setPublishingProgress('')
    } finally {
      setPublishing(false)
      setTimeout(() => setPublishingProgress(''), 3000)
    }
  }

  const getStatusColor = (status: string): 'primary' | 'secondary' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'approved': return 'success'
      case 'published': return 'primary'
      default: return 'secondary'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Ready to Publish'
      case 'published': return 'Published'
      default: return status
    }
  }

  const getPriorityColor = (reviewedAt: string, status: string) => {
    if (status !== 'approved') return 'transparent'
    
    const daysSinceReview = Math.floor(
      (new Date().getTime() - new Date(reviewedAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysSinceReview >= 7) return '#dc3545' // Red - high priority
    if (daysSinceReview >= 3) return '#ffc107' // Yellow - medium priority
    return '#28a745' // Green - normal priority
  }

  if (authLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  const isFiltered = searchQuery || filterStatus || filterCategory || filterAuthor || filterDateFrom || filterDateTo
  const finalFilteredManuscripts = getFilteredManuscripts()

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Publisher Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage approved manuscripts and publish books</p>
      </div>

      {/* Filter Toggle Button */}
      <div className="mb-6">
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

        {/* Results Counter */}
        {finalFilteredManuscripts.length !== manuscripts.length && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-600">
            Showing {finalFilteredManuscripts.length} of {manuscripts.length} manuscripts
            {getActiveFiltersCount() > 0 && ` with ${getActiveFiltersCount()} filter(s) applied`}
          </div>
        )}
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
                Clear All Filters
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
                <option value="approved">Approved</option>
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
                {existingCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
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
                {existingAuthors.map(author => (
                  <option key={author.id} value={author.id}>{author.name}</option>
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
        </Card>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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

      {/* Publishing Progress */}
      {publishingProgress && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md text-center">
          <p className="text-blue-800 font-medium">
            {publishingProgress}
          </p>
        </div>
      )}

      {/* Manuscripts Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Manuscripts</h2>
        
        {finalFilteredManuscripts.length === 0 ? (
          <Card>
            <p className="text-center text-gray-500 py-8">
              {isFiltered || activeStatusTab !== 'all' ? 'No manuscripts match your filters.' : 'No manuscripts to review.'}
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {finalFilteredManuscripts.map((manuscript) => (
              <Card 
                key={manuscript.id}
                className="overflow-hidden transition-all duration-200 hover:shadow-lg"
                style={{
                  borderLeft: `4px solid ${getPriorityColor(manuscript.reviewed_at || '', manuscript.status)}`
                }}
              >
                {/* Cover Image */}
                {manuscript.cover_image_url && (
                  <div 
                    className="h-48 bg-cover bg-center relative"
                    style={{ backgroundImage: `url(${manuscript.cover_image_url})` }}
                  >
                    <div className="absolute top-2 right-2">
                      <Badge variant={getStatusColor(manuscript.status)}>
                        {getStatusText(manuscript.status)}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    {manuscript.title}
                  </h3>
                  
                  <div className="text-sm text-gray-600 mb-2 space-y-1">
                    <div>Author: {manuscript.profiles?.name || 'Unknown'}</div>
                    <div>Category: {manuscript.category}</div>
                    {manuscript.reviewed_at && (
                      <div>Approved: {formatDuration(manuscript.reviewed_at)}</div>
                    )}
                  </div>

                  <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                    {manuscript.description}
                  </p>

                  {/* Tags */}
                  {manuscript.tags.length > 0 && (
                    <div className="mb-3">
                      {manuscript.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
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

                  {/* Price and Physical Book Info */}
                  <div className="text-sm text-gray-600 mb-3 space-y-1">
                    {manuscript.suggested_price && (
                      <div>Suggested Price: {manuscript.suggested_price.toLocaleString()} MMK</div>
                    )}
                    {manuscript.wants_physical && <div>Physical Book Requested</div>}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <a
                      href={manuscript.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      DOCX
                    </a>
                    
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => router.push(`/manuscript-editor?id=${manuscript.id}`)}
                    >
                      ✏️ View
                    </Button>

                    {manuscript.status === 'approved' && (
                      <>
                        <a
                          href={createMailtoLink(manuscript)}
                          className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                        >
                          📧 Email
                        </a>

                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => setSelectedManuscript(manuscript)}
                          disabled={publishing}
                        >
                          📚 Publish
                        </Button>
                      </>
                    )}

                    {manuscript.status === 'published' && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        ✅ Published
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Publish Modal */}
      <Modal
        isOpen={!!selectedManuscript}
        onClose={() => {
          setSelectedManuscript(null)
          setPublishData({ finalPrice: '', edition: 'First Edition' })
        }}
        title={`Publish: ${selectedManuscript?.title || ''}`}
        size="lg"
      >
        {selectedManuscript && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Author: {selectedManuscript.profiles?.name} | Category: {selectedManuscript.category}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Final Price (MMK) *
              </label>
              <input
                type="number"
                value={publishData.finalPrice}
                onChange={(e) => setPublishData(prev => ({ ...prev, finalPrice: e.target.value }))}
                placeholder={selectedManuscript.suggested_price?.toString() || 'Enter final price'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Edition
              </label>
              <select
                value={publishData.edition}
                onChange={(e) => setPublishData(prev => ({ ...prev, edition: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="First Edition">First Edition</option>
                <option value="Second Edition">Second Edition</option>
                <option value="Revised Edition">Revised Edition</option>
                <option value="Special Edition">Special Edition</option>
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedManuscript(null)
                  setPublishData({ finalPrice: '', edition: 'First Edition' })
                }}
                disabled={publishing}
              >
                Cancel
              </Button>
              
              <Button
                variant="success"
                onClick={publishBook}
                disabled={publishing || !publishData.finalPrice}
                loading={publishing}
              >
                {publishing ? 'Publishing...' : 'Publish Book'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}