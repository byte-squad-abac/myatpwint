'use client'

import { useState, useEffect, useCallback } from 'react'

interface ChatMessage {
  id: string
  manuscript_id: string
  chat_type: string
  message: string
  sender_id: string
  sender_role: string
  created_at: string
  sender?: {
    id: string
    name: string
    role: string
  }
}

interface UseChatMessagesReturn {
  messages: ChatMessage[]
  loading: boolean
  error: string | null
  sendMessage: (message: string) => Promise<void>
  loadMoreMessages: () => Promise<void>
  hasMore: boolean
  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
}

export function useChatMessages(
  manuscriptId: string,
  chatType: string | null,
  enabled: boolean
): UseChatMessagesReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [oldestMessageTime, setOldestMessageTime] = useState<string | null>(null)

  // Fetch initial messages
  const fetchMessages = useCallback(async (before?: string) => {
    if (!enabled || !chatType) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        chat_type: chatType,
        limit: '20'
      })
      
      if (before) {
        params.append('before', before)
      }

      const response = await fetch(`/api/manuscripts/${manuscriptId}/chat?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (before) {
        // Loading older messages - prepend to existing (reverse to get oldest first)
        setMessages(prev => [...data.messages.reverse(), ...prev])
      } else {
        // Initial load or refresh - replace all (reverse to get chronological order: oldest first)
        setMessages(data.messages.reverse())
      }
      
      // Update pagination state
      if (data.messages.length < 20) {
        setHasMore(false)
      }
      
      if (data.messages.length > 0) {
        const oldest = data.messages[data.messages.length - 1]
        setOldestMessageTime(oldest.created_at)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages')
    } finally {
      setLoading(false)
    }
  }, [manuscriptId, chatType, enabled])

  // Load initial messages
  useEffect(() => {
    if (enabled && chatType) {
      fetchMessages()
    }
  }, [fetchMessages, enabled, chatType])

  // Send new message
  const sendMessage = useCallback(async (messageText: string) => {
    if (!enabled || !chatType) return

    try {
      const response = await fetch(`/api/manuscripts/${manuscriptId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          chat_type: chatType,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Add new message to the end of the list
      setMessages(prev => [...prev, data.message])
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      throw err // Re-throw so the UI can handle it
    }
  }, [manuscriptId, chatType, enabled])

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || loading || !oldestMessageTime) return
    
    await fetchMessages(oldestMessageTime)
  }, [fetchMessages, hasMore, loading, oldestMessageTime])

  // Add a new message (for real-time updates)
  const addMessage = useCallback((newMessage: ChatMessage) => {
    setMessages(prev => {
      // Check if message already exists to avoid duplicates
      const exists = prev.some(msg => msg.id === newMessage.id)
      if (exists) return prev
      
      // Add new message at the end (newest messages are at the bottom)
      return [...prev, newMessage]
    })
  }, [])

  return {
    messages,
    loading,
    error,
    sendMessage,
    loadMoreMessages,
    hasMore,
    setMessages,
    addMessage
  }
}