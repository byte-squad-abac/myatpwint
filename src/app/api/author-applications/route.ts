import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
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

    // Check if user is banned from applying
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('banned_from_applying, ban_reason')
      .eq('id', user.id)
      .single();

    if (userProfile?.banned_from_applying) {
      return NextResponse.json(
        { 
          error: 'Your account has been permanently banned from applying as an author.',
          reason: userProfile.ban_reason || 'Previous application was rejected.',
          permanent: true
        },
        { status: 403 }
      );
    }

    // Check if user already has an application
    const { data: existingApplication } = await supabase
      .from('author_applications')
      .select('id, status, submission_count')
      .eq('user_id', user.id)
      .single();

    if (existingApplication && existingApplication.status !== 'rejected') {
      return NextResponse.json(
        { error: 'You already have a pending or approved application' },
        { status: 400 }
      );
    }

    // No longer allow resubmissions after rejection
    if (existingApplication && existingApplication.status === 'rejected') {
      return NextResponse.json(
        { 
          error: 'Your previous application was rejected. You cannot apply again.',
          permanent: true
        },
        { status: 403 }
      );
    }

    // Create new application
    const { data: application, error } = await supabase
      .from('author_applications')
      .insert({
        user_id: user.id,
        legal_name,
        author_name,
        association_name,
        membership_id,
        association_proof_url,
        why_publish_with_us,
        book_title,
        book_synopsis,
        book_tags: book_tags || [],
        book_category,
        preferred_price: preferred_price ? parseFloat(preferred_price) : null,
        submission_count: existingApplication ? existingApplication.submission_count + 1 : 1,
        last_resubmitted_at: existingApplication ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create application' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: application });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 API: Author applications GET request from user:', user.id);

    // Check if user is a publisher (can view all applications) or regular user (only their own)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('🔍 API: User profile role:', profile?.role);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    console.log('🔍 API: Requested status filter:', status);

    // Query applications without join first
    let query = supabase.from('author_applications').select('*');

    // If not a publisher, only show own applications
    if (profile?.role !== 'publisher') {
      console.log('🔍 API: Non-publisher user, filtering by user_id:', user.id);
      query = query.eq('user_id', user.id);
    } else {
      console.log('🔍 API: Publisher user, showing all applications');
    }

    // Filter by status if provided
    if (status) {
      console.log('🔍 API: Adding status filter:', status);
      query = query.eq('status', status);
    }

    // Order by creation date (newest first)
    query = query.order('created_at', { ascending: false });

    const { data: applications, error } = await query;
    console.log('🔍 API: Query result - Applications:', applications?.length || 0, 'Error:', error);

    if (error) {
      console.log('🔍 API: Full error details:', JSON.stringify(error, null, 2));
      // For existing authors who don't have applications, return empty array instead of error
      if (error.code === 'PGRST200' || error.message.includes('relationship')) {
        console.log('Existing author without application record - returning empty array');
        return NextResponse.json({ data: [] });
      }
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch applications' },
        { status: 500 }
      );
    }

    // If we have applications, fetch profile data separately
    if (applications && applications.length > 0) {
      console.log('🔍 API: Fetching profile data for applications...');
      const userIds = [...new Set(applications.map(app => app.user_id))];
      
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      if (profileError) {
        console.log('🔍 API: Profile fetch error:', profileError);
      } else {
        console.log('🔍 API: Fetched profiles:', profiles?.length || 0);
      }

      // Merge profile data with applications
      const applicationsWithProfiles = applications.map(application => {
        const userProfile = profiles?.find(p => p.id === application.user_id);
        return {
          ...application,
          profiles: userProfile ? {
            name: userProfile.name,
            email: userProfile.email
          } : null,
          // Also add direct fields for compatibility
          author_name: application.author_name || application.legal_name || 'Unknown'
        };
      });

      return NextResponse.json({ data: applicationsWithProfiles });
    }

    return NextResponse.json({ data: applications || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}