'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { useChatMessages } from './hooks/useChatMessages'
import { useChatRealtime } from './hooks/useChatRealtime'

interface ChatModalProps {
  isOpen: boolean
  onClose: () => void
  manuscriptId: string
  manuscriptStatus: string
  manuscriptTitle: string
  authorId: string
  editorId?: string | null
  publisherId?: string | null
}

export function ChatModal({
  isOpen,
  onClose,
  manuscriptId,
  manuscriptStatus,
  manuscriptTitle,
  authorId,
  editorId,
  publisherId
}: ChatModalProps) {
  const { user, profile } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Determine chat type based on manuscript status and user role
  const getChatType = () => {
    if (['submitted', 'under_review', 'rejected'].includes(manuscriptStatus)) {
      return 'author_editor'
    } else if (['approved', 'published'].includes(manuscriptStatus)) {
      return 'author_publisher'
    }
    return null
  }

  const chatType = getChatType()
  
  // Check if user can participate
  const canParticipate = () => {
    if (!chatType || !user || !profile) return false
    
    if (chatType === 'author_editor') {
      return (profile.role === 'author' && user.id === authorId) ||
             (profile.role === 'editor' && user.id === editorId)
    } else if (chatType === 'author_publisher') {
      return (profile.role === 'author' && user.id === authorId) ||
             (profile.role === 'publisher' && user.id === publisherId)
    }
    return false
  }

  const canChat = canParticipate()

  // Custom hooks for chat functionality
  const {
    messages,
    loading,
    error,
    sendMessage,
    loadMoreMessages,
    hasMore,
    addMessage
  } = useChatMessages(manuscriptId, chatType, canChat)

  // Set up real-time message receiving (without notifications)
  useChatRealtime(
    manuscriptId,
    chatType,
    canChat,
    messages,
    addMessage
  )

  // Mark messages as read when messages are loaded and visible
  useEffect(() => {
    if (isOpen && canChat && chatType && messages.length > 0) {
      const markAsRead = async () => {
        try {
          // Get the latest message ID to mark as read up to that point
          const latestMessage = messages[messages.length - 1]
          
          await fetch(`/api/manuscripts/${manuscriptId}/chat/mark-read`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_type: chatType,
              last_message_id: latestMessage.id
            }),
          })
        } catch (err) {
          console.error('Failed to mark messages as read:', err)
        }
      }
      
      // Mark as read after a short delay to ensure messages are visible
      const timeout = setTimeout(markAsRead, 500)
      return () => clearTimeout(timeout)
    }
  }, [isOpen, canChat, chatType, messages, manuscriptId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])


  if (!canChat) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Chat Not Available">
        <div className="p-6 text-center">
          <p className="text-gray-600">
            Chat is not available for this manuscript at this time.
          </p>
          <div className="mt-4 text-sm text-gray-500">
            <p>Chat is available when:</p>
            <ul className="mt-2 space-y-1">
              <li>• Author ↔ Editor: During submitted/under_review/rejected status</li>
              <li>• Author ↔ Publisher: During approved/published status</li>
            </ul>
          </div>
          <Button onClick={onClose} className="mt-4">
            Close
          </Button>
        </div>
      </Modal>
    )
  }

  const getChatTitle = () => {
    if (chatType === 'author_editor') {
      return 'Chat with Editor'
    } else if (chatType === 'author_publisher') {
      return 'Chat with Publisher'
    }
    return 'Chat'
  }

  const getParticipantInfo = () => {
    if (chatType === 'author_editor') {
      return profile?.role === 'author' ? 'Discussing with your editor' : 'Discussing with author'
    } else if (chatType === 'author_publisher') {
      return profile?.role === 'author' ? 'Discussing publication details' : 'Discussing with author'
    }
    return ''
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={getChatTitle()}
      size="lg"
    >
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        <div className="border-b p-4">
          <h3 className="font-medium text-gray-900">{manuscriptTitle}</h3>
          <p className="text-sm text-gray-600 mt-1">{getParticipantInfo()}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
              {chatType?.replace('_', ' → ')}
            </span>
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
              Status: {manuscriptStatus}
            </span>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {error && (
            <div className="text-center text-red-600 p-4">
              Error loading messages: {error}
            </div>
          )}
          
          {loading && messages.length === 0 && (
            <div className="text-center text-gray-500 p-4">
              Loading messages...
            </div>
          )}

          {hasMore && (
            <div className="text-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadMoreMessages}
                disabled={loading}
              >
                Load earlier messages
              </Button>
            </div>
          )}

          {messages.length === 0 && !loading && (
            <div className="text-center text-gray-500 p-8">
              <p>No messages yet.</p>
              <p className="text-sm mt-1">Start the conversation!</p>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessage 
              key={message.id}
              message={message}
              isOwnMessage={message.sender_id === user?.id}
            />
          ))}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="border-t p-4">
          <ChatInput
            onSendMessage={sendMessage}
            disabled={loading}
            placeholder="Type your message..."
          />
        </div>
      </div>
    </Modal>
  )
}