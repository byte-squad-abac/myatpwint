# Complete Implementation Plan: Real-time Manuscript Chat System

## Phase 1: Database Schema Design

### 1.1 Core Chat Tables

```sql
-- Migration: 001_create_manuscript_chat_system.sql

-- Main chat messages table
CREATE TABLE manuscript_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  manuscript_id UUID REFERENCES manuscripts(id) ON DELETE CASCADE NOT NULL,
  chat_type TEXT CHECK (chat_type IN ('author_editor', 'author_publisher')) NOT NULL,
  message TEXT NOT NULL,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  sender_role TEXT CHECK (sender_role IN ('author', 'editor', 'publisher')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
on
-- Simple read tracking table
CREATE TABLE manuscript_chat_read_status (
  manuscript_id UUID REFERENCES manuscripts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  chat_type TEXT CHECK (chat_type IN ('author_editor', 'author_publisher')) NOT NULL,
  last_read_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (manuscript_id, user_id, chat_type)
);

-- Performance indexes
CREATE INDEX idx_manuscript_chats_manuscript_id ON manuscript_chats(manuscript_id);
CREATE INDEX idx_manuscript_chats_created_at ON manuscript_chats(created_at DESC);
CREATE INDEX idx_manuscript_chats_sender_id ON manuscript_chats(sender_id);
```

### 1.2 Database Functions

```sql
-- Migration: 002_chat_functions.sql

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_chat_count(
  p_user_id UUID,
  p_manuscript_id UUID,
  p_chat_type TEXT
)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM manuscript_chats mc
  LEFT JOIN manuscript_chat_read_status mcrs ON (
    mcrs.manuscript_id = mc.manuscript_id 
    AND mcrs.user_id = p_user_id 
    AND mcrs.chat_type = mc.chat_type
  )
  WHERE mc.manuscript_id = p_manuscript_id
    AND mc.sender_id != p_user_id
    AND mc.chat_type = p_chat_type
    AND (mcrs.last_read_at IS NULL OR mc.created_at > mcrs.last_read_at);
  
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_chat_messages_read(
  p_user_id UUID,
  p_manuscript_id UUID,
  p_chat_type TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO manuscript_chat_read_status (
    manuscript_id,
    user_id,
    chat_type,
    last_read_at
  )
  VALUES (p_manuscript_id, p_user_id, p_chat_type, NOW())
  ON CONFLICT (manuscript_id, user_id, chat_type)
  DO UPDATE SET last_read_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to determine chat availability
CREATE OR REPLACE FUNCTION get_chat_availability(
  p_manuscript_id UUID,
  p_user_id UUID
)
RETURNS TABLE(
  can_chat_author_editor BOOLEAN,
  can_chat_author_publisher BOOLEAN,
  user_role TEXT,
  manuscript_status TEXT
) AS $$
DECLARE
  v_user_role TEXT;
  v_manuscript_status TEXT;
  v_author_id UUID;
  v_editor_id UUID;
  v_publisher_id UUID;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role FROM profiles WHERE id = p_user_id;
  
  -- Get manuscript details
  SELECT status, author_id, editor_id, publisher_id
  INTO v_manuscript_status, v_author_id, v_editor_id, v_publisher_id
  FROM manuscripts
  WHERE id = p_manuscript_id;
  
  -- Determine chat availability
  RETURN QUERY
  SELECT
    -- Author-Editor chat: available for submitted, under_review, rejected statuses
    CASE WHEN v_manuscript_status IN ('submitted', 'under_review', 'rejected') THEN
      (v_user_role = 'author' AND p_user_id = v_author_id) OR 
      (v_user_role = 'editor' AND p_user_id = v_editor_id)
    ELSE false END,
    
    -- Author-Publisher chat: available for approved status
    CASE WHEN v_manuscript_status = 'approved' THEN
      (v_user_role = 'author' AND p_user_id = v_author_id) OR 
      (v_user_role = 'publisher' AND p_user_id = v_publisher_id)
    ELSE false END,
    
    v_user_role,
    v_manuscript_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 1.3 Row Level Security (RLS) Policies

```sql
-- Migration: 003_chat_rls_policies.sql

-- Enable RLS
ALTER TABLE manuscript_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuscript_chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuscript_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Chat messages policies
CREATE POLICY "Users can view chat messages they participate in" ON manuscript_chats
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM get_chat_availability(manuscript_id, auth.uid())
    WHERE can_chat_author_editor OR can_chat_author_publisher
  )
);

CREATE POLICY "Users can insert messages in chats they participate in" ON manuscript_chats
FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM get_chat_availability(manuscript_id, auth.uid())
    WHERE (chat_type = 'author_editor' AND can_chat_author_editor) OR
          (chat_type = 'author_publisher' AND can_chat_author_publisher)
  )
);

CREATE POLICY "Users can update their own messages" ON manuscript_chats
FOR UPDATE USING (sender_id = auth.uid());

-- Chat participants policies
CREATE POLICY "Users can view their own participation records" ON manuscript_chat_participants
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own participation records" ON manuscript_chat_participants
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can manage participation records" ON manuscript_chat_participants
FOR ALL USING (true) WITH CHECK (true);

-- Chat sessions policies
CREATE POLICY "Users can view chat sessions they participate in" ON manuscript_chat_sessions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM get_chat_availability(manuscript_id, auth.uid())
    WHERE can_chat_author_editor OR can_chat_author_publisher
  )
);
```

### 1.4 Realtime Setup

```sql
-- Migration: enable_realtime_chat

-- Enable realtime for chat tables using Supabase's built-in realtime
ALTER PUBLICATION supabase_realtime ADD TABLE manuscript_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE manuscript_chat_read_status;
```

**Note**: Using Supabase's built-in realtime functionality instead of custom triggers for simplicity. This provides automatic real-time updates for INSERT, UPDATE, and DELETE operations on the chat tables.

## Phase 2: API Routes Implementation

### 2.1 Chat Messages API

```typescript
// src/app/api/manuscripts/[id]/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Fetch chat messages
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const chatType = searchParams.get('chat_type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before') // For pagination

    // Check chat availability
    const { data: availability } = await supabase
      .rpc('get_chat_availability', {
        p_manuscript_id: params.id,
        p_user_id: user.id
      })
      .single()

    if (!availability || 
        !(availability.can_chat_author_editor || availability.can_chat_author_publisher)) {
      return NextResponse.json({ error: 'Chat not available' }, { status: 403 })
    }

    // Validate chat type
    const validChatType = chatType || 
      (availability.can_chat_author_editor ? 'author_editor' : 'author_publisher')

    let query = supabase
      .from('manuscript_chats')
      .select(`
        *,
        sender:profiles!manuscript_chats_sender_id_fkey(id, name, role),
        reply_to:manuscript_chats!manuscript_chats_reply_to_id_fkey(id, message, sender_id)
      `)
      .eq('manuscript_id', params.id)
      .eq('chat_type', validChatType)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data: messages, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      messages: messages?.reverse() || [],
      chatType: validChatType,
      hasMore: messages?.length === limit
    })

  } catch (error) {
    console.error('Chat fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Send new message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message, chatType, messageType = 'text', replyToId, metadata = {} } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check chat availability
    const { data: availability } = await supabase
      .rpc('get_chat_availability', {
        p_manuscript_id: params.id,
        p_user_id: user.id
      })
      .single()

    const canChat = chatType === 'author_editor' 
      ? availability?.can_chat_author_editor
      : availability?.can_chat_author_publisher

    if (!canChat) {
      return NextResponse.json({ error: 'Cannot send message in this chat' }, { status: 403 })
    }

    // Insert message
    const { data: newMessage, error } = await supabase
      .from('manuscript_chats')
      .insert({
        manuscript_id: params.id,
        chat_type: chatType,
        message: message.trim(),
        sender_id: user.id,
        sender_role: profile.role,
        message_type: messageType,
        reply_to_id: replyToId || null,
        metadata
      })
      .select(`
        *,
        sender:profiles!manuscript_chats_sender_id_fkey(id, name, role)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: newMessage })

  } catch (error) {
    console.error('Chat send error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### 2.2 Unread Count API

```typescript
// src/app/api/manuscripts/[id]/chat/unread-count/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const chatType = searchParams.get('chat_type')

    const { data: unreadCount, error } = await supabase
      .rpc('get_unread_chat_count', {
        p_user_id: user.id,
        p_manuscript_id: params.id,
        p_chat_type: chatType
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ unreadCount: unreadCount || 0 })

  } catch (error) {
    console.error('Unread count error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### 2.3 Mark as Read API

```typescript
// src/app/api/manuscripts/[id]/chat/mark-read/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { chatType, lastMessageId } = body

    const { error } = await supabase
      .rpc('mark_chat_messages_read', {
        p_user_id: user.id,
        p_manuscript_id: params.id,
        p_chat_type: chatType,
        p_last_message_id: lastMessageId
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Mark read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

## Phase 3: Frontend Components

### 3.1 Main Chat Component

```typescript
// src/components/ManuscriptChat/ChatModal.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ChatMessage } from './ChatMessage'
import { ChatHeader } from './ChatHeader'
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
  
  // Determine chat type based on manuscript status and user role
  const getChatType = () => {
    if (['submitted', 'under_review', 'rejected'].includes(manuscriptStatus)) {
      return 'author_editor'
    } else if (manuscriptStatus === 'approved') {
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

  const {
    messages,
    loading,
    hasMore,
    loadMoreMessages,
    sendMessage
  } = useChatMessages(manuscriptId, chatType, canParticipate())

  const { isConnected, typingUsers } = useChatRealtime(
    manuscriptId, 
    chatType, 
    canParticipate()
  )

  // Mark messages as read when modal opens
  useEffect(() => {
    if (isOpen && canParticipate() && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      markAsRead(lastMessage.id)
    }
  }, [isOpen, messages])

  const markAsRead = async (lastMessageId: string) => {
    try {
      await fetch(`/api/manuscripts/${manuscriptId}/chat/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatType,
          lastMessageId
        })
      })
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const handleSendMessage = async (message: string, replyToId?: string) => {
    if (!canParticipate()) return
    
    try {
      await sendMessage(message, replyToId)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  if (!isOpen) return null

  if (!canParticipate()) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Chat Unavailable">
        <div className="p-6 text-center">
          <div className="text-gray-500 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.4-.324c-.042-.009-.085-.02-.126-.032l-2.474.494a.75.75 0 01-.905-.905l.494-2.474c-.012-.041-.023-.084-.032-.126A8.955 8.955 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chat Not Available</h3>
          <p className="text-gray-500">
            {manuscriptStatus === 'published' 
              ? 'Chat is no longer available for published manuscripts.'
              : 'Chat will be available based on manuscript review status.'
            }
          </p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="lg"
      className="h-[600px] flex flex-col"
    >
      <ChatHeader
        chatType={chatType!}
        manuscriptTitle={manuscriptTitle}
        manuscriptStatus={manuscriptStatus}
        isConnected={isConnected}
        participantCount={2} // Author + Editor/Publisher
      />
      
      <div className="flex-1 flex flex-col min-h-0">
        <ChatMessages
          messages={messages}
          currentUserId={user?.id}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={loadMoreMessages}
          typingUsers={typingUsers}
        />
        
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={loading}
          placeholder={`Message ${chatType === 'author_editor' ? 'about manuscript review' : 'about publication terms'}...`}
        />
      </div>
    </Modal>
  )
}
```

### 3.2 Chat Message Component

```typescript
// src/components/ManuscriptChat/ChatMessage.tsx
'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Avatar } from '@/components/ui/Avatar'

interface ChatMessageProps {
  message: {
    id: string
    message: string
    sender_id: string
    sender_role: string
    created_at: string
    edited_at?: string
    message_type: string
    file_url?: string
    file_name?: string
    reply_to?: {
      id: string
      message: string
      sender_id: string
    }
    sender: {
      id: string
      name: string
      role: string
    }
  }
  currentUserId?: string
  onReply?: (messageId: string, message: string) => void
}

export function ChatMessage({ message, currentUserId, onReply }: ChatMessageProps) {
  const [showActions, setShowActions] = useState(false)
  const isOwnMessage = message.sender_id === currentUserId

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'author': return 'text-blue-600 bg-blue-50'
      case 'editor': return 'text-green-600 bg-green-50'
      case 'publisher': return 'text-purple-600 bg-purple-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'author': return '✍️'
      case 'editor': return '✏️'
      case 'publisher': return '📚'
      default: return '👤'
    }
  }

  return (
    <div 
      className={`flex gap-3 group hover:bg-gray-50 p-2 rounded-lg transition-colors ${
        isOwnMessage ? 'flex-row-reverse' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar 
        name={message.sender.name}
        size="sm"
        className="flex-shrink-0 mt-1"
      />
      
      <div className={`flex-1 min-w-0 ${isOwnMessage ? 'text-right' : ''}`}>
        {/* Sender info */}
        <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'justify-end' : ''}`}>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(message.sender_role)}`}>
            {getRoleIcon(message.sender_role)} {message.sender.name}
          </span>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
          {message.edited_at && (
            <span className="text-xs text-gray-400">(edited)</span>
          )}
        </div>

        {/* Message content */}
        <div className={`${isOwnMessage ? 'text-right' : ''}`}>
          <div className={`prose prose-sm max-w-none ${isOwnMessage ? 'text-right' : ''}`}>
            <p className="whitespace-pre-wrap break-words">{message.message}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### 3.3 Chat Input Component

```typescript
// src/components/ManuscriptChat/ChatInput.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = "Type your message..."
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  }, [message])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim() || sending || disabled) return

    setSending(true)
    try {
      await onSendMessage(message.trim())
      setMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="border-t bg-white p-4">

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || sending}
            rows={1}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none transition-colors"
          />
        </div>
        
        <Button
          type="submit"
          disabled={disabled || sending || !message.trim()}
          className="px-4 py-2 flex-shrink-0"
        >
          {sending ? (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </Button>
      </form>
      
      <div className="mt-2 text-xs text-gray-500">
        Press Enter to send, Shift + Enter for new line
      </div>
    </div>
  )
}
```

## Phase 4: Custom Hooks for Chat Logic

### 4.1 Chat Messages Hook

```typescript
// src/components/ManuscriptChat/hooks/useChatMessages.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

interface ChatMessage {
  id: string
  message: string
  sender_id: string
  sender_role: string
  created_at: string
  message_type: string
  sender: {
    id: string
    name: string
    role: string
  }
}

export function useChatMessages(
  manuscriptId: string,
  chatType: string | null,
  canParticipate: boolean
) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [oldestMessageDate, setOldestMessageDate] = useState<string | null>(null)

  const loadMessages = useCallback(async (before?: string) => {
    if (!canParticipate || !chatType) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        chat_type: chatType,
        limit: '30'
      })
      
      if (before) {
        params.append('before', before)
      }

      const response = await fetch(`/api/manuscripts/${manuscriptId}/chat?${params}`)
      const data = await response.json()

      if (response.ok) {
        if (before) {
          // Loading older messages
          setMessages(prev => [...data.messages, ...prev])
        } else {
          // Initial load
          setMessages(data.messages)
          if (data.messages.length > 0) {
            setOldestMessageDate(data.messages[0].created_at)
          }
        }
        setHasMore(data.hasMore)
      } else {
        console.error('Error loading messages:', data.error)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }, [manuscriptId, chatType, canParticipate])

  const loadMoreMessages = useCallback(() => {
    if (hasMore && !loading && oldestMessageDate) {
      loadMessages(oldestMessageDate)
    }
  }, [hasMore, loading, oldestMessageDate, loadMessages])

  const sendMessage = useCallback(async (message: string, replyToId?: string) => {
    if (!canParticipate || !chatType) return

    const response = await fetch(`/api/manuscripts/${manuscriptId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        chatType,
        replyToId
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to send message')
    }

    const data = await response.json()
    setMessages(prev => [...prev, data.message])
  }, [manuscriptId, chatType, canParticipate])

  // Initial load
  useEffect(() => {
    if (canParticipate && chatType) {
      loadMessages()
    }
  }, [canParticipate, chatType, loadMessages])

  return {
    messages,
    loading,
    hasMore,
    loadMoreMessages,
    sendMessage
  }
}
```

### 4.2 Realtime Chat Hook

```typescript
// src/components/ManuscriptChat/hooks/useChatRealtime.ts
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export function useChatRealtime(
  manuscriptId: string,
  chatType: string | null,
  canParticipate: boolean
) {
  const { user } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const channelRef = useRef<any>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!canParticipate || !chatType || !user) return

    const channel = supabase
      .channel(`manuscript_chat_${manuscriptId}_${chatType}`, {
        config: {
          presence: { key: user.id }
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState()
        setIsConnected(Object.keys(newState).length > 0)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined chat:', key)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left chat:', key)
        setTypingUsers(prev => prev.filter(userId => userId !== key))
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== user.id) {
          setTypingUsers(prev => {
            if (!prev.includes(payload.user_id)) {
              return [...prev, payload.user_id]
            }
            return prev
          })

          // Clear typing indicator after 3 seconds
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(id => id !== payload.user_id))
          }, 3000)
        }
      })
      .on('broadcast', { event: 'stop_typing' }, ({ payload }) => {
        setTypingUsers(prev => prev.filter(id => id !== payload.user_id))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ 
            user_id: user.id,
            online_at: new Date().toISOString()
          })
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [manuscriptId, chatType, canParticipate, user])

  const sendTypingIndicator = () => {
    if (channelRef.current && user) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: user.id }
      })

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Send stop typing after 1 second of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'stop_typing',
          payload: { user_id: user.id }
        })
      }, 1000)
    }
  }

  return {
    isConnected,
    typingUsers,
    sendTypingIndicator
  }
}
```

## Phase 5: Integration with Existing UI

### 5.1 Add Chat Button to Manuscript Cards

```typescript
// Update src/app/(dashboards)/author/page.tsx
// Add to manuscript card actions section (around line 1300)

{/* Chat button - show based on manuscript status */}
{(['submitted', 'under_review', 'rejected', 'approved'].includes(manuscript.status)) && (
  <Button
    size="sm"
    variant={unreadCount > 0 ? 'primary' : 'secondary'}
    onClick={() => {
      setSelectedChatManuscript(manuscript)
      setShowChatModal(true)
    }}
    className="inline-flex items-center space-x-2"
  >
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.4-.324c-.042-.009-.085-.02-.126-.032l-2.474.494a.75.75 0 01-.905-.905l.494-2.474c-.012-.041-.023-.084-.032-.126A8.955 8.955 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
    </svg>
    <span>Chat</span>
    {unreadCount > 0 && (
      <span className="ml-1 px-2 py-1 bg-red-500 text-white rounded-full text-xs font-bold">
        {unreadCount}
      </span>
    )}
  </Button>
)}
```

### 5.2 Add Chat Modal State

```typescript
// Add to author page state
const [showChatModal, setShowChatModal] = useState(false)
const [selectedChatManuscript, setSelectedChatManuscript] = useState<Manuscript | null>(null)
const [chatUnreadCounts, setChatUnreadCounts] = useState<Record<string, number>>({})

// Add near the end of the component
{showChatModal && selectedChatManuscript && (
  <ChatModal
    isOpen={showChatModal}
    onClose={() => {
      setShowChatModal(false)
      setSelectedChatManuscript(null)
      // Refresh unread count after closing
      fetchUnreadCount(selectedChatManuscript.id)
    }}
    manuscriptId={selectedChatManuscript.id}
    manuscriptStatus={selectedChatManuscript.status}
    manuscriptTitle={selectedChatManuscript.title}
    authorId={selectedChatManuscript.author_id}
    editorId={selectedChatManuscript.editor_id}
    publisherId={selectedChatManuscript.publisher_id}
  />
)}
```

## Phase 6: Deployment Checklist

### 6.1 Database Migrations
1. Run all migration files in sequence
2. Verify RLS policies are properly applied
3. Test database functions with sample data
4. Enable realtime for chat tables

### 6.2 Environment Configuration
```env
# Add to .env.local if not already present
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 6.3 Testing Strategy
1. **Unit Tests**: Test chat hooks and utility functions
2. **Integration Tests**: Test API routes with different user roles
3. **E2E Tests**: Test complete chat workflow from UI
4. **Load Tests**: Test realtime performance with multiple users

### 6.4 Performance Optimizations
1. Implement message pagination
2. Add message caching for frequently accessed chats
3. Optimize database queries with proper indexing
4. Implement rate limiting for message sending

### 6.5 Security Verification
1. Verify RLS policies prevent unauthorized access
2. Test role-based chat access controls
3. Validate input sanitization for messages
4. Test file upload security (if implementing file sharing)

This implementation provides a comprehensive, production-ready chat system that integrates seamlessly with your existing MyatPwint v2 workflow. The system is designed to be scalable, secure, and maintainable while providing an excellent user experience for all stakeholders in the manuscript review process.