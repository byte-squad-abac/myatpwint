'use client'

import React from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import type { AuthorApplication } from '@/types'
import { APPLICATION_STATUSES } from '@/types'

interface ApplicationStatusProps {
  application: AuthorApplication | null
  loading?: boolean
  onResubmit?: () => void
  userRole?: string
  userProfile?: {
    banned_from_applying?: boolean
    ban_reason?: string | null
    banned_at?: string | null
  }
}

const STATUS_CONFIG = {
  [APPLICATION_STATUSES.PENDING]: {
    title: 'Application Under Review',
    description: 'Your author application is being reviewed by our publishers.',
    color: 'yellow',
    icon: '⏳'
  },
  [APPLICATION_STATUSES.APPROVED]: {
    title: 'Application Approved!',
    description: 'Congratulations! You are now an approved author.',
    color: 'green',
    icon: '✅'
  },
  [APPLICATION_STATUSES.REJECTED]: {
    title: 'Application Permanently Rejected',
    description: 'Your application was rejected and your account has been permanently banned from future applications.',
    color: 'red',
    icon: '🚫'
  }
} as const

export default function ApplicationStatus({ 
  application, 
  loading = false,
  onResubmit,
  userRole,
  userProfile
}: ApplicationStatusProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    )
  }

  if (!application) {
    // Check if user is banned from applying
    if (userProfile?.banned_from_applying) {
      return (
        <div className="bg-red-50 border-red-200 rounded-lg border p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">🚫</div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Account Banned from Author Applications
            </h3>
            <p className="text-red-700 mb-4">
              Your account has been permanently banned from applying as an author.
            </p>
            {userProfile.ban_reason && (
              <div className="bg-red-100 rounded-md p-3 mb-4">
                <p className="text-sm text-red-800">
                  <strong>Reason:</strong> {userProfile.ban_reason}
                </p>
              </div>
            )}
            <p className="text-red-600 text-sm">
              You can continue to purchase and read books, but cannot apply as an author.
            </p>
          </div>
        </div>
      )
    }

    // Check if user is already an author (existing author without application)
    if (userRole === 'author') {
      return (
        <div className="bg-green-50 border-green-200 rounded-lg border p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">👨‍💼</div>
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              Existing Author Account
            </h3>
            <p className="text-green-700 mb-4">
              You are already registered as an author and can submit manuscripts directly.
            </p>
            <Link href="/author">
              <Button variant="primary">Go to Author Dashboard</Button>
            </Link>
          </div>
        </div>
      )
    }

    // Regular user without application
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">✍️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Ready to Become an Author?
          </h3>
          <p className="text-gray-600 mb-4">
            Submit your author application along with your first book pitch to get started.
          </p>
          <Link href="/apply-as-author">
            <Button>Apply as Author</Button>
          </Link>
        </div>
      </div>
    )
  }

  const status = STATUS_CONFIG[application.status]
  const colorClasses = {
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      button: 'bg-yellow-100 hover:bg-yellow-200'
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200', 
      text: 'text-green-800',
      button: 'bg-green-100 hover:bg-green-200'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      button: 'bg-red-100 hover:bg-red-200'
    }
  }

  const colors = colorClasses[status.color]

  return (
    <div className={`rounded-lg border p-6 ${colors.bg} ${colors.border}`}>
      <div className="flex items-start space-x-4">
        <div className="text-2xl">{status.icon}</div>
        <div className="flex-1">
          <h3 className={`text-lg font-semibold mb-1 ${colors.text}`}>
            {status.title}
          </h3>
          <p className={`text-sm mb-4 ${colors.text} opacity-90`}>
            {status.description}
          </p>

          <div className="text-sm space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Submitted:</span>
              <span className="font-medium">
                {new Date(application.created_at).toLocaleDateString()}
              </span>
            </div>
            
            {application.submission_count > 1 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Resubmissions:</span>
                <span className="font-medium">{application.submission_count - 1}</span>
              </div>
            )}
            
            {application.reviewed_at && (
              <div className="flex justify-between">
                <span className="text-gray-600">Reviewed:</span>
                <span className="font-medium">
                  {new Date(application.reviewed_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {application.publisher_feedback && (
            <div className="bg-white bg-opacity-50 rounded-md p-3 mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                Publisher Feedback:
              </h4>
              <p className="text-sm text-gray-700">{application.publisher_feedback}</p>
            </div>
          )}

          <div className="flex space-x-3">
            {application.status === APPLICATION_STATUSES.APPROVED && (
              <Link href={`/first-manuscript-upload?applicationId=${application.id}`}>
                <Button variant="primary" size="sm">
                  Upload First Manuscript
                </Button>
              </Link>
            )}
            
            {application.status === APPLICATION_STATUSES.REJECTED && (
              <div className="bg-red-100 rounded-md p-3 text-center">
                <p className="text-sm text-red-800 font-medium">
                  Account permanently banned from future applications
                </p>
                <p className="text-xs text-red-600 mt-1">
                  You can continue to purchase and read books
                </p>
              </div>
            )}
            
            <Link href="/author-application/view">
              <Button 
                variant="outline" 
                size="sm"
                className={colors.button}
              >
                View Details
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}