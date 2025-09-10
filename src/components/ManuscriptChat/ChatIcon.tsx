'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface ChatIconProps {
  manuscriptId: string
  manuscriptStatus: string
  authorId: string
  editorId?: string | null
  publisherId?: string | null
  onClick: () => void
  className?: string
}

export function ChatIcon({
  manuscriptId,
  manuscriptStatus,
  authorId,
  editorId,
  publisherId,
  onClick,
  className = ''
}: ChatIconProps) {
  const { user, profile } = useAuth()
  const [isVisible, setIsVisible] = useState(false)

  // Determine if chat is available and what type
  const getChatInfo = () => {
    if (!user || !profile) return { available: false, chatType: null }

    if (['submitted', 'under_review', 'rejected'].includes(manuscriptStatus)) {
      // Author-Editor chat
      const canChat = (profile.role === 'author' && user.id === authorId) ||
                     (profile.role === 'editor' && user.id === editorId)
      return { available: canChat, chatType: 'author_editor' }
    } else if (['approved', 'published'].includes(manuscriptStatus)) {
      // Author-Publisher chat
      const canChat = (profile.role === 'author' && user.id === authorId) ||
                     (profile.role === 'publisher' && user.id === publisherId)
      return { available: canChat, chatType: 'author_publisher' }
    }

    return { available: false, chatType: null }
  }

  const { available, chatType } = getChatInfo()

  // Check if chat is available
  useEffect(() => {
    if (!available) {
      setIsVisible(false)
      return
    }

    setIsVisible(true)
  }, [available])

  if (!isVisible) return null

  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center justify-center p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors duration-200 ${className}`}
      title="Open chat"
    >
      {/* Chat Icon SVG */}
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>

    </button>
  )
}