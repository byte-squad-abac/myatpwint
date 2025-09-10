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
            console.log('📨 Polling found new message:', message.message)
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
    let pollTimeout: NodeJS.Timeout
    
    // Start polling after 3 seconds (if real-time hasn't kicked in)
    pollTimeout = setTimeout(() => {
      console.log('🔄 Starting backup polling mechanism')
      pollInterval = setInterval(pollForNewMessages, 3000)
      
      // Stop polling after 30 seconds (real-time should be working by then)
      setTimeout(() => {
        if (pollInterval) {
          console.log('⏹️ Stopping backup polling')
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

    console.log('Setting up realtime subscription for:', manuscriptId, chatType)
    setIsRealtimeReady(false)
    console.log('📡 Subscription filter will be:', `manuscript_id=eq.${manuscriptId}`)
    
    let channel: any

    const setupRealtimeSubscription = async () => {
      // Force a fresh Supabase connection by removing any existing channels first
      const existingChannels = supabase.getChannels()
      console.log('🔍 Existing channels before cleanup:', existingChannels.length)
      
      // Remove all existing channels for this manuscript to prevent conflicts
      existingChannels.forEach(ch => {
        if (ch.topic.includes(manuscriptId)) {
          console.log('🗑️ Removing existing channel:', ch.topic)
          supabase.removeChannel(ch)
        }
      })
      
      // Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Create completely fresh channel
      const channelName = `manuscript_chat_${manuscriptId}_${chatType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      console.log('📻 Creating fresh channel:', channelName)
      
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'manuscript_chats',
          filter: `manuscript_id=eq.${manuscriptId}`
        }, async (payload) => {
          console.log('🚨 RAW POSTGRES EVENT RECEIVED:', payload)
          console.log('🔥 New message received via realtime:', payload.new)
          
          // Only handle messages for the current chat type
          if (payload.new.chat_type === chatType) {
            console.log('✅ Message matches current chat type:', chatType)
            
            
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
                console.log('💬 Adding message to UI:', completeMessage.message)
                setLastMessageId(completeMessage.id) // Track this message
                addMessage(completeMessage)
              }
            } catch (error) {
              console.error('❌ Failed to fetch complete message:', error)
            }
          } else {
            console.log('⏭️ Message for different chat type, ignoring')
          }
        })
        .subscribe(async (status) => {
          console.log('📡 Realtime subscription status:', status)
          
          // When subscription is ready, set a more conservative ready state
          if (status === 'SUBSCRIBED') {
            setTimeout(() => {
              console.log('✅ Real-time subscription fully established')
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
      console.log('🧹 Cleaning up realtime subscription')
      setIsRealtimeReady(false)
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [manuscriptId, chatType, enabled, addMessage])

  return {
    // No more unread count functionality
  }
}