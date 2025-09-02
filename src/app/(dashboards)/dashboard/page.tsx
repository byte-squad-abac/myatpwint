'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

export default function DashboardRedirect() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login')
        return
      }

      // Redirect to appropriate dashboard based on user role
      switch (profile?.role) {
        case 'author':
          router.push('/author')
          break
        case 'editor':
          router.push('/editor')
          break
        case 'publisher':
          router.push('/publisher')
          break
        default:
          router.push('/books')
          break
      }
    }
  }, [user, profile, loading, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  )
}