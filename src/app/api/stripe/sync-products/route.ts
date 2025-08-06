/**
 * Admin API Route to Sync Books to Stripe Products
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncAllBooksToStripe } from '@/lib/stripe/products';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabaseClient = createRouteHandlerClient({ cookies });
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin/publisher
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['publisher', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Admin/Publisher access required' },
        { status: 403 }
      );
    }

    // Sync all books to Stripe
    await syncAllBooksToStripe();

    return NextResponse.json({
      success: true,
      message: 'Books successfully synced to Stripe',
    });

  } catch (error) {
    console.error('Error syncing products:', error);
    
    return NextResponse.json(
      { error: 'Failed to sync products to Stripe' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to sync all books to Stripe products',
    endpoints: {
      sync: 'POST /api/stripe/sync-products',
    }
  });
}