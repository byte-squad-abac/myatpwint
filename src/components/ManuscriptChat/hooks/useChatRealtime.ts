'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

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

interface UseChatRealtimeReturn {
  // No more unread count functionality
  isReady: boolean
}

export function useChatRealtime(
  manuscriptId: string,
  chatType: string | null,
  enabled: boolean,
  messages: ChatMessage[],
  addMessage?: (message: ChatMessage) => void
): UseChatRealtimeReturn {
  const [isRealtimeReady, setIsRealtimeReady] = useState(false)
  const [lastMessageId, setLastMessageId] = useState<string | null>(null)

  // Backup polling mechanism for when real-time fails initially
  const pollForNewMessages = useCallback(async () => {
    if (!enabled || !chatType || !addMessage) return
    
    try {
      const params = new URLSearchParams({ 
        chat_type: chatType,
        limit: '5',  // Just get the latest few messages
        ...(lastMessageId && { after: lastMessageId })
      })
      
      const response = await fetch(`/api/manuscripts/${manuscriptId}/chat?${params}`)
      if (response.ok) {
        const data = await response.json()
        const newMessages = data.messages || []
        
        // Add any new messages
        newMessages.forEach((message: ChatMessage) => {
          if (!lastMessageId || message.id !== lastMessageId) {
            addMessage(message)
            setLastMessageId(message.id)
          }
        })
      }
    } catch (error) {
      console.error('❌ Polling error:', error)
    }
  }, [manuscriptId, chatType, enabled, addMessage, lastMessageId])

  // Set up polling as backup (runs every 3 seconds for first 30 seconds)
  useEffect(() => {
    if (!enabled || !chatType || !addMessage) return
    
    let pollInterval: NodeJS.Timeout
    
    // Start polling after 3 seconds (if real-time hasn't kicked in)
    const pollTimeout = setTimeout(() => {
      pollInterval = setInterval(pollForNewMessages, 3000)
      
      // Stop polling after 30 seconds (real-time should be working by then)
      setTimeout(() => {
        if (pollInterval) {
          clearInterval(pollInterval)
        }
      }, 30000)
    }, 3000)
    
    return () => {
      if (pollTimeout) clearTimeout(pollTimeout)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [enabled, chatType, addMessage, pollForNewMessages])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!enabled || !chatType || !addMessage) return

    setIsRealtimeReady(false)
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any // Supabase channel type

    const setupRealtimeSubscription = async () => {
      // Force a fresh Supabase connection by removing any existing channels first
      const existingChannels = supabase.getChannels()
      
      // Remove all existing channels for this manuscript to prevent conflicts
      existingChannels.forEach(ch => {
        if (ch.topic.includes(manuscriptId)) {
          supabase.removeChannel(ch)
        }
      })
      
      // Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Create completely fresh channel
      const channelName = `manuscript_chat_${manuscriptId}_${chatType}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'manuscript_chats',
          filter: `manuscript_id=eq.${manuscriptId}`
        }, async (payload) => {
          // Only handle messages for the current chat type
          if (payload.new.chat_type === chatType) {
            
            
            // Fetch complete message data with sender info and add to messages
            try {
              const { data: completeMessage } = await supabase
                .from('manuscript_chats')
                .select(`
                  *,
                  sender:profiles!manuscript_chats_sender_id_fkey(id, name, role)
                `)
                .eq('id', payload.new.id)
                .single()
              
              if (completeMessage) {
                setLastMessageId(completeMessage.id) // Track this message
                addMessage(completeMessage)
                
                // Mark as read immediately since user is actively viewing the chat
                if (completeMessage.sender_id !== (await supabase.auth.getUser()).data.user?.id) {
                  try {
                    await fetch(`/api/manuscripts/${manuscriptId}/chat/mark-read`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        chat_type: chatType,
                        last_message_id: completeMessage.id
                      }),
                    })
                  } catch (err) {
                    console.error('Failed to auto-mark message as read:', err)
                  }
                }
              }
            } catch (error) {
              console.error('❌ Failed to fetch complete message:', error)
            }
          }
        })
        .subscribe(async (status) => {
          // When subscription is ready, set a more conservative ready state
          if (status === 'SUBSCRIBED') {
            setTimeout(() => {
              setIsRealtimeReady(true)
            }, 2000) // Increased delay to 2 seconds
          } else if (status === 'CLOSED') {
            setIsRealtimeReady(false)
          }
        })
    }

    setupRealtimeSubscription()

    // Cleanup subscription
    return () => {
      setIsRealtimeReady(false)
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [manuscriptId, chatType, enabled, addMessage])

  return {
    isReady: isRealtimeReady
  }
}