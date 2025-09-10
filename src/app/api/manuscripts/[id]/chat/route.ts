import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Fetch chat messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
        p_manuscript_id: id,
        p_user_id: user.id
      })
      .single()

    if (!availability || 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        !((availability as any).can_chat_author_editor || (availability as any).can_chat_author_publisher)) {
      return NextResponse.json({ error: 'Chat not available' }, { status: 403 })
    }

    // Validate chat type
    const validChatType = chatType || 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((availability as any).can_chat_author_editor ? 'author_editor' : 'author_publisher')

    let query = supabase
      .from('manuscript_chats')
      .select(`
        *,
        sender:profiles!manuscript_chats_sender_id_fkey(id, name, role)
      `)
      .eq('manuscript_id', id)
      .eq('chat_type', validChatType)
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
      messages: messages || [],
      chat_type: validChatType,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user_role: (availability as any).user_role,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      manuscript_status: (availability as any).manuscript_status
    })

  } catch (error) {
    console.error('Chat messages fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Send new chat message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message, chat_type } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
    }

    if (!chat_type || !['author_editor', 'author_publisher'].includes(chat_type)) {
      return NextResponse.json({ error: 'Invalid chat type' }, { status: 400 })
    }

    // Check chat availability
    const { data: availability } = await supabase
      .rpc('get_chat_availability', {
        p_manuscript_id: id,
        p_user_id: user.id
      })
      .single()

    if (!availability) {
      return NextResponse.json({ error: 'Chat not available' }, { status: 403 })
    }

    // Validate user can send in this chat type
    const canSend = (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (chat_type === 'author_editor' && (availability as any).can_chat_author_editor) ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (chat_type === 'author_publisher' && (availability as any).can_chat_author_publisher)
    )

    if (!canSend) {
      return NextResponse.json({ error: 'Cannot send message in this chat' }, { status: 403 })
    }

    // Insert message
    const { data: newMessage, error } = await supabase
      .from('manuscript_chats')
      .insert({
        manuscript_id: id,
        chat_type,
        message: message.trim(),
        sender_id: user.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sender_role: (availability as any).user_role
      })
      .select(`
        *,
        sender:profiles!manuscript_chats_sender_id_fkey(id, name, role)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: newMessage,
      success: true
    })

  } catch (error) {
    console.error('Chat message send error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}