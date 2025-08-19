/**
 * Real-time Analytics Dashboard Update Endpoint
 * Receives updates from N8N workflows and broadcasts to connected clients
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const updateData = await request.json();
    
    // Validate required fields
    if (!updateData.event_type || !updateData.data) {
      return NextResponse.json(
        { error: 'Missing required fields: event_type, data' },
        { status: 400 }
      );
    }

    // Validate API key for security
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.DASHBOARD_API_KEY;
    
    if (!authHeader || !expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`📊 Real-time update received: ${updateData.event_type}`);

    // Process different types of updates
    const processedUpdate = {
      id: `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event_type: updateData.event_type,
      data: updateData.data,
      timestamp: new Date().toISOString(),
      dashboard_sections: updateData.data.dashboard_sections || [],
      processed_at: new Date().toISOString()
    };

    // Here you would typically:
    // 1. Store the update in a cache (Redis)
    // 2. Broadcast to WebSocket connections
    // 3. Update real-time metrics
    
    // For now, we'll simulate these operations
    switch (updateData.event_type) {
      case 'marketing_campaign_created':
        await handleMarketingUpdate(processedUpdate);
        break;
      case 'revenue_updated':
        await handleRevenueUpdate(processedUpdate);
        break;
      default:
        console.log(`Unknown event type: ${updateData.event_type}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Dashboard update processed',
      update_id: processedUpdate.id,
      event_type: updateData.event_type,
      sections_updated: processedUpdate.dashboard_sections
    });

  } catch (error) {
    console.error('Error processing dashboard update:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process dashboard update',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function handleMarketingUpdate(update: any) {
  console.log('📈 Processing marketing campaign update:', {
    book_id: update.data.book_id,
    campaign_id: update.data.campaign_id,
    platforms: update.data.platforms
  });
  
  // In a real implementation, you would:
  // - Update marketing metrics in cache
  // - Notify dashboard clients via WebSocket
  // - Update recommendation engine status
  // - Log campaign performance
}

async function handleRevenueUpdate(update: any) {
  console.log('💰 Processing revenue update:', {
    payment_id: update.data.payment_id,
    amount: update.data.amount,
    book_id: update.data.book_id
  });
  
  // In a real implementation, you would:
  // - Update revenue metrics in cache
  // - Refresh dashboard charts
  // - Update publisher earnings
  // - Trigger alerts if needed
}

// GET endpoint for dashboard status
export async function GET() {
  return NextResponse.json({
    endpoint: 'Real-time Analytics Dashboard Updates',
    description: 'Receives updates from N8N workflows for dashboard refresh',
    supported_events: [
      'marketing_campaign_created',
      'revenue_updated',
      'book_recommendation_updated'
    ],
    authentication: 'Bearer token required',
    example_payload: {
      event_type: 'revenue_updated',
      data: {
        payment_id: 'pi_1234567890',
        amount: 15000,
        book_id: 'book-uuid',
        dashboard_sections: ['total_revenue', 'daily_sales']
      }
    }
  });
}