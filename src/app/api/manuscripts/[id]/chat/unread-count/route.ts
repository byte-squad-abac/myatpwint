import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    if (!chatType || !['author_editor', 'author_publisher'].includes(chatType)) {
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
      (chatType === 'author_editor' && availability.can_chat_author_editor) ||
      (chatType === 'author_publisher' && availability.can_chat_author_publisher)
    )

    if (!canAccess) {
      return NextResponse.json({ error: 'Cannot access this chat' }, { status: 403 })
    }

    // Get unread count
    const { data: unreadCount } = await supabase
      .rpc('get_unread_count', {
        p_user_id: user.id,
        p_manuscript_id: id,
        p_chat_type: chatType
      })

    return NextResponse.json({
      unreadCount: unreadCount || 0
    })

  } catch (error) {
    console.error('Unread count fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}