'use client'

import { useState, KeyboardEvent } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSendMessage, disabled = false, placeholder = "Type your message..." }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage || sending) return

    setSending(true)
    try {
      await onSendMessage(trimmedMessage)
      setMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
      // Error is handled by the parent component
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || sending}
          className="w-full"
          maxLength={1000}
        />
      </div>
      <Button
        onClick={handleSend}
        disabled={!message.trim() || disabled || sending}
        className="px-6"
      >
        {sending ? 'Sending...' : 'Send'}
      </Button>
    </div>
  )
}