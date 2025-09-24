'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to books page as the main landing page
    router.replace('/books')
  }, [router])

  // Show minimal loading while redirecting
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="relative">
        <div className="w-24 h-24 border-4 border-white/10 rounded-full"></div>
        <div className="absolute inset-0 w-24 h-24 border-4 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    </div>
  )
}