/**
 * Admin API to generate embeddings for all books
 */

import { NextRequest, NextResponse } from 'next/server';
import AISearchService from '@/lib/ai/search-service';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Check authentication using route handler client
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin/publisher
    const { data: profile } = await supabase
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

    // Generate embeddings for all books
    const results = await AISearchService.generateAllBookEmbeddings();
    
    return NextResponse.json({
      message: 'Embedding generation completed',
      results
    });

  } catch (error) {
    console.error('Embedding generation API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Embedding generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for information
export async function GET() {
  return NextResponse.json({
    message: 'Admin API - Generate Book Embeddings',
    endpoints: {
      generate: 'POST /api/ai/generate-embeddings',
      authentication: 'Required (Admin or Publisher role)',
      description: 'Generates E5 embeddings for all books without embeddings'
    }
  });
}