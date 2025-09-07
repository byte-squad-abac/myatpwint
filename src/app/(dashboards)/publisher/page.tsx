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

type FeedbackHistory = {
  feedback: string
  editor_id: string
  editor_name?: string
  timestamp: string
  action: 'rejected' | 'approved' | 'under_review'
}

type PublisherSalesData = {
  month: string
  total_sales: number
  total_revenue: number
  unique_books_sold: number
  unique_customers: number
  avg_order_value: number
  digital_revenue: number
  physical_revenue: number
  digital_sales: number
  physical_sales: number
  books_sold: string
}

type BookSalesData = {
  book_id: string
  manuscript_id: string
  book_name: string
  total_sales: number
  total_revenue: number
  digital_sales: number
  physical_sales: number
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
  const [salesData, setSalesData] = useState<PublisherSalesData[]>([])
  const [bookSalesData, setBookSalesData] = useState<BookSalesData[]>([])
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

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedDetailManuscript, setSelectedDetailManuscript] = useState<Manuscript | null>(null)
  
  // Sales filter state
  const [showOnlyBooksWithSales, setShowOnlyBooksWithSales] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>('') // Will be set to current month
  const [isRefreshingSales, setIsRefreshingSales] = useState(false)
  const [lastSalesUpdate, setLastSalesUpdate] = useState<Date | null>(null)

  // Analytics state
  const [sortBy, setSortBy] = useState<'default' | 'sales' | 'revenue' | 'author_revenue'>('default')
  const [showTopPerformers, setShowTopPerformers] = useState(false)
  
  // Toggle states for sections
  const [showCurrentMonth, setShowCurrentMonth] = useState(false)
  const [showMonthlyHistory, setShowMonthlyHistory] = useState(false)

  const fetchSalesData = useCallback(async () => {
    if (!user) return
    
    setIsRefreshingSales(true)
    try {
      console.log('Auto-refreshing sales data...')
      // Fetch monthly sales data for this publisher - simplified approach
      // First get publisher's books, then get purchases for those books
      const { data: publisherBooks } = await supabase
        .from('books')
        .select('id, name, manuscript_id, manuscripts!inner(id, publisher_id)')
        .eq('manuscripts.publisher_id', user.id)
      
      if (!publisherBooks || publisherBooks.length === 0) {
        setSalesData([])
        setBookSalesData([])
        setIsRefreshingSales(false)
        return
      }
      
      const bookIds = publisherBooks.map(book => book.id)
      const { data: monthlySales, error: monthlyError } = await supabase
        .from('purchases')
        .select('*')
        .in('book_id', bookIds)
        .eq('status', 'completed')

      // Create maps for both monthly and book sales processing
      const bookNameMap = publisherBooks.reduce((map: Record<string, string>, book: { id: string; name: string; manuscript_id: string }) => {
        map[book.id] = book.name
        return map
      }, {})

      const bookDetailsMap = publisherBooks.reduce((map: Record<string, { name: string; manuscript_id: string }>, book: { id: string; name: string; manuscript_id: string }) => {
        map[book.id] = { name: book.name, manuscript_id: book.manuscript_id }
        return map
      }, {})

      if (monthlyError) {
        console.error('Error fetching monthly sales:', monthlyError)
      } else if (monthlySales && publisherBooks) {

        // Process monthly sales data
        const monthlyStats = monthlySales.reduce((acc: Record<string, {
          month: string
          total_sales: number
          total_revenue: number
          unique_books_sold: Set<string>
          unique_customers: Set<string>
          digital_revenue: number
          physical_revenue: number
          digital_sales: number
          physical_sales: number
          books_sold: Set<string>
        }>, purchase: {
          created_at: string
          book_id: string
          user_id: string
          quantity: number
          total_price: string
          delivery_type: string
        }) => {
          const month = purchase.created_at.substring(0, 7) // YYYY-MM format
          if (!acc[month]) {
            acc[month] = {
              month: month + '-01',
              total_sales: 0,
              total_revenue: 0,
              unique_books_sold: new Set(),
              unique_customers: new Set(),
              digital_revenue: 0,
              physical_revenue: 0,
              digital_sales: 0,
              physical_sales: 0,
              books_sold: new Set()
            }
          }
          
          acc[month].total_sales += purchase.quantity || 1
          acc[month].total_revenue += parseFloat(purchase.total_price || '0')
          acc[month].unique_books_sold.add(purchase.book_id)
          acc[month].unique_customers.add(purchase.user_id)
          acc[month].books_sold.add(bookNameMap[purchase.book_id] || 'Unknown Book')
          
          if (purchase.delivery_type === 'digital') {
            acc[month].digital_revenue += parseFloat(purchase.total_price || '0')
            acc[month].digital_sales += purchase.quantity || 1
          } else {
            acc[month].physical_revenue += parseFloat(purchase.total_price || '0')
            acc[month].physical_sales += purchase.quantity || 1
          }
          
          return acc
        }, {})
        
        // Convert to array and calculate averages
        const processedSalesData = Object.values(monthlyStats).map((stats) => ({
          month: stats.month,
          total_sales: stats.total_sales,
          total_revenue: stats.total_revenue,
          unique_books_sold: stats.unique_books_sold.size,
          unique_customers: stats.unique_customers.size,
          avg_order_value: stats.total_sales > 0 ? stats.total_revenue / stats.total_sales : 0,
          digital_revenue: stats.digital_revenue,
          physical_revenue: stats.physical_revenue,
          digital_sales: stats.digital_sales,
          physical_sales: stats.physical_sales,
          books_sold: Array.from(stats.books_sold).join(', ')
        })).sort((a, b) => b.month.localeCompare(a.month))
        
        setSalesData(processedSalesData.slice(0, 12)) // Last 12 months
        
        // Set current month as default selected month if not already set
        if (!selectedMonth && processedSalesData.length > 0) {
          const sortedData = processedSalesData.sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime())
          setSelectedMonth(sortedData[0].month)
        }
      }
      
      // Fetch individual book sales data using the same book IDs
      const { data: bookSales, error: bookError } = await supabase
        .from('purchases')
        .select('book_id, quantity, total_price, delivery_type')
        .in('book_id', bookIds)
        .eq('status', 'completed')
        
      if (bookError) {
        console.error('Error fetching book sales:', bookError)
      } else if (bookSales && publisherBooks) {
        // Process book sales data
        const bookStats = bookSales.reduce((acc: Record<string, {
          book_id: string
          manuscript_id: string
          book_name: string
          total_sales: number
          total_revenue: number
          digital_sales: number
          physical_sales: number
          digital_revenue: number
          physical_revenue: number
        }>, purchase: {
          book_id: string
          quantity: number
          total_price: string
          delivery_type: string
        }) => {
          const bookId = purchase.book_id
          const bookDetails = bookDetailsMap[bookId]
          
          if (!bookDetails) return acc // Skip if we don't have book details
          
          if (!acc[bookId]) {
            acc[bookId] = {
              book_id: bookId,
              manuscript_id: bookDetails.manuscript_id,
              book_name: bookDetails.name,
              total_sales: 0,
              total_revenue: 0,
              digital_sales: 0,
              physical_sales: 0,
              digital_revenue: 0,
              physical_revenue: 0
            }
          }
          
          acc[bookId].total_sales += purchase.quantity || 1
          acc[bookId].total_revenue += parseFloat(purchase.total_price || '0')
          
          if (purchase.delivery_type === 'digital') {
            acc[bookId].digital_sales += purchase.quantity || 1
            acc[bookId].digital_revenue += parseFloat(purchase.total_price || '0')
          } else {
            acc[bookId].physical_sales += purchase.quantity || 1
            acc[bookId].physical_revenue += parseFloat(purchase.total_price || '0')
          }
          
          return acc
        }, {})
        
        setBookSalesData(Object.values(bookStats))
      }
      
      setLastSalesUpdate(new Date())
    } catch (error) {
      console.error('Error fetching sales data:', error)
    } finally {
      setIsRefreshingSales(false)
    }
  }, [user, selectedMonth])
  
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
      fetchSalesData()
      setPageLoading(false)
    }
  }, [user, profile, router, authLoading, fetchManuscripts, fetchSalesData])

  // Auto-refresh sales data every 30 seconds for live updates
  useEffect(() => {
    if (!user || !profile || profile.role !== 'publisher') return

    console.log('Starting live sales data updates (every 30 seconds)')
    const salesInterval = setInterval(() => {
      console.log('Auto-refreshing sales data...')
      fetchSalesData()
    }, 30000) // 30 seconds

    // Cleanup interval on unmount or when user changes
    return () => {
      console.log('Stopping live sales data updates')
      clearInterval(salesInterval)
    }
  }, [user, profile, fetchSalesData])

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
    setShowOnlyBooksWithSales(false)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (searchQuery) count++
    if (filterStatus) count++
    if (filterCategory) count++
    if (filterAuthor) count++
    if (filterDateFrom) count++
    if (filterDateTo) count++
    if (showOnlyBooksWithSales) count++
    return count
  }

  const getFilteredManuscripts = () => {
    let filtered = manuscripts

    // Filter by active tab first
    if (activeStatusTab !== 'all') {
      if (activeStatusTab === 'approved') filtered = filtered.filter(m => m.status === 'approved')
      if (activeStatusTab === 'published') filtered = filtered.filter(m => m.status === 'published')
    }

    // Sales filter - only show books with sales
    if (showOnlyBooksWithSales) {
      filtered = filtered.filter(m => {
        if (m.status !== 'published') return false
        const salesData = getSalesDataForManuscript(m.id)
        return salesData.sales > 0
      })
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
      fetchSalesData() // Refresh sales data
      
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


  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Ready to Publish'
      case 'published': return 'Published'
      default: return status
    }
  }

  const getSalesDataForManuscript = (manuscriptId: string) => {
    const bookSale = bookSalesData.find(s => s.manuscript_id === manuscriptId)
    return bookSale ? { 
      sales: bookSale.total_sales, 
      revenue: bookSale.total_revenue,
      digitalSales: bookSale.digital_sales,
      physicalSales: bookSale.physical_sales,
      digitalRevenue: bookSale.digital_revenue,
      physicalRevenue: bookSale.physical_revenue
    } : { 
      sales: 0, 
      revenue: 0, 
      digitalSales: 0, 
      physicalSales: 0, 
      digitalRevenue: 0, 
      physicalRevenue: 0 
    }
  }

  const getTotalSalesStats = () => {
    const totalStats = salesData.reduce((acc, month) => ({
      totalSales: acc.totalSales + month.total_sales,
      totalRevenue: acc.totalRevenue + month.total_revenue,
      digitalSales: acc.digitalSales + month.digital_sales,
      physicalSales: acc.physicalSales + month.physical_sales,
      uniqueCustomersCount: Math.max(acc.uniqueCustomersCount, month.unique_customers)
    }), { totalSales: 0, totalRevenue: 0, digitalSales: 0, physicalSales: 0, uniqueCustomersCount: 0 })
    
    // Count unique books from bookSalesData (books that actually have sales)
    const uniqueBooksCount = bookSalesData.filter(book => book.total_sales > 0).length
    
    const currentMonth = salesData[0] || { total_sales: 0, total_revenue: 0, digital_sales: 0, physical_sales: 0, unique_customers: 0, unique_books_sold: 0 }
    
    return { ...totalStats, uniqueBooksCount, currentMonth }
  }

  // Analytics functions
  const getTopPerformingBooks = (limit = 5) => {
    return bookSalesData
      .filter(book => book.total_sales > 0)
      .sort((a, b) => {
        if (sortBy === 'sales') return b.total_sales - a.total_sales
        if (sortBy === 'revenue') return b.total_revenue - a.total_revenue
        return b.total_revenue - a.total_revenue
      })
      .slice(0, limit)
  }

  const getAuthorAnalytics = () => {
    const authorStats = manuscripts
      .filter(m => m.status === 'published')
      .reduce((acc: Record<string, { author_id: string; author_name: string; total_revenue: number; total_sales: number; books_count: number }>, manuscript) => {
        const salesData = getSalesDataForManuscript(manuscript.id)
        const authorId = manuscript.author_id
        const authorName = manuscript.profiles?.name || 'Unknown Author'
        
        if (!acc[authorId]) {
          acc[authorId] = {
            author_id: authorId,
            author_name: authorName,
            total_revenue: 0,
            total_sales: 0,
            books_count: 0
          }
        }
        
        acc[authorId].total_revenue += salesData.revenue
        acc[authorId].total_sales += salesData.sales
        acc[authorId].books_count += 1
        
        return acc
      }, {})
    
    return Object.values(authorStats)
      .filter(author => author.total_sales > 0)
      .sort((a, b) => b.total_revenue - a.total_revenue)
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Publisher Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage approved manuscripts and publish books</p>
          </div>
          <Button
            onClick={() => router.push('/publisher/authors')}
            variant="outline"
          >
            📝 Author Management
          </Button>
        </div>
      </div>

      {/* Publisher Sales & Revenue Dashboard */}
      {salesData.length > 0 && (() => {
        const stats = getTotalSalesStats()
        return (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Sales & Revenue Overview</h2>
              <div className="flex items-center space-x-3">
                <Button
                  variant={showCurrentMonth ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setShowCurrentMonth(!showCurrentMonth)}
                >
                  {showCurrentMonth ? 'Hide' : 'Show'} Current Month
                </Button>
                <Button
                  variant={showMonthlyHistory ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setShowMonthlyHistory(!showMonthlyHistory)}
                >
                  {showMonthlyHistory ? 'Hide' : 'Show'} History
                </Button>
              </div>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Revenue */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-emerald-200">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-emerald-700 font-medium uppercase tracking-wide">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalRevenue.toLocaleString()} <span className="text-lg text-gray-600">MMK</span></p>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                      <span className="text-xs text-emerald-600">All time</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Total Sales */}
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 font-medium uppercase tracking-wide">Total Sales</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalSales}</p>
                    <div className="flex items-center space-x-4 mt-1 text-xs">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="text-blue-600">Digital: {stats.digitalSales}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        <span className="text-purple-600">Physical: {stats.physicalSales}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Books Sold */}
              <Card 
                className={`cursor-pointer transition-all duration-200 ${
                  showOnlyBooksWithSales 
                    ? 'bg-gradient-to-br from-purple-100 to-purple-200 border-2 border-purple-400 ring-2 ring-purple-300' 
                    : 'bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 hover:border-purple-300'
                }`}
                onClick={() => setShowOnlyBooksWithSales(!showOnlyBooksWithSales)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-colors ${
                    showOnlyBooksWithSales ? 'bg-purple-600' : 'bg-purple-500'
                  }`}>
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-purple-700 font-medium uppercase tracking-wide">Books With Sales</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.uniqueBooksCount}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        showOnlyBooksWithSales ? 'bg-purple-500 animate-pulse' : 'bg-purple-400'
                      }`}></div>
                      <span className={`text-xs ${
                        showOnlyBooksWithSales ? 'text-purple-700 font-semibold' : 'text-purple-600'
                      }`}>
                        {showOnlyBooksWithSales ? 'Filtering active' : 'Click to filter'}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Customers */}
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-orange-700 font-medium uppercase tracking-wide">Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.uniqueCustomersCount}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                      <span className="text-xs text-orange-600">Unique buyers</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Current Month Performance */}
            {showCurrentMonth && stats.currentMonth.total_sales > 0 && (
              <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Current Month Performance</h3>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      isRefreshingSales ? 'bg-orange-400 animate-pulse' : 'bg-green-400 animate-pulse'
                    }`}></div>
                    <div className="text-right">
                      <span className={`text-sm font-medium ${
                        isRefreshingSales ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {isRefreshingSales ? 'Refreshing...' : 'Live Data'}
                      </span>
                      {lastSalesUpdate && !isRefreshingSales && (
                        <div className="text-xs text-gray-500">
                          Updated {lastSalesUpdate.toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Copies</p>
                    <p className="text-xl font-bold text-gray-900">{stats.currentMonth.total_sales}</p>
                    <p className="text-xs text-gray-400 mt-1">Individual purchases</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Monthly Revenue</p>
                    <p className="text-xl font-bold text-gray-900">{stats.currentMonth.total_revenue.toLocaleString()} <span className="text-sm text-gray-600">MMK</span></p>
                    <p className="text-xs text-gray-400 mt-1">Total earnings</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">New Customers</p>
                    <p className="text-xl font-bold text-gray-900">{stats.currentMonth.unique_customers}</p>
                    <p className="text-xs text-gray-400 mt-1">First-time buyers</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Active Titles</p>
                    <p className="text-xl font-bold text-gray-900">{stats.currentMonth.unique_books_sold}</p>
                    <p className="text-xs text-gray-400 mt-1">Different books sold</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )
      })()}

      {/* Historical Monthly Records */}
      {showMonthlyHistory && salesData.length > 0 && selectedMonth && (
        <div className="mb-8">
          <Card className="bg-gradient-to-br from-purple-50 to-indigo-100 border-2 border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Monthly Performance History</h3>
              <div className="flex items-center space-x-3">
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {salesData
                    .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime())
                    .map((monthData) => {
                      const monthName = new Date(monthData.month + 'T00:00:00').toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long'
                      })
                      return (
                        <option key={monthData.month} value={monthData.month}>
                          {monthName}
                        </option>
                      )
                    })}
                </select>
                <div className="text-sm text-gray-600">
                  {salesData.length} month{salesData.length !== 1 ? 's' : ''} available
                </div>
              </div>
            </div>
            
            {(() => {
              const monthData = salesData.find(data => data.month === selectedMonth)
              if (!monthData) return <p className="text-center text-gray-500 py-4">No data found for selected month</p>
              
              const monthName = new Date(monthData.month + 'T00:00:00').toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long'
              })
              const currentDate = new Date()
              const selectedDate = new Date(monthData.month + 'T00:00:00')
              const isCurrentMonth = selectedDate.getFullYear() === currentDate.getFullYear() && 
                                   selectedDate.getMonth() === currentDate.getMonth()
              
              return (
                <div className={`rounded-lg border ${
                  isCurrentMonth 
                    ? 'bg-white/90 border-purple-300 shadow-md' 
                    : 'bg-white/80 border-gray-200'
                }`}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className={`text-xl font-semibold ${isCurrentMonth ? 'text-purple-900' : 'text-gray-900'}`}>
                        {monthName}
                        {isCurrentMonth && (
                          <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                            Current Month
                          </span>
                        )}
                      </h4>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          {monthData.total_revenue.toLocaleString()} MMK
                        </p>
                        <p className="text-sm text-gray-500">
                          {monthData.total_sales} copies sold
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center bg-white/60 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Sales</p>
                        <p className="text-xl font-bold text-gray-900">{monthData.total_sales}</p>
                        <p className="text-xs text-gray-400">Copies sold</p>
                      </div>
                      <div className="text-center bg-white/60 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Revenue</p>
                        <p className="text-xl font-bold text-gray-900">{monthData.total_revenue.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">MMK earned</p>
                      </div>
                      <div className="text-center bg-white/60 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Books Sold</p>
                        <p className="text-xl font-bold text-gray-900">{monthData.unique_books_sold}</p>
                        <p className="text-xs text-gray-400">Different titles</p>
                      </div>
                      <div className="text-center bg-white/60 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Customers</p>
                        <p className="text-xl font-bold text-gray-900">{monthData.unique_customers}</p>
                        <p className="text-xs text-gray-400">Buyers reached</p>
                      </div>
                    </div>
                    
                    {(monthData.digital_sales > 0 || monthData.physical_sales > 0) && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h5 className="text-sm font-medium text-gray-700 mb-3">Delivery Type Breakdown</h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center bg-blue-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-blue-700">Digital</p>
                            <p className="text-lg font-bold text-blue-900">{monthData.digital_sales}</p>
                            <p className="text-xs text-blue-600">{monthData.digital_revenue.toLocaleString()} MMK</p>
                          </div>
                          <div className="text-center bg-green-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-green-700">Physical</p>
                            <p className="text-lg font-bold text-green-900">{monthData.physical_sales}</p>
                            <p className="text-xs text-green-600">{monthData.physical_revenue.toLocaleString()} MMK</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}
          </Card>
        </div>
      )}

      {/* Analytics Section */}
      {salesData.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Performance Analytics</h2>
            <div className="flex items-center space-x-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'default' | 'sales' | 'revenue' | 'author_revenue')}
                className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="default">Default Sort</option>
                <option value="sales">Sort by Sales Volume</option>
                <option value="revenue">Sort by Revenue</option>
              </select>
              <Button
                variant={showTopPerformers ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => setShowTopPerformers(!showTopPerformers)}
              >
                {showTopPerformers ? 'Hide Analytics' : 'Show Top Performers'}
              </Button>
              {sortBy !== 'default' && (
                <div className="flex items-center space-x-1">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span className="text-xs text-blue-600 font-medium">Sorted</span>
                </div>
              )}
            </div>
          </div>

          {showTopPerformers && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Top Performing Books */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Top Books by Revenue</h3>
                  <p className="text-sm text-gray-600">Your highest earning publications</p>
                </div>
                <div className="space-y-3">
                  {getTopPerformingBooks(5).map((book, index) => (
                    <div key={book.book_id} className="flex items-center justify-between bg-white/80 rounded-lg p-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{book.book_name}</p>
                          <p className="text-xs text-gray-600">{book.total_sales} sales</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{book.total_revenue.toLocaleString()} MMK</p>
                        <p className="text-xs text-gray-600">avg {Math.round(book.total_revenue / book.total_sales).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                  {getTopPerformingBooks(5).length === 0 && (
                    <p className="text-center text-gray-500 py-4">No sales data available yet</p>
                  )}
                </div>
              </Card>

              {/* Top Authors */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Top Authors by Revenue</h3>
                  <p className="text-sm text-gray-600">Your most profitable authors</p>
                </div>
                <div className="space-y-3">
                  {getAuthorAnalytics().slice(0, 5).map((author, index) => (
                    <div key={author.author_id} className="flex items-center justify-between bg-white/80 rounded-lg p-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-green-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{author.author_name}</p>
                          <p className="text-xs text-gray-600">{author.books_count} book{author.books_count !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{author.total_revenue.toLocaleString()} MMK</p>
                        <p className="text-xs text-gray-600">{author.total_sales} total sales</p>
                      </div>
                    </div>
                  ))}
                  {getAuthorAnalytics().length === 0 && (
                    <p className="text-center text-gray-500 py-4">No author data available yet</p>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

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
        {(finalFilteredManuscripts.length !== manuscripts.length || showOnlyBooksWithSales) && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-600">
            Showing {finalFilteredManuscripts.length} of {manuscripts.length} manuscripts
            {showOnlyBooksWithSales && (
              <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                With sales only
              </span>
            )}
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
            {finalFilteredManuscripts.map((manuscript) => {
              // Status-based theming (matching author/editor dashboard)
              const statusConfig = {
                published: { 
                  bg: 'bg-gradient-to-br from-blue-50 to-blue-100', 
                  border: 'border-blue-200', 
                  accent: 'bg-blue-500',
                  text: 'text-blue-700',
                  iconBg: 'bg-blue-500',
                  iconSymbol: '📚'
                },
                approved: { 
                  bg: 'bg-gradient-to-br from-green-50 to-green-100', 
                  border: 'border-green-200', 
                  accent: 'bg-green-500',
                  text: 'text-green-700',
                  iconBg: 'bg-green-500',
                  iconSymbol: '✅'
                }
              }
              const config = statusConfig[manuscript.status as keyof typeof statusConfig] || {
                bg: 'bg-gradient-to-br from-gray-50 to-gray-100', 
                border: 'border-gray-200', 
                accent: 'bg-gray-500',
                text: 'text-gray-700',
                iconBg: 'bg-gray-500',
                iconSymbol: '📄'
              }
              
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
                    <div className={`w-8 h-8 rounded-full ${config.iconBg} text-white flex items-center justify-center text-lg shadow-lg`}>
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
                          <span className="font-medium">{manuscript.profiles?.name || 'Unknown Author'}</span>
                        </div>
                        {manuscript.reviewed_at && (
                          <div className="mt-1 text-xs text-gray-500">
                            Approved: {formatDuration(manuscript.reviewed_at)}
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

                    {/* Publisher-specific info */}
                    <div className="space-y-3 mb-4">
                      {/* Pricing and edition info */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
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
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-gray-400 rounded-sm flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-sm"></div>
                          </div>
                          <span className="text-xs">{getStatusText(manuscript.status)}</span>
                        </div>
                      </div>

                      {/* Publication readiness indicator */}
                      {manuscript.status === 'approved' && (
                        <div className="bg-green-100 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-sm font-medium text-green-700">Ready to publish!</span>
                          </div>
                        </div>
                      )}

                      {/* Sales Performance Section - Only for Published Books */}
                      {manuscript.status === 'published' && (() => {
                        const salesData = getSalesDataForManuscript(manuscript.id)
                        return (
                          <div className="mt-4 pt-4 border-t border-white/40">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-600">Sales Performance</span>
                              {salesData.sales > 0 && (
                                <div className="flex items-center space-x-1">
                                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                  <span className="text-xs text-green-600 font-medium">Active</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-3 grid grid-cols-2 gap-4">
                              <div className="bg-white/60 rounded-lg p-3 border border-white/80">
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Copies Sold</p>
                                    <p className="text-lg font-bold text-gray-900">{salesData.sales}</p>
                                    {salesData.sales > 0 && (
                                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                                        <span>D: {salesData.digitalSales}</span>
                                        <span>P: {salesData.physicalSales}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-white/60 rounded-lg p-3 border border-white/80">
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Revenue</p>
                                    <p className="text-lg font-bold text-gray-900">{Number(salesData.revenue).toLocaleString()} <span className="text-sm font-normal text-gray-600">MMK</span></p>
                                    {salesData.sales > 0 && (
                                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                                        <span>Avg: {Math.round(salesData.revenue / salesData.sales).toLocaleString()}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {salesData.sales === 0 && (
                              <div className="mt-3 text-center py-2">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <p className="text-sm text-gray-500">No sales recorded yet</p>
                                <p className="text-xs text-gray-400 mt-1">Sales will appear here once customers purchase this book</p>
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

                        {/* View/Edit Button */}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => router.push(`/manuscript-editor?id=${manuscript.id}`)}
                          className="inline-flex items-center space-x-2"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>View</span>
                        </Button>
                        
                        {/* Status-specific actions */}
                        {manuscript.status === 'approved' && (
                          <>
                            <a
                              href={createMailtoLink(manuscript)}
                              className="inline-flex items-center space-x-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span>Email</span>
                            </a>

                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => setSelectedManuscript(manuscript)}
                              disabled={publishing}
                              className="inline-flex items-center space-x-2"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                              <span>Publish</span>
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Published badge */}
                      {manuscript.status === 'published' && (
                        <div className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>Published</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
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
                        'bg-gray-500'
                      }`}></div>
                      <span className={`font-medium ${
                        selectedDetailManuscript.status === 'published' ? 'text-blue-700' :
                        selectedDetailManuscript.status === 'approved' ? 'text-green-700' :
                        'text-gray-700'
                      }`}>
                        {getStatusText(selectedDetailManuscript.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Author</h4>
                  <p className="text-gray-700">{selectedDetailManuscript.profiles?.name || 'Unknown Author'}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Manuscript Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Manuscript Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Submitted:</span>
                    <span className="font-medium">{new Date(selectedDetailManuscript.submitted_at).toLocaleDateString()}</span>
                  </div>
                  {selectedDetailManuscript.reviewed_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Approved:</span>
                      <span className="font-medium">{new Date(selectedDetailManuscript.reviewed_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedDetailManuscript.published_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Published:</span>
                      <span className="font-medium">{new Date(selectedDetailManuscript.published_at).toLocaleDateString()}</span>
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
                <h3 className="font-semibold text-gray-800 mb-3">Publishing Information</h3>
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
                      {selectedDetailManuscript.wants_physical ? 'Requested' : 'Digital only'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${
                      selectedDetailManuscript.status === 'published' ? 'text-blue-600' :
                      selectedDetailManuscript.status === 'approved' ? 'text-green-600' :
                      'text-gray-600'
                    }`}>
                      {getStatusText(selectedDetailManuscript.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sales Performance - Only for Published Books */}
              {selectedDetailManuscript.status === 'published' && (() => {
                const salesData = getSalesDataForManuscript(selectedDetailManuscript.id)
                return (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-800">Sales Performance</h3>
                      {salesData.sales > 0 && (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-xs text-green-600 font-medium">Active</span>
                        </div>
                      )}
                    </div>
                    
                    {salesData.sales > 0 ? (
                      <div className="space-y-4">
                        {/* Total Sales */}
                        <div className="bg-white/80 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Copies Sold</p>
                                <p className="text-2xl font-bold text-gray-900 mb-1">{salesData.sales}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between text-sm text-gray-600 mt-2">
                            <span>Digital: {salesData.digitalSales}</span>
                            <span>Physical: {salesData.physicalSales}</span>
                          </div>
                        </div>

                        {/* Total Revenue */}
                        <div className="bg-white/80 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Revenue</p>
                                <p className="text-2xl font-bold text-gray-900 mb-1">{Number(salesData.revenue).toLocaleString()}</p>
                                <p className="text-xs text-gray-500">MMK</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between text-sm text-gray-600 mt-2">
                            <span>Avg per sale: {Math.round(salesData.revenue / salesData.sales).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setShowDetailModal(false)
                    router.push(`/manuscript-editor?id=${selectedDetailManuscript.id}`)
                  }}
                >
                  View Manuscript
                </Button>

                {selectedDetailManuscript.status === 'approved' && (
                  <>
                    <a
                      href={createMailtoLink(selectedDetailManuscript)}
                      className="inline-flex items-center space-x-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>Email Author</span>
                    </a>

                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => {
                        setShowDetailModal(false)
                        setSelectedManuscript(selectedDetailManuscript)
                      }}
                      disabled={publishing}
                    >
                      Publish Book
                    </Button>
                  </>
                )}
              </div>

              {/* Status indicator */}
              {selectedDetailManuscript.status === 'published' && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Published</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}