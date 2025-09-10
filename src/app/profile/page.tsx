'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import ApplicationStatus from '@/components/AuthorApplication/ApplicationStatus'
import ApplicationForm from '@/components/AuthorApplication/ApplicationForm'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import type { AuthorApplication, AuthorApplicationFormData } from '@/types'

export default function ProfilePage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [application, setApplication] = useState<AuthorApplication | null>(null)
  const [userProfile, setUserProfile] = useState<{
    banned_from_applying?: boolean
    ban_reason?: string | null
    banned_at?: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showResubmitForm, setShowResubmitForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchApplication = useCallback(async () => {
    try {
      console.log('Fetching user application...')
      const response = await fetch('/api/author-applications')
      console.log('User application fetch response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('User application fetch result:', data)
        
        if (data.data && data.data.length > 0) {
          setApplication(data.data[0]) // Get the user's application
          console.log('Set application:', data.data[0])
        } else {
          console.log('No application found for user')
        }
      } else {
        const errorData = await response.json()
        console.error('User application fetch failed:', response.status, errorData)
      }
    } catch (error) {
      console.error('Failed to fetch application:', error)
      setApplication(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUserProfile = useCallback(async () => {
    if (!user) return
    
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('banned_from_applying, ban_reason, banned_at')
        .eq('id', user.id)
        .single()
      
      setUserProfile(profileData)
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      Promise.all([fetchApplication(), fetchUserProfile()])
    }
  }, [user, fetchApplication, fetchUserProfile])



  const handleResubmitSubmit = async (formData: AuthorApplicationFormData) => {
    if (!application) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/author-applications/${application.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update application')
      }

      const result = await response.json()
      setApplication(result.data)
      setShowResubmitForm(false)
      
      // Show success message or handle success state
      alert('Application resubmitted successfully!')
      
    } catch (error) {
      console.error('Failed to resubmit application:', error)
      alert(error instanceof Error ? error.message : 'Failed to resubmit application')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelResubmit = () => {
    setShowResubmitForm(false)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">Please log in</h1>
          <Button onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  if (showResubmitForm && application) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <ApplicationForm
          mode="edit"
          initialData={{
            legal_name: application.legal_name,
            author_name: application.author_name,
            association_name: application.association_name || '',
            membership_id: application.membership_id || '',
            association_proof_url: application.association_proof_url || '',
            why_publish_with_us: application.why_publish_with_us,
            book_title: application.book_title,
            book_synopsis: application.book_synopsis,
            book_tags: application.book_tags,
            book_category: application.book_category,
            preferred_price: application.preferred_price
          }}
          onSubmit={handleResubmitSubmit}
          loading={submitting}
        />
        <div className="max-w-4xl mx-auto px-6 mt-4">
          <Button 
            variant="secondary" 
            onClick={handleCancelResubmit}
            disabled={submitting}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
            <p className="text-gray-600 mt-2">
              Manage your account and author application status
            </p>
          </div>

          <div className="space-y-6">
            {/* User Profile Information */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Account Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <p className="text-gray-900">{profile?.name || 'Not provided'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <p className="text-gray-900">{profile?.email || user.email}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Type
                  </label>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    {profile?.role || 'user'}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Member Since
                  </label>
                  <p className="text-gray-900">
                    {profile?.created_at 
                      ? new Date(profile.created_at).toLocaleDateString()
                      : 'Unknown'
                    }
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <Button variant="outline" size="sm">
                  Edit Profile
                </Button>
              </div>
            </Card>

            {/* Author Application Status */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Author Status
              </h2>
              <ApplicationStatus
                application={application}
                loading={loading}
                userRole={profile?.role}
                userProfile={userProfile || undefined}
              />
            </div>

            {/* Additional sections can go here */}
            {profile?.role === 'author' && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Author Dashboard
                </h2>
                <p className="text-gray-600 mb-4">
                  Quick access to your author tools and submissions.
                </p>
                <div className="flex space-x-4">
                  <Button 
                    onClick={() => router.push('/author')}
                    variant="primary"
                  >
                    Go to Author Dashboard
                  </Button>
                  <Button 
                    onClick={() => router.push('/manuscript-editor')}
                    variant="outline"
                  >
                    Submit New Manuscript
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}