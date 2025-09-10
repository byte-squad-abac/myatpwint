import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const { chat_type, last_message_id } = body

    if (!chat_type || !['author_editor', 'author_publisher'].includes(chat_type)) {
      return NextResponse.json({ error: 'Invalid chat type' }, { status: 400 })
    }

    // Check chat availability first
    const { data: availability } = await supabase
      .rpc('get_chat_availability', {
        p_manuscript_id: id,
        p_user_id: user.id
      })
      .single()

    if (!availability) {
      return NextResponse.json({ error: 'Chat not available' }, { status: 403 })
    }

    // Validate user can access this chat type
    const canAccess = (
      (chat_type === 'author_editor' && availability.can_chat_author_editor) ||
      (chat_type === 'author_publisher' && availability.can_chat_author_publisher)
    )

    if (!canAccess) {
      return NextResponse.json({ error: 'Cannot access this chat' }, { status: 403 })
    }

    // Mark messages as read
    await supabase
      .rpc('mark_messages_read', {
        p_user_id: user.id,
        p_manuscript_id: id,
        p_chat_type: chat_type,
        p_last_message_id: last_message_id || null
      })

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Mark as read error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}