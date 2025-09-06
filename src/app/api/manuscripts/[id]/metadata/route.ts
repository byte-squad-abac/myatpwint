import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const manuscriptId = params.id

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get manuscript to check ownership and status
    const { data: manuscript, error: manuscriptError } = await supabase
      .from('manuscripts')
      .select('*')
      .eq('id', manuscriptId)
      .single()

    if (manuscriptError || !manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 })
    }

    // Check authorization - only author can edit their rejected manuscripts
    if (manuscript.author_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to edit this manuscript' }, { status: 403 })
    }

    if (manuscript.status !== 'rejected') {
      return NextResponse.json({ 
        error: 'Metadata can only be edited for rejected manuscripts' 
      }, { status: 400 })
    }

    // Parse request body
    const body = await request.json()
    const { 
      title, 
      description, 
      category, 
      tags, 
      cover_image_url, 
      suggested_price, 
      wants_physical 
    } = body

    // Validate required fields
    if (!title || !description || !category) {
      return NextResponse.json({ 
        error: 'Title, description, and category are required' 
      }, { status: 400 })
    }

    // Validate category
    const validCategories = [
      'Fiction', 'Non-Fiction', 'Poetry', 'Biography', 'History', 'Science',
      'Technology', 'Business', 'Self-Help', 'Religion', 'Philosophy', 'Art',
      'Travel', 'Children', 'Young Adult', 'Romance', 'Mystery', 'Thriller',
      'Fantasy', 'Sci-Fi'
    ]

    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    // Process tags
    let processedTags = null
    if (tags && Array.isArray(tags) && tags.length > 0) {
      processedTags = tags.filter((tag: string) => tag && tag.trim().length > 0)
      if (processedTags.length === 0) {
        processedTags = null
      }
    }

    // Update manuscript
    const { data: updatedManuscript, error: updateError } = await supabase
      .from('manuscripts')
      .update({
        title,
        description,
        category,
        tags: processedTags,
        cover_image_url: cover_image_url || manuscript.cover_image_url,
        suggested_price: suggested_price || null,
        wants_physical: Boolean(wants_physical),
        updated_at: new Date().toISOString()
      })
      .eq('id', manuscriptId)
      .select()
      .single()

    if (updateError) {
      console.error('Manuscript update error:', updateError)
      return NextResponse.json({ error: 'Failed to update manuscript' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      manuscript: updatedManuscript 
    })

  } catch (error) {
    console.error('Metadata update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}