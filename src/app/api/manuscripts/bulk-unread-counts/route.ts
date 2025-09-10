import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { manuscriptIds }: { manuscriptIds: string[] } = await request.json()

    if (!manuscriptIds || !Array.isArray(manuscriptIds)) {
      return NextResponse.json({ error: 'Invalid manuscript IDs' }, { status: 400 })
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['publisher', 'author', 'editor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Only publishers, authors, and editors can access bulk unread counts' }, { status: 403 })
    }

    // Get unread counts for all manuscripts
    const unreadCounts: Record<string, number> = {}

    for (const manuscriptId of manuscriptIds) {
      // Check what type of chat is available for this manuscript
      const { data: manuscript } = await supabase
        .from('manuscripts')
        .select('status, author_id, editor_id')
        .eq('id', manuscriptId)
        .single()

      if (!manuscript) continue

      let chatType: string | null = null
      
      // Determine chat type based on manuscript status
      if (['submitted', 'under_review', 'rejected'].includes(manuscript.status)) {
        chatType = 'author_editor'
      } else if (['approved', 'published'].includes(manuscript.status)) {
        chatType = 'author_publisher'
      }

      if (!chatType) {
        unreadCounts[manuscriptId] = 0
        continue
      }

      // Get unread count for publisher (messages they haven't read)
      const { data: unreadCount } = await supabase
        .rpc('get_unread_count', {
          p_user_id: user.id,
          p_manuscript_id: manuscriptId,
          p_chat_type: chatType
        })

      unreadCounts[manuscriptId] = unreadCount || 0
    }

    return NextResponse.json({ unreadCounts })

  } catch (error) {
    console.error('Bulk unread count fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}