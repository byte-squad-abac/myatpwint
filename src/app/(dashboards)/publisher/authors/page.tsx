'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import type { AuthorApplicationWithProfile } from '@/types'

type AuthorWithDetails = {
  id: string
  name: string
  email: string
  role: string
  created_at: string
  manuscripts_count: number
  last_submission: string | null
  author_application?: {
    id: string
    created_at: string
    book_title: string
    status: string
  }
}

export default function PublisherAuthorsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState<'applications' | 'authors'>('applications')
  const [applications, setApplications] = useState<AuthorApplicationWithProfile[]>([])
  const [authors, setAuthors] = useState<AuthorWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApplication, setSelectedApplication] = useState<AuthorApplicationWithProfile | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve')
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // Don't check auth while still loading
    if (authLoading) return
    
    console.log('Publisher Authors auth check - User:', !!user, 'Profile:', profile?.role)
    
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
      fetchData()
    }
  }, [user, profile, router, authLoading])

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchApplications(), fetchAuthors()])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchApplications = async () => {
    try {
      console.log('Fetching applications with status=pending...')
      const response = await fetch('/api/author-applications?status=pending')
      console.log('Applications fetch response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('Applications fetch result:', result)
        setApplications(result.data || [])
      } else {
        const errorData = await response.json()
        console.error('Applications fetch failed:', response.status, errorData)
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    }
  }

  const fetchAuthors = async () => {
    try {
      // First, fetch all authors
      const { data: authorsData, error: authorsError } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          email,
          role,
          created_at
        `)
        .eq('role', 'author')
        .order('created_at', { ascending: false })

      if (authorsError) throw authorsError

      // Then, fetch author applications separately
      const authorIds = authorsData.map(author => author.id)
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('author_applications')
        .select('user_id, id, created_at, book_title, status')
        .in('user_id', authorIds)

      if (applicationsError) {
        console.log('Applications fetch error (expected for authors without apps):', applicationsError)
      }

      // Fetch manuscript counts for each author
      const manuscriptCounts: Record<string, number> = {}
      for (const author of authorsData) {
        const { data: manuscripts, error: manuscriptsError } = await supabase
          .from('manuscripts')
          .select('id', { count: 'exact' })
          .eq('author_id', author.id)
        
        if (!manuscriptsError) {
          manuscriptCounts[author.id] = manuscripts?.length || 0
        }
      }

      // Combine the data
      const authorsWithDetails: AuthorWithDetails[] = authorsData.map(author => {
        const application = applicationsData?.find(app => app.user_id === author.id)
        
        return {
          id: author.id,
          name: author.name,
          email: author.email,
          role: author.role,
          created_at: author.created_at,
          manuscripts_count: manuscriptCounts[author.id] || 0,
          last_submission: null,
          author_application: application
        }
      })

      setAuthors(authorsWithDetails)
    } catch (error) {
      console.error('Failed to fetch authors:', error)
    }
  }

  const handleReview = (application: AuthorApplicationWithProfile, action: 'approve' | 'reject') => {
    setSelectedApplication(application)
    setReviewAction(action)
    setFeedback('')
    setShowReviewModal(true)
  }

  const submitReview = async () => {
    if (!selectedApplication) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/author-applications/${selectedApplication.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: reviewAction,
          publisher_feedback: feedback
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update application')
      }

      // Refresh data
      await fetchData()
      
      // Close modal
      setShowReviewModal(false)
      setSelectedApplication(null)
      setFeedback('')

    } catch (error) {
      console.error('Failed to submit review:', error)
      alert(error instanceof Error ? error.message : 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleAssociationVerified = async (applicationId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('author_applications')
        .update({ association_verified: !currentStatus })
        .eq('id', applicationId)

      if (error) throw error

      // Update local state
      setApplications(prev => 
        prev.map(app => 
          app.id === applicationId 
            ? { ...app, association_verified: !currentStatus }
            : app
        )
      )
    } catch (error) {
      console.error('Failed to toggle verification:', error)
      alert('Failed to update verification status')
    }
  }

  const filteredApplications = applications.filter(app => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    
    return (
      app.profiles?.name?.toLowerCase().includes(searchLower) ||
      app.author_name?.toLowerCase().includes(searchLower) ||
      app.book_title?.toLowerCase().includes(searchLower)
    );
  });

  const filteredAuthors = authors.filter(author => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    
    return (
      author.name?.toLowerCase().includes(searchLower) ||
      author.email?.toLowerCase().includes(searchLower)
    );
  });

  // Show loading state while auth is loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user || profile?.role !== 'publisher') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">This page is only accessible to publishers.</p>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Author Management</h1>
              <p className="text-gray-600 mt-2">
                Review author applications and manage approved authors
              </p>
            </div>
            <Button
              onClick={() => router.push('/publisher')}
              variant="outline"
            >
              ← Back to Manuscripts
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('applications')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'applications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Applications ({applications.length})
            </button>
            <button
              onClick={() => setActiveTab('authors')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'authors'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Approved Authors ({authors.length})
            </button>
          </nav>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            {/* Applications Tab */}
            {activeTab === 'applications' && (
              <div className="space-y-4">
                {filteredApplications.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-gray-500">
                      {searchTerm ? 'No applications match your search.' : 'No pending applications.'}
                    </p>
                  </Card>
                ) : (
                  filteredApplications.map((application) => (
                    <Card key={application.id} className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {application.author_name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {application.profiles?.name} • {application.profiles?.email}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Book Details</h4>
                              <p className="text-sm"><strong>Title:</strong> {application.book_title}</p>
                              <p className="text-sm"><strong>Category:</strong> {application.book_category}</p>
                              <p className="text-sm"><strong>Tags:</strong> {application.book_tags.join(', ')}</p>
                              {application.preferred_price && (
                                <p className="text-sm"><strong>Suggested Price:</strong> ${application.preferred_price}</p>
                              )}
                              {!application.preferred_price && (
                                <p className="text-sm"><strong>Suggested Price:</strong> <span className="text-gray-500">Not specified</span></p>
                              )}
                            </div>

                            {application.association_name && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Association</h4>
                                <p className="text-sm"><strong>Name:</strong> {application.association_name}</p>
                                {application.membership_id && (
                                  <p className="text-sm"><strong>ID:</strong> {application.membership_id}</p>
                                )}
                                <div className="flex items-center space-x-2 mt-2">
                                  <input
                                    type="checkbox"
                                    checked={application.association_verified}
                                    onChange={() => toggleAssociationVerified(application.id, application.association_verified)}
                                    className="rounded"
                                  />
                                  <span className="text-sm">Verified association proof</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {application.book_synopsis && (
                            <div className="mb-4">
                              <h4 className="font-medium text-gray-900 mb-2">Book Synopsis</h4>
                              <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded leading-relaxed">
                                {application.book_synopsis}
                              </p>
                            </div>
                          )}

                          <div className="mb-4">
                            <h4 className="font-medium text-gray-900 mb-2">Why MyatPwint?</h4>
                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                              {application.why_publish_with_us}
                            </p>
                          </div>

                          <div className="text-xs text-gray-500">
                            Submitted: {new Date(application.created_at).toLocaleDateString()}
                            {application.submission_count > 1 && (
                              <span> • Resubmissions: {application.submission_count - 1}</span>
                            )}
                          </div>
                        </div>

                        <div className="ml-6 flex flex-col space-y-2">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleReview(application, 'approve')}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="error"
                            onClick={() => handleReview(application, 'reject')}
                          >
                            Reject
                          </Button>
                          {application.association_proof_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(application.association_proof_url, '_blank')}
                            >
                              View Proof
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Authors Tab */}
            {activeTab === 'authors' && (
              <div className="space-y-4">
                {filteredAuthors.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-gray-500">
                      {searchTerm ? 'No authors match your search.' : 'No approved authors yet.'}
                    </p>
                  </Card>
                ) : (
                  filteredAuthors.map((author) => (
                    <Card key={author.id} className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {author.name}
                              </h3>
                              <p className="text-sm text-gray-600">{author.email}</p>
                            </div>
                            <Badge variant="success">Author</Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Joined:</span>
                              <span className="ml-2">{new Date(author.created_at).toLocaleDateString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Books Submitted:</span>
                              <span className="ml-2">{author.manuscripts_count}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Last Submission:</span>
                              <span className="ml-2">{author.last_submission || 'None'}</span>
                            </div>
                          </div>

                          {author.author_application && (
                            <div className="mt-3 text-sm">
                              <span className="text-gray-600">First Book:</span>
                              <span className="ml-2">{author.author_application.book_title}</span>
                            </div>
                          )}
                        </div>

                        <div className="ml-6">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/author-profile/${author.id}`)}
                          >
                            View Profile
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedApplication && (
        <Modal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          title={`${reviewAction === 'approve' ? 'Approve' : 'Reject'} Application`}
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-medium">Application Summary</h4>
              <p><strong>Author:</strong> {selectedApplication.author_name}</p>
              <p><strong>Book:</strong> {selectedApplication.book_title}</p>
              <p><strong>Category:</strong> {selectedApplication.book_category}</p>
            </div>

            {reviewAction === 'reject' && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      ⚠️ Warning: Permanent Action
                    </h3>
                    <p className="mt-1 text-sm text-red-700">
                      Rejecting this application will <strong>permanently ban</strong> this user from applying as an author again. 
                      They will only be able to purchase and read books. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {reviewAction === 'approve' ? 'Approval Message (Optional)' : 'Rejection Reason * (Required for permanent ban)'}
              </label>
              <textarea
                rows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={
                  reviewAction === 'approve' 
                    ? 'Welcome message or additional instructions...'
                    : 'Please provide a clear reason for rejection. This will be shown to the user and recorded permanently.'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                required={reviewAction === 'reject'}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowReviewModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant={reviewAction === 'approve' ? 'success' : 'error'}
                onClick={submitReview}
                loading={submitting}
                disabled={submitting || (reviewAction === 'reject' && !feedback.trim())}
              >
                {reviewAction === 'approve' ? 'Approve Application' : 'Reject & Ban Permanently'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}