'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import FileUpload from '@/components/ui/FileUpload'
import Card from '@/components/ui/Card'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import type { AuthorApplication } from '@/types'

interface ManuscriptUploadData {
  cover_file: File | null
  manuscript_file: File | null
  additional_notes?: string
}

function FirstManuscriptUploadContent() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const applicationId = searchParams.get('applicationId')

  const [application, setApplication] = useState<AuthorApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadData, setUploadData] = useState<ManuscriptUploadData>({
    cover_file: null,
    manuscript_file: null,
    additional_notes: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadingFiles, setUploadingFiles] = useState({
    cover: false,
    manuscript: false
  })
  const [uploadedUrls, setUploadedUrls] = useState({
    cover_url: '',
    manuscript_url: ''
  })

  useEffect(() => {
    if (applicationId) {
      fetchApplication()
    } else {
      setLoading(false)
    }
  }, [applicationId])

  const fetchApplication = async () => {
    try {
      const response = await fetch(`/api/author-applications/${applicationId}`)
      if (response.ok) {
        const result = await response.json()
        setApplication(result.data)
        
        if (result.data.status !== 'approved') {
          router.push('/profile')
          return
        }
      } else {
        throw new Error('Application not found')
      }
    } catch (error) {
      console.error('Failed to fetch application:', error)
      router.push('/profile')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File, type: 'cover' | 'manuscript') => {
    setUploadingFiles(prev => ({ ...prev, [type]: true }))
    
    try {
      // Use the manuscript-specific upload endpoint
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('type', type)

      const response = await fetch('/api/manuscripts/upload', {
        method: 'POST',
        body: uploadFormData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload file')
      }

      const result = await response.json()
      
      setUploadedUrls(prev => ({
        ...prev,
        [`${type}_url`]: result.data.url
      }))

      setUploadData(prev => ({
        ...prev,
        [`${type}_file`]: file
      }))
      
      // Clear any errors for this field
      if (errors[`${type}_file`]) {
        setErrors(prev => ({ ...prev, [`${type}_file`]: '' }))
      }

    } catch (error) {
      console.error(`${type} file upload error:`, error)
      setErrors(prev => ({
        ...prev,
        [`${type}_file`]: error instanceof Error ? error.message : 'Failed to upload file'
      }))
    } finally {
      setUploadingFiles(prev => ({ ...prev, [type]: false }))
    }
  }

  const handleFileRemove = (type: 'cover' | 'manuscript') => {
    setUploadData(prev => ({
      ...prev,
      [`${type}_file`]: null
    }))
    setUploadedUrls(prev => ({
      ...prev,
      [`${type}_url`]: ''
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!uploadData.cover_file || !uploadedUrls.cover_url) {
      newErrors.cover_file = 'Cover image is required'
    }

    if (!uploadData.manuscript_file || !uploadedUrls.manuscript_url) {
      newErrors.manuscript_file = 'Manuscript file is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !application) {
      return
    }

    setSubmitting(true)

    try {
      // Create manuscript from the approved application using Supabase client
      const { error: insertError } = await supabase
        .from('manuscripts')
        .insert({
          author_id: user!.id,
          title: application.book_title,
          description: application.book_synopsis,
          category: application.book_category,
          tags: application.book_tags,
          suggested_price: application.preferred_price,
          wants_physical: false, // Default for first submission
          cover_image_url: uploadedUrls.cover_url,
          file_url: uploadedUrls.manuscript_url,
          status: 'submitted'
        })

      if (insertError) {
        throw insertError
      }

      // Success! Redirect to author dashboard
      router.push('/author?firstSubmission=true')
      router.refresh()

    } catch (error) {
      console.error('Manuscript submission error:', error)
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to submit manuscript'
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!user || profile?.role !== 'author') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-4">
            This page is only accessible to approved authors.
          </p>
          <Button onClick={() => router.push('/profile')}>
            Go to Profile
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application details...</p>
        </div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">
            Application Not Found
          </h1>
          <p className="text-gray-600 mb-4">
            Could not find your author application.
          </p>
          <Button onClick={() => router.push('/profile')}>
            Go to Profile
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Upload Your First Manuscript
          </h1>
          <p className="text-gray-600 mt-2">
            Congratulations on being approved as an author! Now upload the manuscript 
            files for &quot;{application.book_title}&quot; that you pitched in your application.
          </p>
        </div>

        <Card className="p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Book Details from Your Application
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div><strong>Title:</strong> {application.book_title}</div>
              <div><strong>Category:</strong> {application.book_category}</div>
              <div><strong>Tags:</strong> {application.book_tags.join(', ')}</div>
              {application.preferred_price && (
                <div><strong>Suggested Price:</strong> ${application.preferred_price}</div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Upload Files
              </h3>
              
              <FileUpload
                label="Book Cover Image *"
                accept="image/*"
                onFileSelect={(file) => handleFileUpload(file, 'cover')}
                onFileRemove={() => handleFileRemove('cover')}
                value={uploadData.cover_file}
                disabled={uploadingFiles.cover}
                error={errors.cover_file}
                helperText="Upload an attractive cover image for your book (JPG, PNG, etc.)"
              />

              <FileUpload
                label="Manuscript File *"
                accept=".docx,.doc,.pdf"
                maxSize={50 * 1024 * 1024} // 50MB
                onFileSelect={(file) => handleFileUpload(file, 'manuscript')}
                onFileRemove={() => handleFileRemove('manuscript')}
                value={uploadData.manuscript_file}
                disabled={uploadingFiles.manuscript}
                error={errors.manuscript_file}
                helperText="Upload your complete manuscript (DOCX, DOC, or PDF format, max 50MB)"
              />
            </div>

            <div>
              <label htmlFor="additional_notes" className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes (Optional)
              </label>
              <textarea
                id="additional_notes"
                name="additional_notes"
                rows={4}
                value={uploadData.additional_notes}
                onChange={(e) => setUploadData(prev => ({ ...prev, additional_notes: e.target.value }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Any additional notes or changes since your original pitch..."
              />
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {errors.submit}
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/profile')}
                disabled={submitting || uploadingFiles.cover || uploadingFiles.manuscript}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={submitting}
                disabled={submitting || uploadingFiles.cover || uploadingFiles.manuscript}
              >
                Submit Manuscript
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default function FirstManuscriptUploadPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }>
        <FirstManuscriptUploadContent />
      </Suspense>
    </ErrorBoundary>
  )
}