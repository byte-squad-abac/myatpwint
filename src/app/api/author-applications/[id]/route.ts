import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First get the application
    const { data: application, error } = await supabase
      .from('author_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Then get the profile data separately
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('id', application.user_id)
      .single();

    // Get reviewer profile if exists
    let reviewerProfile = null;
    if (application.reviewed_by) {
      const { data: reviewer } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('id', application.reviewed_by)
        .single();
      reviewerProfile = reviewer;
    }

    // Merge the data
    const applicationWithProfiles = {
      ...application,
      profiles: userProfile,
      reviewer: reviewerProfile
    };

    return NextResponse.json({ data: applicationWithProfiles });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Check if user is a publisher (for approve/reject) or the application owner (for updates)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Get the current application
    const { data: currentApplication, error: fetchError } = await supabase
      .from('author_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentApplication) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Handle publisher actions (approve/reject)
    if (action === 'approve' || action === 'reject') {
      if (profile?.role !== 'publisher') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { publisher_feedback } = body;

      const updateData: Record<string, unknown> = {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      };

      if (publisher_feedback) {
        updateData.publisher_feedback = publisher_feedback;
      }

      // If approving, update user role to author and set name
      if (action === 'approve') {
        await supabase
          .from('profiles')
          .update({ 
            role: 'author',
            name: currentApplication.author_name || currentApplication.legal_name
          })
          .eq('id', currentApplication.user_id);
      }

      // If rejecting, permanently ban the user from applying again
      if (action === 'reject') {
        await supabase
          .from('profiles')
          .update({ 
            banned_from_applying: true,
            ban_reason: publisher_feedback || 'Application was rejected by publisher.',
            banned_at: new Date().toISOString()
          })
          .eq('id', currentApplication.user_id);
      }

      const { data: updatedApplication, error: updateError } = await supabase
        .from('author_applications')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Database error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update application' },
          { status: 500 }
        );
      }

      return NextResponse.json({ data: updatedApplication });
    }

    // Handle application updates (by owner)
    if (currentApplication.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // No longer allow updates to rejected applications (permanent ban system)
    if (currentApplication.status === 'rejected') {
      return NextResponse.json(
        { 
          error: 'Rejected applications cannot be resubmitted. Your account has been permanently banned from applying as an author.',
          permanent: true
        },
        { status: 403 }
      );
    }

    if (currentApplication.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot update approved application' },
        { status: 400 }
      );
    }

    const {
      legal_name,
      author_name,
      association_name,
      membership_id,
      association_proof_url,
      why_publish_with_us,
      book_title,
      book_synopsis,
      book_tags,
      book_category,
      preferred_price
    } = body;

    const updateData: Record<string, unknown> = {};
    
    if (legal_name !== undefined) updateData.legal_name = legal_name;
    if (author_name !== undefined) updateData.author_name = author_name;
    if (association_name !== undefined) updateData.association_name = association_name;
    if (membership_id !== undefined) updateData.membership_id = membership_id;
    if (association_proof_url !== undefined) updateData.association_proof_url = association_proof_url;
    if (why_publish_with_us !== undefined) updateData.why_publish_with_us = why_publish_with_us;
    if (book_title !== undefined) updateData.book_title = book_title;
    if (book_synopsis !== undefined) updateData.book_synopsis = book_synopsis;
    if (book_tags !== undefined) updateData.book_tags = book_tags;
    if (book_category !== undefined) updateData.book_category = book_category;
    if (preferred_price !== undefined) updateData.preferred_price = preferred_price ? parseFloat(preferred_price) : null;

    // Only allow updates to pending applications (resubmission removed)

    const { data: updatedApplication, error: updateError } = await supabase
      .from('author_applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update application' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedApplication });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}