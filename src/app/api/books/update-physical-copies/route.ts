import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { manuscriptId, physicalCopiesCount } = await request.json();

    if (!manuscriptId || physicalCopiesCount === undefined) {
      return NextResponse.json(
        { error: 'Missing manuscript ID or physical copies count' },
        { status: 400 }
      );
    }

    // Validate input
    const copiesCount = parseInt(physicalCopiesCount);
    if (isNaN(copiesCount) || copiesCount < 0) {
      return NextResponse.json(
        { error: 'Physical copies count must be a non-negative number' },
        { status: 400 }
      );
    }

    // Find the book by manuscript_id
    const { data: book, error: findError } = await supabase
      .from('books')
      .select('id, physical_copies_count')
      .eq('manuscript_id', manuscriptId)
      .single();

    if (findError) {
      console.error('Error finding book:', findError);
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Get current sales data to validate against sold copies
    const { data: purchases } = await supabase
      .from('purchases')
      .select('quantity')
      .eq('book_id', book.id)
      .eq('delivery_type', 'physical')
      .eq('status', 'completed');

    const soldPhysical = purchases?.reduce((sum, purchase) => sum + (purchase.quantity || 0), 0) || 0;

    // Prevent reducing below sold copies
    if (copiesCount < soldPhysical) {
      return NextResponse.json(
        { 
          error: `Cannot reduce physical copies below ${soldPhysical}. That many copies have already been sold.`,
          soldCopies: soldPhysical,
          requestedCount: copiesCount
        },
        { status: 400 }
      );
    }

    // Update the book's physical copies count
    const { error: updateError } = await supabase
      .from('books')
      .update({ physical_copies_count: copiesCount })
      .eq('manuscript_id', manuscriptId);

    if (updateError) {
      console.error('Error updating physical copies:', updateError);
      return NextResponse.json(
        { error: 'Failed to update physical copies count' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      manuscriptId,
      newPhysicalCopiesCount: copiesCount,
      soldCopies: soldPhysical,
      remainingCopies: copiesCount - soldPhysical
    });

  } catch (error) {
    console.error('Physical copies update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}