'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'

interface ChatIconProps {
  manuscriptId: string
  manuscriptStatus: string
  authorId: string
  editorId?: string | null
  publisherId?: string | null
  onClick: () => void
  className?: string
  onChatOpen?: () => void // Callback when chat is opened
}

export function ChatIcon({
  manuscriptId,
  manuscriptStatus,
  authorId,
  editorId,
  publisherId,
  onClick,
  className = '',
  onChatOpen
}: ChatIconProps) {
  const { user, profile } = useAuth()
  const [isVisible, setIsVisible] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

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

  // Check if chat is available and fetch unread count
  useEffect(() => {
    if (!available || !chatType) {
      setIsVisible(false)
      setUnreadCount(0)
      return
    }

    setIsVisible(true)
    
    // Fetch unread count
    const fetchUnreadCount = async () => {
      try {
        const params = new URLSearchParams({ chat_type: chatType })
        const response = await fetch(`/api/manuscripts/${manuscriptId}/chat/unread-count?${params}`)
        
        if (response.ok) {
          const data = await response.json()
          setUnreadCount(data.unreadCount || 0)
        }
      } catch (err) {
        console.error('Failed to fetch unread count:', err)
      }
    }

    fetchUnreadCount()
    
    // Set up real-time subscription for read status changes
    const channel = supabase
      .channel(`chat_icon_${manuscriptId}_${chatType}_${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_read_status',
        filter: `manuscript_id=eq.${manuscriptId}`
      }, () => {
        fetchUnreadCount()
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'manuscript_chats',
        filter: `manuscript_id=eq.${manuscriptId}`
      }, (payload) => {
        if (payload.new.chat_type === chatType) {
          fetchUnreadCount()
        }
      })
      .subscribe()
    
    // Poll for updates every 30 seconds as backup
    const interval = setInterval(fetchUnreadCount, 30000)
    
    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [available, chatType, manuscriptId])

  if (!isVisible) return null

  return (
    <button
      onClick={() => {
        onClick()
        // Clear unread count immediately when chat is opened
        setUnreadCount(0)
        if (onChatOpen) onChatOpen()
      }}
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

      {/* Unread Count Badge */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}