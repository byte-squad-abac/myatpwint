'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/books')
  }, [router])
  return (
    <div className="flex flex-1 items-center justify-center bg-app">
      <div className="relative">
        <div className="w-16 h-16 sm:w-24 sm:h-24 border-4 border-app rounded-full" />
        <div className="absolute inset-0 w-16 h-16 sm:w-24 sm:h-24 border-4 border-t-[var(--app-accent)] rounded-full animate-spin" />
      </div>
    </div>
  )
}
