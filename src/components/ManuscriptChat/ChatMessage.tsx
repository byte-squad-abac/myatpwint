'use client'

import { formatDistance } from 'date-fns'

interface ChatMessageProps {
  message: {
    id: string
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
  isOwnMessage: boolean
}

export function ChatMessage({ message, isOwnMessage }: ChatMessageProps) {
  const getSenderName = () => {
    if (isOwnMessage) return 'You'
    return message.sender?.name || 'Unknown User'
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'author':
        return 'text-green-600'
      case 'editor':
        return 'text-blue-600'
      case 'publisher':
        return 'text-purple-600'
      default:
        return 'text-gray-600'
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'author':
        return 'bg-green-100 text-green-700'
      case 'editor':
        return 'bg-blue-100 text-blue-700'
      case 'publisher':
        return 'bg-purple-100 text-purple-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const formatTime = (timestamp: string) => {
    return formatDistance(new Date(timestamp), new Date(), { addSuffix: true })
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
        <div className="flex items-center gap-2 mb-1">
          {!isOwnMessage && (
            <>
              <span className={`text-sm font-medium ${getRoleColor(message.sender_role)}`}>
                {getSenderName()}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadge(message.sender_role)}`}>
                {message.sender_role}
              </span>
            </>
          )}
          <span className="text-xs text-gray-500 ml-auto">
            {formatTime(message.created_at)}
          </span>
        </div>
        
        <div
          className={`rounded-lg px-4 py-2 ${
            isOwnMessage
              ? 'bg-blue-500 text-white ml-4'
              : 'bg-white border border-gray-200 text-gray-900 mr-4'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.message}
          </p>
        </div>
      </div>
    </div>
  )
}