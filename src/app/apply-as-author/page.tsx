'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import ApplicationForm from '@/components/AuthorApplication/ApplicationForm'
import type { AuthorApplicationFormData } from '@/types'

export default function ApplyAsAuthorPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [hasExistingApplication, setHasExistingApplication] = useState(false)
  const [checkingExisting, setCheckingExisting] = useState(true)

  useEffect(() => {
    if (user) {
      checkExistingApplication()
    }
  }, [user])

  const checkExistingApplication = async () => {
    try {
      const response = await fetch('/api/author-applications')
      if (response.ok) {
        const data = await response.json()
        if (data.data && data.data.length > 0) {
          setHasExistingApplication(true)
        }
      }
    } catch (error) {
      console.error('Failed to check existing application:', error)
    } finally {
      setCheckingExisting(false)
    }
  }

  const handleSubmit = async (formData: AuthorApplicationFormData) => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/author-applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit application')
      }

      // Success! Redirect to profile page
      router.push('/profile?submitted=true')
      router.refresh()
      
    } catch (error) {
      console.error('Failed to submit application:', error)
      throw error // Let ApplicationForm handle the error display
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Please Log In
          </h1>
          <p className="text-gray-600 mb-6">
            You need to be logged in to submit an author application.
          </p>
          <div className="space-x-4">
            <button
              onClick={() => router.push('/login')}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Log In
            </button>
            <button
              onClick={() => router.push('/register')}
              className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (checkingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking your application status...</p>
        </div>
      </div>
    )
  }

  if (hasExistingApplication) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="text-4xl mb-4">📝</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Application Already Submitted
          </h1>
          <p className="text-gray-600 mb-6">
            You have already submitted an author application. You can check its status 
            and manage it from your profile page.
          </p>
          <button
            onClick={() => router.push('/profile')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Go to Profile
          </button>
        </div>
      </div>
    )
  }

  if (profile?.role === 'author') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            You&apos;re Already an Author!
          </h1>
          <p className="text-gray-600 mb-6">
            Your author application has been approved. You can start submitting 
            manuscripts through your author dashboard.
          </p>
          <div className="space-x-4">
            <button
              onClick={() => router.push('/author')}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Author Dashboard
            </button>
            <button
              onClick={() => router.push('/manuscript-editor')}
              className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
            >
              Submit Manuscript
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <ApplicationForm 
        onSubmit={handleSubmit}
        loading={loading}
      />
    </div>
  )
}